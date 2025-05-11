export interface Config {
  OPENAI_API_KEY: string;
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
