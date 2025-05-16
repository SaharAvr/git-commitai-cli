import OpenAI from 'openai';
import { OpenAIResponse } from '../types';

export class OpenAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export class OpenAIManager {
  public static readonly MAX_ATTEMPTS = 3;
  public static readonly MAX_TOKENS = 100;
  public static readonly TEMPERATURE = 0.7;

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new OpenAIError('OpenAI API key is required');
    }
  }

  private async makeRequest(requestBody: any): Promise<OpenAIResponse> {
    try {
      const openai = new OpenAI({ apiKey: this.apiKey });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: requestBody.messages[0].content }],
        max_tokens: OpenAIManager.MAX_TOKENS,
        temperature: OpenAIManager.TEMPERATURE,
      });

      return response as unknown as OpenAIResponse;
    } catch (error) {
      throw new OpenAIError(
        error instanceof Error ? error.message : 'Failed to make OpenAI request'
      );
    }
  }

  public async generateCommitMessage(
    changes: string,
    prefix: string,
    previousMessages: string[] = []
  ): Promise<string> {
    let prevMessage = '';
    let attempts = 0;

    for (attempts = 0; attempts < OpenAIManager.MAX_ATTEMPTS; attempts++) {
      let promptText = 'Please suggest a git commit message following Conventional Commits format.';
      if (prefix) {
        promptText += ` The message MUST start with: ${prefix}`;
      } else {
        promptText +=
          " The message MUST start with one of these types: feat, fix, docs, style, refactor, perf, test, or chore. Only add a scope in parentheses if it provides meaningful context about the change (e.g., 'feat(auth)' for authentication features). Do NOT add a scope just because you see a filename.";
      }
      promptText +=
        " Use imperative mood and keep it concise.\nExample formats:\ntype: description (preferred when no specific scope is needed)\ntype(scope): description (only when scope adds meaningful context)\n\nImportant: reply with the commit message only.\n\nNote: If you see '[File: filename - Too many changes to display]', treat it as a refactor of that file and focus on the overall purpose of the changes.";

      if (previousMessages.length > 0) {
        promptText +=
          '\n\nPlease generate a message different from the following previous messages:\n' +
          previousMessages.join('\n');
      }

      const fullPrompt = `${promptText}\n\nChanges:\n${changes}`;
      const requestBody = {
        messages: [{ role: 'user', content: fullPrompt }],
      };

      try {
        const response = await this.makeRequest(requestBody);

        if (
          !response ||
          !Array.isArray(response.choices) ||
          !response.choices[0] ||
          !response.choices[0].message ||
          typeof response.choices[0].message.content !== 'string'
        ) {
          throw new OpenAIError('Failed to generate commit message');
        }

        const message = response.choices[0].message.content;

        // Validate the message format
        if (prefix) {
          if (!message.startsWith(prefix)) {
            console.log('Generated message:', message);
            console.log("Generated message doesn't start with required prefix. Retrying...");
            prevMessage = message;
            continue;
          }
        } else {
          if (!/^(feat|fix|docs|style|refactor|perf|test|chore)/.test(message)) {
            console.log('Generated message:', message);
            console.log(
              "Generated message doesn't follow Conventional Commits format. Retrying..."
            );
            prevMessage = message;
            continue;
          }
        }

        // Process the message using a testable method
        const processResult = this.processValidMessage(message, prevMessage, attempts);
        if (processResult.shouldReturn) {
          return processResult.message;
        }

        prevMessage = message;
      } catch (error) {
        throw new OpenAIError(
          error instanceof Error ? error.message : 'Failed to generate commit message'
        );
      }
    }

    // Should never reach here, but throw as a safeguard
    throw new OpenAIError('Failed to generate commit message');
  }

  // Extracted method to make testing easier
  public handleSameMessageRetry(message: string): void {
    console.log('Generated message:', message);
    console.log('Generated message is the same as previous. Retrying...');
  }

  // Process message decisions in a testable way
  public processValidMessage(
    message: string,
    prevMessage: string,
    attempts: number
  ): { shouldReturn: boolean; message: string } {
    // Check if we should return the message
    if (message !== prevMessage) {
      return { shouldReturn: true, message };
    }

    // If we've reached the last attempt, return the message
    if (attempts === OpenAIManager.MAX_ATTEMPTS - 1) {
      return { shouldReturn: true, message };
    }

    // Handle retry logic
    this.handleSameMessageRetry(message);
    return { shouldReturn: false, message };
  }
}
