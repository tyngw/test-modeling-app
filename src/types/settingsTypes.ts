// src/types/settingsTypes.ts
export type SettingValue = string | number;

export interface SettingField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'color' | 'select' | 'radio';
  helperText: string;
  defaultValue: SettingValue;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    step?: number;
    required?: boolean;
  };
}

export interface SettingTab {
  id: number;
  label: string;
  fields: SettingField[];
}
