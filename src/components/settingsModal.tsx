// src/components/settingsModal.tsx
import React, { useState, useEffect } from 'react';
import ModalWindow from './modalWindow';
import { Tabs, Tab, Box, TextField, Button, Typography, Radio, FormControlLabel, FormGroup, FormControl, FormLabel, FormHelperText } from '@mui/material';
import {
  getNumberOfSections,
  setNumberOfSections,
  getApiKey,
  setApiKey,
  getPrompt,
  setPrompt,
  getSystemPromptTemplate,
  setSystemPromptTemplate,
} from '../utils/localStorageHelpers';

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
  const [sectionsError, setSectionsError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNumberOfSectionsInput(getNumberOfSections().toString());
      setApiKeyState(getApiKey());
      setPromptState(getPrompt());
      setSystemPromptTemplateState(getSystemPromptTemplate());
    }
  }, [isOpen]);

  const handleSave = () => {
    let numValue = parseInt(numberOfSectionsInput, 10);
    const validSections = Math.max(1, Math.min(10, numValue));
    setNumberOfSections(validSections);
    setApiKey(apiKey);
    setPrompt(prompt);
    setSystemPromptTemplate(systemPromptTemplate)
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
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">Select Model</FormLabel>
              <FormGroup>
                <FormControlLabel
                  value="Gemini-1.5-flash"
                  control={<Radio checked />}
                  label="Gemini-1.5-flash"
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
          disabled={sectionsError || numberOfSectionsInput === ''} // 空文字列も無効化条件に追加
        >
          OK
        </Button>
      </Box>
    </ModalWindow>
  );
};

export default SettingsModal;