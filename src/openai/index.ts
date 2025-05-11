import OpenAI from 'openai';
import { OpenAIResponse } from '../types';

export class OpenAIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export class OpenAIManager {
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly MAX_TOKENS = 100;
  private static readonly TEMPERATURE = 0.7;

  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new OpenAIError('OpenAI API key is required');
    }
  }

  private async makeRequest(requestBody: any): Promise<OpenAIResponse> {
    try {
      const openai = new OpenAI({ apiKey: this.apiKey });
      const response = await openai.chat.completions.create({
        model: 'gpt-4',
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

    while (true) {
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
        const message = response.choices[0].message.content;

        // Validate the message format
        if (prefix) {
          if (message.startsWith(prefix)) {
            if (message !== prevMessage || attempts >= OpenAIManager.MAX_ATTEMPTS) {
              return message;
            }
          }
        } else {
          if (/^(feat|fix|docs|style|refactor|perf|test|chore)/.test(message)) {
            if (message !== prevMessage || attempts >= OpenAIManager.MAX_ATTEMPTS) {
              return message;
            }
          }
        }

        console.log('Generated message:', message);
        console.log("Generated message doesn't follow Conventional Commits format. Retrying...");

        prevMessage = message;
        attempts++;

        if (attempts >= OpenAIManager.MAX_ATTEMPTS) {
          throw new OpenAIError(
            `Failed to generate a valid commit message after ${OpenAIManager.MAX_ATTEMPTS} attempts`
          );
        }
      } catch (error) {
        throw new OpenAIError(
          error instanceof Error ? error.message : 'Failed to generate commit message'
        );
      }
    }
  }
}
