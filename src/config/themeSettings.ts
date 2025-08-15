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
    CLOSE_BUTTON_HOVER_COLOR: '#1111ff',
    ADD_BUTTON_BACKGROUND: 'transparent',
    ADD_BUTTON_TEXT: '#000',
  },
  // QuickMenuBar
  MENU_BAR: {
    BACKGROUND: '#f1f1f1',
    ICON_COLOR: '#666666',
    DIVIDER_COLOR: '#e0e0e0',
  },
  // Modal Window
  MODAL: {
    BACKGROUND: '#ffffff',
    TEXT_COLOR: '#000000',
    BUTTON_BACKGROUND: '#f1f1f1',
    BUTTON_TEXT: '#000000',
    BUTTON_BORDER: '#cccccc',
    BUTTON_PRIMARY_BACKGROUND: '#1976d2',
    BUTTON_PRIMARY_TEXT: '#ffffff',
  },
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
    CLOSE_BUTTON_HOVER_COLOR: '#9999ff',
    ADD_BUTTON_BACKGROUND: 'transparent',
    ADD_BUTTON_TEXT: '#ffffff',
  },
  // QuickMenuBar
  MENU_BAR: {
    BACKGROUND: '#333333',
    ICON_COLOR: '#bbbbbb',
    DIVIDER_COLOR: '#444444',
  },
  // Modal Window
  MODAL: {
    BACKGROUND: '#333333',
    TEXT_COLOR: '#fefefe',
    BUTTON_BACKGROUND: '#555555',
    BUTTON_TEXT: '#ffffff',
    BUTTON_BORDER: '#666666',
    BUTTON_PRIMARY_BACKGROUND: '#1976d2',
    BUTTON_PRIMARY_TEXT: '#ffffff',
  },
};
