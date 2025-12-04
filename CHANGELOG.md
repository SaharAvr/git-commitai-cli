# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.7.1] - 2025-12-04

### Security
- Migrated npm publishing to use OIDC trusted publishing instead of long-lived access tokens
- Packages now include automatic provenance attestation for supply chain security
- Aligned with npm's new security requirements (classic tokens sunset, 90-day max token expiration)

## [2.7.0] - 2025-11-16

### Added
- Settings menu option to view full API keys for each configured provider, with a guided flow to add or update keys.

### Fixed
- `--settings` and `--config` flags are now handled consistently as settings commands and work even when no changes are staged.

## [2.6.0] - 2025-10-30

### Added
- Support for `-v` and `--version` flags to display current version
- Version command that works in both development and production environments
- Shared version utility to eliminate code duplication
- Comprehensive test suite for version utility (5 new tests)

### Changed
- Version and help flags are now handled before git operations to prevent conflicts
- Updated help message to include `-v, --version` and `-h, --help` options
- Upgraded `@google/genai` from 0.13.0 to 1.28.0 (fixes punycode deprecation warning)
- Upgraded `@anthropic-ai/sdk` from 0.50.4 to 0.68.0
- Upgraded `openai` from 6.5.0 to 6.7.0

### Fixed
- Fixed `-v` flag being incorrectly interpreted as git diff option
- Eliminated punycode deprecation warning by updating dependencies

## [2.5.1] - 2025-10-30

### Fixed
- Update checker not working when package is installed globally - now correctly finds package.json in both development and production environments
- Added package.json to published files to ensure version information is available

## [2.5.0] - 2025-10-30

### Added
- Binary and asset file detection - automatically skips diffing for images, videos, audio, archives, executables, documents, fonts, and other binary formats
- Files without extensions are now treated as binary/asset files
- Comprehensive binary extension list covering 40+ common binary file types
- Smart file handling that shows `[File: filename - Binary/Asset file]` instead of attempting to diff binary content

### Changed
- Improved git diff handling to prevent sending binary file content to AI models
- Files like Makefile, Dockerfile, LICENSE (without extensions) are now treated as binary

## [2.4.0] - 2025-10-30

### Added
- Automatic update checker that notifies users when a new version is available
- Interactive prompt allowing users to update immediately or decline (similar to oh-my-zsh)
- Remembers declined versions to avoid repeated prompts for the same version
- Automatic provider fallback on rate limit errors - tries other configured providers automatically
- Clear error messages that show actual git/AI errors instead of generic messages

### Fixed
- Improved error handling in git commit command to preserve and display actual error messages
- SIGINT handling when user cancels with Ctrl+C - now exits gracefully without error message
- Quote escaping in commit messages containing double quotes

## [2.3.2] - 2025-10-30

### Fixed
- Git commit failing when commit messages contain double quotes - now properly escapes quotes in commit messages
- SIGINT error message displaying when user cancels with Ctrl+C - now exits gracefully without showing error message

## [2.3.1] - 2025-10-30

### Fixed
- Critical error handling issue where AI call or git commit failures would exit with code 0 instead of code 1
- This caused subsequent commands in chains (e.g., `git add . && git commitai -y && git push`) to execute even when git-commitai failed
- Now properly exits with error code 1 and displays clear error messages prefixed with "git-commitai:" when failures occur

## [2.3.0] - 2025-10-18

### Added
- Auto-accept option with `-y` or `--yes` flag to skip confirmation prompt and automatically commit with generated message
- 4 new tests for auto-accept functionality

## [2.2.1] - 2025-10-18

### Fixed
- Resolved `node-domexception` deprecation warning by upgrading OpenAI SDK from v4.98.0 to v6.5.0
- Fixed 5 security vulnerabilities in dependencies

## [2.2.0] - 2025-07-02

### Fixed
- `git commitai help` and `git commitai settings` commands now execute properly instead of being treated as commit message prefixes

### Changed
- Refactored command keyword handling to use centralized constants shared between CLI and Git modules
- Enhanced command argument processing logic for better maintainability

### Added
- Comprehensive test coverage for command argument processing scenarios

## [2.1.0] - 2025-05-22q

### Fixed
- Correct parameter passing in promptCommitMessage function

## [2.0.2] - 2025-05-18

### Changed
- Updated git-commitai.gif asset file

## [2.0.1] - 2025-05-17

### Changed
- Refactored CLI to remove circular dependencies

### Fixed
- Improved error handling in CLI

## [2.0.0] - 2025-05-17

### Added
- Multi-provider support for AI-generated commit messages:
  - OpenAI (GPT)
  - Google (Gemini)
  - Anthropic (Claude)
- Settings command for easy provider selection and configuration
- Improved provider-specific prompt templates for better commit messages

### Changed
- Complete architecture refactoring to support multiple AI providers
- Enhanced CLI with provider selection interface
- Updated configuration storage to handle multiple API keys
- Added source maps to build and dev scripts

### Fixed
- Improved error handling for provider-specific API failures
- Better validation for API keys across all providers

## [1.5.1] - 2025-05-16

### Changed
- Updated OpenAI model from 'gpt-4.1-nano' to 'gpt-4o-mini'

## [1.5.0] - 2025-05-16

### Added
- Unit tests for ConfigManager functionality
- Handling for no staged changes in commit prompt
- Enhanced GitManager to handle maximum changes per file and total changes

### Changed
- Improved success message styling in CLI
- Reordered scripts in package.json

### Fixed
- Updated model version to gpt-4.1-nano in OpenAI integration

## [1.4.1] - 2025-05-11

### Changed
- Replaced rm with rimraf in clean script
- Moved some dependencies to devDependencies

## [1.4.0] - 2025-05-11

### Changed
- Updated project configuration files for linting and packaging

## [1.3.0] - 2025-05-11

### Added
- Postinstall script to run build after install

### Changed
- Replaced yarn with npm in scripts and documentation

## [1.2.0] - 2025-05-11

### Fixed
- Updated script commands for dev and prebuild in package.json

## [1.1.0] - 2025-05-10

### Added
- Enhanced commit message generation logic

### Changed
- Improved error handling in OpenAI integration

### Fixed
- Handling for files with too many changes in GitManager
- Updated npm version badge link in README

## [1.0.0] - 2025-05-11

### Added
- Initial release
- AI-powered commit message generation
- Conventional Commits support
- Git integration
- OpenAI API integration
- Interactive commit message approval
- Custom commit prefix support 