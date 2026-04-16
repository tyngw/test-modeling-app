# Project Structure

## Root Directory

- **Configuration**: `.eslintrc.js`, `.prettierrc`, `tsconfig.json`, `next.config.ts`
- **Documentation**: `README.md`, `CODING_STYLE.md`, `AGENTS.md`
- **Build Output**: `build/` (web app), `dist/` (compiled TypeScript)
- **Dependencies**: `package.json`, `package-lock.json`, `node_modules/`

## Source Code Organization (`src/`)

### Application Layer

- `src/app/`: Next.js app router pages and layouts
- `src/components/`: React components organized by feature
  - `canvas/`: Canvas-specific components (drawing, elements, interactions)
  - `header/`: Top navigation and menu components
  - `modal/`: Modal dialogs (help, settings, confirmations)
  - `icons/`: Custom icon components

### Business Logic

- `src/state/`: State management with reducer pattern
  - `state.ts`: Main application state and action handlers
  - `undoredo.ts`: Undo/redo functionality
- `src/context/`: React contexts for state sharing
- `src/hooks/`: Custom React hooks for reusable logic

### Data & Types

- `src/types/`: TypeScript type definitions
  - `types.ts`: Core domain types
  - `elementTypes.ts`: Canvas element types
  - `hierarchicalTypes.ts`: Hierarchical structure types
- `src/config/`: Configuration constants and settings

### Utilities

- `src/utils/`: Utility functions organized by domain
  - `hierarchical/`: Hierarchical data structure operations
  - `clipboard/`: Copy/paste functionality
  - `file/`: File operations and adapters
  - `storage/`: Local storage and VSCode storage adapters
  - `api/`: API client and schema definitions

## VSCode Extension (`extension/`)

- `src/extension.ts`: Main extension entry point
- `webview/`: Built web app files for VSCode webview
- `package.json`: Extension manifest and dependencies

## Key Architectural Patterns

### Hierarchical Data Structure

- All canvas elements are managed in a tree structure (`HierarchicalStructure`)
- Parent-child relationships determine layout and ordering
- Operations maintain hierarchy consistency

### State Management

- Custom reducer pattern with typed actions
- Immutable state updates
- Undo/redo support with snapshots

### Component Organization

- Feature-based folder structure
- Separation of UI components and business logic
- Custom hooks for complex state logic

### File Naming Conventions

- Components: PascalCase (e.g., `CanvasArea.tsx`)
- Utilities: camelCase (e.g., `elementHelpers.ts`)
- Types: descriptive names ending in `Types.ts`
- Tests: `__tests__/` folders or `.test.ts` suffix

## Testing Structure

- Unit tests alongside source files in `__tests__/` folders
- Integration tests for complex state operations
- Test utilities in `src/state/__test__/`
