import chalk from 'chalk';
import inquirer from 'inquirer';
import { GitManager, GitStatus } from '../git';
import { ConfigManager } from '../config';
import { AIManager } from '../ai';
import { displayHelpMessage, displaySettingsHeader } from './messages';

// Import dynamically to avoid circular dependencies
let promptFunctions: any = null;

// This will be called from index.ts to break circular dependencies
export function setPromptFunctions(fns: any): void {
  promptFunctions = fns;
}

/**
 * Handles the help command
 */
export function showHelp(rl: any): void {
  displayHelpMessage();
  rl.close();
}

/**
 * Handles the settings command
 */
export function showSettings(rl: any): void {
  const configManager = new ConfigManager();
  const apiKeys = configManager.getApiKeys();
  const defaultProvider = configManager.getDefaultProvider();

  displaySettingsHeader();

  console.log(chalk.yellow('Current Configuration:'));
  console.log(`Default Provider: ${chalk.cyan(defaultProvider)}`);

  console.log('\nAPI Keys:');
  Object.entries(apiKeys).forEach(([provider, key]) => {
    const maskedKey = key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : 'Not set';
    const isDefault = provider === defaultProvider ? ' (default)' : '';
    console.log(`  - ${chalk.cyan(provider)}${isDefault}: ${maskedKey}`);
  });

  console.log();

  inquirer
    .prompt([
      {
        type: 'list',
        name: 'option',
        message: 'Select an option:',
        choices: [
          { name: 'Add/Update API key', value: '1' },
          { name: 'Change default provider', value: '2' },
          { name: 'Exit', value: '3' },
        ],
      },
    ])
    .then(async ({ option }) => {
      switch (option) {
        case '1':
          console.log();
          await promptFunctions.promptForProvider();
          break;
        case '2':
          console.log();
          await promptFunctions.promptForDefaultProvider();
          break;
        case '3':
          rl.close();
          break;
      }
    });
}

/**
 * Prompts for a commit message based on staged changes
 */
export async function promptCommitMessage(
  rl: any,
  previousMessages: string[] = [],
  gitArgs: string[] = []
): Promise<void> {
  try {
    const configManager = new ConfigManager();
    const provider = configManager.getDefaultProvider();
    const apiKey = configManager.getApiKey(provider);

    if (!apiKey) {
      console.log(chalk.yellow(`\nNo API key found for ${provider}. Please set up your API key.`));
      if (promptFunctions) {
        await promptFunctions.promptForProvider();
      } else {
        console.log('Unable to prompt for provider. Please run the settings command.');
        rl.close();
      }
      return;
    }

    const ai = new AIManager(apiKey, provider);
    const changes = GitManager.getStagedChanges();

    if (changes === GitStatus.NO_STAGED_CHANGES) {
      console.log(chalk.yellow('\n📋 No changes staged for commit'));
      console.log('Please stage your changes before using git commitai:');
      console.log(`  ${chalk.cyan('git add <file>')}`);
      console.log(`  ${chalk.cyan('git add .')}`);
      rl.close();
      return;
    }

    const { prefix, args } = GitManager.processCommitArgs(gitArgs);

    const suggestedMsg = await ai.generateCommitMessage(changes, prefix, previousMessages);

    console.log(`\nCommit message: "${chalk.cyan(suggestedMsg)}"`);

    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: 'Use this message?',
        default: true,
      },
    ]);

    if (confirmed) {
      try {
        GitManager.commit(suggestedMsg, [...gitArgs, ...args]);
        console.log();
        rl.close();
      } catch (error: any) {
        // Print all available error output from execSync errors
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
        rl.close();
        process.exit(1);
      }
    } else {
      // Regenerate a new commit message, passing the last three messages
      console.log();
      const newPreviousMessages = [...previousMessages, suggestedMsg].slice(-3);
      await promptCommitMessage(rl, newPreviousMessages, gitArgs);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    rl.close();
    process.exit(1);
  }
}
