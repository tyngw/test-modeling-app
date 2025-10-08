// src/types/settingsTypes.ts

export type SettingValue = string | number | boolean;

export interface SettingValidation {
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  pattern?: RegExp;
}

export interface SettingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'textarea' | 'radio';
  defaultValue: SettingValue;
  description?: string;
  helperText?: string;
  validation?: SettingValidation;
  options?: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  rows?: number;
}

export interface SettingTab {
  id: number;
  label: string;
  fields: SettingField[];
}

export interface IndentSettings {
  spacesPerLevel: 2 | 4;
}

export interface AppSettings {
  indent: IndentSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  indent: {
    spacesPerLevel: 4,
  },
};
