#!/usr/bin/env node

import readline from 'readline';
import chalk from 'chalk';
import { ConfigManager } from './config';
import { GitManager, GitStatus } from './git';
import { OpenAIManager } from './openai';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const openai = new OpenAIManager(apiKey);
    await openai.generateCommitMessage('test', '', []);
    return true;
  } catch {
    return false;
  }
}

async function promptCommitMessage(
  previousMessages: string[] = [],
  gitArgs: string[] = []
): Promise<void> {
  try {
    const configManager = new ConfigManager();
    const apiKey = configManager.getApiKey();
    const openai = new OpenAIManager(apiKey);
    const changes = GitManager.getStagedChanges();

    if (changes === GitStatus.NO_STAGED_CHANGES) {
      console.log(chalk.yellow('\n📋 No changes staged for commit'));
      console.log('Please stage your changes before using git commitai:');
      console.log(`  ${chalk.cyan('git add <file>')}`);
      console.log(`  ${chalk.cyan('git add .')}`);
      rl.close();
      return;
    }

    const { prefix, args } = GitManager.processCommitArgs(process.argv.slice(2));

    const suggestedMsg = await openai.generateCommitMessage(changes, prefix, previousMessages);

    rl.question(`Commit message "${suggestedMsg}" [Y/n] `, async (answer) => {
      const response = (answer || 'y').toLowerCase();

      if (response === 'y') {
        try {
          GitManager.commit(suggestedMsg, [...gitArgs, ...args]);
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
      } else if (response === 'n') {
        // Regenerate a new commit message, passing the last three messages
        const newPreviousMessages = [...previousMessages, suggestedMsg].slice(-3);
        await promptCommitMessage(newPreviousMessages, gitArgs);
      } else {
        console.log('Invalid response. Please enter "y" or "n"');
        await promptCommitMessage(previousMessages, gitArgs);
      }
    });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    rl.close();
    process.exit(1);
  }
}

async function checkAndPromptOpenAIKey(): Promise<void> {
  const configManager = new ConfigManager();
  const apiKey = configManager.getApiKey();

  if (!apiKey) {
    console.log('\n' + chalk.green('✨ Welcome to git-commitai! ✨'));
    console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.green('Your AI-powered git commit message assistant'));
    console.log(chalk.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') + '\n');

    console.log(chalk.yellow('🔑 OpenAI API Key Required'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('To use git-commitai, you need an OpenAI API key.');
    console.log('You can get one at: https://platform.openai.com/api-keys');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    rl.question('Enter your OpenAI API key: ', async (key) => {
      if (!key.trim()) {
        console.error('\n❌ Error: API key cannot be empty.');
        process.exit(1);
      }

      console.log('\n🔍 Validating API key...');
      const isValid = await validateApiKey(key);

      if (!isValid) {
        console.error('\n❌ Error: Invalid API key. Please check your key and try again.');
        process.exit(1);
      }

      await configManager.saveApiKey(key);
      console.log('\n✅ API key validated and saved successfully.');

      try {
        const changes = GitManager.getStagedChanges();
        if (changes === GitStatus.NO_STAGED_CHANGES) {
          console.log(chalk.green('\n✓ git commitai is configured successfully'));
          console.log('To create your first AI-generated commit:');
          console.log(`1. ${chalk.cyan('git add')} your modified files`);
          console.log(`2. Run ${chalk.cyan('git commitai')} to generate a commit message`);
          rl.close();
          return;
        }

        const { args } = GitManager.processCommitArgs(process.argv.slice(2));
        await promptCommitMessage([], args);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
        rl.close();
        process.exit(1);
      }
    });
  } else {
    const { args } = GitManager.processCommitArgs(process.argv.slice(2));
    await promptCommitMessage([], args);
  }
}

checkAndPromptOpenAIKey();
