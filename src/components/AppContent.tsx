// src/AppContent.tsx
'use client';

import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { CanvasArea } from './canvas';
import QuickMenuBar from './header/QuickMenuBar';
import TabHeaders from './header/TabHeaders';
import SettingsModal from './modal/SettingsModal';
import UnsaveConfirmModal from './modal/UnsaveConfirmModal';
import HelpModal from './modal/HelpModal';
import { CanvasProvider } from '../context/CanvasContext';
import { useFileOperations } from '../hooks/useFileOperations';
import { useAIGeneration } from '../hooks/useAIGeneration';
import { useTabManagement } from '../hooks/useTabManagement';
import { useModalState } from '../hooks/useModalState';
import { setupVSCodeMessageListener, notifyDocumentUpdate } from '../utils/vscode/vscodeMessaging';
import { isVSCodeEditorMode, isVSCodeExtension } from '../utils/environment/environmentDetector';
import { HierarchicalStructure } from '../types/hierarchicalTypes';

const AppContent: React.FC = () => {
  const renderCount = useRef(0);

  // レンダリングの追跡
  useEffect(() => {
    renderCount.current += 1;
    // debugLog(`[DEBUG] AppContent rendered #${renderCount.current}`);
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
  const { handleAIClick, isLoading } = useAIGeneration({
    currentTab,
    dispatch,
  });

  // ファイル操作関連機能
  const { handleSaveSvg, handleSaveElements, handleLoadElements } = useFileOperations({
    currentTab,
    addTab,
    updateTabState,
    updateTabName,
    switchTab,
    updateTabSaveStatus,
  });

  // 環境情報の状態管理
  const [environmentInfo, setEnvironmentInfo] = useState(() => ({
    isExtension: isVSCodeExtension(),
    isEditorMode: isVSCodeEditorMode(),
  }));

  // 最新のcurrentTabを追跡
  const currentTabRef = useRef(currentTab);
  useEffect(() => {
    currentTabRef.current = currentTab;
  }, [currentTab]);

  // VSCodeメッセージリスナーの設定
  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const cleanup = setupVSCodeMessageListener(
      // ファイル初期化
      (data) => {
        console.log('[AppContent] Initializing with file:', data.fileName);
        setEnvironmentInfo({ isExtension: true, isEditorMode: Boolean(data.isEditorMode) });

        // 新しいタブを作成してファイルデータを読み込み
        const newTabId = addTab();
        if (data.content) {
          updateTabState(newTabId, (prevState) => ({
            ...prevState,
            hierarchicalData: data.content as HierarchicalStructure,
          }));
          updateTabName(newTabId, data.fileName);
          updateTabSaveStatus(newTabId, true);
        }
      },
      // ドキュメント更新（更新後の最新データ）
      (data) => {
        console.log('[AppContent] Document updated:', data.fileName);

        if (currentTabRef.current && data.content) {
          // extensionからの更新であることを記録
          isUpdatingFromExtensionRef.current = true;

          updateTabState(currentTabId, (prevState) => ({
            ...prevState,
            hierarchicalData: data.content as HierarchicalStructure,
          }));
          updateTabName(currentTabId, data.fileName);

          // lastNotifiedStateRefも更新して、次回の比較をスキップ
          lastNotifiedStateRef.current = JSON.stringify(data.content);
        }
      },
    );

    return cleanup;
  }, [addTab, updateTabState, updateTabName, updateTabSaveStatus, currentTabId]);

  // エディタモードでの状態変更をVSCodeに通知
  const lastNotifiedStateRef = useRef<string>('');
  const isUpdatingFromExtensionRef = useRef<boolean>(false);

  useEffect(() => {
    if (!environmentInfo.isEditorMode || !currentTab) {
      return;
    }

    // extensionからの更新中はスキップ
    if (isUpdatingFromExtensionRef.current) {
      console.log('[AppContent] Skipping notification (updating from extension)');
      isUpdatingFromExtensionRef.current = false;
      return;
    }

    // 状態が変更されたかチェック
    const currentStateStr = JSON.stringify(currentTab.state.hierarchicalData);
    if (currentStateStr === lastNotifiedStateRef.current) {
      return;
    }

    console.log('[AppContent] State changed, notifying VSCode');
    lastNotifiedStateRef.current = currentStateStr;

    if (currentTab.state.hierarchicalData) {
      notifyDocumentUpdate(currentTab.state.hierarchicalData);
    }
  }, [currentTab?.state.hierarchicalData, currentTab, environmentInfo.isEditorMode]);

  const memoizedCanvasProvider = useMemo(() => {
    if (!currentTab) return null;

    const editorMode = environmentInfo.isEditorMode;
    const extensionMode = environmentInfo.isExtension;

    return (
      <CanvasProvider state={currentTab.state} dispatch={dispatch}>
        <CanvasArea isHelpOpen={isHelpOpen} toggleHelp={toggleHelp} />
        {/* エディタモードではタブバーを非表示 */}
        {!editorMode && (
          <TabHeaders
            tabs={tabs}
            currentTabId={currentTabId}
            addTab={addTab}
            closeTab={handleTabCloseRequest}
            switchTab={switchTab}
          />
        )}
        <QuickMenuBar
          saveSvg={handleSaveSvg}
          loadElements={handleLoadElements}
          saveElements={handleSaveElements}
          toggleHelp={toggleHelp}
          toggleSettings={toggleSettings}
          onAIClick={handleAIClick}
          isAILoading={isLoading}
          isEditorMode={editorMode}
          isVSCodeExtension={extensionMode}
        />
      </CanvasProvider>
    );
  }, [
    currentTab,
    dispatch,
    toggleHelp,
    isHelpOpen,
    currentTabId,
    toggleSettings,
    handleAIClick,
    handleLoadElements,
    handleSaveElements,
    addTab,
    handleTabCloseRequest,
    switchTab,
    tabs,
    handleSaveSvg,
    isLoading,
    environmentInfo,
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
