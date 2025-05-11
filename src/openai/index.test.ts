import { OpenAIManager, OpenAIError } from './index';
import OpenAI from 'openai';

jest.mock('openai');

describe('OpenAIManager', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should throw OpenAIError if API key is empty', () => {
      expect(() => new OpenAIManager('')).toThrow(OpenAIError);
    });

    it('should create instance with valid API key', () => {
      const openaiInstance = new OpenAIManager(mockApiKey);
      expect(openaiInstance).toBeInstanceOf(OpenAIManager);
    });
  });

  describe('generateCommitMessage', () => {
    it('should generate commit message with prefix', async () => {
      const mockResponse = { choices: [{ message: { content: 'feat: test changes' } }] };
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      const result = await openaiInstance.generateCommitMessage('test changes', 'feat');
      expect(result).toBe('feat: test changes');
    });

    it('should generate commit message without prefix', async () => {
      const mockResponse = { choices: [{ message: { content: 'test changes' } }] };
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(mockResponse),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      const result = await openaiInstance.generateCommitMessage('test changes', '');
      expect(result).toBe('test changes');
    });

    it('should throw OpenAIError after max retries', async () => {
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API error')),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', '')).rejects.toThrow(
        OpenAIError
      );
    });

    it('should retry if the first response is invalid and succeed on the second', async () => {
      const mockResponses = [
        { choices: [{ message: { content: 'invalid message' } }] },
        { choices: [{ message: { content: 'feat: valid message' } }] },
      ];
      let callCount = 0;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => Promise.resolve(mockResponses[callCount++])),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      const result = await openaiInstance.generateCommitMessage('test changes', 'feat');
      expect(result).toBe('feat: valid message');
    });

    it('should throw OpenAIError if OpenAI response is malformed', async () => {
      const malformedResponse = { notChoices: [] };
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue(malformedResponse),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        OpenAIError
      );
    });

    it('should throw OpenAIError if API key is invalid (authentication error)', async () => {
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue({
              message: 'Incorrect API key provided',
              response: { status: 401 },
            }),
          },
        },
      }));

      const openaiInstance = new OpenAIManager('invalid-api-key');
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        OpenAIError
      );
    });
  });
});
