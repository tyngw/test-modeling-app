'use client';

import { useState, useCallback } from 'react';

type ModalStates = {
  isHelpOpen: boolean;
  isSettingsOpen: boolean;
  showCloseConfirm: boolean;
  tabToClose: string | null;
};

type ModalActions = {
  toggleHelp: () => void;
  toggleSettings: () => void;
  openCloseConfirm: (tabId: string) => void;
  closeConfirmModal: () => void;
  setShowCloseConfirm: (value: boolean) => void;
  setTabToClose: (tabId: string | null) => void;
};

/**
 * モーダルウィンドウの表示状態を管理するカスタムフック
 * ヘルプモーダル、設定モーダル、閉じる確認モーダルの状態と制御機能を提供します
 */
export function useModalState(onEditingEnd: () => void): [ModalStates, ModalActions] {
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tabToClose, setTabToClose] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const toggleHelp = useCallback(() => {
    onEditingEnd();
    setHelpOpen(prev => !prev);
  }, [onEditingEnd]);

  const toggleSettings = useCallback(() => {
    onEditingEnd();
    setIsSettingsOpen(prev => !prev);
  }, [onEditingEnd]);

  const openCloseConfirm = useCallback((tabId: string) => {
    setTabToClose(tabId);
    setShowCloseConfirm(true);
  }, []);

  const closeConfirmModal = useCallback(() => {
    setShowCloseConfirm(false);
    setTabToClose(null);
  }, []);

  return [
    { isHelpOpen, isSettingsOpen, showCloseConfirm, tabToClose },
    { 
      toggleHelp, 
      toggleSettings, 
      openCloseConfirm, 
      closeConfirmModal,
      setShowCloseConfirm,  // セッターを追加
      setTabToClose        // セッターを追加
    }
  ];
}
