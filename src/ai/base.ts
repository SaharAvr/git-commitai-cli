import { AIResponse, ApiProvider } from '../types';

/**
 * Custom error for AI operations
 */
export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIError';
  }
}

/**
 * Base class for AI model integrations
 */
export abstract class BaseAIManager {
  public static readonly MAX_ATTEMPTS = 3;
  public static readonly MAX_TOKENS = 100;
  public static readonly TEMPERATURE = 0.7;

  protected provider: ApiProvider;

  constructor(
    protected apiKey: string,
    provider: ApiProvider
  ) {
    if (!apiKey) {
      throw new AIError(`API key for ${provider} is required`);
    }
    this.provider = provider;
  }

  /**
   * Abstract method to make API requests to the AI provider
   */
  // eslint-disable-next-line no-unused-vars
  protected abstract makeRequest(requestBody: any): Promise<AIResponse>;

  /**
   * Generates a commit message based on changes
   */
  public async generateCommitMessage(
    changes: string,
    prefix?: string,
    previousMessages: string[] = []
  ): Promise<string> {
    let prevMessage = '';
    let attempts = 0;

    for (attempts = 0; attempts < BaseAIManager.MAX_ATTEMPTS; attempts++) {
      let promptText =
        'Please suggest a git commit message following Conventional Commits format. The message MUST be a single line only.';
      if (prefix) {
        promptText += ` The message MUST start with: ${prefix}`;
      } else {
        promptText +=
          " The message MUST start with one of these types: feat, fix, docs, style, refactor, perf, test, or chore. Always include a scope in parentheses (e.g., 'feat(auth)', 'fix(api)'). Use filenames, components, or affected areas as scope identifiers.";
      }
      promptText +=
        " Use imperative mood and keep it concise. The description part MUST start with lowercase letters.\nExample format:\ntype(scope): add feature (not 'Add feature')\n\nImportant: reply with ONLY the commit message as a single line. No additional text, explanations, or multi-line commits.";

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

        if (!response || typeof response.content !== 'string') {
          throw new AIError('Failed to generate commit message');
        }

        const message = response.content?.trim();

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
        throw new AIError(
          error instanceof Error ? error.message : 'Failed to generate commit message'
        );
      }
    }

    // Should never reach here, but throw as a safeguard
    throw new AIError('Failed to generate commit message');
  }

  /**
   * Handles retry when the same message is generated
   */
  // Extracted method to make testing easier
  protected handleSameMessageRetry(message: string): void {
    console.log('Generated message:', message);
    console.log('Generated message is the same as previous. Retrying...');
  }

  /**
   * Processes message and determines if it should be returned
   */
  // Process message decisions in a testable way
  protected processValidMessage(
    message: string,
    prevMessage: string,
    attempts: number
  ): { shouldReturn: boolean; message: string } {
    // Check if we should return the message
    if (message !== prevMessage) {
      return { shouldReturn: true, message };
    }

    // If we've reached the last attempt, return the message
    if (attempts === BaseAIManager.MAX_ATTEMPTS - 1) {
      return { shouldReturn: true, message };
    }

    // Handle retry logic
    this.handleSameMessageRetry(message);
    return { shouldReturn: false, message };
  }
}

// Export the AIError as OpenAIError for backward compatibility
export { AIError as OpenAIError };
