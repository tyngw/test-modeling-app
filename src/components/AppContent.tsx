// src/AppContent.tsx
'use client';

import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { CanvasArea } from './canvas';
import QuickMenuBar from './menus/QuickMenuBar';
import TabHeaders from './tabHeaders/TabHeaders';
import SettingsModal from './SettingsModal';
import UnsaveConfirmModal from './UnsaveConfirmModal';
import HelpModal from './HelpModal';
import { CanvasProvider } from '../context/CanvasContext';
import { useToast } from '../context/ToastContext';
import { useFileOperations } from '../hooks/useFileOperations';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { useTabManagement } from '../hooks/useTabManagement';
import { useModalState } from '../hooks/useModalState';

const AppContent: React.FC = () => {
  const renderCount = useRef(0);

  // レンダリングの追跡
  useEffect(() => {
    renderCount.current += 1;
    // console.log(`[DEBUG] AppContent rendered #${renderCount.current}`);
  });

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
    updateTabSaveStatus,
    dispatch,
    handleCloseTabRequest,
    updateTabNameFromRootElement,
  } = useTabManagement();

  // 編集終了のハンドラ
  const handleEndEditing = useCallback(() => {
    dispatch({ type: 'END_EDITING' });
    updateTabNameFromRootElement();
  }, [dispatch, updateTabNameFromRootElement]);

  // モーダル状態管理
  const [
    { isHelpOpen, isSettingsOpen, showCloseConfirm, tabToClose },
    { toggleHelp, toggleSettings, setShowCloseConfirm, setTabToClose },
  ] = useModalState(handleEndEditing);

  const { addToast } = useToast();

  // タブ閉じる要求時のハンドラー
  const handleTabCloseRequest = useCallback(
    (tabId: string) => {
      const result = handleCloseTabRequest(tabId);
      if (result.needsConfirmation && result.tabId) {
        setTabToClose(result.tabId);
        setShowCloseConfirm(true);
      }
      return result;
    },
    [handleCloseTabRequest, setTabToClose, setShowCloseConfirm],
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
    updateTabSaveStatus,
  });

  const memoizedCanvasProvider = useMemo(() => {
    if (!currentTab) return null;
    return (
      <CanvasProvider state={currentTab.state} dispatch={dispatch}>
        <CanvasArea isHelpOpen={isHelpOpen} toggleHelp={toggleHelp} />
        <TabHeaders
          tabs={tabs}
          currentTabId={currentTabId}
          addTab={addTab}
          closeTab={handleTabCloseRequest}
          switchTab={switchTab}
        />
        <QuickMenuBar
          saveSvg={handleSaveSvg}
          loadElements={handleLoadElements}
          saveElements={handleSaveElements}
          toggleHelp={toggleHelp}
          toggleSettings={toggleSettings}
          onAIClick={handleAIClick}
        />
      </CanvasProvider>
    );
  }, [
    currentTab,
    dispatch,
    toggleHelp,
    isHelpOpen,
    currentTabId,
    updateTabName,
    toggleSettings,
    addToast,
    handleAIClick,
    handleLoadElements,
    handleSaveElements,
    addTab,
    handleTabCloseRequest,
    switchTab,
    tabs,
    handleSaveSvg,
  ]);

  return (
    <div>
      {memoizedCanvasProvider}

      <UnsaveConfirmModal
        showCloseConfirm={showCloseConfirm}
        setShowCloseConfirm={setShowCloseConfirm}
        tabToClose={tabToClose}
        closeTab={closeTab}
        dispatch={dispatch}
        modalId="confirm-modal"
        onOpen={() => dispatch({ type: 'END_EDITING' })}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={toggleSettings}
        dispatch={dispatch}
        modalId="settings-modal"
        onOpen={() => dispatch({ type: 'END_EDITING' })}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={toggleHelp}
        dispatch={dispatch}
        modalId="help-modal"
        onOpen={() => dispatch({ type: 'END_EDITING' })}
      />
    </div>
  );
};

export default AppContent;
