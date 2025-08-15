// src/components/unsaveConfiromModal.tsx
import React from 'react';
import ModalWindow from './ModalWindow';
import { Button } from '@mui/material';
import { getCurrentTheme } from '../../utils/style/colorHelpers';
import { getCanvasBackgroundColor } from '../../utils/storage/localStorageHelpers';
import ConfirmIcon from '../icons/ConfirmIcon';
import { Action } from '../../types/actionTypes';

interface UnsaveConfirmModalProps {
  showCloseConfirm: boolean;
  setShowCloseConfirm: (value: boolean) => void;
  tabToClose: string | null;
  closeTab: (id: string) => void;
  dispatch: React.Dispatch<Action>;
  modalId?: string;
  onOpen?: () => void;
}

const UnsaveConfirmModal: React.FC<UnsaveConfirmModalProps> = ({
  showCloseConfirm,
  setShowCloseConfirm,
  tabToClose,
  closeTab,
  dispatch,
  modalId,
  onOpen,
}) => {
  if (!showCloseConfirm) return null;

  const currentTheme = getCurrentTheme(getCanvasBackgroundColor());

  return (
    <ModalWindow
      isOpen={showCloseConfirm}
      onClose={() => setShowCloseConfirm(false)}
      closeOnOverlayClick={false}
      title="確認"
      icon={<ConfirmIcon />}
      dispatch={dispatch}
      modalId={modalId}
      onOpen={onOpen}
    >
      <div
        style={{
          padding: '10px 5px 20px',
          textAlign: 'left' as const,
        }}
      >
        <p
          style={{
            margin: '0 0 10px',
            fontSize: '15px',
            opacity: 0.8,
            lineHeight: 1.5,
            maxWidth: '350px',
            marginTop: '10px',
          }}
        >
          保存していない変更があります。
          <br />
          タブを閉じてよろしいですか？
        </p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '16px',
            marginTop: '30px',
          }}
        >
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
              },
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
              },
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
