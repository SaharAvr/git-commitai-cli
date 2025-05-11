import fs from 'fs';
import path from 'path';
import os from 'os';
import { Config } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.git-commitai');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config');

export class ConfigManager {
  private config: Config = { OPENAI_API_KEY: '' };

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    if (fs.existsSync(CONFIG_FILE)) {
      try {
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } catch (error) {
        console.error(
          'Error reading config file:',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }

  public getApiKey(): string {
    return this.config.OPENAI_API_KEY;
  }

  public async saveApiKey(key: string): Promise<void> {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    this.config.OPENAI_API_KEY = key;
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
  }
}
