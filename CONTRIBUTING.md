# Contributing to git-commitai

Thank you for your interest in contributing to git-commitai! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read it before contributing.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Provide specific examples to demonstrate the steps
- Describe the behavior you observed after following the steps
- Explain which behavior you expected to see instead and why
- Include screenshots if possible
- Include the output of any error messages
- Include your operating system and version
- Include the version of Node.js you're using

### Suggesting Enhancements

If you have a suggestion for a new feature or enhancement, please include as much detail as possible:

- Use a clear and descriptive title
- Provide a detailed description of the proposed functionality
- Explain why this enhancement would be useful
- List any similar features in other applications
- Include screenshots if applicable

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/git-commitai.git
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/SaharAvr/git-commitai.git
   ```
4. Install dependencies:
   ```bash
   npm install
   ```

### Development Workflow

1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run tests:
   ```bash
   npm test
   ```
4. Run linting:
   ```bash
   npm run lint
   ```
5. Build the project:
   ```bash
   npm run build
   ```
6. Commit your changes following the Conventional Commits specification
7. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. Create a Pull Request

### Code Style

- We use ESLint and Prettier for code formatting
- Run `npm run lint` to check for style issues
- Run `npm run format` to automatically fix style issues

### Testing

- Write tests for new features and bug fixes
- Run `npm test` to execute the test suite
- Run `npm run test:coverage` to check test coverage
- Maintain or improve the current test coverage

### Documentation

- Update documentation for any new features or changes
- Follow the existing documentation style
- Include JSDoc comments for new functions and classes

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Please format your commit messages accordingly:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Changes to the build process or auxiliary tools

## Review Process

1. All pull requests require at least one review
2. CI checks must pass
3. Code coverage must be maintained or improved
4. Documentation must be updated if necessary

## Questions?

Feel free to open an issue for any questions you might have about contributing. 