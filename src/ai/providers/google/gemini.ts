import { GoogleGenAI } from '@google/genai';
import { AIResponse, ApiProvider } from '../../../types';
import { BaseAIManager } from '../../base';

/**
 * Gemini API implementation
 */
export class GeminiManager extends BaseAIManager {
  constructor(apiKey: string) {
    super(apiKey, ApiProvider.GOOGLE);
  }

  /**
   * Makes request to the Google Gemini API
   */
  protected async makeRequest(requestBody: any): Promise<AIResponse> {
    try {
      const gemini = new GoogleGenAI({ apiKey: this.apiKey });

      const result = await gemini.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: [{ role: 'user', parts: [{ text: requestBody.messages[0].content }] }],
        config: {
          temperature: BaseAIManager.TEMPERATURE,
          maxOutputTokens: BaseAIManager.MAX_TOKENS,
        },
      });

      return {
        content: result?.text || '',
      };
    } catch (error: any) {
      console.error('Gemini API error:', error?.message || error);
      throw error;
    }
  }
}
