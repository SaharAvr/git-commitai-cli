# git commitai

A command-line tool that helps you write clear, conventional git commit messages. It uses AI to suggest commit messages that follow the Conventional Commits specification.

![git-commitai demo](https://raw.githubusercontent.com/SaharAvr/git-commitai/main/assets/git-commitai.gif)

[![CI](https://github.com/SaharAvr/git-commitai/actions/workflows/ci.yml/badge.svg)](https://github.com/SaharAvr/git-commitai/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/SaharAvr/git-commitai/branch/main/graph/badge.svg)](https://codecov.io/gh/SaharAvr/git-commitai)
[![npm version](https://badge.fury.io/js/git-commitai-cli.svg)](https://badge.fury.io/js/git-commitai-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- Generates commit messages using multiple AI providers:
  - OpenAI (GPT)
  - Google (Gemini)
  - Anthropic (Claude)
- Follows the Conventional Commits specification
- Supports message regeneration
- Auto-accept mode with `-y` or `--yes` flag
- Stores your API keys securely
- Allows specifying commit prefixes
- Passes through git commit arguments

## 📦 Installation

```bash
# Using npm
npm install -g git-commitai-cli
```

## ⚙️ Setup

1. Get your API key from one of the supported providers:
   - [OpenAI Platform](https://platform.openai.com/api-keys)
   - [Google AI Studio](https://makersuite.google.com/app/apikey)
   - [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Run `git commitai` and follow the prompts to select a provider and save your API key

## 🚀 Usage

```bash
# Stage your changes
git add .

# Generate and commit with a suggested message
git commitai

# Auto-accept the generated message (no prompt)
git commitai -y
# or
git commitai --yes

# Pass git commit arguments
git commitai --no-verify

# Use a specific prefix
git commitai "feat"

# Combine options
git commitai feat -y --no-verify

# Change AI provider or other settings
git commitai settings
```

## 📝 Commit Message Format

This tool generates messages that follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types include:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or modifying tests
- `chore`: Changes to the build process or auxiliary tools

## 🛠️ Configuration

The API keys are stored in `~/.git-commitai/config`. You can edit this file manually if needed.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'feat: add your feature'`)
4. Push to your branch (`git push origin feature/your-feature`)
5. Open a Pull Request

### 🧑‍💻 Development Setup

```bash
# Clone the repository
git clone https://github.com/SaharAvr/git-commitai.git

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint
```

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](https://raw.githubusercontent.com/SaharAvr/git-commitai/main/LICENSE) file for details. 