import fs from 'fs';
import path from 'path';

/**
 * Gets the current package version
 * Works in both development and production (globally installed) environments
 */
export function getCurrentVersion(): string {
  // Try multiple paths to find package.json
  const paths = [
    // When globally installed: dist/cli.cjs -> ../package.json
    path.join(__dirname, '../package.json'),
    // When in development: src/*/file.ts -> ../../package.json
    path.join(__dirname, '../../package.json'),
  ];

  for (const packageJsonPath of paths) {
    try {
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version;
      }
    } catch {
      continue;
    }
  }

  throw new Error('Could not find package.json');
}
