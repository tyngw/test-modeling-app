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
  SelectChangeEvent
} from '@mui/material';
import { SettingField as SettingFieldType } from '../../types/settings';

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
  onChange 
}) => {
  const handleSelectChange = (event: SelectChangeEvent) => {
    onChange(event.target.value);
  };

  switch (field.type) {
    case 'text':
      return (
        <TextField
          label={field.label}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          fullWidth
          margin="normal"
          multiline={field.key === 'prompt' || field.key === 'systemPromptTemplate'}
          rows={field.key === 'prompt' || field.key === 'systemPromptTemplate' ? 6 : 1}
          type={field.key === 'apiKey' ? 'password' : 'text'}
          helperText={field.helperText}
          variant={field.key === 'prompt' || field.key === 'systemPromptTemplate' ? "outlined" : "standard"}
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
            step: field.validation?.step
          }}
          error={error}
          helperText={error ? `${field.validation?.min}から${field.validation?.max}の数値を入力してください` : field.helperText}
        />
      );

    case 'select':
      return (
        <FormControl 
          fullWidth 
          margin="normal"
        >
          <InputLabel>{field.label}</InputLabel>
          <Select
            value={String(value)}
            label={field.label}
            onChange={handleSelectChange}
            MenuProps={{
              sx: {
                zIndex: 9999
              }
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
