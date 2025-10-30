import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager, getConfigFilePath } from './index';
import { ApiProvider } from '../types';

// Mock modules
jest.mock('fs');
jest.mock('path');
jest.mock('os');

describe('ConfigManager', () => {
  const mockHomedir = '/mock/home';
  const mockConfigDir = '/mock/home/.git-commitai';
  const mockConfigFile = '/mock/home/.git-commitai/config';
  const mockDevConfigFile = '/mock/home/.git-commitai/config.dev';
  const mockConfig = {
    apiKeys: {
      [ApiProvider.OPENAI]: 'test-key-123',
      [ApiProvider.GOOGLE]: 'gemini-key-456',
    },
    defaultProvider: ApiProvider.OPENAI,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => {
      if (args[0] === mockHomedir && args[1] === '.git-commitai' && !args[2]) {
        return mockConfigDir;
      }
      if (args[0] === mockConfigDir && args[1] === 'config') {
        return mockConfigFile;
      }
      if (args[0] === mockConfigDir && args[1] === 'config.dev') {
        return mockDevConfigFile;
      }
      return args.join('/');
    });

    // Mock os.homedir
    (os.homedir as jest.Mock).mockReturnValue(mockHomedir);

    // Default return values for fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.readFileSync as jest.Mock).mockReturnValue('{}');
    (fs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    (fs.mkdirSync as jest.Mock).mockReturnValue(undefined);
  });

  describe('constructor and loadConfig', () => {
    it('should load config from file if it exists', () => {
      // Setup mock for existing config file
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(configManager.getApiKey(ApiProvider.OPENAI)).toBe(
        mockConfig.apiKeys[ApiProvider.OPENAI]
      );
      expect(configManager.getApiKey(ApiProvider.GOOGLE)).toBe(
        mockConfig.apiKeys[ApiProvider.GOOGLE]
      );
      expect(configManager.getDefaultProvider()).toBe(ApiProvider.OPENAI);
    });

    it('should handle JSON parse errors', () => {
      // Setup mock for existing config with invalid JSON
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce('invalid json');

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const configManager = new ConfigManager();

      expect(consoleSpy).toHaveBeenCalled();
      expect(configManager.getApiKey()).toBe('');

      consoleSpy.mockRestore();
    });

    it('should initialize with empty config if file does not exist', () => {
      // Setup mock for non-existent config file (default is false)

      const configManager = new ConfigManager();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(configManager.getApiKey()).toBe('');
    });

    it('should handle non-Error exceptions when loading config', () => {
      // Setup mock for existing config file
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      // Mock readFileSync to throw a non-Error exception
      (fs.readFileSync as jest.Mock).mockImplementationOnce(() => {
        throw 'String error';
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const configManager = new ConfigManager();

      expect(consoleSpy).toHaveBeenCalled();
      expect(configManager.getApiKey()).toBe('');

      consoleSpy.mockRestore();
    });

    it('should initialize apiKeys if missing in the loaded config', () => {
      // Setup mock for config without apiKeys property
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({
          defaultProvider: ApiProvider.OPENAI,
        })
      );

      const configManager = new ConfigManager();

      // The apiKeys should be initialized as an empty object
      expect(configManager.getApiKeys()).toEqual({});
    });
  });

  describe('development mode', () => {
    let originalNodeEnv: string | undefined;
    const CONFIG_DIR = '/mock/config/dir';

    beforeEach(() => {
      originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock the needed functions
      (path.join as jest.Mock).mockImplementation((...args) => {
        if (args[1] === 'config.dev') {
          return CONFIG_DIR + '/config.dev';
        }
        if (args[1] === 'config') {
          return CONFIG_DIR + '/config';
        }
        return CONFIG_DIR;
      });
    });

    afterEach(() => {
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should use development config file when NODE_ENV=development', () => {
      const configPath = getConfigFilePath();
      expect(configPath).toContain('config.dev');

      // Change to production and verify it changes
      process.env.NODE_ENV = 'production';
      const prodConfigPath = getConfigFilePath();
      expect(prodConfigPath).toContain('config');
      expect(prodConfigPath).not.toContain('config.dev');
    });
  });

  describe('getApiKey', () => {
    it('should return the API key for the default provider', () => {
      // Setup mock
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();

      expect(configManager.getApiKey()).toBe(mockConfig.apiKeys[ApiProvider.OPENAI]);
    });

    it('should return the API key for a specific provider', () => {
      // Setup mock
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();

      expect(configManager.getApiKey(ApiProvider.GOOGLE)).toBe(
        mockConfig.apiKeys[ApiProvider.GOOGLE]
      );
    });

    it('should return empty string for non-existent provider', () => {
      // Setup mock
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();

      expect(configManager.getApiKey(ApiProvider.ANTHROPIC)).toBe('');
    });

    it('should use the explicit provider when default is unset', () => {
      // Setup mock for config without default provider
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({ apiKeys: { [ApiProvider.OPENAI]: 'test-key' } })
      );

      const configManager = new ConfigManager();

      // Explicitly provide a provider, even though the default is unset
      expect(configManager.getApiKey(ApiProvider.OPENAI)).toBe('test-key');
    });

    it('should handle undefined apiKeys[provider]', () => {
      // Setup mock for config without the provider we'll request
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify({ apiKeys: {} }));

      const configManager = new ConfigManager();

      // Using a provider that doesn't exist in the config
      expect(configManager.getApiKey(ApiProvider.ANTHROPIC)).toBe('');
    });

    it('should return the key when it exists', () => {
      // Setup mock for config with the provider we'll request
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({
          apiKeys: {
            [ApiProvider.ANTHROPIC]: 'anthropic-key',
          },
        })
      );

      const configManager = new ConfigManager();

      // Test non-empty key retrieval for this specific provider
      expect(configManager.getApiKey(ApiProvider.ANTHROPIC)).toBe('anthropic-key');
    });

    it('should handle explicit provider without using default provider', () => {
      // Setup mock for config with default provider set
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({
          apiKeys: {
            [ApiProvider.ANTHROPIC]: 'anthropic-key',
            [ApiProvider.OPENAI]: 'openai-key',
          },
          defaultProvider: ApiProvider.OPENAI,
        })
      );

      const configManager = new ConfigManager();

      // Test that it uses the explicit provider and not the default
      expect(configManager.getApiKey(ApiProvider.ANTHROPIC)).toBe('anthropic-key');
    });

    it('should use default provider when no explicit provider is given', () => {
      // Setup mock for config with default provider set
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({
          apiKeys: {
            [ApiProvider.ANTHROPIC]: 'anthropic-key',
            [ApiProvider.OPENAI]: 'openai-key',
          },
          defaultProvider: ApiProvider.OPENAI,
        })
      );

      const configManager = new ConfigManager();

      // Test that it uses the default provider when no explicit provider is given
      expect(configManager.getApiKey()).toBe('openai-key');
    });
  });

  describe('getApiKeys', () => {
    it('should return all API keys', () => {
      // Setup mock
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();
      const keys = configManager.getApiKeys();

      expect(keys[ApiProvider.OPENAI]).toBe(mockConfig.apiKeys[ApiProvider.OPENAI]);
      expect(keys[ApiProvider.GOOGLE]).toBe(mockConfig.apiKeys[ApiProvider.GOOGLE]);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of providers that have API keys', () => {
      // Setup mock with multiple providers
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();
      const providers = configManager.getAvailableProviders();

      expect(providers).toContain(ApiProvider.OPENAI);
      expect(providers).toContain(ApiProvider.GOOGLE);
      expect(providers).toHaveLength(2);
    });

    it('should not return providers without API keys', () => {
      // Setup mock with only one provider having a key
      const configWithOneKey = {
        apiKeys: {
          [ApiProvider.OPENAI]: 'test-key-123',
          [ApiProvider.GOOGLE]: '',
          [ApiProvider.ANTHROPIC]: undefined,
        },
        defaultProvider: ApiProvider.OPENAI,
      };
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(configWithOneKey));

      const configManager = new ConfigManager();
      const providers = configManager.getAvailableProviders();

      expect(providers).toContain(ApiProvider.OPENAI);
      expect(providers).not.toContain(ApiProvider.GOOGLE);
      expect(providers).not.toContain(ApiProvider.ANTHROPIC);
      expect(providers).toHaveLength(1);
    });
  });

  describe('hasApiKey', () => {
    it('should return true if key exists for provider', () => {
      // Setup mock
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();

      expect(configManager.hasApiKey(ApiProvider.OPENAI)).toBe(true);
      expect(configManager.hasApiKey(ApiProvider.GOOGLE)).toBe(true);
      expect(configManager.hasApiKey(ApiProvider.ANTHROPIC)).toBe(false);
    });
  });

  describe('hasAnyApiKey', () => {
    it('should return true if any API key exists', () => {
      // Setup mock
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();

      expect(configManager.hasAnyApiKey()).toBe(true);
    });

    it('should return false if no API keys exist', () => {
      // Setup mock for empty config
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify({ apiKeys: {} }));

      const configManager = new ConfigManager();

      expect(configManager.hasAnyApiKey()).toBe(false);
    });
  });

  describe('getDefaultProvider', () => {
    it('should return the default provider', () => {
      // Setup mock
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();

      expect(configManager.getDefaultProvider()).toBe(ApiProvider.OPENAI);
    });

    it('should return OPENAI if no default provider is set', () => {
      // Setup mock for config without default provider
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({ apiKeys: mockConfig.apiKeys })
      );

      const configManager = new ConfigManager();

      expect(configManager.getDefaultProvider()).toBe(ApiProvider.OPENAI);
    });

    it('should return OPENAI when config.defaultProvider is undefined', () => {
      // Setup mock for config without defaultProvider property at all
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify({ apiKeys: {} }));

      const configManager = new ConfigManager();

      // Force defaultProvider to be explicitly undefined
      Object.defineProperty(configManager, 'config', {
        value: { apiKeys: {}, defaultProvider: undefined },
        writable: true,
      });

      expect(configManager.getDefaultProvider()).toBe(ApiProvider.OPENAI);
    });
  });

  describe('saveApiKey', () => {
    it('should create the config directory if it does not exist', async () => {
      // Default for existsSync is false, so we don't need to set it again

      const configManager = new ConfigManager();
      await configManager.saveApiKey('new-key', ApiProvider.OPENAI);

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should not create the config directory if it already exists', async () => {
      // For the directory check in saveApiKey
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // For initial config check in constructor
        .mockReturnValueOnce(true); // For directory check in saveApiKey

      const configManager = new ConfigManager();
      await configManager.saveApiKey('new-key', ApiProvider.OPENAI);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should save the new API key to the config file', async () => {
      // Setup mock for constructor
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();
      const newKey = 'new-api-key';
      await configManager.saveApiKey(newKey, ApiProvider.GOOGLE);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(configManager.getApiKey(ApiProvider.GOOGLE)).toBe(newKey);
    });

    it('should set as default provider if no default exists', async () => {
      // Setup mock for config without default provider
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify({ apiKeys: {} }));

      const configManager = new ConfigManager();
      await configManager.saveApiKey('new-key', ApiProvider.ANTHROPIC);

      expect(configManager.getDefaultProvider()).toBe(ApiProvider.ANTHROPIC);
    });

    it('should initialize apiKeys if null during saveApiKey', async () => {
      // Setup mock for empty config
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      const configManager = new ConfigManager();

      // Force apiKeys to be null (simulating broken state)
      Object.defineProperty(configManager, 'config', {
        value: { apiKeys: null },
        writable: true,
      });

      await configManager.saveApiKey('new-key', ApiProvider.OPENAI);

      expect(configManager.getApiKey(ApiProvider.OPENAI)).toBe('new-key');
    });

    it('should set default provider when defaultProvider is null', async () => {
      // Setup mock for empty config
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      const configManager = new ConfigManager();

      // Force config with null defaultProvider
      Object.defineProperty(configManager, 'config', {
        value: { apiKeys: {}, defaultProvider: null },
        writable: true,
      });

      await configManager.saveApiKey('new-key', ApiProvider.ANTHROPIC);

      // Should set ANTHROPIC as the default provider
      expect(configManager.getDefaultProvider()).toBe(ApiProvider.ANTHROPIC);
    });

    it('should not override existing default provider', async () => {
      // Setup mock with existing default provider
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({
          apiKeys: {},
          defaultProvider: ApiProvider.ANTHROPIC,
        })
      );

      const configManager = new ConfigManager();
      await configManager.saveApiKey('new-key', ApiProvider.OPENAI);

      // Default provider should still be ANTHROPIC
      expect(configManager.getDefaultProvider()).toBe(ApiProvider.ANTHROPIC);
    });

    it('should preserve existing apiKeys when adding a new key', async () => {
      // Setup mock with existing keys
      const initialConfig = {
        apiKeys: {
          [ApiProvider.OPENAI]: 'existing-key',
        },
      };
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(initialConfig));

      const configManager = new ConfigManager();
      await configManager.saveApiKey('new-key', ApiProvider.ANTHROPIC);

      // Should preserve the existing key
      expect(configManager.getApiKey(ApiProvider.OPENAI)).toBe('existing-key');
      // And add the new key
      expect(configManager.getApiKey(ApiProvider.ANTHROPIC)).toBe('new-key');
    });

    it('should use OPENAI as the default provider when provider parameter is not specified', async () => {
      // Setup mock for empty config
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

      const configManager = new ConfigManager();

      // Call saveApiKey without specifying a provider
      await configManager.saveApiKey('new-key');

      // Should use OPENAI as the default provider
      expect(configManager.getApiKey(ApiProvider.OPENAI)).toBe('new-key');
      expect(configManager.getDefaultProvider()).toBe(ApiProvider.OPENAI);
    });

    it('should set the API key as the default provider when no default exists', async () => {
      // Setup mock for config without default provider
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify({ apiKeys: {} }));

      const configManager = new ConfigManager();
      await configManager.saveApiKey('new-key', ApiProvider.ANTHROPIC);

      // Should set ANTHROPIC as the default provider
      expect(configManager.getDefaultProvider()).toBe(ApiProvider.ANTHROPIC);
    });
  });

  describe('setDefaultProvider', () => {
    it('should set the default provider', async () => {
      // Setup mock
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();
      await configManager.setDefaultProvider(ApiProvider.GOOGLE);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(configManager.getDefaultProvider()).toBe(ApiProvider.GOOGLE);
    });
  });

  describe('getLastDeclinedUpdateVersion', () => {
    it('should return undefined if no version is set', () => {
      // Setup mock with no lastDeclinedUpdateVersion
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();
      expect(configManager.getLastDeclinedUpdateVersion()).toBeUndefined();
    });

    it('should return the last declined update version if set', () => {
      // Setup mock with lastDeclinedUpdateVersion
      const configWithVersion = {
        ...mockConfig,
        lastDeclinedUpdateVersion: '2.4.0',
      };
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(configWithVersion));

      const configManager = new ConfigManager();
      expect(configManager.getLastDeclinedUpdateVersion()).toBe('2.4.0');
    });
  });

  describe('setLastDeclinedUpdateVersion', () => {
    it('should set the last declined update version', async () => {
      // Setup mock
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();
      await configManager.setLastDeclinedUpdateVersion('2.4.0');

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(configManager.getLastDeclinedUpdateVersion()).toBe('2.4.0');
    });
  });
});
