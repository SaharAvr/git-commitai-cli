import chalk from 'chalk';
import { ApiProvider } from '../types';

/**
 * Returns provider-specific information for display in the CLI
 */
export function getProviderInfo(provider: ApiProvider): { name: string; url: string } {
  let providerInfo: { name: string; url: string } = {
    name: 'OpenAI',
    url: 'https://platform.openai.com/api-keys',
  };

  switch (provider) {
    case ApiProvider.GOOGLE:
      providerInfo = { name: 'Google Gemini', url: 'https://aistudio.google.com/app/apikey' };
      break;
    case ApiProvider.ANTHROPIC:
      providerInfo = {
        name: 'Anthropic Claude',
        url: 'https://console.anthropic.com/account/keys',
      };
      break;
  }

  return providerInfo;
}

/**
 * Displays the welcome message for git-commitai
 */
export function displayWelcomeMessage(): void {
  console.log('\n' + chalk.green('✨ Welcome to git commitai! ✨'));
  console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.green('Your AI-powered git commit message assistant'));
  console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') + '\n');
}

/**
 * Displays the help information
 */
export function displayHelpMessage(): void {
  console.log('\n' + chalk.green('📚 git commitai - Help'));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Generate AI-powered commit messages for your git repository');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(chalk.yellow('Commands:'));
  console.log(
    `  ${chalk.cyan('git commitai')}                   Generate a commit message for staged changes`
  );
  console.log(`  ${chalk.cyan('git commitai help')}              Show this help information`);
  console.log(`  ${chalk.cyan('git commitai settings')}          Manage API keys and settings`);
  console.log(
    `  ${chalk.cyan('git commitai <type>')}            Specify commit type (e.g., feat, fix, docs)\n`
  );

  console.log(chalk.yellow('Options:'));
  console.log(
    `  ${chalk.cyan('-y, --yes')}                      Auto-accept the generated commit message\n`
  );

  console.log(chalk.yellow('Examples:'));
  console.log(`  ${chalk.cyan('git commitai')}                   Generate a commit message`);
  console.log(
    `  ${chalk.cyan('git commitai -y')}                Generate and auto-accept commit message`
  );
  console.log(
    `  ${chalk.cyan('git commitai feat')}              Generate a feature commit message`
  );
  console.log(
    `  ${chalk.cyan('git commitai fix --yes')}         Generate and auto-accept a bug fix commit`
  );
  console.log(
    `  ${chalk.cyan('git commitai --amend')}           Generate a message and amend the last commit\n`
  );
}

/**
 * Displays the settings header
 */
export function displaySettingsHeader(): void {
  console.log('\n' + chalk.green('⚙️ git commitai - Settings'));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Manage your API keys and settings');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Displays API key required message
 */
export function displayApiKeyRequiredMessage(provider: ApiProvider): void {
  const providerInfo = getProviderInfo(provider);

  console.log(chalk.yellow(`🔑 ${providerInfo.name} API Key Required`));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`To use git commitai with ${providerInfo.name}, you need an API key.`);
  console.log(`You can get one at: ${providerInfo.url}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
