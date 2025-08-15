import React from 'react';
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Typography,
  Radio,
  FormControlLabel,
  FormGroup,
  FormLabel,
  SelectChangeEvent,
} from '@mui/material';
import { SettingField as SettingFieldType } from '../../types/settings';
import { sanitizeText } from '../../utils/security/sanitization';
import { validateSettingValue } from '../../utils/security/validation';

interface SettingFieldProps {
  field: SettingFieldType;
  value: string | number;
  error?: boolean;
  onChange: (value: string) => void;
}

export const SettingField: React.FC<SettingFieldProps> = ({
  field,
  value,
  error = false,
  onChange,
}) => {
  const handleSelectChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  /**
   * 安全なテキスト入力ハンドラー
   * 設定値のサニタイゼーションと検証を行う
   */
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;

    // APIキーの場合は特別な処理（検証とサニタイズをスキップ）
    if (field.key === 'apiKey') {
      onChange(rawValue);
      return;
    }

    // 設定値の検証
    if (!validateSettingValue(field.key, rawValue)) {
      console.warn(`設定値が無効です: ${field.key}`);
      return;
    }

    // APIキー以外はサニタイズ
    const safeValue = sanitizeText(rawValue);
    onChange(safeValue);
  };

  switch (field.type) {
    case 'text':
      return (
        <TextField
          label={field.label}
          value={value}
          onChange={handleTextChange}
          fullWidth
          margin="normal"
          multiline={field.key === 'prompt' || field.key === 'systemPromptTemplate'}
          rows={field.key === 'prompt' || field.key === 'systemPromptTemplate' ? 6 : 1}
          type={field.key === 'apiKey' ? 'password' : 'text'}
          helperText={field.helperText}
          variant={
            field.key === 'prompt' || field.key === 'systemPromptTemplate' ? 'outlined' : 'standard'
          }
        />
      );

    case 'number':
      return (
        <TextField
          label={field.label}
          type="number"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          fullWidth
          margin="normal"
          inputProps={{
            min: field.validation?.min,
            max: field.validation?.max,
            step: field.validation?.step,
          }}
          error={error}
          helperText={
            error
              ? `${field.validation?.min}から${field.validation?.max}の数値を入力してください`
              : field.helperText
          }
        />
      );

    case 'select':
      return (
        <FormControl fullWidth margin="normal">
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={String(value)}
            label={field.label}
            onChange={handleSelectChange}
            MenuProps={{
              sx: {
                zIndex: 9999,
              },
            }}
          >
            {field.options?.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{field.helperText}</FormHelperText>
        </FormControl>
      );

    case 'color':
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
          <Typography variant="body1" sx={{ mr: 2, width: '120px' }}>
            {field.label}:
          </Typography>
          <input
            type="color"
            value={String(value)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          />
          <FormHelperText>{field.helperText}</FormHelperText>
        </Box>
      );

    case 'radio':
      return (
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">{field.label}</FormLabel>
          <FormGroup>
            {field.options?.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={
                  <Radio
                    checked={value === option.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                  />
                }
                label={option.label}
              />
            ))}
          </FormGroup>
          <FormHelperText>{field.helperText}</FormHelperText>
        </FormControl>
      );

    default:
      return null;
  }
};
