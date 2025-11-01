# Contributing to Jira MCP Server

Thank you for your interest in contributing to Jira MCP Server! This document provides guidelines and instructions for contributing.

## 🌟 Ways to Contribute

- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Improve documentation
- 🔧 Submit bug fixes
- ✨ Add new features
- 🧪 Write tests

## 📋 Before You Start

1. Check existing issues and pull requests to avoid duplicates
2. For major changes, open an issue first to discuss your idea
3. Make sure you can test your changes locally
4. Follow the existing code style and conventions

## 🚀 Getting Started

### 1. Fork and Clone

```bash
git clone https://github.com/garywenneker/jira-mcp-server.git
cd jira-mcp-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure

Set up your Jira credentials:

```bash
export JIRA_BASE_URL="https://yourcompany.atlassian.net"
export JIRA_USERNAME="your.email@company.com"
export JIRA_API_TOKEN="your-api-token"
```

### 4. Test Your Changes

```bash
npm start
# Test the MCP server with your AI assistant
```

## 💻 Development Guidelines

### Code Style

- Use meaningful variable and function names
- Add comments for complex logic
- Follow existing code patterns
- Keep functions focused and small

### Commit Messages

Use clear, descriptive commit messages:

```
✨ Add worklog management feature
🐛 Fix issue with sprint listing
📝 Update README with new examples
♻️ Refactor JQL query handling
```

Emoji prefix guide:
- ✨ New feature
- 🐛 Bug fix
- 📝 Documentation
- ♻️ Refactoring
- 🧪 Tests
- 🎨 UI/Style
- ⚡ Performance
- 🔒 Security

### Pull Request Process

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit:
   ```bash
   git add .
   git commit -m "✨ Add your feature"
   ```

3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a Pull Request with:
   - Clear title and description
   - Link to related issues
   - Screenshots (if UI changes)
   - Testing steps

## 🐛 Reporting Bugs

When reporting bugs, please include:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Exact steps to trigger the bug
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Environment**: 
  - Node.js version
  - Operating system
  - MCP client (Cursor/Claude Desktop)
  - Jira Cloud/Server version

## 💡 Suggesting Features

Feature requests should include:

- **Use Case**: Why is this feature needed?
- **Description**: What should the feature do?
- **Examples**: How would it be used?
- **Alternatives**: Have you considered alternatives?

## 📚 Documentation

Documentation improvements are always welcome:

- Fix typos and grammar
- Add examples
- Clarify unclear sections
- Add troubleshooting tips
- Translate to other languages

## 🧪 Testing

When adding features:

1. Test manually with your Jira instance
2. Test edge cases
3. Verify error handling
4. Check with different Jira configurations

## 🔒 Security

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. Email the maintainers privately
3. Provide details about the vulnerability
4. Allow time for a fix before public disclosure

## ❓ Questions?

- Open a [Discussion](https://github.com/garywenneker/jira-mcp-server/discussions)
- Check the [Wiki](https://github.com/garywenneker/jira-mcp-server/wiki)
- Review existing issues

## 📜 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Help others learn and grow

## 🎉 Recognition

Contributors will be:
- Listed in the README
- Credited in release notes
- Part of a growing community

Thank you for contributing to Jira MCP Server! 🚀

