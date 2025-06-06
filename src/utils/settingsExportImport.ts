// src/utils/settingsExportImport.ts
import { SettingField } from '../types/settings';

/**
 * Exports element settings to a JSON file
 * @param settingsData Record of settings values
 * @param fields Array of setting field definitions to include in export
 */
export const exportElementSettings = (
  settingsData: Record<string, string | number>,
  fields: SettingField[],
): void => {
  // Get element settings from values state
  const elementSettings: Record<string, string | number> = {};

  // Only include fields from the provided fields array
  fields.forEach((field) => {
    if (settingsData[field.key] !== undefined) {
      elementSettings[field.key] = settingsData[field.key];
    }
  });

  // Convert to JSON string
  const jsonString = JSON.stringify(elementSettings, null, 2);

  // Create a blob and trigger download
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Create an anchor element and trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = `theme-settings-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
};

/**
 * Validates a field value against its validation rules
 * @param field Setting field definition
 * @param value Value to validate
 * @returns boolean indicating if value is valid
 */
export const validateSettingField = (field: SettingField, value: string | number): boolean => {
  if (field.type === 'number') {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (field.validation?.required && (value === '' || isNaN(numValue))) return false;
    if (!isNaN(numValue)) {
      if (field.validation?.min !== undefined && numValue < field.validation.min) return false;
      if (field.validation?.max !== undefined && numValue > field.validation.max) return false;
    }
  }
  return true;
};

/**
 * Imports element settings from a JSON file
 * @param jsonData Parsed JSON data from imported file
 * @param currentValues Current settings values
 * @param currentErrors Current validation errors
 * @param fields Array of setting field definitions to validate against
 * @returns Object containing new values, errors, and whether there were validation errors
 */
export const importElementSettings = (
  jsonData: Record<string, string | number>,
  currentValues: Record<string, string | number>,
  currentErrors: Record<string, boolean>,
  fields: SettingField[],
): {
  newValues: Record<string, string | number>;
  newErrors: Record<string, boolean>;
  hasError: boolean;
} => {
  const newValues = { ...currentValues };
  const newErrors = { ...currentErrors };
  let hasError = false;

  // Process each field from the provided fields array
  fields.forEach((field) => {
    if (jsonData[field.key] !== undefined) {
      // Validate the field value
      if (!validateSettingField(field, jsonData[field.key])) {
        hasError = true;
        newErrors[field.key] = true;
      } else {
        newValues[field.key] = jsonData[field.key];
        newErrors[field.key] = false;
      }
    }
  });

  return { newValues, newErrors, hasError };
};
