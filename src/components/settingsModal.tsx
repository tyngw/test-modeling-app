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
  const [numberOfSections, setNumberOfSectionsState] = useState(3);
  const [apiKey, setApiKeyState] = useState('');
  const [prompt, setPromptState] = useState('');
  const [systemPromptTemplate, setSystemPromptTemplateState] = useState('');
  const [sectionsError, setSectionsError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNumberOfSectionsState(getNumberOfSections());
      setApiKeyState(getApiKey());
      setPromptState(getPrompt());
      setSystemPromptTemplateState(getSystemPromptTemplate());
    }
  }, [isOpen]);

  const handleSave = () => {
    const validSections = Math.max(1, Math.min(10, numberOfSections));
    setNumberOfSections(validSections);
    setApiKey(apiKey);
    setPrompt(prompt);
    setSystemPromptTemplate(systemPromptTemplate)
    onClose();
  };

  const handleSectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (value > 10) {
      setSectionsError(true);
      setNumberOfSectionsState(10);
    } else if (value < 1) {
      setSectionsError(true);
      setNumberOfSectionsState(1);
    } else {
      setSectionsError(false);
      setNumberOfSectionsState(isNaN(value) ? 3 : value);
    }
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
              value={numberOfSections}
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
              <FormLabel component="legend">Model Version</FormLabel>
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
        <Button variant="contained" onClick={handleSave} color="primary">
          OK
        </Button>
      </Box>
    </ModalWindow>
  );
};

export default SettingsModal;