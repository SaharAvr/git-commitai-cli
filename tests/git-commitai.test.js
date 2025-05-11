const { execSync } = require('child_process');
const {
  processCommitArgs,
  getStagedChanges,
  generateCommitMessage,
  commit,
} = require('../src/git-commitai');

// Mock child_process.execSync
jest.mock('child_process', () => ({
  execSync: jest.fn((command) => {
    // Mock git commands
    if (command.includes('git diff --cached --name-only')) {
      return 'file1.txt\nfile2.js';
    }
    if (command.includes('git diff --cached --quiet')) {
      return ''; // No error means there are staged changes
    }
    if (command.includes('git diff --cached --')) {
      return '+line1\n-line2\n+line3';
    }
    // Mock OpenAI API call
    if (command.includes('curl')) {
      return JSON.stringify({
        choices: [
          {
            message: {
              content: command.includes('custom')
                ? 'custom: add new feature'
                : 'feat: add new feature',
            },
          },
        ],
      });
    }
    return '';
  }),
}));

describe('git-commitai', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = process.env;
    process.env = { ...originalEnv };

    // Mock OpenAI API key
    process.env.OPENAI_API_KEY = 'test-api-key';

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('processCommitArgs', () => {
    it('should extract prefix and remaining args', () => {
      const result = processCommitArgs(['feat', '-m', 'test', '--amend']);
      expect(result).toEqual({
        prefix: 'feat',
        args: ['--amend'],
      });
    });

    it('should handle no prefix', () => {
      const result = processCommitArgs(['-m', 'test', '--amend']);
      expect(result).toEqual({
        prefix: '',
        args: ['--amend'],
      });
    });
  });

  describe('getStagedChanges', () => {
    it('should return formatted changes for staged files', () => {
      const result = getStagedChanges();

      // Verify git commands were called
      expect(execSync).toHaveBeenCalledWith('git diff --cached --name-only');
      expect(execSync).toHaveBeenCalledWith('git diff --cached -- "file1.txt"');
      expect(execSync).toHaveBeenCalledWith('git diff --cached -- "file2.js"');

      // Verify output format
      expect(result).toContain('Files changed:');
      expect(result).toContain('file1.txt');
      expect(result).toContain('file2.js');
      expect(result).toContain('Changes:');
    });
  });

  describe('generateCommitMessage', () => {
    it('should generate a valid conventional commit message', () => {
      const changes = 'test changes';
      const result = generateCommitMessage(changes);

      // Verify OpenAI API was called
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('curl'));
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('api.openai.com'));

      // Verify result
      expect(result).toBe('feat: add new feature');
    });

    it('should respect custom prefix', () => {
      const changes = 'test changes';
      const result = generateCommitMessage(changes, 'custom');

      // Verify OpenAI API was called with custom prefix
      expect(execSync).toHaveBeenCalledWith(expect.stringContaining('custom'));

      // Verify result
      expect(result).toBe('custom: add new feature');
    });

    it('should throw error when OPENAI_API_KEY is not set', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => {
        generateCommitMessage('test changes');
      }).toThrow('OPENAI_API_KEY environment variable is not set');
    });
  });

  describe('commit', () => {
    it('should generate commit message and return it', () => {
      const result = commit();
      expect(result).toBe('feat: add new feature');
    });

    it('should throw error when no staged changes', () => {
      execSync.mockImplementationOnce(() => {
        throw new Error('no staged changes');
      });

      expect(() => {
        commit();
      }).toThrow('no staged changes found');
    });
  });
});
