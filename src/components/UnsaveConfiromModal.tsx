// src/components/unsaveConfiromModal.tsx
import React from 'react';
import ModalWindow from './ModalWindow';
import { Button } from '@mui/material';
import { getCurrentTheme } from '../utils/colorHelpers';
import { getCanvasBackgroundColor } from '../utils/localStorageHelpers';

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

  const currentTheme = getCurrentTheme(getCanvasBackgroundColor());

  return (
    <ModalWindow
      isOpen={showCloseConfirm}
      onClose={() => setShowCloseConfirm(false)}
      closeOnOverlayClick={false}
    >
      <div style={{ 
        padding: '10px 5px 20px',
        textAlign: 'center' as const,
      }}>
        <div style={{ 
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            marginBottom: '10px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: `${currentTheme.MODAL.TEXT_COLOR}15`,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V13" stroke={currentTheme.MODAL.TEXT_COLOR} strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="17" r="1" fill={currentTheme.MODAL.TEXT_COLOR}/>
              </svg>
            </div>
            <h3 style={{ 
              margin: 0,
              fontSize: '20px',
              fontWeight: 600
            }}>
              確認
            </h3>
          </div>
          <p style={{ 
            margin: '0 0 10px',
            fontSize: '15px',
            opacity: 0.8,
            lineHeight: 1.5,
            maxWidth: '350px'
          }}>
            タブを閉じてよろしいですか？
          </p>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '30px'
        }}>
          <Button
            variant="outlined"
            onClick={() => setShowCloseConfirm(false)}
            sx={{
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none',
              boxShadow: 'none',
              transition: 'all 0.2s ease',
              backgroundColor: currentTheme.MODAL.BUTTON_BACKGROUND,
              borderColor: currentTheme.MODAL.BUTTON_BORDER,
              color: currentTheme.MODAL.BUTTON_TEXT,
              '&:hover': {
                backgroundColor: currentTheme.MODAL.BUTTON_BACKGROUND,
                opacity: 0.9,
              }
            }}
          >
            いいえ
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (tabToClose) closeTab(tabToClose);
              setShowCloseConfirm(false);
            }}
            sx={{
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none',
              boxShadow: 'none',
              transition: 'all 0.2s ease',
              backgroundColor: currentTheme.MODAL.BUTTON_PRIMARY_BACKGROUND,
              color: currentTheme.MODAL.BUTTON_PRIMARY_TEXT,
              '&:hover': {
                backgroundColor: currentTheme.MODAL.BUTTON_PRIMARY_BACKGROUND,
                opacity: 0.9,
              }
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
