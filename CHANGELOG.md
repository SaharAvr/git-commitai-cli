# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Integration of multiple AI providers (OpenAI, Google, Anthropic) for generating commit messages
- Enhanced CLI functionality

### Changed
- Added source maps to build and dev scripts

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