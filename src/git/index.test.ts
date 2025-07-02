import { GitManager, GitError, GitStatus } from './index';
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
    it('should treat help command as argument not prefix', () => {
      const result = GitManager.processCommitArgs(['help']);
      expect(result).toEqual({ prefix: '', args: ['help'] });
    });
    it('should treat settings command as argument not prefix', () => {
      const result = GitManager.processCommitArgs(['settings']);
      expect(result).toEqual({ prefix: '', args: ['settings'] });
    });
    it('should treat config command as argument not prefix', () => {
      const result = GitManager.processCommitArgs(['config']);
      expect(result).toEqual({ prefix: '', args: ['config'] });
    });
    it('should treat --help flag as argument not prefix', () => {
      const result = GitManager.processCommitArgs(['--help']);
      expect(result).toEqual({ prefix: '', args: ['--help'] });
    });
    it('should treat -h flag as argument not prefix', () => {
      const result = GitManager.processCommitArgs(['-h']);
      expect(result).toEqual({ prefix: '', args: ['-h'] });
    });
    it('should handle command keywords mixed with other args', () => {
      const result = GitManager.processCommitArgs(['help', '--verbose']);
      expect(result).toEqual({ prefix: '', args: ['help', '--verbose'] });
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
    it('should return NO_STAGED_CHANGES when no changes are staged', () => {
      (execSync as jest.Mock).mockReturnValueOnce('');
      expect(GitManager.getStagedChanges()).toBe(GitStatus.NO_STAGED_CHANGES);
    });
    it('should handle files with too many changes', () => {
      (execSync as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd.includes('git diff --cached --name-only')) return 'large-file.txt';
        if (cmd.includes('git diff --cached -- "large-file.txt"')) {
          // Create a string with more than MAX_CHANGES_PER_FILE lines
          return Array(GitManager.MAX_CHANGES_PER_FILE + 1)
            .fill('+line')
            .join('\n');
        }
        return '';
      });
      const result = GitManager.getStagedChanges();
      expect(result).toContain('Too many changes to display');
      expect(result).toContain(`${GitManager.MAX_CHANGES_PER_FILE + 1} lines`);
      expect(result).toContain('1 file(s) exceeded maximum line count');
    });
    it('should handle total changes exceeding maximum', () => {
      (execSync as jest.Mock).mockImplementation((cmd: string) => {
        if (cmd.includes('git diff --cached --name-only')) {
          return 'file1.txt\nfile2.txt\nfile3.txt\nfile4.txt\nfile5.txt';
        }
        if (cmd.includes('git diff --cached -- "file1.txt"')) {
          return Array(GitManager.MAX_TOTAL_CHANGES + 1)
            .fill('+line')
            .join('\n');
        }
        if (cmd.includes('git diff --cached -- "file2.txt"')) {
          return Array(GitManager.MAX_TOTAL_CHANGES + 1)
            .fill('+line')
            .join('\n');
        }
        if (cmd.includes('git diff --cached -- "file3.txt"')) {
          return Array(GitManager.MAX_TOTAL_CHANGES + 1)
            .fill('+line')
            .join('\n');
        }
        if (cmd.includes('git diff --cached -- "file4.txt"')) {
          return Array(GitManager.MAX_TOTAL_CHANGES + 1)
            .fill('+line')
            .join('\n');
        }
        if (cmd.includes('git diff --cached -- "file5.txt"')) {
          return Array(GitManager.MAX_TOTAL_CHANGES + 1)
            .fill('+line')
            .join('\n');
        }
        return '';
      });
      const result = GitManager.getStagedChanges();
      expect(result).toContain('more files not shown due to size constraints');
      expect(result).toContain('exceeded maximum line count');
    });
    it('should throw original error if not Error instance', () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw 'string error';
      });
      expect(() => GitManager.getStagedChanges()).toThrow('string error');
    });
    it('should throw GitError for Error instance', () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command failed');
      });
      expect(() => GitManager.getStagedChanges()).toThrow(GitError);
      expect(() => GitManager.getStagedChanges()).toThrow('Failed to get staged changes');
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
