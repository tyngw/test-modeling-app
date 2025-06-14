/**
 * Help content data structure
 * Structured data for safe React component rendering
 */

export interface HelpSection {
  title: string;
  items: string[];
}

/**
 * Safe structured help content data
 * Managed as plain text to prevent HTML injection
 */
export const helpSections: HelpSection[] = [
  {
    title: 'Keyboard shortcuts',
    items: [
      'Tab: Add a child element to the selected element',
      'Shift + Tab: Add a sibling element to the selected element',
      'Delete/Backspace: Remove the selected element',
      'Enter: Edit the selected element',
      'Esc: Stop editing the selected element',
      'Tab in editing mode: Move the focus to the next text box',
      'Ctrl + Z: Undo the last action',
      'Shift + Ctrl + Z: Redo the last action',
      'Ctrl + X: Cut the selected element',
      'Ctrl + C: Copy the selected element',
      'Ctrl + V: Paste the copied element',
      'Ctrl + ArrowLeft: Collapse the children of the selected element',
      'Ctrl + ArrowRight: Expand the children of the selected element',
      'Arrow keys: Navigate between elements',
    ],
  },
  {
    title: 'Mouse operations',
    items: [
      'Click: Select an element',
      'Double click: Edit the selected element',
      'Clicking outside the element will end the editing mode',
      'Drag: Move the selected element',
    ],
  },
  {
    title: 'Menu operations',
    items: [
      'New: Create a new diagram. Unsaved changes will be discarded.',
      'Open: Load saved data. The current data will be discarded.',
      'Save as: Save the diagram data in JSON format',
      'Export: Export the diagram in SVG format',
    ],
  },
];
