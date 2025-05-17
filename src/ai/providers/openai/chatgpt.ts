import OpenAI from 'openai';
import { AIResponse, ApiProvider } from '../../../types';
import { BaseAIManager } from '../../base';

/**
 * ChatGPT API implementation
 */
export class ChatGptAIManager extends BaseAIManager {
  constructor(apiKey: string) {
    super(apiKey, ApiProvider.OPENAI);
  }

  /**
   * Makes request to the OpenAI API
   */
  protected async makeRequest(requestBody: any): Promise<AIResponse> {
    try {
      const openai = new OpenAI({ apiKey: this.apiKey });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: requestBody.messages[0].content }],
        max_tokens: BaseAIManager.MAX_TOKENS,
        temperature: BaseAIManager.TEMPERATURE,
      });

      return {
        content: response.choices[0].message.content || '',
      };
    } catch (error: any) {
      console.error('ChatGPT API error:', error?.message || error);
      throw error;
    }
  }
}
