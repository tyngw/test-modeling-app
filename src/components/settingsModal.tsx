// src/components/settingsModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import ModalWindow from './modalWindow';
import { 
  Tabs, 
  Tab, 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Radio, 
  FormControlLabel, 
  FormGroup, 
  FormControl, 
  FormLabel, 
  FormHelperText,
  Select,
  MenuItem,
  InputLabel
} from '@mui/material';
import {
  getNumberOfSections,
  setNumberOfSections,
  getApiKey,
  setApiKey,
  getPrompt,
  setPrompt,
  getSystemPromptTemplate,
  setSystemPromptTemplate,
  getModelType,
  setModelType,
  getElementColor,
  setElementColor,
  getStrokeColor,
  setStrokeColor,
  getStrokeWidth,
  setStrokeWidth,
  getFontFamily,
  setFontFamily,
  getMarkerType,
  setMarkerType,
  getConnectionPathColor,
  setConnectionPathColor,
  getConnectionPathStroke,
  setConnectionPathStroke,
  getCanvasBackgroundColor,
  setCanvasBackgroundColor,
  getTextColor,
  setTextColor
} from '../utils/localStorageHelpers';
import { MARKER_TYPES } from '../constants/elementSettings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [numberOfSectionsInput, setNumberOfSectionsInput] = useState('3');
  const [apiKey, setApiKeyState] = useState('');
  const [prompt, setPromptState] = useState('');
  const [systemPromptTemplate, setSystemPromptTemplateState] = useState('');
  const [modelType, setModelTypeState] = useState('gemini-1.5-flash');
  const [elementColor, setElementColorState] = useState('');
  const [strokeColor, setStrokeColorState] = useState('');
  const [strokeWidth, setStrokeWidthState] = useState('');
  const [fontFamily, setFontFamilyState] = useState('');
  const [markerType, setMarkerTypeState] = useState('');
  const [connectionPathColor, setConnectionPathColorState] = useState('');
  const [connectionPathStroke, setConnectionPathStrokeState] = useState('');
  const [canvasBackgroundColor, setCanvasBackgroundColorState] = useState('');
  const [textColor, setTextColorState] = useState('');
  const [sectionsError, setSectionsError] = useState(false);
  const [strokeWidthError, setStrokeWidthError] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (isOpen) {
        setNumberOfSectionsInput(getNumberOfSections().toString());
        setApiKeyState(await getApiKey());
        setPromptState(getPrompt());
        setSystemPromptTemplateState(getSystemPromptTemplate());
        setModelTypeState(getModelType());
        setElementColorState(getElementColor());
        setStrokeColorState(getStrokeColor());
        setStrokeWidthState(getStrokeWidth().toString());
        setFontFamilyState(getFontFamily());
        setMarkerTypeState(getMarkerType() || MARKER_TYPES.NONE); // デフォルト値を設定
        setConnectionPathColorState(getConnectionPathColor());
        setConnectionPathStrokeState(getConnectionPathStroke().toString());
        setCanvasBackgroundColorState(getCanvasBackgroundColor());
        setTextColorState(getTextColor());
      }
    };
    loadSettings();
  }, [isOpen]);

  const handleSave = async () => {
    let numValue = parseInt(numberOfSectionsInput, 10);
    const validSections = Math.max(1, Math.min(10, numValue));
    setNumberOfSections(validSections);
    
    await setApiKey(apiKey);
    setPrompt(prompt);
    setSystemPromptTemplate(systemPromptTemplate);
    setModelType(modelType);
    
    // Save new settings
    setElementColor(elementColor);
    setStrokeColor(strokeColor);
    
    const strokeWidthValue = parseFloat(strokeWidth);
    if (!isNaN(strokeWidthValue) && strokeWidthValue > 0) {
      setStrokeWidth(strokeWidthValue);
    }
    
    setFontFamily(fontFamily);
    setMarkerType(markerType);
    setConnectionPathColor(connectionPathColor);
    const connectionPathStrokeValue = parseFloat(connectionPathStroke);
    if (!isNaN(connectionPathStrokeValue) && connectionPathStrokeValue > 0) {
      setConnectionPathStroke(connectionPathStrokeValue);
    }
    setCanvasBackgroundColor(canvasBackgroundColor);
    setTextColor(textColor);
    
    onClose();
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNumberOfSectionsInput(value);
    const numValue = parseInt(value, 10);
    const isEmpty = value === '';
    const isInvalid = isEmpty || isNaN(numValue) || numValue < 1 || numValue > 10;
    setSectionsError(isInvalid);
  };

  const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStrokeWidthState(value);
    const numValue = parseFloat(value);
    const isEmpty = value === '';
    const isInvalid = isEmpty || isNaN(numValue) || numValue <= 0;
    setStrokeWidthError(isInvalid);
  };

  const handleModelTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModelTypeState(e.target.value);
  };

  return (
    <ModalWindow isOpen={isOpen} onClose={onClose}>
      <Typography variant="h6" gutterBottom>
        Preference
      </Typography>
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        <Tab label="Elements Setting" />
        <Tab label="API Setting" />
        <Tab label="Prompt" />
      </Tabs>
      <Box sx={{ mt: 2, minHeight: 300 }}>
        {activeTab === 0 && (
          <Box>
            <TextField
              label="Number of sections"
              type="number"
              value={numberOfSectionsInput}
              onChange={handleSectionChange}
              fullWidth
              margin="normal"
              inputProps={{ min: 1, max: 10 }}
              error={sectionsError}
            />
            <FormHelperText error={sectionsError}>
              {sectionsError ? "1から10の数値を入力してください" : "同時に表示するセクションの数（1〜10）"}
            </FormHelperText>

            <FormControl fullWidth margin="normal">
              <InputLabel id="marker-type-label">Default Marker Type</InputLabel>
              <Select
                labelId="marker-type-label"
                value={markerType}
                label="Default Marker Type"
                onChange={(e) => setMarkerTypeState(e.target.value)}
              >
                <MenuItem value={MARKER_TYPES.NONE}>None</MenuItem>
                <MenuItem value={MARKER_TYPES.ARROW}>Arrow</MenuItem>
                <MenuItem value={MARKER_TYPES.CIRCLE}>Circle</MenuItem>
                <MenuItem value={MARKER_TYPES.SQUARE}>Square</MenuItem>
                <MenuItem value={MARKER_TYPES.DIAMOND}>Diamond</MenuItem>
              </Select>
              <FormHelperText>新規要素作成時のデフォルトマーカータイプ</FormHelperText>
            </FormControl>

            <TextField
              label="Font Family"
              value={fontFamily}
              onChange={(e) => setFontFamilyState(e.target.value)}
              fullWidth
              margin="normal"
              helperText="表示に使用するフォントファミリ"
            />

            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
              <Typography variant="body1" sx={{ mr: 2, width: '120px' }}>
                Element Color:
              </Typography>
              <input
                type="color"
                value={elementColor}
                onChange={(e) => setElementColorState(e.target.value)}
              />
            </Box>
            <FormHelperText>要素の背景色</FormHelperText>

            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
              <Typography variant="body1" sx={{ mr: 2, width: '120px' }}>
                Stroke Color:
              </Typography>
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColorState(e.target.value)}
              />
            </Box>
            <FormHelperText>要素の枠線色</FormHelperText>

            <TextField
              label="Stroke Width"
              type="number"
              value={strokeWidth}
              onChange={handleStrokeWidthChange}
              fullWidth
              margin="normal"
              inputProps={{ min: 0.5, step: 0.5 }}
              error={strokeWidthError}
              helperText={strokeWidthError ? "正の数値を入力してください" : "要素の枠線の太さ"}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
              <Typography variant="body1" sx={{ mr: 2, width: '120px' }}>
                Connection Path Color:
              </Typography>
              <input
                type="color"
                value={connectionPathColor}
                onChange={(e) => setConnectionPathColorState(e.target.value)}
              />
            </Box>
            <FormHelperText>接続線の色</FormHelperText>

            <TextField
              label="Connection Path Stroke"
              type="number"
              value={connectionPathStroke}
              onChange={(e) => setConnectionPathStrokeState(e.target.value)}
              fullWidth
              margin="normal"
              inputProps={{ min: 0.5, step: 0.5 }}
              helperText="接続線の太さ"
            />

            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
              <Typography variant="body1" sx={{ mr: 2, width: '120px' }}>
                Canvas Background Color:
              </Typography>
              <input
                type="color"
                value={canvasBackgroundColor}
                onChange={(e) => setCanvasBackgroundColorState(e.target.value)}
              />
            </Box>
            <FormHelperText>キャンバスの背景色</FormHelperText>

            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, mb: 1 }}>
              <Typography variant="body1" sx={{ mr: 2, width: '120px' }}>
                Text Color:
              </Typography>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColorState(e.target.value)}
              />
            </Box>
            <FormHelperText>テキストの色</FormHelperText>
          </Box>
        )}
        {activeTab === 1 && (
          <Box>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">Select Model</FormLabel>
              <FormGroup>
                <FormControlLabel
                  value="gemini-1.5-flash"
                  control={<Radio checked={modelType === 'gemini-1.5-flash'} onChange={handleModelTypeChange} />}
                  label="Gemini-1.5-flash"
                />
                <FormControlLabel
                  value="gemini-2.0-flash"
                  control={<Radio checked={modelType === 'gemini-2.0-flash'} onChange={handleModelTypeChange} />}
                  label="Gemini-2.0-flash"
                />
              </FormGroup>
            </FormControl>
            <TextField
              label="Gemini API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              fullWidth
              margin="normal"
              helperText="入力されたキーは暗号化してlocalStorageに保存されます。サーバに送信されることはありません。"
            />
          </Box>
        )}
        {activeTab === 2 && (
          <Box>
            <TextField
              label="inputText"
              value={prompt}
              onChange={(e) => setPromptState(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              rows={6}
              variant="outlined"
            />
            <TextField
              label="SystemPromptTemplate"
              value={systemPromptTemplate}
              onChange={(e) => setSystemPromptTemplateState(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              rows={6}
              variant="outlined"
            />
          </Box>
        )}
      </Box>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="contained" 
          onClick={handleSave} 
          color="primary"
          disabled={sectionsError || strokeWidthError || numberOfSectionsInput === ''} 
        >
          OK
        </Button>
      </Box>
    </ModalWindow>
  );
};

export default SettingsModal;