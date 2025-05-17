import { BaseAIManager, AIError, OpenAIError } from './base';
import { ApiProvider, AIResponse } from '../types';

// Create a concrete implementation of the abstract class for testing
class TestAIManager extends BaseAIManager {
  public testLastRequestBody: any = null;

  constructor(apiKey: string) {
    super(apiKey, ApiProvider.OPENAI);
  }

  // Custom implementation for testing different scenarios
  protected makeRequest(requestBody: any): Promise<AIResponse> {
    this.testLastRequestBody = requestBody;

    const prompt = requestBody.messages[0].content;

    // For test when response is null
    if (prompt.includes('test-invalid-response')) {
      return Promise.resolve(null as any);
    }

    // For test when error happens
    if (prompt.includes('test-error')) {
      return Promise.reject(new Error('Forced error for testing'));
    }

    // Default valid message for most tests
    if (prompt.includes('test-valid')) {
      return Promise.resolve({ content: 'feat: valid test message' });
    }

    // For testing when message doesn't follow conventional format
    if (prompt.includes('test-invalid-format')) {
      return Promise.resolve({ content: 'invalid format message' });
    }

    // For testing when message doesn't start with required prefix
    if (
      prompt.includes('test-prefix') &&
      prompt.includes('The message MUST start with: custom-prefix:')
    ) {
      return Promise.resolve({ content: 'wrong prefix: message' });
    }

    // For testing when message has correct prefix
    if (
      prompt.includes('test-correct-prefix') &&
      prompt.includes('The message MUST start with: custom-prefix:')
    ) {
      return Promise.resolve({ content: 'custom-prefix: message with correct prefix' });
    }

    // For testing when the same message is generated multiple times
    if (prompt.includes('test-same-message')) {
      return Promise.resolve({ content: 'feat: same test message' });
    }

    // Default response
    return Promise.resolve({ content: 'feat: default test message' });
  }
}

// Create a test implementation of BaseAIManager that we can easily control
class SequenceResponseManager extends BaseAIManager {
  private responses: Array<{ content: string }> = [];
  private responseIndex = 0;

  constructor(apiKey: string, responses: Array<string>) {
    super(apiKey, ApiProvider.OPENAI);
    this.responses = responses.map((content) => ({ content }));
  }

  // Override makeRequest to return pre-configured responses
  protected makeRequest(): Promise<AIResponse> {
    if (this.responseIndex >= this.responses.length) {
      return Promise.resolve({ content: 'feat: default response' });
    }

    return Promise.resolve(this.responses[this.responseIndex++]);
  }
}

describe('BaseAIManager', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('should throw error when instantiated without API key', () => {
    expect(() => new TestAIManager('')).toThrow(AIError);
    expect(() => new TestAIManager('')).toThrow('API key for openai is required');
  });

  it('should create instance with valid API key', () => {
    const manager = new TestAIManager('test-api-key');
    expect(manager).toBeInstanceOf(BaseAIManager);
  });

  it('should generate a valid commit message', async () => {
    const manager = new TestAIManager('test-api-key');
    const message = await manager.generateCommitMessage('test-valid', '');

    expect(message).toBe('feat: valid test message');
    expect(manager.testLastRequestBody.messages[0].content).toContain('test-valid');
  });

  it('should include prefix in prompt when provided', async () => {
    const manager = new TestAIManager('test-api-key');
    await manager.generateCommitMessage('test-correct-prefix', 'custom-prefix:');

    expect(manager.testLastRequestBody.messages[0].content).toContain(
      'The message MUST start with: custom-prefix:'
    );
  });

  it('should include conventional commit format guidance when no prefix provided', async () => {
    const manager = new TestAIManager('test-api-key');
    await manager.generateCommitMessage('test-valid', '');

    expect(manager.testLastRequestBody.messages[0].content).toContain(
      'The message MUST start with one of these types: feat, fix, docs, style, refactor, perf, test, or chore'
    );
  });

  it('should include previous messages in prompt when provided', async () => {
    const manager = new TestAIManager('test-api-key');
    const previousMessages = ['feat: previous message 1', 'fix: previous message 2'];
    await manager.generateCommitMessage('test-valid', '', previousMessages);

    expect(manager.testLastRequestBody.messages[0].content).toContain(
      'Please generate a message different from the following previous messages'
    );
    expect(manager.testLastRequestBody.messages[0].content).toContain('feat: previous message 1');
    expect(manager.testLastRequestBody.messages[0].content).toContain('fix: previous message 2');
  });

  it('should retry when message does not start with required prefix', async () => {
    const manager = new SequenceResponseManager('test-api-key', [
      'invalid prefix message',
      'custom-prefix: valid message',
    ]);

    const message = await manager.generateCommitMessage('test changes', 'custom-prefix:');

    expect(message).toBe('custom-prefix: valid message');
    expect(consoleLogSpy).toHaveBeenCalledWith('Generated message:', 'invalid prefix message');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Generated message doesn't start with required prefix. Retrying..."
    );
  });

  it('should retry when message does not follow conventional commits format', async () => {
    const manager = new SequenceResponseManager('test-api-key', [
      'invalid format message',
      'feat: valid message',
    ]);

    const message = await manager.generateCommitMessage('test changes', '');

    expect(message).toBe('feat: valid message');
    expect(consoleLogSpy).toHaveBeenCalledWith('Generated message:', 'invalid format message');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Generated message doesn't follow Conventional Commits format. Retrying..."
    );
  });

  it('should handle case when the same message is generated twice', async () => {
    // We need to directly test processValidMessage's behavior
    const manager = new TestAIManager('test-api-key');

    // Call the method directly rather than relying on generateCommitMessage
    const testResult1 = (manager as any).processValidMessage(
      'test message',
      'different message',
      0
    );
    expect(testResult1.shouldReturn).toBe(true);

    // When messages are the same but not the last attempt, it should return false
    const testResult2 = (manager as any).processValidMessage('test message', 'test message', 0);
    expect(testResult2.shouldReturn).toBe(false);

    // Verify handleSameMessageRetry behavior - we need to spy on console.log
    const spy = jest.spyOn(console, 'log');
    (manager as any).handleSameMessageRetry('test message');
    expect(spy).toHaveBeenCalledWith('Generated message:', 'test message');
    expect(spy).toHaveBeenCalledWith('Generated message is the same as previous. Retrying...');
    spy.mockRestore();
  });

  it('should return the message on the last attempt even if it is the same as previous', async () => {
    // All responses will be the same to test last attempt behavior
    const manager = new SequenceResponseManager('test-api-key', [
      'feat: repeated message',
      'feat: repeated message',
    ]);

    // Mock processValidMessage to force the test down the final attempt path
    const processValidMessageSpy = jest
      .spyOn(manager as any, 'processValidMessage')
      .mockImplementationOnce(() => ({ shouldReturn: false, message: 'feat: repeated message' }))
      .mockImplementationOnce(() => ({ shouldReturn: true, message: 'feat: repeated message' }));

    const message = await manager.generateCommitMessage('test changes', '');

    // We should get the message even if it's the same on the last attempt
    expect(message).toBe('feat: repeated message');

    // Verify processValidMessage was called twice
    expect(processValidMessageSpy).toHaveBeenCalledTimes(2);
  });

  it('should throw AIError if AI provider returns an error', async () => {
    const manager = new TestAIManager('test-api-key');

    await expect(manager.generateCommitMessage('test-error', '')).rejects.toThrow(AIError);
    await expect(manager.generateCommitMessage('test-error', '')).rejects.toThrow(
      'Forced error for testing'
    );
  });

  it('should throw AIError with generic message when error is not an Error instance', async () => {
    const manager = new TestAIManager('test-api-key');

    // Mock makeRequest to reject with a non-Error object
    jest.spyOn(manager as any, 'makeRequest').mockRejectedValueOnce('string error');

    // Use a single promise to test both the error type and message
    await expect(manager.generateCommitMessage('test-changes', '')).rejects.toThrow(
      new AIError('Failed to generate commit message')
    );
  });

  it('should throw AIError if response is invalid', async () => {
    const manager = new TestAIManager('test-api-key');

    await expect(manager.generateCommitMessage('test-invalid-response', '')).rejects.toThrow(
      AIError
    );
    await expect(manager.generateCommitMessage('test-invalid-response', '')).rejects.toThrow(
      'Failed to generate commit message'
    );
  });

  it('should throw AIError if max attempts are exceeded without returning', async () => {
    const manager = new SequenceResponseManager('test-api-key', [
      'feat: test message',
      'feat: test message',
      'feat: test message',
    ]);

    // Make processValidMessage always return false to trigger the final error
    jest.spyOn(manager as any, 'processValidMessage').mockReturnValue({
      shouldReturn: false,
      message: 'test message',
    });

    await expect(manager.generateCommitMessage('test', '')).rejects.toThrow(
      'Failed to generate commit message'
    );
  });

  describe('handleSameMessageRetry', () => {
    it('should log retry message when the same message is generated', () => {
      const manager = new TestAIManager('test-api-key');

      // Create a method that exposes the protected method
      const exposedManager = manager as any;
      exposedManager.handleSameMessageRetry('test message');

      expect(consoleLogSpy).toHaveBeenCalledWith('Generated message:', 'test message');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Generated message is the same as previous. Retrying...'
      );
    });
  });

  describe('processValidMessage', () => {
    it('should return true when messages are different', () => {
      const manager = new TestAIManager('test-api-key');

      // Create a method that exposes the protected method
      const exposedManager = manager as any;
      const result = exposedManager.processValidMessage('new message', 'old message', 0);

      expect(result.shouldReturn).toBe(true);
      expect(result.message).toBe('new message');
    });

    it('should return true when it is the last attempt even if messages are the same', () => {
      const manager = new TestAIManager('test-api-key');

      // Create a method that exposes the protected method
      const exposedManager = manager as any;
      const result = exposedManager.processValidMessage(
        'same message',
        'same message',
        BaseAIManager.MAX_ATTEMPTS - 1
      );

      expect(result.shouldReturn).toBe(true);
      expect(result.message).toBe('same message');
    });

    it('should return false when messages are the same and more attempts are left', () => {
      const manager = new TestAIManager('test-api-key');

      // Create a method that exposes the protected method
      const exposedManager = manager as any;
      const result = exposedManager.processValidMessage('same message', 'same message', 0);

      expect(result.shouldReturn).toBe(false);
      expect(result.message).toBe('same message');
    });
  });

  it('should verify OpenAIError is an alias of AIError', () => {
    expect(OpenAIError).toBe(AIError);
    const error = new OpenAIError('test error');
    expect(error).toBeInstanceOf(AIError);
    expect(error.name).toBe('AIError');
  });
});
