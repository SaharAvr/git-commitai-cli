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
        model: 'gemini-3.1-flash-lite',
        contents: [{ role: 'user', parts: [{ text: requestBody.messages[0].content }] }],
        config: {
          temperature: BaseAIManager.TEMPERATURE,
          maxOutputTokens: BaseAIManager.MAX_TOKENS,
        },
      });

      let content = '';

      const candidate = result?.candidates?.[0];
      if (candidate?.content?.parts) {
        content = candidate.content.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text)
          .join('');
      } else {
        // Fallback to text getter if parts are not available
        content = result?.text || '';
      }

      return {
        content,
      };
    } catch (error: any) {
      console.error('Gemini API error:', error?.message || error);
      throw error;
    }
  }
}
