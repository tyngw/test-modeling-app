// src/constants/themeSettings.ts
// This file contains theme-related constants for the application

// Theme mode threshold - brightness value below this is considered dark mode
export const THEME_BRIGHTNESS_THRESHOLD = 128;

// Light theme colors
export const LIGHT_THEME = {
  // Tab headers
  TAB_BAR: {
    BACKGROUND: '#f0f0f0',
    ACTIVE_TAB_BACKGROUND: '#fff',
    INACTIVE_TAB_BACKGROUND: '#ddd',
    ACTIVE_TAB_BORDER: '#87CEFA',
    TAB_TEXT: '#000000',
    CLOSE_BUTTON_COLOR: '#666',
    ADD_BUTTON_BACKGROUND: 'transparent',
    ADD_BUTTON_TEXT: '#000',
  },
  // QuickMenuBar
  MENU_BAR: {
    BACKGROUND: '#f1f1f1',
    ICON_COLOR: '#666666',
    DIVIDER_COLOR: '#e0e0e0',
  }
};

// Dark theme colors
export const DARK_THEME = {
  // Tab headers
  TAB_BAR: {
    BACKGROUND: '#333333',
    ACTIVE_TAB_BACKGROUND: '#555555',
    INACTIVE_TAB_BACKGROUND: '#444444',
    ACTIVE_TAB_BORDER: '#00aaff',
    TAB_TEXT: '#ffffff',
    CLOSE_BUTTON_COLOR: '#aaaaaa',
    ADD_BUTTON_BACKGROUND: 'transparent',
    ADD_BUTTON_TEXT: '#ffffff',
  },
  // QuickMenuBar
  MENU_BAR: {
    BACKGROUND: '#333333',
    ICON_COLOR: '#bbbbbb',
    DIVIDER_COLOR: '#444444',
  }
};