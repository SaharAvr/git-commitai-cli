# git commitai

A command-line tool that helps you write clear, conventional git commit messages. It uses OpenAI to suggest commit messages that follow the Conventional Commits specification.

![git-commitai demo](/assets/git-commitai.gif)

[![CI](https://github.com/SaharAvr/git-commitai/actions/workflows/ci.yml/badge.svg)](https://github.com/SaharAvr/git-commitai/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/SaharAvr/git-commitai/branch/main/graph/badge.svg)](https://codecov.io/gh/SaharAvr/git-commitai)
[![npm version](https://badge.fury.io/js/git-commitai.svg)](https://badge.fury.io/js/git-commitai)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- Generates commit messages using OpenAI
- Follows the Conventional Commits specification
- Supports message regeneration
- Stores your API key securely
- Allows specifying commit prefixes
- Passes through git commit arguments

## 📦 Installation

```bash
# Using npm
npm install -g git-commitai-cli

# Using yarn
yarn global add git-commitai-cli
```

## ⚙️ Setup

1. Get your OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Run `git commitai` and follow the prompts to save your API key

## 🚀 Usage

```bash
# Stage your changes
git add .

# Generate and commit with a suggested message
git commitai

# Pass git commit arguments
git commitai --no-verify

# Use a specific prefix
git commitai "feat"
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

The API key is stored in `~/.git-commitai/config`. You can edit this file manually if needed.

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
yarn install

# Build the project
yarn build

# Run tests
yarn test

# Run linting
yarn lint
```

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details. 