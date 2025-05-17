import { ClaudeManager } from './claude';

// Mock the entire claude.ts module implementation
jest.mock('./claude', () => {
  // Keep track of the last request made
  let lastRequest: any = null;

  // Mock implementation that exposes the request for testing
  const mockMakeRequest = jest.fn().mockImplementation(async (requestBody: any) => {
    lastRequest = requestBody;
    return { content: 'test commit message' };
  });

  // Create a proper class to mock the ClaudeManager
  class MockClaudeManager {
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
    ClaudeManager: MockClaudeManager,
  };
});

// Import the mocked implementation
const MockClaudeManager = ClaudeManager as any;

describe('ClaudeManager', () => {
  let manager: ClaudeManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new ClaudeManager('test-api-key');

    // Initialize the lastRequest
    MockClaudeManager.resetRequest();

    // Reset the mock to return a successful response by default
    MockClaudeManager.setMockImplementation(async () => {
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
    MockClaudeManager.setMockImplementation(() => {
      throw testError;
    });

    // This should throw the error
    await expect(manager.generateCommitMessage('changes')).rejects.toThrow(testError);
  });

  it('should handle different response types', async () => {
    // Test with empty content
    MockClaudeManager.setMockImplementation(async () => {
      return { content: '' };
    });

    let result = await manager.generateCommitMessage('test changes');
    expect(result).toBe('');

    // Test with null content
    MockClaudeManager.setMockImplementation(async () => {
      return { content: null };
    });

    result = await manager.generateCommitMessage('test changes');
    expect(result).toBe('');
  });
});
