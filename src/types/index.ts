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
