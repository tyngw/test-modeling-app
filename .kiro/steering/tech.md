# Technology Stack

## Core Technologies

- **Framework**: Next.js 15+ with React 18
- **Language**: TypeScript with strict type checking
- **UI Library**: Material-UI (MUI) v5 with Emotion styling
- **Canvas**: HTML5 Canvas API for diagram rendering
- **State Management**: Custom reducer pattern with hierarchical data structures

## Build System & Tools

- **Package Manager**: npm
- **Bundler**: Next.js with Turbopack (dev mode)
- **Linting**: ESLint with TypeScript, React, and Prettier plugins
- **Formatting**: Prettier with specific configuration
- **Testing**: Jest with React Testing Library
- **Git Hooks**: Husky with lint-staged for pre-commit checks

## Development Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm start               # Serve production build locally

# Building
npm run build           # Build web app (outputs to /build)
npm run build:extension # Build VSCode extension
npm run build:all       # Build both web app and extension

# Testing & Quality
npm test                # Run tests once
npm run test:watch      # Run tests in watch mode
npm run lint            # Lint TypeScript files
npm run format          # Format code with Prettier

# Deployment
npm run deploy          # Deploy to GitHub Pages
```

## Key Dependencies

- **axios**: HTTP client for API calls
- **crypto-js**: Cryptographic utilities
- **react-ga4**: Google Analytics integration
- **canvas**: Server-side canvas rendering
- **node-polyfill-webpack-plugin**: Node.js polyfills for browser

## VSCode Extension

- Built using VSCode Extension API
- Webview integration for embedding the React app
- File system integration for workspace-based saving
- Settings synchronization with VSCode preferences

## Configuration Files

- `next.config.ts`: Next.js configuration with export settings
- `tsconfig.json`: TypeScript configuration with strict mode
- `.eslintrc.js`: ESLint rules and plugins
- `.prettierrc`: Code formatting rules
