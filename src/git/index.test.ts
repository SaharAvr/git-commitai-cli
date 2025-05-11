import { GitManager, GitError } from './index';
import { execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('GitManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processCommitArgs', () => {
    it('should extract prefix and remaining args', () => {
      const result = GitManager.processCommitArgs(['feat', '-m', 'test', '--amend']);
      expect(result).toEqual({ prefix: 'feat', args: ['--amend'] });
    });
    it('should handle no prefix', () => {
      const result = GitManager.processCommitArgs(['-m', 'test', '--amend']);
      expect(result).toEqual({ prefix: '', args: ['--amend'] });
    });
    it('should handle empty args array', () => {
      const result = GitManager.processCommitArgs([]);
      expect(result).toEqual({ prefix: '', args: [] });
    });
  });

  describe('getStagedChanges', () => {
    it('should return formatted changes for staged files', () => {
      (execSync as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd.includes('git diff --cached --name-only')) return 'file1.txt\nfile2.js';
        if (cmd.includes('git diff --cached -- "file1.txt"')) return '+line1\n-line2';
        if (cmd.includes('git diff --cached -- "file2.js"')) return '+line3\n-line4';
        return '';
      });
      const result = GitManager.getStagedChanges();
      expect(result).toContain('Files changed:');
      expect(result).toContain('file1.txt');
      expect(result).toContain('file2.js');
      expect(result).toContain('Changes:');
    });
    it('should throw if no staged changes', () => {
      (execSync as jest.Mock).mockReturnValueOnce('');
      expect(() => GitManager.getStagedChanges()).toThrow(GitError);
    });
    it('should handle files with too many changes', () => {
      (execSync as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd.includes('git diff --cached --name-only')) return 'large-file.txt';
        if (cmd.includes('git diff --cached -- "large-file.txt"')) {
          // Create a string with more than MAX_CHANGES lines
          return Array(600).fill('+line').join('\n');
        }
        return '';
      });
      const result = GitManager.getStagedChanges();
      expect(result).toContain('Too many changes to display');
      expect(result).toContain('600 lines');
    });
    it('should throw original error if not Error instance', () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw 'string error';
      });
      expect(() => GitManager.getStagedChanges()).toThrow('string error');
    });
  });

  describe('commit', () => {
    it('should call execSync with stdio: inherit', () => {
      (execSync as jest.Mock).mockReturnValue('commit output');
      GitManager.commit('test message', ['--amend']);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git commit -m'),
        expect.objectContaining({ stdio: 'inherit' })
      );
    });
    it('should throw GitError on execSync error', () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('fail');
      });
      expect(() => GitManager.commit('msg')).toThrow(GitError);
    });
    it('should handle commit message with special characters', () => {
      (execSync as jest.Mock).mockReturnValue('commit output');
      const specialMsg = 'fix: handle quotes " and backticks ` in message';
      GitManager.commit(specialMsg, []);
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('git commit -m'),
        expect.objectContaining({ stdio: 'inherit' })
      );
    });
    it('should write error output to stdout and stderr', () => {
      const mockStdout = Buffer.from('stdout error');
      const mockStderr = Buffer.from('stderr error');
      const mockError = {
        stdout: mockStdout,
        stderr: mockStderr,
        message: 'commit failed',
      };

      (execSync as jest.Mock).mockImplementation(() => {
        throw mockError;
      });

      const stdoutSpy = jest.spyOn(process.stdout, 'write');
      const stderrSpy = jest.spyOn(process.stderr, 'write');

      expect(() => GitManager.commit('msg')).toThrow(GitError);
      expect(stdoutSpy).toHaveBeenCalledWith(mockStdout.toString());
      expect(stderrSpy).toHaveBeenCalledWith(mockStderr.toString());

      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
    });
  });
});
