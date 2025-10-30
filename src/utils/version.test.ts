import fs from 'fs';
import path from 'path';
import { getCurrentVersion } from './version';

// Mock modules
jest.mock('fs');
jest.mock('path');

describe('getCurrentVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return version from package.json in first path (globally installed)', () => {
    const mockPackageJson = { version: '2.5.1', name: 'git-commitai-cli' };

    // Mock path.join to return predictable paths
    (path.join as jest.Mock).mockImplementation((...args) => {
      if (args[1] === '../package.json') {
        return '/global/package.json';
      }
      if (args[1] === '../../package.json') {
        return '/dev/package.json';
      }
      return args.join('/');
    });

    // Mock fs.existsSync to return true for first path
    (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
      return filePath === '/global/package.json';
    });

    // Mock fs.readFileSync
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));

    const version = getCurrentVersion();
    expect(version).toBe('2.5.1');
  });

  it('should return version from package.json in second path (development)', () => {
    const mockPackageJson = { version: '2.5.1', name: 'git-commitai-cli' };

    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => {
      if (args[1] === '../package.json') {
        return '/global/package.json';
      }
      if (args[1] === '../../package.json') {
        return '/dev/package.json';
      }
      return args.join('/');
    });

    // Mock fs.existsSync to return false for first path, true for second
    (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
      return filePath === '/dev/package.json';
    });

    // Mock fs.readFileSync
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockPackageJson));

    const version = getCurrentVersion();
    expect(version).toBe('2.5.1');
  });

  it('should throw error if package.json is not found', () => {
    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

    // Mock fs.existsSync to always return false
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    expect(() => getCurrentVersion()).toThrow('Could not find package.json');
  });

  it('should continue to next path if JSON parsing fails', () => {
    const mockPackageJson = { version: '2.5.1', name: 'git-commitai-cli' };

    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => {
      if (args[1] === '../package.json') {
        return '/global/package.json';
      }
      if (args[1] === '../../package.json') {
        return '/dev/package.json';
      }
      return args.join('/');
    });

    // Mock fs.existsSync to return true for both paths
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Mock fs.readFileSync to fail for first path, succeed for second
    (fs.readFileSync as jest.Mock).mockImplementation((filePath) => {
      if (filePath === '/global/package.json') {
        return 'invalid json{';
      }
      return JSON.stringify(mockPackageJson);
    });

    const version = getCurrentVersion();
    expect(version).toBe('2.5.1');
  });

  it('should throw error if all paths fail', () => {
    // Mock path.join
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));

    // Mock fs.existsSync to return true
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Mock fs.readFileSync to always throw
    (fs.readFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('Read error');
    });

    expect(() => getCurrentVersion()).toThrow('Could not find package.json');
  });
});
