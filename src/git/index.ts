import { execSync } from 'child_process';
import { CommitArgs, ALL_COMMAND_KEYWORDS } from '../types';

export enum GitStatus {
  /* eslint-disable no-unused-vars */
  NO_STAGED_CHANGES = 'NO_STAGED_CHANGES',
}

/**
 * Custom error for Git operations
 */
export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitError';
  }
}

/**
 * Manages Git operations
 */
export class GitManager {
  public static readonly MAX_CHANGES_PER_FILE = 1000;
  public static readonly MAX_TOTAL_CHANGES = 10000;

  /**
   * Processes command line arguments for commit
   */
  public static processCommitArgs(args: string[]): CommitArgs {
    const processedArgs: string[] = [];
    let skipNext = false;
    let prefix = '';
    let skipConfirmation = false;

    // Define command keywords that should never be treated as prefixes

    for (const arg of args) {
      if (skipNext) {
        skipNext = false;
        continue;
      }

      if (arg === '-y' || arg === '--yes') {
        skipConfirmation = true;
      } else if (arg === '-m' || arg === '--message') {
        skipNext = true;
      } else if (!arg.startsWith('-m') && !arg.startsWith('--message=')) {
        // If this is a command keyword, always add it to processedArgs
        if (ALL_COMMAND_KEYWORDS.includes(arg as any)) {
          processedArgs.push(arg);
        } else if (!prefix && !arg.startsWith('-')) {
          prefix = arg;
        } else {
          processedArgs.push(arg);
        }
      }
    }

    return { prefix, args: processedArgs, skipConfirmation };
  }

  /**
   * Gets changes staged for commit
   */
  public static getStagedChanges(): string | GitStatus {
    try {
      const files = execSync('git diff --cached --name-only').toString().trim().split('\n');

      if (files.length === 0 || (files.length === 1 && files[0] === '')) {
        return GitStatus.NO_STAGED_CHANGES;
      }

      let allChanges = '';
      let totalChangeCount = 0;
      let truncatedFiles = 0;

      // First pass: count total changes and identify large files
      for (const file of files) {
        const fileChanges = execSync(`git diff --cached -- "${file}"`).toString();
        const changeCount = fileChanges.split('\n').length;
        totalChangeCount += changeCount;

        if (changeCount > this.MAX_CHANGES_PER_FILE) {
          truncatedFiles++;
          allChanges += `[File: ${file} - Too many changes to display (${changeCount} lines)]\n`;
        } else {
          allChanges += `[File: ${file}]\n${fileChanges}\n\n`;
        }

        // If we exceed the max total changes, stop processing more files in detail
        if (totalChangeCount > this.MAX_TOTAL_CHANGES) {
          const remainingFiles = files.length - (files.indexOf(file) + 1);
          if (remainingFiles > 0) {
            allChanges += `\n[${remainingFiles} more files not shown due to size constraints]\n`;
            break;
          }
        }
      }

      // Add summary if files were truncated
      if (truncatedFiles > 0) {
        allChanges =
          `[${truncatedFiles} file(s) exceeded maximum line count and were truncated]\n\n` +
          allChanges;
      }

      return `Files changed:\n${files.join('\n')}\n\nChanges:\n${allChanges}`;
    } catch (error) {
      if (error instanceof Error) {
        throw new GitError('Failed to get staged changes');
      }
      throw error;
    }
  }

  /**
   * Commits changes with the provided message
   */
  public static commit(message: string, args: string[] = []): void {
    try {
      const argsStr = args.length > 0 ? ' ' + args.join(' ') : '';
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"${argsStr}`, {
        stdio: 'inherit',
      });
    } catch (error: any) {
      // Extract the actual error message
      let actualError = 'Failed to commit changes';

      if (error instanceof Error && error.message) {
        actualError = error.message;
      }

      throw new GitError(actualError);
    }
  }
}
