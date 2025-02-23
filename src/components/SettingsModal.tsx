// src/components/settingsModal.tsx
import React, { useState, useEffect } from 'react';
import ModalWindow from './modalWindow';
import { Tabs, Tab, Box, TextField, Button, Typography } from '@mui/material';
import {
  getNumberOfSections,
  setNumberOfSections,
  getApiKey,
  setApiKey,
  getApiEndpoint,
  setApiEndpoint,
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
  const [apiEndpoint, setApiEndpointState] = useState('');
  const [prompt, setPromptState] = useState('');
  const [systemPromptTemplate, setSystemPromptTemplateState] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNumberOfSectionsState(getNumberOfSections());
      setApiKeyState(getApiKey());
      setApiEndpointState(getApiEndpoint());
      setPromptState(getPrompt());
      setSystemPromptTemplateState(getSystemPromptTemplate());
    }
  }, [isOpen]);


  const handleSave = () => {
    const validSections = Math.max(1, Math.min(10, numberOfSections));
    setNumberOfSections(validSections);
    setApiKey(apiKey);
    setApiEndpoint(apiEndpoint);
    setPrompt(prompt);
    setSystemPromptTemplate(systemPromptTemplate)
    onClose();
  };

  return (
    <ModalWindow isOpen={isOpen} onClose={onClose}>
      <Typography variant="h6" gutterBottom>
        設定
      </Typography>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        <Tab label="Elements Setting" />
        <Tab label="API Setting" />
        <Tab label="Prompt" />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <Box>
            <TextField
              label="セクション数"
              type="number"
              value={numberOfSections}
              onChange={(e) => setNumberOfSectionsState(parseInt(e.target.value) || 3)}
              fullWidth
              margin="normal"
              inputProps={{ min: 1, max: 10 }}
            />
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <TextField
              label="API Endpoint"
              value={apiEndpoint}
              onChange={(e) => setApiEndpointState(e.target.value)}
              fullWidth
              margin="normal"
            />
            <TextField
              label="Gemini APIキー"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              fullWidth
              margin="normal"
              helperText="入力されたキーは暗号化して保存されます"
            />
          </Box>
        )}
        {activeTab === 2 && (
          <Box>
            <TextField
              label="Prompt"
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
          キャンセル
        </Button>
        <Button variant="contained" onClick={handleSave} color="primary">
          OK
        </Button>
      </Box>
    </ModalWindow>
  );
};

export default SettingsModal;