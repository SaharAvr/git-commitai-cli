import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigManager } from './index';

// Mock modules
jest.mock('fs');
jest.mock('path');
jest.mock('os');

describe('ConfigManager', () => {
  const mockHomedir = '/mock/home';
  const mockConfigDir = '/mock/home/.git-commitai';
  const mockConfigFile = '/mock/home/.git-commitai/config';
  const mockConfig = { OPENAI_API_KEY: 'test-key-123' };

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
      expect(configManager.getApiKey()).toBe(mockConfig.OPENAI_API_KEY);
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
  });

  describe('getApiKey', () => {
    it('should return the API key from config', () => {
      // Setup mock
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();

      expect(configManager.getApiKey()).toBe(mockConfig.OPENAI_API_KEY);
    });
  });

  describe('saveApiKey', () => {
    it('should create the config directory if it does not exist', async () => {
      // Default for existsSync is false, so we don't need to set it again

      const configManager = new ConfigManager();
      await configManager.saveApiKey('new-key');

      expect(fs.mkdirSync).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should not create the config directory if it already exists', async () => {
      // For the directory check in saveApiKey
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(false) // For initial config check in constructor
        .mockReturnValueOnce(true); // For directory check in saveApiKey

      const configManager = new ConfigManager();
      await configManager.saveApiKey('new-key');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should save the new API key to the config file', async () => {
      // Setup mock for constructor
      (fs.existsSync as jest.Mock).mockReturnValueOnce(true);
      (fs.readFileSync as jest.Mock).mockReturnValueOnce(JSON.stringify(mockConfig));

      const configManager = new ConfigManager();
      const newKey = 'new-api-key';
      await configManager.saveApiKey(newKey);

      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(configManager.getApiKey()).toBe(newKey);
    });
  });
});
