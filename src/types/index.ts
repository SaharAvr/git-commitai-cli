import { ChatGptAIManager } from '../ai/providers/openai/chatgpt';
import { GeminiManager } from '../ai/providers/google/gemini';
import { ClaudeManager } from '../ai/providers/anthropic/claude';

// These enum values are used as index signatures, so eslint incorrectly flags them as unused
/* eslint-disable no-unused-vars */
export enum ApiProvider {
  OPENAI = 'openai',
  GOOGLE = 'google',
  ANTHROPIC = 'anthropic',
}
/* eslint-enable no-unused-vars */

export interface ApiKeys {
  [ApiProvider.OPENAI]?: string;
  [ApiProvider.GOOGLE]?: string;
  [ApiProvider.ANTHROPIC]?: string;
}

export interface Config {
  apiKeys: ApiKeys;
  defaultProvider?: ApiProvider;
}

export interface CommitArgs {
  prefix: string;
  args: string[];
  skipConfirmation: boolean;
}

export interface CommitResult {
  message: string;
  args: string[];
}

export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface AIResponse {
  content: string;
}

export type AIModelImplementation = ChatGptAIManager | GeminiManager | ClaudeManager;

// Command constants
export const COMMAND_KEYWORDS = {
  HELP: ['help', '--help', '-h'],
  SETTINGS: ['settings', 'config'],
} as const;

// Flattened array of all command keywords for easy checking
export const ALL_COMMAND_KEYWORDS = [
  ...COMMAND_KEYWORDS.HELP,
  ...COMMAND_KEYWORDS.SETTINGS,
] as const;
