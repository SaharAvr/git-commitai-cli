import { ApiProvider } from '../types';
import { BaseAIManager, AIError, OpenAIError } from './base';
import { ChatGptAIManager } from './providers/openai/chatgpt';
import { GeminiManager } from './providers/google/gemini';
import { ClaudeManager } from './providers/anthropic/claude';

/**
 * Main AIManager that handles provider selection and delegation
 */
export class AIManager {
  /**
   * The selected AI implementation
   */
  private implementation: BaseAIManager;

  /**
   * Creates an AIManager that delegates to the appropriate model implementation
   * @param {string} apiKey - API key for the selected provider
   * @param {ApiProvider} provider - Which AI provider to use
   */
  constructor(apiKey: string, provider: ApiProvider = ApiProvider.OPENAI) {
    // Create the appropriate implementation based on the provider
    if (provider === ApiProvider.OPENAI) {
      this.implementation = new ChatGptAIManager(apiKey) as BaseAIManager;
      return;
    }

    if (provider === ApiProvider.GOOGLE) {
      this.implementation = new GeminiManager(apiKey) as BaseAIManager;
      return;
    }

    if (provider === ApiProvider.ANTHROPIC) {
      this.implementation = new ClaudeManager(apiKey) as BaseAIManager;
      return;
    }

    throw new AIError(`Unsupported provider: ${provider}`);
  }

  /**
   * Generates a commit message for the given changes
   * @param {string} changes - The git diff changes to summarize
   * @param {string} prefix - Optional prefix for the commit message
   * @param {string[]} previousMessages - Previous messages to avoid duplicating
   * @returns {Promise<string>} The generated commit message
   */
  public async generateCommitMessage(
    changes: string,
    prefix: string,
    previousMessages: string[] = []
  ): Promise<string> {
    return this.implementation.generateCommitMessage(changes, prefix, previousMessages);
  }
}

// Export all classes for compatibility and convenience
export { ChatGptAIManager, GeminiManager, ClaudeManager, AIError, OpenAIError };
