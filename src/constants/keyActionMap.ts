// src/constants/keyActionMap.ts

export const keyActionMap: { [key: string]: string } = {
    'Ctrl+z': 'UNDO',
    'Ctrl+Shift+z': 'REDO',
    'ArrowUp': 'ARROW_UP',
    'ArrowDown': 'ARROW_DOWN',
    'ArrowRight': 'ARROW_RIGHT',
    'Ctrl+ArrowRight': 'EXPAND_ELEMENT',
    'ArrowLeft': 'ARROW_LEFT',
    'Ctrl+ArrowLeft': 'COLLAPSE_ELEMENT',
    'Ctrl+x': 'CUT_ELEMENT',
    'Ctrl+c': 'COPY_ELEMENT',
    'Ctrl+v': 'PASTE_ELEMENT',
    'Tab': 'ADD_ELEMENT',
    'Shift+Tab': 'ADD_SIBLING_ELEMENT',
    'Delete': 'DELETE_ELEMENT',
    'Backspace': 'DELETE_ELEMENT',
    'Enter': 'EDIT_ELEMENT'
};

export const inputFieldKeyActionMap: { [key: string]: string } = {
    'Tab': 'NEXT_FIELD',
    'Escape': 'END_EDITING',
    'Ctrl+Enter': 'END_EDITING',
    'Alt+Enter': 'END_EDITING',
    'Meta+Enter': 'END_EDITING',
};
