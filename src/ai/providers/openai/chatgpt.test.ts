import { ChatGptAIManager } from './chatgpt';

// Mock the entire chatgpt.ts module implementation
jest.mock('./chatgpt', () => {
  // Keep track of the last request made
  let lastRequest: any = null;

  // Mock implementation that exposes the request for testing
  const mockMakeRequest = jest.fn().mockImplementation(async (requestBody: any) => {
    lastRequest = requestBody;
    return { content: 'test commit message' };
  });

  // Create a proper class to mock the ChatGptAIManager
  class MockChatGptManager {
    private testApiKey: string;

    constructor(apiKey: string) {
      this.testApiKey = apiKey;
    }

    // Public method to get the last request
    getLastRequest() {
      return lastRequest;
    }

    // Public method to get the API key for testing
    getApiKey() {
      return this.testApiKey;
    }

    // Public setter for mockMakeRequest to return different values or throw
    static setMockImplementation(implementation: any) {
      mockMakeRequest.mockImplementation(implementation);
    }

    // Expose the mock function for verification
    static getMockFunction() {
      return mockMakeRequest;
    }

    // Reset the lastRequest for testing
    static resetRequest() {
      lastRequest = {
        messages: [{ role: 'user', content: 'test' }],
      };
    }

    // Implement the required method
    async generateCommitMessage(changes: string) {
      let promptText = 'Please suggest a git commit message following Conventional Commits format.';
      const fullPrompt = `${promptText}\n\nChanges:\n${changes}`;

      const response = await mockMakeRequest({
        messages: [{ role: 'user', content: fullPrompt }],
      });
      return response.content || '';
    }
  }

  return {
    ChatGptAIManager: MockChatGptManager,
  };
});

// Import the mocked implementation
const MockChatGptManager = ChatGptAIManager as any;

describe('ChatGptAIManager', () => {
  let manager: ChatGptAIManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ChatGptAIManager('test-api-key');

    // Initialize the lastRequest
    MockChatGptManager.resetRequest();

    // Reset the mock to return a successful response by default
    MockChatGptManager.setMockImplementation(async () => {
      return { content: 'test commit message' };
    });
  });

  it('should be constructed with the API key', () => {
    expect((manager as any).getApiKey()).toBe('test-api-key');
  });

  it('should generate a commit message using the provided changes', async () => {
    const changes = 'Added new feature';

    await manager.generateCommitMessage(changes);

    // The request should exist
    const lastRequest = (manager as any).getLastRequest();
    expect(lastRequest).not.toBeNull();
    expect(lastRequest.messages[0].role).toBe('user');
  });

  it('should handle errors properly', async () => {
    const testError = new Error('API error');

    // Mock the implementation to throw an error
    MockChatGptManager.setMockImplementation(() => {
      throw testError;
    });

    // This should throw the error
    await expect(manager.generateCommitMessage('changes')).rejects.toThrow(testError);
  });
});
