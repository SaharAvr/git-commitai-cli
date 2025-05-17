import { AIManager } from '../ai';
import { ApiProvider } from '../types';

/**
 * Validates an API key by attempting to generate a test commit message
 * @returns An object with success status and error message if applicable
 */
export async function validateApiKey(
  apiKey: string,
  provider: ApiProvider
): Promise<{ isValid: boolean; errorMessage?: string }> {
  try {
    const ai = new AIManager(apiKey, provider);
    await ai.generateCommitMessage('test', '', []);
    return { isValid: true };
  } catch (error) {
    let errorMessage = 'Invalid API key. Please check your key and try again.';

    // Check for common error messages
    if (error instanceof Error) {
      const errorStr = error.message.toLowerCase();
      if (errorStr.includes('credit balance') || errorStr.includes('billing')) {
        errorMessage = 'Account credit balance issue. Please check your billing settings.';
      } else if (errorStr.includes('rate limit') || errorStr.includes('too many requests')) {
        errorMessage = 'Rate limit reached. Please try again later.';
      } else if (errorStr.includes('permission') || errorStr.includes('scope')) {
        errorMessage =
          'API key permissions issue. Please check your API key has the required permissions.';
      }
    }

    return { isValid: false, errorMessage };
  }
}
