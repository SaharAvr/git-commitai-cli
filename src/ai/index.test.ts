import {
  AIManager,
  AIError,
  ChatGptAIManager,
  GeminiManager,
  ClaudeManager,
  OpenAIError,
} from './index';
import { ApiProvider } from '../types/index';

// Mock the model implementations
jest.mock('./providers/openai/chatgpt', () => {
  const mockGenerateCommitMessage = jest.fn().mockResolvedValue('mocked openai message');
  return {
    ChatGptAIManager: jest.fn().mockImplementation(() => {
      return {
        generateCommitMessage: mockGenerateCommitMessage,
      };
    }),
  };
});

jest.mock('./providers/google/gemini', () => {
  const mockGenerateCommitMessage = jest.fn().mockResolvedValue('mocked gemini message');
  return {
    GeminiManager: jest.fn().mockImplementation(() => {
      return {
        generateCommitMessage: mockGenerateCommitMessage,
      };
    }),
  };
});

jest.mock('./providers/anthropic/claude', () => {
  const mockGenerateCommitMessage = jest.fn().mockResolvedValue('mocked claude message');
  return {
    ClaudeManager: jest.fn().mockImplementation(() => {
      return {
        generateCommitMessage: mockGenerateCommitMessage,
      };
    }),
  };
});

describe('AIManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create ChatGptAIManager by default', () => {
    new AIManager('test-key');
    expect(ChatGptAIManager).toHaveBeenCalledWith('test-key');
  });

  it('should create ChatGptAIManager when OpenAI provider is specified', () => {
    new AIManager('test-key', ApiProvider.OPENAI);
    expect(ChatGptAIManager).toHaveBeenCalledWith('test-key');
  });

  it('should create GeminiManager when Google provider is specified', () => {
    new AIManager('test-key', ApiProvider.GOOGLE);
    expect(GeminiManager).toHaveBeenCalledWith('test-key');
  });

  it('should create ClaudeManager when Anthropic provider is specified', () => {
    new AIManager('test-key', ApiProvider.ANTHROPIC);
    expect(ClaudeManager).toHaveBeenCalledWith('test-key');
  });

  it('should throw an error for unsupported providers', () => {
    expect(() => new AIManager('test-key', 'unsupported' as ApiProvider)).toThrow(AIError);
    expect(() => new AIManager('test-key', 'unsupported' as ApiProvider)).toThrow(
      'Unsupported provider: unsupported'
    );
  });

  it('should delegate generateCommitMessage to the implementation', async () => {
    const manager = new AIManager('test-key', ApiProvider.OPENAI);
    const result = await manager.generateCommitMessage('test changes', 'feat:', ['previous']);

    expect(result).toBe('mocked openai message');

    // Access the mock via the module's mock property
    const mockChatGptConstructor = jest.mocked(ChatGptAIManager);
    const mockInstance = mockChatGptConstructor.mock.results[0].value;
    expect(mockInstance.generateCommitMessage).toHaveBeenCalledWith('test changes', 'feat:', [
      'previous',
    ]);
  });

  it('should delegate generateCommitMessage to Google implementation', async () => {
    const manager = new AIManager('test-key', ApiProvider.GOOGLE);
    const result = await manager.generateCommitMessage('test changes', 'fix:');

    expect(result).toBe('mocked gemini message');

    const mockGeminiConstructor = jest.mocked(GeminiManager);
    const mockInstance = mockGeminiConstructor.mock.results[0].value;
    expect(mockInstance.generateCommitMessage).toHaveBeenCalledWith('test changes', 'fix:', []);
  });

  it('should delegate generateCommitMessage to Anthropic implementation', async () => {
    const manager = new AIManager('test-key', ApiProvider.ANTHROPIC);
    const result = await manager.generateCommitMessage('test changes', '');

    expect(result).toBe('mocked claude message');

    const mockClaudeConstructor = jest.mocked(ClaudeManager);
    const mockInstance = mockClaudeConstructor.mock.results[0].value;
    expect(mockInstance.generateCommitMessage).toHaveBeenCalledWith('test changes', '', []);
  });
});

describe('Exported classes and types', () => {
  it('should export ChatGptAIManager', () => {
    expect(ChatGptAIManager).toBeDefined();
  });

  it('should export GeminiManager', () => {
    expect(GeminiManager).toBeDefined();
  });

  it('should export ClaudeManager', () => {
    expect(ClaudeManager).toBeDefined();
  });

  it('should export AIError', () => {
    expect(AIError).toBeDefined();
    const error = new AIError('test error');
    expect(error.name).toBe('AIError');
    expect(error.message).toBe('test error');
  });

  it('should export OpenAIError as an alias of AIError', () => {
    expect(OpenAIError).toBeDefined();
    expect(OpenAIError).toBe(AIError);
    const error = new OpenAIError('test error');
    expect(error.name).toBe('AIError');
    expect(error.message).toBe('test error');
  });
});
