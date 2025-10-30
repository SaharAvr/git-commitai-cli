import chalk from 'chalk';
import inquirer from 'inquirer';
import { GitManager, GitStatus } from '../git';
import { ConfigManager } from '../config';
import { AIManager } from '../ai';
import { displayHelpMessage, displaySettingsHeader } from './messages';
import { promptForProvider, promptForDefaultProvider } from './prompt';

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
          await promptForProvider();
          break;
        case '2':
          console.log();
          await promptForDefaultProvider();
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
  prefix?: string,
  commandArgs: string[] = [],
  skipConfirmation: boolean = false
): Promise<void> {
  try {
    const configManager = new ConfigManager();
    const provider = configManager.getDefaultProvider();
    const apiKey = configManager.getApiKey(provider);

    if (!apiKey) {
      console.log(chalk.yellow(`\nNo API key found for ${provider}. Please set up your API key.`));
      await promptForProvider();
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

    const suggestedMsg = await ai.generateCommitMessage(changes, prefix, previousMessages);

    console.log(`\nCommit message: "${chalk.cyan(suggestedMsg)}"`);

    let confirmed = skipConfirmation;

    if (!skipConfirmation) {
      const result = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: 'Use this message?',
          default: true,
        },
      ]);
      confirmed = result.confirmed;
    }

    if (confirmed) {
      try {
        GitManager.commit(suggestedMsg, commandArgs);
        console.log();
        rl.close();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to commit changes';
        console.error(chalk.red(`\ngit-commitai: ${errorMsg}`));
        rl.close();
        process.exit(1);
      }
    } else {
      // Regenerate a new commit message, passing the last three messages
      console.log();
      const newPreviousMessages = [...previousMessages, suggestedMsg].slice(-3);
      await promptCommitMessage(rl, newPreviousMessages, prefix, commandArgs, skipConfirmation);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to generate commit message';
    console.error(chalk.red(`\ngit-commitai: ${errorMsg}`));
    rl.close();
    process.exit(1);
  }
}
