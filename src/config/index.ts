import fs from 'fs';
import path from 'path';
import os from 'os';
import { Config, ApiProvider, ApiKeys } from '../types';

const CONFIG_DIR = path.join(os.homedir(), '.git-commitai');

/**
 * Returns the path to the config file
 */
export function getConfigFilePath(): string {
  return path.join(CONFIG_DIR, process.env.NODE_ENV === 'development' ? 'config.dev' : 'config');
}

/**
 * Manages configuration for the application
 */
export class ConfigManager {
  private config: Config = { apiKeys: {} };

  constructor() {
    this.loadConfig();
  }

  /**
   * Loads configuration from file
   */
  private loadConfig(): void {
    const configFile = getConfigFilePath();
    if (fs.existsSync(configFile)) {
      try {
        this.config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

        // Initialize apiKeys property if it doesn't exist
        if (!this.config.apiKeys) {
          this.config.apiKeys = {};
        }
      } catch (error) {
        console.error(
          'Error reading config file:',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }

  /**
   * Saves configuration to file
   */
  private saveConfig(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(getConfigFilePath(), JSON.stringify(this.config, null, 2));
  }

  /**
   * Gets provider with fallback to default
   */
  private getProviderWithFallback(explicitProvider?: ApiProvider): ApiProvider {
    if (explicitProvider !== undefined) {
      return explicitProvider;
    }
    if (this.config.defaultProvider === undefined) {
      return ApiProvider.OPENAI;
    }
    return this.config.defaultProvider;
  }

  /**
   * Gets API key for specified provider
   */
  public getApiKey(explicitProvider?: ApiProvider): string {
    const provider = this.getProviderWithFallback(explicitProvider);
    const key = this.config.apiKeys[provider];
    return key || '';
  }

  /**
   * Gets all API keys
   */
  public getApiKeys(): ApiKeys {
    return { ...this.config.apiKeys };
  }

  /**
   * Checks if an API key exists for specified provider
   */
  public hasApiKey(explicitProvider?: ApiProvider): boolean {
    const provider = this.getProviderWithFallback(explicitProvider);
    return !!this.getApiKey(provider);
  }

  /**
   * Checks if any API key exists
   */
  public hasAnyApiKey(): boolean {
    return Object.values(this.config.apiKeys).some((key) => !!key);
  }

  /**
   * Gets the default provider
   */
  public getDefaultProvider(): ApiProvider {
    if (this.config.defaultProvider === undefined) {
      return ApiProvider.OPENAI;
    }
    return this.config.defaultProvider;
  }

  /**
   * Saves an API key for the specified provider
   */
  public async saveApiKey(key: string, provider = ApiProvider.OPENAI): Promise<void> {
    this.config.apiKeys = this.config.apiKeys || {};
    this.config.apiKeys[provider] = key;

    this.setDefaultProviderIfNeeded(provider);
    this.saveConfig();
  }

  /**
   * Sets default provider if not already set
   */
  private setDefaultProviderIfNeeded(provider: ApiProvider): void {
    const hasDefaultProvider = !!this.config.defaultProvider;
    if (!hasDefaultProvider) {
      this.config.defaultProvider = provider;
    }
  }

  /**
   * Sets the default provider
   */
  public async setDefaultProvider(provider: ApiProvider): Promise<void> {
    this.config.defaultProvider = provider;
    this.saveConfig();
  }

  /**
   * Gets all providers that have API keys configured
   */
  public getAvailableProviders(): ApiProvider[] {
    return Object.entries(this.config.apiKeys)
      .filter(([, key]) => !!key)
      .map(([provider]) => provider as ApiProvider);
  }

  /**
   * Gets the last declined update version
   */
  public getLastDeclinedUpdateVersion(): string | undefined {
    return this.config.lastDeclinedUpdateVersion;
  }

  /**
   * Sets the last declined update version
   */
  public async setLastDeclinedUpdateVersion(version: string): Promise<void> {
    this.config.lastDeclinedUpdateVersion = version;
    this.saveConfig();
  }
}
