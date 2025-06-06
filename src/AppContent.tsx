// src/AppContent.tsx
'use client';

import React, { useCallback } from 'react';
import { useTabManagement } from './hooks/useTabManagement';
import { useModalState } from './hooks/useModalState';
import { useAIGeneration } from './hooks/useAIGeneration';
import { useFileOperations } from './hooks/useFileOperations';
import { AppLayout } from './components/app-layout/AppLayout';

/**
 * アプリケーションのメインコンテンツコンポーネント
 * 機能が分割されたカスタムフックを利用して全体を統合します
 */
const AppContent: React.FC = () => {
  // タブ管理に関する機能
  const {
    tabs,
    currentTabId,
    currentTab,
    addTab,
    closeTab,
    switchTab,
    updateTabState,
    updateTabName,
    dispatch,
    handleCloseTabRequest,
  } = useTabManagement();

  // 編集終了のハンドラ
  const handleEndEditing = useCallback(() => {
    dispatch({ type: 'END_EDITING' });
  }, [dispatch]);

  // モーダル状態管理
  const [
    { isHelpOpen, isSettingsOpen, showCloseConfirm, tabToClose },
    {
      toggleHelp,
      toggleSettings,
      openCloseConfirm,
      setShowCloseConfirm,
      setTabToClose,
      closeConfirmModal,
    },
  ] = useModalState(handleEndEditing);

  // タブ閉じる要求時のハンドラー
  const handleTabCloseRequest = useCallback(
    (tabId: string) => {
      const result = handleCloseTabRequest(tabId);
      if (result.needsConfirmation && result.tabId) {
        openCloseConfirm(result.tabId);
      }
      return result;
    },
    [handleCloseTabRequest, openCloseConfirm],
  );

  // AI生成機能
  const { handleAIClick } = useAIGeneration({ currentTab, dispatch });

  // ファイル操作関連機能
  const { handleSaveSvg, handleSaveElements, handleLoadElements } = useFileOperations({
    currentTab,
    addTab,
    updateTabState,
    updateTabName,
    switchTab,
  });

  return (
    <AppLayout
      // タブ関連
      tabs={tabs}
      currentTabId={currentTabId}
      currentTab={currentTab}
      addTab={addTab}
      closeTab={closeTab}
      switchTab={switchTab}
      dispatch={dispatch}
      // モーダル関連
      isHelpOpen={isHelpOpen}
      isSettingsOpen={isSettingsOpen}
      showCloseConfirm={showCloseConfirm}
      tabToClose={tabToClose}
      toggleHelp={toggleHelp}
      toggleSettings={toggleSettings}
      handleCloseTabRequest={handleTabCloseRequest}
      setShowCloseConfirm={setShowCloseConfirm}
      // ファイル操作関連
      handleSaveSvg={handleSaveSvg}
      handleSaveElements={handleSaveElements}
      handleLoadElements={handleLoadElements}
      // AI機能
      handleAIClick={handleAIClick}
    />
  );
};

export default AppContent;
