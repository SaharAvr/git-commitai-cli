#!/usr/bin/env node

import readline from 'readline';
import inquirer from 'inquirer';
import { ConfigManager } from '../config';
import { GitManager } from '../git';
import { COMMAND_KEYWORDS } from '../types';

// Import all CLI components
import { showHelp, showVersion, showSettings, promptCommitMessage } from './commands';
import { promptForProvider } from './prompt';
import { checkForUpdates } from './updater';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  rl.close();
  process.exit(0);
});

// Handle ExitPromptError properly
process.on('uncaughtException', (error) => {
  if (error instanceof Error && error.name === 'ExitPromptError') {
    // Gracefully exit when the prompt is cancelled
    process.exit(0);
  } else {
    // Re-throw other errors
    console.error('\nAn unexpected error occurred:', error);
    process.exit(1);
  }
});

/**
 * Main entry point for the CLI
 */
async function mainFunc(): Promise<void> {
  // Command line arguments
  const args = process.argv.slice(2);

  // Check for help and version flags FIRST (before processing through GitManager)
  // This prevents -v from being interpreted as a git diff option
  if (COMMAND_KEYWORDS.HELP.some((keyword) => args.includes(keyword))) {
    showHelp(rl);
    return;
  }

  if (COMMAND_KEYWORDS.VERSION.some((keyword) => args.includes(keyword))) {
    showVersion(rl);
    return;
  }

  const { prefix, args: commandArgs, skipConfirmation } = GitManager.processCommitArgs(args);

  // Process other commands
  if (COMMAND_KEYWORDS.SETTINGS.some((keyword) => commandArgs.includes(keyword))) {
    showSettings(rl);
    return;
  }

  // Check for updates (non-blocking)
  await checkForUpdates();

  // Process API key setup
  const configManager = new ConfigManager();
  const defaultProvider = configManager.getDefaultProvider();
  const apiKey = configManager.getApiKey(defaultProvider);

  if (!configManager.hasAnyApiKey()) {
    await promptForProvider();
  } else if (!apiKey) {
    // Default provider has no key, but other providers might
    console.log(`\n⚠️ No API key for default provider (${defaultProvider}).`);

    const { setupDifferentProvider } = await inquirer.prompt([
      {
        type: 'list',
        name: 'setupDifferentProvider',
        message: 'Would you like to set up a different provider?',
        choices: [
          { name: 'Yes', value: true },
          { name: 'No', value: false },
        ],
      },
    ]);

    if (setupDifferentProvider) {
      await promptForProvider();
    } else {
      rl.close();
    }
  } else {
    // We have an API key for the default provider
    await promptCommitMessage(rl, [], prefix, commandArgs, skipConfirmation);
  }
}

// Export for external use
export const main = mainFunc;
export * from './commands';
export * from './messages';
export * from './prompt';
export * from './validation';
export * from './updater';
