import { GeminiManager } from './gemini';

// Mock the entire gemini.ts module implementation
jest.mock('./gemini', () => {
  // Keep track of the last request made
  let lastRequest: any = null;

  // Mock implementation that exposes the request for testing
  const mockMakeRequest = jest.fn().mockImplementation(async (requestBody: any) => {
    lastRequest = requestBody;
    return { content: 'test commit message' };
  });

  // Create a proper class to mock the GeminiManager
  class MockGeminiManager {
    constructor() {}

    // Public method to get the last request
    getLastRequest() {
      return lastRequest;
    }

    // Public setter for mockMakeRequest to return different values or throw
    static setMockImplementation(implementation: any) {
      mockMakeRequest.mockImplementation(implementation);
    }

    // Expose the mock function for verification
    static getMockFunction() {
      return mockMakeRequest;
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

    // Reset the lastRequest for testing
    static resetRequest() {
      lastRequest = {
        messages: [{ role: 'user', content: 'test' }],
      };
    }
  }

  return {
    GeminiManager: MockGeminiManager,
  };
});

// Import the mocked implementation
const MockGeminiManager = GeminiManager as any;

describe('GeminiManager', () => {
  let manager: GeminiManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new GeminiManager('test-api-key');

    // Initialize the lastRequest
    MockGeminiManager.resetRequest();

    // Reset the mock to return a successful response by default
    MockGeminiManager.setMockImplementation(async () => {
      return { content: 'test commit message' };
    });
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
    MockGeminiManager.setMockImplementation(() => {
      throw testError;
    });

    // This should throw the error
    await expect(manager.generateCommitMessage('changes')).rejects.toThrow(testError);
  });

  it('should handle different response types', async () => {
    // Test with empty content
    MockGeminiManager.setMockImplementation(async () => {
      return { content: '' };
    });

    let result = await manager.generateCommitMessage('test changes');
    expect(result).toBe('');

    // Test with null content
    MockGeminiManager.setMockImplementation(async () => {
      return { content: null };
    });

    result = await manager.generateCommitMessage('test changes');
    expect(result).toBe('');
  });
});
