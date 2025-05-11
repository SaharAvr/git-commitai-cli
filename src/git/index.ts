import { execSync } from 'child_process';
import { CommitArgs } from '../types';

export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitError';
  }
}

export class GitManager {
  private static readonly MAX_CHANGES = 500;

  public static processCommitArgs(args: string[]): CommitArgs {
    const processedArgs: string[] = [];
    let skipNext = false;
    let prefix = '';

    for (const arg of args) {
      if (skipNext) {
        skipNext = false;
        continue;
      }

      if (arg === '-m' || arg === '--message') {
        skipNext = true;
      } else if (!arg.startsWith('-m') && !arg.startsWith('--message=')) {
        if (!prefix && !arg.startsWith('-')) {
          prefix = arg;
        } else {
          processedArgs.push(arg);
        }
      }
    }

    return { prefix, args: processedArgs };
  }

  public static getStagedChanges(): string {
    try {
      const files = execSync('git diff --cached --name-only').toString().trim().split('\n');

      if (files.length === 0 || (files.length === 1 && files[0] === '')) {
        throw new GitError("No staged changes found. Use 'git add' first.");
      }

      let allChanges = '';
      for (const file of files) {
        const fileChanges = execSync(`git diff --cached -- "${file}"`).toString();
        const changeCount = fileChanges.split('\n').length;

        if (changeCount > this.MAX_CHANGES) {
          allChanges += `[File: ${file} - Too many changes to display (${changeCount} lines)]\n`;
        } else {
          allChanges += `[File: ${file}]\n${fileChanges}\n\n`;
        }
      }

      return `Files changed:\n${files.join('\n')}\n\nChanges:\n${allChanges}`;
    } catch (error) {
      if (error instanceof Error) {
        throw new GitError('Failed to get staged changes');
      }
      throw error;
    }
  }

  public static commit(message: string, args: string[] = []): void {
    try {
      const argsStr = args.length > 0 ? ' ' + args.join(' ') : '';
      execSync(`git commit -m "${message.replace(/"/g, '"')}"${argsStr}`, {
        stdio: 'inherit',
      });
    } catch (error: any) {
      // Print all available error output
      if (error && typeof error === 'object') {
        if ('stdout' in error && error.stdout) {
          process.stdout.write(error.stdout.toString());
        }
        if ('stderr' in error && error.stderr) {
          process.stderr.write(error.stderr.toString());
        }
      }
      // Print error message if nothing else
      if (error instanceof Error && error.message) {
        process.stderr.write(error.message + '\n');
      }
      const gitError = new GitError('Failed to commit changes');
      if (gitError.message) process.stdout.write(gitError.message + '\n');
      throw gitError;
    }
  }
}
