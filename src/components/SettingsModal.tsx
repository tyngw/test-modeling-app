// src/components/SettingsModal.tsx
import React, { useState, useEffect } from 'react';
import ModalWindow from './ModalWindow';
import { Tabs, Tab, Box, TextField, Button, Typography } from '@mui/material';
import CryptoJS from 'crypto-js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { numberOfSections: number; apiKey: string }) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [numberOfSections, setNumberOfSections] = useState(3);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen) {
      // LocalStorageから設定値を読み込む
      const savedSections = localStorage.getItem('numberOfSections');
      const savedEncryptedKey = localStorage.getItem('apiKey');

      setNumberOfSections(savedSections ? parseInt(savedSections, 10) : 3);
      setApiKey(savedEncryptedKey ? CryptoJS.AES.decrypt(savedEncryptedKey, 'encryptionKey').toString(CryptoJS.enc.Utf8) : '');
    }
  }, [isOpen]);

  const handleSave = () => {
    // 入力値を検証
    const validSections = Math.max(1, Math.min(10, numberOfSections));
    const encryptedKey = CryptoJS.AES.encrypt(apiKey, 'encryptionKey').toString();

    // LocalStorageに保存
    localStorage.setItem('numberOfSections', validSections.toString());
    localStorage.setItem('apiKey', encryptedKey);

    // 親コンポーネントに通知
    onSave({
      numberOfSections: validSections,
      apiKey: apiKey
    });

    onClose();
  };

  return (
    <ModalWindow isOpen={isOpen} onClose={onClose}>
      <Typography variant="h6" gutterBottom>
        設定
      </Typography>
      
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        <Tab label="Elements Setting" />
        <Tab label="API Key" />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <Box>
            <TextField
              label="セクション数"
              type="number"
              value={numberOfSections}
              onChange={(e) => setNumberOfSections(parseInt(e.target.value) || 3)}
              fullWidth
              margin="normal"
              inputProps={{ min: 1, max: 10 }}
            />
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <TextField
              label="APIキー"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              fullWidth
              margin="normal"
              helperText="入力されたキーは暗号化して保存されます"
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