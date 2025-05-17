import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../config';
import { ApiProvider } from '../types';
import { GitManager, GitStatus } from '../git';
import { validateApiKey } from './validation';
import { displayApiKeyRequiredMessage, displayWelcomeMessage, getProviderInfo } from './messages';

// Type definition for the promptCommitMessage function
type PromptCommitMessageFn = () => Promise<void>;

// Forward declaration to avoid circular dependency
let commandPromptCommitMessage: PromptCommitMessageFn | null = null;

/**
 * Sets the prompt commit message function to avoid circular dependencies
 */
export function setPromptCommitMessage(fn: PromptCommitMessageFn): void {
  commandPromptCommitMessage = fn;
}

/**
 * Prompts the user for an API key
 */
export async function promptForApiKey(
  rl: any,
  provider: ApiProvider = ApiProvider.OPENAI
): Promise<void> {
  const configManager = new ConfigManager();
  const existingKey = configManager.getApiKey(provider);

  displayWelcomeMessage();

  if (!provider) {
    await promptForProvider();
    return;
  }

  // Provider specific instructions
  const providerInfo = getProviderInfo(provider);
  displayApiKeyRequiredMessage(provider);

  if (existingKey) {
    const maskedKey = `${existingKey.substring(0, 4)}...${existingKey.substring(existingKey.length - 4)}`;
    console.log(
      chalk.yellow(`\nNote: You already have a key set for ${providerInfo.name}: ${maskedKey}`)
    );

    console.log();
    const { confirmReplace } = await inquirer.prompt([
      {
        type: 'list',
        name: 'confirmReplace',
        message: 'Do you want to replace your existing API key?',
        choices: [
          { name: 'No, keep existing key', value: false },
          { name: 'Yes, enter new key', value: true },
        ],
      },
    ]);

    if (!confirmReplace) {
      console.log(chalk.green('\n✓ Operation cancelled. Your existing API key has been kept.'));
      rl.close();
      return;
    }

    console.log('\nPlease enter your new API key:');
  }

  // Show the prompt without repeating the message in the input line
  console.log(`Enter your ${providerInfo.name} API key:`);
  const { apiKey } = await inquirer.prompt([
    {
      type: 'password',
      name: 'apiKey',
      message: '',
      mask: '*',
      validate: (input) => {
        if (!input.trim()) {
          return 'API key cannot be empty';
        }
        return true;
      },
    },
  ]);

  console.log('\n🔍 Validating API key...');
  try {
    const validationResult = await validateApiKey(apiKey, provider);

    if (!validationResult.isValid) {
      console.error(`\n❌ Error: ${validationResult.errorMessage}`);
      process.exit(1);
    }

    await configManager.saveApiKey(apiKey, provider);
    if (existingKey) {
      console.log(chalk.green('✅ API key updated successfully.'));
    } else {
      console.log(chalk.green('✅ API key validated and saved successfully.'));
    }

    try {
      const changes = GitManager.getStagedChanges();
      if (changes === GitStatus.NO_STAGED_CHANGES) {
        console.log('\nTo create your first AI-generated commit:');
        console.log(`1. ${chalk.cyan('git add')} your modified files`);
        console.log(`2. Run ${chalk.cyan('git commitai')} to generate a commit message`);
        console.log();
        rl.close();
        return;
      }

      GitManager.processCommitArgs([]);
      if (commandPromptCommitMessage) {
        await commandPromptCommitMessage();
      } else {
        console.log('Ready to generate commit messages');
        rl.close();
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
      rl.close();
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : 'Unknown error');
    rl.close();
    process.exit(1);
  }
}

/**
 * Prompts the user to select an AI provider
 */
export async function promptForProvider(): Promise<void> {
  console.log(chalk.yellow('Select AI Provider'));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const configManager = new ConfigManager();
  const apiKeys = configManager.getApiKeys();

  const providerChoices = [
    {
      name: `${chalk.cyan('OpenAI')} (GPT-4)${apiKeys[ApiProvider.OPENAI] ? chalk.green(' [Key set]') : ''}`,
      value: ApiProvider.OPENAI,
    },
    {
      name: `${chalk.cyan('Google')} (Gemini Pro)${apiKeys[ApiProvider.GOOGLE] ? chalk.green(' [Key set]') : ''}`,
      value: ApiProvider.GOOGLE,
    },
    {
      name: `${chalk.cyan('Anthropic')} (Claude 3)${apiKeys[ApiProvider.ANTHROPIC] ? chalk.green(' [Key set]') : ''}`,
      value: ApiProvider.ANTHROPIC,
    },
  ];

  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select your AI provider:',
      choices: providerChoices,
    },
  ]);

  const rl = {
    close: () => {}, // Dummy rl object
  };
  await promptForApiKey(rl, provider);
}

/**
 * Prompts the user to select the default provider
 */
export async function promptForDefaultProvider(): Promise<void> {
  const configManager = new ConfigManager();
  const apiKeys = configManager.getApiKeys();
  const providers = Object.keys(apiKeys).filter((key) => apiKeys[key as ApiProvider]);

  if (providers.length === 0) {
    console.log('\n❌ No API keys set. Please add at least one API key first.');
    await promptForProvider();
    return;
  }

  console.log('\n' + chalk.yellow('Available Providers:'));

  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Select default provider:',
      choices: providers.map((provider) => ({
        name: chalk.cyan(provider),
        value: provider,
      })),
    },
  ]);

  await configManager.setDefaultProvider(provider as ApiProvider);
  console.log(`\n✅ Default provider set to ${chalk.cyan(provider)}.`);
}
