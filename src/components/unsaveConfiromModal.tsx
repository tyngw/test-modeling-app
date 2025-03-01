// src/components/unsaveConfiromModal.tsx
import React from 'react';
import ModalWindow from './modalWindow';
import { Button } from '@mui/material';

interface UnsaveConfirmModalProps {
  showCloseConfirm: boolean;
  setShowCloseConfirm: (value: boolean) => void;
  tabToClose: string | null;
  closeTab: (id: string) => void;
}

const UnsaveConfirmModal: React.FC<UnsaveConfirmModalProps> = ({
  showCloseConfirm,
  setShowCloseConfirm,
  tabToClose,
  closeTab,
}) => {
  if (!showCloseConfirm) return null;
  return (
    <ModalWindow
      isOpen={showCloseConfirm}
      onClose={() => setShowCloseConfirm(false)}
    >
      <div style={{ padding: '20px' }}>
        <p style={{ marginBottom: '20px' }}>
          タブを閉じてよろしいですか？
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <Button
            variant="outlined"
            onClick={() => setShowCloseConfirm(false)}
          >
            いいえ
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (tabToClose) closeTab(tabToClose);
              setShowCloseConfirm(false);
            }}
          >
            はい
          </Button>
        </div>
      </div>
    </ModalWindow>
  );
};

export default UnsaveConfirmModal;