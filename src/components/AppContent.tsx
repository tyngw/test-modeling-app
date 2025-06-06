// src/AppContent.tsx
'use client';

import { ToastMessages } from '../constants/toastMessages';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { CanvasArea } from './canvas';
import QuickMenuBar from './menus/QuickMenuBar';
import TabHeaders from './tabHeaders/TabHeaders';
import SettingsModal from './SettingsModal';
import UnsaveConfirmModal from './UnsaveConfirmModal';
import HelpModal from './HelpModal';
import { CanvasProvider } from '../context/CanvasContext';
import { useTabs } from '../context/TabsContext';
import { reducer } from '../state/state';
import { Action } from '../types/actionTypes';
import {
  saveSvg,
  loadElements,
  saveElements,
  extractRootElementTextFromElements,
} from '../utils/file';
import { determineFileName } from '../utils/file/fileHelpers';
import { generateElementSuggestions } from '../utils/api';
import { getApiKey, getModelType } from '../utils/storage';
import { formatElementsForPrompt } from '../utils/element';
import { createUserPrompt } from '../constants/promptHelpers';
import { useToast } from '../context/ToastContext';
import { useFileOperations } from '../hooks/useFileOperations';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { useTabManagement } from '../hooks/useTabManagement';
import { useModalState } from '../hooks/useModalState';

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
    updateTabSaveStatus,
    forceCloseTab,
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

  // タブ名を更新する機能
  const updateTabNameFromRootElement = useCallback(() => {
    if (!currentTab) return;

    const elements = Object.values(currentTab.state.elements);
    const rootElementText = extractRootElementTextFromElements(elements);

    if (rootElementText) {
      const newTabName = determineFileName(currentTab.name, rootElementText);
      if (newTabName !== currentTab.name) {
        updateTabName(currentTabId, newTabName);
      }
    }
  }, [currentTab, currentTabId, updateTabName]);

  // 要素が変更されたときにタブ名を更新
  useEffect(() => {
    if (currentTab) {
      updateTabNameFromRootElement();
    }
  }, [currentTab?.state.elements, updateTabNameFromRootElement]);

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
          saveSvg={() =>
            saveSvg(document.querySelector('.svg-element') as SVGSVGElement, 'download.svg')
          }
          loadElements={handleLoadElements}
          saveElements={handleSaveElements}
          toggleHelp={toggleHelp}
          toggleSettings={toggleSettings}
          onAIClick={handleAIClick}
        />

        <UnsaveConfirmModal
          showCloseConfirm={showCloseConfirm}
          setShowCloseConfirm={setShowCloseConfirm}
          tabToClose={tabToClose}
          closeTab={closeTab}
        />

        <SettingsModal isOpen={isSettingsOpen} onClose={toggleSettings} />
        <HelpModal isOpen={isHelpOpen} onClose={toggleHelp} />
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
    showCloseConfirm,
    tabToClose,
    closeTab,
    isSettingsOpen,
    handleLoadElements,
    handleSaveElements,
  ]);

  return <div>{memoizedCanvasProvider}</div>;
};

export default AppContent;
