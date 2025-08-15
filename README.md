# Test Modeling App

## Overview

This application allows you to describe test architectures using a notation similar to UML class diagrams.

## Usage

### Running Locally

1. Clone the repository
2. Run `npm install` to install dependencies
3. Start the development server with `npm run dev`
4. Open `http://localhost:3000` in your web browser

Alternatively, to run the production build:
```bash
npm run build
npm start
```

### Deploying to GitHub Pages

Push to the main branch to automatically deploy the app.

### Live Demo

The app is available at [https://tyngw.github.io/test-modeling-app/](https://tyngw.github.io/test-modeling-app/)

### How to Use the App

#### Keyboard Shortcuts

- `Tab`: Add a child element to the selected item
- `Delete`: Delete the selected element
- `Enter`: Edit the selected element
- `Esc`: Exit edit mode
- While editing, `Tab`: Move focus to the next textbox
- `Ctrl + Z`: Undo the last action
- `Shift + Ctrl + Z`: Redo the last undone action
- `Ctrl + X`: Cut the selected element
- `Ctrl + C`: Copy the selected element
- `Ctrl + V`: Paste the copied element
- `Ctrl + ←`: Collapse children of the selected element
- `Ctrl + →`: Expand children of the selected element

#### Mouse Operations

- `Click`: Select an element
- `Double-click`: Edit an element
  - Clicking outside the element exits edit mode
- `Drag`: Move the selected element

#### Menu Operations

- `New`: Create a new diagram (unsaved changes will be discarded)
- `Open`: Load saved data (current data will be discarded)
- `Save As`: Save diagram data as JSON
- `Export`: Export the diagram as SVG

---

### Hierarchical Clipboard Paste (Auto Indent Structure Restoration)

This app can automatically reconstruct hierarchical structures from indented text pasted from the clipboard.

#### How to Use
1. Copy text with a hierarchical structure (such as an outline or bulleted list)
2. Paste it into the app (`Ctrl + V` or `⌘ + V`)
3. Parent-child relationships are automatically created based on indentation

#### Example
```
Parent Item
  Child Item 1
    Grandchild Item 1
  Child Item 2
```

#### Result
- Parent Item
  - Child Item 1
    - Grandchild Item 1
  - Child Item 2

- Indentation is recognized by tabs or two or more spaces
- Mixed tabs and spaces are automatically detected
- If indentation is invalid or too deep, pasted items may be flattened into a single list

---

## Element Hierarchy and Display Order Specifications

This app manages element hierarchy and display order using two mechanisms.

### 1. Hierarchical Data Structure
- Elements are managed in a hierarchical tree structure (`HierarchicalStructure`)
- Each parent element has a `children` array that maintains the **actual order** of child elements
- This structure is the **single source of truth** for element order and relationships

### 2. Display Order Logic
- Element display positions are calculated by Y coordinate
- The order of the `children` array in the hierarchy determines the **logical order**
- When adding or moving elements, they are first inserted into the hierarchy, then positions are recalculated

### 3. Order Determination During Drag & Drop

#### between mode (dropping between elements)
1. **Order Calculation**:
   - Uses the order of the `children` array in the hierarchy, not Y coordinate
   - Calculates insertion position from siblings of `prevElement` and `nextElement`
   - Maintains consistency between logical order and physical placement

2. **Position Calculation**:
   - `insertY`: Calculates Y coordinate for display position
   - `insertX`: Calculates X coordinate from parent or inherited direction
   - `baseOrder`: Determined by position in the hierarchy array

3. **Element Insertion**:
   - The `moveElementInHierarchy` function handles insertion into the hierarchy
   - Inserts into the `children` array at the calculated `baseOrder` position
   - Recalculates layout and updates display positions

### 4. Consistency Rules

- **ADD_ELEMENT / ADD_SIBLING_ELEMENT**: New elements are added to the end of the `children` array, then positioned
- **Drag & Drop**: Order is determined by the hierarchy, not Y coordinate
- **Copy & Paste**: Hierarchy is preserved even when pasting multiple elements
- **Layout Calculation**: Always respects the order of the `children` array

### 5. Debugging and Verification
- Check `state.hierarchicalData` in browser DevTools to verify actual order
- Compare display and data order for consistency
- If hierarchy cannot be obtained, the `getChildren` function returns a consistently sorted list by ID

This ensures that element order is never broken, and logical hierarchy always matches display order!

---

#### Element Hierarchy and Order Management

Element hierarchy and order management follow these specifications:

##### Hierarchy Order Management
- **The order of the `children` array in the hierarchical structure is the only official order**
- This array order is preserved even when saving to LocalStorage
- Y coordinate for display is calculated based on the order of the `children` array
- There is no `order` property; order is determined purely by array index

##### Adding Elements (ADD_ELEMENT / ADD_SIBLING_ELEMENT)
- New elements are added to the **end** of the parent's `children` array
- On screen, they appear below existing children
- LocalStorage hierarchy and display order always match

##### Changing Order by Drag & Drop
- **between mode**: When dropping between elements, inserts at the exact index in the `children` array
  - Insert after `prevElement` or at the position of `nextElement`
  - Always uses the `children` array as the basis for order, not visual order or Y coordinate
- **child mode**: When adding as a child, inserts at the end of the `children` array
- The `moveElementInHierarchy` function manages order precisely via array `splice`

##### Order Consistency
- The order of the `children` array in the hierarchy is **the single correct order**
- All operations (add, move, copy & paste) maintain this order
- Y coordinate is only for display calculation, not for determining order
- The `getChildrenFromHierarchy` function returns the element list in the order of the `children` array

---

## Using as a VSCode Extension

This application can be used not only as a regular web app, but also as a Visual Studio Code extension.

### Building and Installing the Extension

1. **Build the extension**
   ```bash
   npm run build:extension
   ```

2. **Run the extension in development mode in VSCode**
   - Open this project in VSCode
   - Press `F5` or select "Run Extension" from the "Run and Debug" panel
   - A new VSCode window (Extension Development Host) will open

3. **Use the extension**
   - Open the command palette (`Ctrl/Cmd + Shift + P`)
   - Run `Open Test Modeling App`
   - You can create and edit modeling diagrams in the editor

### Features of the VSCode Extension Version

#### Integrated File Operations
- **Save within workspace**: Diagram data is saved as files in your workspace
- **Real-time saving**: Edits are automatically saved as JSON files
- **File history**: Leverage VSCode's file history features

#### Integrated Settings
- **Integration with VSCode settings**: App settings are managed via VSCode's settings system
- **Automatic theme application**: App theme changes according to VSCode's theme
- **Workspace-specific settings**: Different settings can be kept for each project

#### Developer Features
- **Project integration**: Manage code and modeling diagrams in the same workspace
- **Git integration**: Diagram files can be included in version control
- **Extensibility**: Can be integrated with other VSCode extensions

### Settings

The VSCode extension currently uses default settings. Configuration options may be added in future versions.

---

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.