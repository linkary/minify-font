# Contributing to minify-font

Thank you for your interest in contributing to minify-font!

## Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/linkary/minify-font.git
   cd minify-font
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Run tests**

   ```bash
   npm test
   ```

4. **Run tests in watch mode**
   ```bash
   npm run test:watch
   ```

## CI/CD Workflows

### 1. **CI Workflow** (`.github/workflows/ci.yml`)

Runs automatically on push and pull requests to main/master/develop branches.

**What it does:**

- Tests on Node.js 18, 20, 22
- Tests on Ubuntu, macOS, Windows
- Runs all test suites
- Tests CLI installation
- Runs code linting
- Generates code coverage

### 2. **Publish Workflow** (`.github/workflows/publish.yml`)

Runs automatically when you create a GitHub release.

**What it does:**

- Runs all tests
- Publishes to npm with provenance
- Uses npm token from GitHub secrets

**To publish a new version:**

1. Update version in `package.json`
2. Commit and push changes
3. Create a new release on GitHub
4. The workflow will automatically publish to npm

**Required Secret:**

- `NPM_TOKEN`: Your npm access token (Add in GitHub repo settings → Secrets)

### 3. **CodeQL Workflow** (`.github/workflows/codeql.yml`)

Runs weekly and on push/PR to main/master.

**What it does:**

- Scans code for security vulnerabilities
- Analyzes JavaScript code quality
- Reports issues in GitHub Security tab

### 4. **Dependabot** (`.github/dependabot.yml`)

Automatically creates PRs for dependency updates.

**Configuration:**

- npm dependencies: Weekly updates
- GitHub Actions: Monthly updates

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Code Style

- Use ES modules (`import`/`export`)
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Write tests for new features

## Testing

All contributions must include tests:

- Unit tests for individual functions
- Integration tests for CLI commands
- Ensure all tests pass before submitting PR

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
