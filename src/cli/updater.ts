import https from 'https';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../config';

const execAsync = promisify(exec);

/**
 * Gets the current package version
 */
function getCurrentVersion(): string {
  // Read version from package.json - let it throw if it fails
  const packageJsonPath = path.join(__dirname, '../../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

/**
 * Fetches the latest version from npm registry
 */
async function getLatestVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    const options = {
      hostname: 'registry.npmjs.org',
      path: '/git-commitai-cli/latest',
      method: 'GET',
      headers: {
        'User-Agent': 'git-commitai-cli',
      },
      timeout: 5000,
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.version || null);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => {
      resolve(null);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

/**
 * Compares two semantic versions
 * Returns true if newVersion > currentVersion
 */
function isNewerVersion(currentVersion: string, newVersion: string): boolean {
  const current = currentVersion.split('.').map(Number);
  const latest = newVersion.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (latest[i] > current[i]) return true;
    if (latest[i] < current[i]) return false;
  }

  return false;
}

/**
 * Performs the update by running npm install -g
 */
async function performUpdate(): Promise<boolean> {
  try {
    console.log(chalk.cyan('\n📦 Updating git-commitai-cli...'));
    await execAsync('npm install -g git-commitai-cli');
    console.log(chalk.green('✅ Update completed successfully!\n'));
    return true;
  } catch {
    console.error(
      chalk.red('❌ Failed to update. Please try manually: npm install -g git-commitai-cli\n')
    );
    return false;
  }
}

/**
 * Checks for updates and prompts user if update is available
 */
export async function checkForUpdates(): Promise<void> {
  try {
    const currentVersion = getCurrentVersion();
    const latestVersion = await getLatestVersion();

    // Skip if we couldn't fetch latest version
    if (!latestVersion) {
      return;
    }

    // Skip if already up to date
    if (!isNewerVersion(currentVersion, latestVersion)) {
      return;
    }

    // Check if user already declined this version
    const configManager = new ConfigManager();
    const declinedVersion = configManager.getLastDeclinedUpdateVersion();

    if (declinedVersion === latestVersion) {
      return;
    }

    // Show update notification
    console.log();
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.yellow(`  🎉 A new version of git-commitai-cli is available!`));
    console.log(
      chalk.gray(`     Current: ${currentVersion} → Latest: ${chalk.green(latestVersion)}`)
    );
    console.log(chalk.yellow('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log();

    const { shouldUpdate } = await inquirer.prompt([
      {
        type: 'list',
        name: 'shouldUpdate',
        message: 'Would you like to update now?',
        choices: [
          { name: 'Yes, update now', value: true },
          { name: 'No, remind me later', value: false },
        ],
      },
    ]);

    if (shouldUpdate) {
      const updateSuccess = await performUpdate();
      // Continue with the operation regardless of update success/failure
      if (updateSuccess) {
        console.log(chalk.gray('Continuing with your operation...\n'));
      } else {
        console.log(chalk.gray('Continuing with your operation anyway...\n'));
      }
    } else {
      await configManager.setLastDeclinedUpdateVersion(latestVersion);
      console.log(chalk.gray('  You can update later with: npm install -g git-commitai-cli'));
      console.log(chalk.gray('  Continuing with your operation...\n'));
    }

    // Always return to continue with the main operation
    return;
  } catch {
    // Silently fail - don't interrupt the user's workflow
    return;
  }
}
