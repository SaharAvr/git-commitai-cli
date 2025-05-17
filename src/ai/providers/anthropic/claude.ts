import Anthropic from '@anthropic-ai/sdk';
import { AIResponse, ApiProvider } from '../../../types';
import { BaseAIManager } from '../../base';

/**
 * Claude API implementation
 */
export class ClaudeManager extends BaseAIManager {
  constructor(apiKey: string) {
    super(apiKey, ApiProvider.ANTHROPIC);
  }

  /**
   * Makes request to the Anthropic Claude API
   */
  protected async makeRequest(requestBody: any): Promise<AIResponse> {
    try {
      const anthropic = new Anthropic({
        apiKey: this.apiKey,
      });

      const result = await anthropic.messages.create({
        model: 'claude-3-5-haiku-latest',
        max_tokens: BaseAIManager.MAX_TOKENS,
        temperature: BaseAIManager.TEMPERATURE,
        messages: [
          {
            role: 'user',
            content: requestBody.messages[0].content,
          },
        ],
      });

      // Handle different content block types
      let textContent = '';
      if (result.content && result.content.length > 0) {
        const firstBlock = result.content[0];
        if ('text' in firstBlock) {
          textContent = firstBlock.text;
        }
      }

      return {
        content: textContent,
      };
    } catch (error: any) {
      console.error('Claude API error:', error?.message || error);
      throw error;
    }
  }
}
