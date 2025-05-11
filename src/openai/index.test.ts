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

    it('should include previous messages in the prompt', async () => {
      const mockResponse = { choices: [{ message: { content: 'feat: new message' } }] };
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation((params) => {
              // Verify that previous messages are included in the prompt
              expect(params.messages[0].content).toContain('previous message 1');
              expect(params.messages[0].content).toContain('previous message 2');
              return Promise.resolve(mockResponse);
            }),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      const previousMessages = ['previous message 1', 'previous message 2'];
      await openaiInstance.generateCommitMessage('test changes', 'feat', previousMessages);
    });

    it('should throw OpenAIError after MAX_ATTEMPTS invalid responses', async () => {
      const invalidResponses = Array(OpenAIManager.MAX_ATTEMPTS).fill({
        choices: [{ message: { content: 'invalid message' } }],
      });
      let callCount = 0;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest
              .fn()
              .mockImplementation(() => Promise.resolve(invalidResponses[callCount++])),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        'Failed to generate commit message'
      );
    });

    it('should accept a different message on retry', async () => {
      const mockResponses = [
        { choices: [{ message: { content: 'invalid message' } }] },
        { choices: [{ message: { content: 'feat: second message' } }] },
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
      expect(result).toBe('feat: second message');
    });

    it('should throw OpenAIError for non-Error objects', async () => {
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => {
              throw 'string error';
            }),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        'Failed to make OpenAI request'
      );
    });

    it('should accept a different message on retry with prefix', async () => {
      const mockResponses = [
        { choices: [{ message: { content: 'invalid message' } }] },
        { choices: [{ message: { content: 'feat: second message' } }] },
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
      expect(result).toBe('feat: second message');
    });

    it('should accept a different message on retry without prefix', async () => {
      const mockResponses = [
        { choices: [{ message: { content: 'invalid message' } }] },
        { choices: [{ message: { content: 'feat: second message' } }] },
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
      const result = await openaiInstance.generateCommitMessage('test changes', '');
      expect(result).toBe('feat: second message');
    });

    it('should throw OpenAIError for non-Error objects in generateCommitMessage', async () => {
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => {
              throw { custom: 'error' };
            }),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        'Failed to make OpenAI request'
      );
    });

    it('should throw OpenAIError after MAX_ATTEMPTS with attempts branch (with prefix)', async () => {
      const invalidResponses = Array(3).fill({
        choices: [{ message: { content: 'invalid message' } }],
      });
      let callCount = 0;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest
              .fn()
              .mockImplementation(() => Promise.resolve(invalidResponses[callCount++])),
          },
        },
      }));
      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        'Failed to generate commit message'
      );
    });

    it('should throw OpenAIError after MAX_ATTEMPTS with attempts branch (no prefix)', async () => {
      const invalidResponses = Array(3).fill({
        choices: [{ message: { content: 'invalid message' } }],
      });
      let callCount = 0;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest
              .fn()
              .mockImplementation(() => Promise.resolve(invalidResponses[callCount++])),
          },
        },
      }));
      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', '')).rejects.toThrow(
        'Failed to generate commit message'
      );
    });

    it('should throw OpenAIError with fallback message if makeRequest throws non-Error object', async () => {
      // Patch makeRequest to throw a non-Error object
      const openaiInstance = new OpenAIManager(mockApiKey);
      // @ts-ignore
      openaiInstance.makeRequest = jest.fn().mockImplementation(() => {
        throw 'not an error';
      });
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        'Failed to generate commit message'
      );
    });

    it('should return message when it starts with prefix and is different from previous', async () => {
      const mockResponses = [
        { choices: [{ message: { content: 'invalid message' } }] },
        { choices: [{ message: { content: 'feat: second message' } }] },
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
      expect(result).toBe('feat: second message');
    });

    it('should return message when it follows conventional commits and is different from previous', async () => {
      const mockResponses = [
        { choices: [{ message: { content: 'invalid message' } }] },
        { choices: [{ message: { content: 'feat: second message' } }] },
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
      const result = await openaiInstance.generateCommitMessage('test changes', '');
      expect(result).toBe('feat: second message');
    });

    it('should return message when it starts with prefix and max attempts reached', async () => {
      const mockResponses = Array(3).fill({
        choices: [{ message: { content: 'feat: same message' } }],
      });
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
      expect(result).toBe('feat: same message');
    });

    it('should return message when it follows conventional commits and max attempts reached', async () => {
      const mockResponses = Array(3).fill({
        choices: [{ message: { content: 'feat: same message' } }],
      });
      let callCount = 0;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => Promise.resolve(mockResponses[callCount++])),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      const result = await openaiInstance.generateCommitMessage('test changes', '');
      expect(result).toBe('feat: same message');
    });

    it('should retry when message starts with wrong prefix', async () => {
      const mockResponses = [
        { choices: [{ message: { content: 'fix: wrong prefix' } }] },
        { choices: [{ message: { content: 'feat: correct prefix' } }] },
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
      expect(result).toBe('feat: correct prefix');
    });

    it('should retry when message does not follow conventional commits', async () => {
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
      const result = await openaiInstance.generateCommitMessage('test changes', '');
      expect(result).toBe('feat: valid message');
    });

    it('should throw OpenAIError when max attempts reached with invalid messages', async () => {
      const mockResponses = Array(3).fill({
        choices: [{ message: { content: 'invalid message' } }],
      });
      let callCount = 0;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => Promise.resolve(mockResponses[callCount++])),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        'Failed to generate commit message'
      );
    });

    it('should throw OpenAIError when response is malformed', async () => {
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({ notChoices: [] }),
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        'Failed to generate commit message'
      );
    });

    it('should retry up to MAX_ATTEMPTS when all messages are invalid', async () => {
      const invalidMessage = 'invalid message';
      const mockResponses = Array(OpenAIManager.MAX_ATTEMPTS).fill({
        choices: [{ message: { content: invalidMessage } }],
      });
      const createMock = jest.fn();
      let callCount = 0;
      createMock.mockImplementation(() => {
        callCount++;
        return Promise.resolve(mockResponses[callCount - 1]);
      });

      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: createMock,
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        'Failed to generate commit message'
      );
      expect(createMock).toHaveBeenCalledTimes(OpenAIManager.MAX_ATTEMPTS);
    });

    it('should properly handle retry logic when message is the same', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      const openaiInstance = new OpenAIManager(mockApiKey);

      openaiInstance.handleSameMessageRetry('test message');

      expect(consoleSpy).toHaveBeenCalledWith('Generated message:', 'test message');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Generated message is the same as previous. Retrying...'
      );

      consoleSpy.mockRestore();
    });

    it('should test processValidMessage for all conditions', () => {
      const openaiInstance = new OpenAIManager(mockApiKey);
      const spy = jest.spyOn(openaiInstance, 'handleSameMessageRetry');

      // Case 1: message !== prevMessage
      let result = openaiInstance.processValidMessage('new message', 'old message', 0);
      expect(result).toEqual({ shouldReturn: true, message: 'new message' });

      // Case 2: last attempt
      result = openaiInstance.processValidMessage(
        'same message',
        'same message',
        OpenAIManager.MAX_ATTEMPTS - 1
      );
      expect(result).toEqual({ shouldReturn: true, message: 'same message' });

      // Case 3: default retry path
      result = openaiInstance.processValidMessage('same message', 'same message', 0);
      expect(result).toEqual({ shouldReturn: false, message: 'same message' });
      expect(spy).toHaveBeenCalledWith('same message');

      spy.mockRestore();
    });
  });

  describe('retry logic', () => {
    it('should retry up to MAX_ATTEMPTS when all messages are invalid', async () => {
      const invalidMessage = 'invalid message';
      const mockResponses = Array(OpenAIManager.MAX_ATTEMPTS).fill({
        choices: [{ message: { content: invalidMessage } }],
      });
      const createMock = jest.fn();
      let callCount = 0;
      createMock.mockImplementation(() => {
        callCount++;
        return Promise.resolve(mockResponses[callCount - 1]);
      });

      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: createMock,
          },
        },
      }));

      const openaiInstance = new OpenAIManager(mockApiKey);
      await expect(openaiInstance.generateCommitMessage('test changes', 'feat')).rejects.toThrow(
        'Failed to generate commit message'
      );
      expect(createMock).toHaveBeenCalledTimes(OpenAIManager.MAX_ATTEMPTS);
    });

    it('should update prevMessage when response does not start with required prefix', async () => {
      // Setup sequence of responses with different prefixes
      const mockResponses = [
        { choices: [{ message: { content: 'fix: first message' } }] },
        { choices: [{ message: { content: 'feat: second message' } }] },
      ];
      let callCount = 0;
      (OpenAI as unknown as jest.Mock).mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockImplementation(() => Promise.resolve(mockResponses[callCount++])),
          },
        },
      }));

      // Spy on console.log to verify behavior
      const consoleSpy = jest.spyOn(console, 'log');

      const openaiInstance = new OpenAIManager(mockApiKey);
      const result = await openaiInstance.generateCommitMessage('test changes', 'feat');

      // Verify retry happened and second message was returned
      expect(result).toBe('feat: second message');

      // Verify the first message was logged as not matching the prefix
      expect(consoleSpy).toHaveBeenCalledWith('Generated message:', 'fix: first message');
      expect(consoleSpy).toHaveBeenCalledWith(
        "Generated message doesn't start with required prefix. Retrying..."
      );

      consoleSpy.mockRestore();
    });

    it('should update prevMessage after processValidMessage returns shouldReturn: false', async () => {
      // Create a sequence of valid messages
      const mockResponses = [
        { choices: [{ message: { content: 'feat: first valid message' } }] },
        { choices: [{ message: { content: 'feat: second valid message' } }] },
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

      // Spy on processValidMessage to control its return value
      const processSpy = jest.spyOn(openaiInstance, 'processValidMessage');

      // First call returns false to continue the loop
      processSpy.mockReturnValueOnce({ shouldReturn: false, message: 'feat: first valid message' });

      // Second call returns true to exit the loop
      processSpy.mockReturnValueOnce({ shouldReturn: true, message: 'feat: second valid message' });

      const result = await openaiInstance.generateCommitMessage('test changes', 'feat');

      // Verify the return value is from the second message
      expect(result).toBe('feat: second valid message');

      // Verify processValidMessage was called twice
      expect(processSpy).toHaveBeenCalledTimes(2);

      // Verify first and second calls to processValidMessage
      expect(processSpy.mock.calls[0][0]).toBe('feat: first valid message');
      expect(processSpy.mock.calls[1][0]).toBe('feat: second valid message');

      processSpy.mockRestore();
    });
  });
});
