import chalk from 'chalk';
import inquirer from 'inquirer';
import { GitManager, GitStatus } from '../git';
import { ConfigManager } from '../config';
import { AIManager } from '../ai';
import { ApiProvider } from '../types';
import { displayHelpMessage, displaySettingsHeader } from './messages';
import { promptForProvider, promptForDefaultProvider } from './prompt';
import { getCurrentVersion } from '../utils/version';

/**
 * Checks if an error is related to rate limiting
 */
function isRateLimitError(error: any): boolean {
  if (!error) return false;

  const errorStr = error.toString().toLowerCase();
  const errorMsg = error.message ? error.message.toLowerCase() : '';

  return (
    errorStr.includes('rate limit') ||
    errorStr.includes('too many requests') ||
    errorStr.includes('429') ||
    errorMsg.includes('rate limit') ||
    errorMsg.includes('too many requests') ||
    errorMsg.includes('429') ||
    errorMsg.includes('quota')
  );
}

/**
 * Handles the help command
 */
export function showHelp(rl: any): void {
  displayHelpMessage();
  rl.close();
}

/**
 * Handles the version command
 */
export function showVersion(rl: any): void {
  try {
    const version = getCurrentVersion();
    console.log(`git-commitai-cli v${version}`);
  } catch {
    console.log('git-commitai-cli (version unknown)');
  }
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
          { name: 'View API keys', value: '2' },
          { name: 'Change default provider', value: '3' },
          { name: 'Exit', value: '4' },
        ],
      },
    ])
    .then(async ({ option }) => {
      switch (option) {
        case '1':
          console.log();
          await promptForProvider();
          break;
        case '2': {
          console.log();

          const apiKeysFull = configManager.getApiKeys();
          const providers = [ApiProvider.OPENAI, ApiProvider.GOOGLE, ApiProvider.ANTHROPIC];

          const { confirmView } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirmView',
              message:
                'This will display your full API keys in the terminal. Do you want to continue?',
              default: false,
            },
          ]);

          if (confirmView) {
            console.log(chalk.yellow('API Keys (full values):'));
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            providers.forEach((provider) => {
              const key = apiKeysFull[provider];
              const label = chalk.cyan(provider);
              if (key) {
                console.log(`  - ${label}: ${key}`);
              } else {
                console.log(`  - ${label}: Not set`);
              }
            });
            console.log();

            const { edit } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'edit',
                message: 'Would you like to add or update an API key now?',
                default: false,
              },
            ]);

            if (edit) {
              console.log();
              await promptForProvider();
            }
          }

          rl.close();
          break;
        }
        case '3':
          console.log();
          await promptForDefaultProvider();
          break;
        case '4':
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
  skipConfirmation: boolean = false,
  triedProviders: ApiProvider[] = []
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
        // Handle user cancellation (Ctrl+C) gracefully
        if (
          error instanceof Error &&
          (error.name === 'ExitPromptError' ||
            error.message.includes('SIGINT') ||
            error.message.includes('force_closed'))
        ) {
          rl.close();
          process.exit(0);
        }

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
    // Handle user cancellation (Ctrl+C) gracefully
    if (
      error instanceof Error &&
      (error.name === 'ExitPromptError' ||
        error.message.includes('SIGINT') ||
        error.message.includes('force_closed'))
    ) {
      rl.close();
      process.exit(0);
    }

    // Check if it's a rate limit error
    if (isRateLimitError(error)) {
      const configManager = new ConfigManager();
      const currentProvider = configManager.getDefaultProvider();
      const availableProviders = configManager.getAvailableProviders();

      // Mark current provider as tried
      const newTriedProviders = [...triedProviders, currentProvider];

      // Find next available provider that hasn't been tried
      const nextProvider = availableProviders.find((p) => !newTriedProviders.includes(p));

      if (nextProvider) {
        console.log(
          chalk.yellow(`\n⚠️  Rate limit reached for ${currentProvider}. Trying ${nextProvider}...`)
        );

        // Temporarily switch to next provider
        const originalProvider = currentProvider;
        await configManager.setDefaultProvider(nextProvider);

        try {
          // Retry with the next provider
          await promptCommitMessage(
            rl,
            previousMessages,
            prefix,
            commandArgs,
            skipConfirmation,
            newTriedProviders
          );

          // If successful, restore original provider
          await configManager.setDefaultProvider(originalProvider);
          return;
        } catch (retryError) {
          // Restore original provider before handling retry error
          await configManager.setDefaultProvider(originalProvider);
          throw retryError;
        }
      } else {
        // All providers have been tried
        const errorMsg = `Rate limit reached for all available providers. Please try again later.`;
        console.error(chalk.red(`\ngit-commitai: ${errorMsg}`));
        rl.close();
        process.exit(1);
      }
    }

    const errorMsg = error instanceof Error ? error.message : 'Failed to generate commit message';
    console.error(chalk.red(`\ngit-commitai: ${errorMsg}`));
    rl.close();
    process.exit(1);
  }
}
