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
import { useTabs } from '../context/TabsContext';
import { useChatAssistant } from '../hooks/useChatAssistant';
import { SidePanel } from './side-panel/SidePanel';
import {
  setupVSCodeMessageListener,
  notifyDocumentUpdate,
  DocumentUpdatePayload,
  DocumentUpdatedMessagePayload,
} from '../utils/vscode/vscodeMessaging';
import { isVSCodeEditorMode, isVSCodeExtension } from '../utils/environment/environmentDetector';
import { HierarchicalStructure } from '../types/hierarchicalTypes';
import {
  loadMarkdownAsHierarchical,
  convertHierarchicalToMarkdown,
} from '../utils/file/markdownHelpers';

const AppContent: React.FC = () => {
  const renderCount = useRef(0);
  const hasInitializedFromExtensionRef = useRef(false);

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

  // AI生成機能、サジェスト機能用 ※ QuickMenuBar の AI アイコンを控厶します
  const { handleAIClick } = useAIGeneration({
    currentTab,
    dispatch,
  });

  // サイドパネルの開閉状態
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);

  const toggleSidePanel = useCallback(() => {
    setIsSidePanelOpen((prev) => !prev);
  }, []);

  // サイドパネル幅を CSS カスタムプロパティに反映
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--app-side-panel-width',
      isSidePanelOpen ? '360px' : '0px',
    );
  }, [isSidePanelOpen]);

  // チャット機能 (useChatAssistant)
  const getLatestState = useCallback(() => currentTab, [currentTab]);
  const { handleChatMessage, isLoading: isChatLoading } = useChatAssistant({
    currentTab,
    dispatch,
    getLatestState,
  });

  // 外部から AI アシスタントメッセージを受信しパネルを開く
  const [externalChatMessage, setExternalChatMessage] = useState('');
  useEffect(() => {
    const handleAIAssistantMessage = (event: CustomEvent) => {
      setIsSidePanelOpen(true);
      setExternalChatMessage(event.detail.message as string);
    };
    window.addEventListener('aiAssistantMessage', handleAIAssistantMessage as EventListener);
    return () => {
      window.removeEventListener('aiAssistantMessage', handleAIAssistantMessage as EventListener);
    };
  }, []);

  // ファイル操作関連機能
  const { handleSaveSvg, handleSaveElements, handleLoadElements } = useFileOperations({
    currentTab,
    addTab,
    updateTabState,
    updateTabName,
    switchTab,
    updateTabSaveStatus,
  });

  type EnvironmentInfo = {
    isExtension: boolean;
    isEditorMode: boolean;
    fileType: 'json' | 'markdown';
  };

  // 環境情報の状態管理
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo>(() => ({
    isExtension: isVSCodeExtension(),
    isEditorMode: isVSCodeEditorMode(),
    fileType: 'json',
  }));

  const currentFileTypeRef = useRef<'json' | 'markdown'>(environmentInfo.fileType);

  const { updateCurrentTabNumberOfSections, getCurrentTabNumberOfSections } = useTabs();

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
        hasInitializedFromExtensionRef.current = false;

        const fileType = data.fileType === 'markdown' ? 'markdown' : 'json';
        currentFileTypeRef.current = fileType;
        setEnvironmentInfo({
          isExtension: true,
          isEditorMode: Boolean(data.isEditorMode),
          fileType,
        });

        // VSCode拡張機能では既存のタブを使用、ブラウザでは新しいタブを作成
        const ensuredTabId = currentTabId ?? addTab();

        // ファイル名を常に設定
        updateTabName(ensuredTabId, data.fileName);

        if (fileType === 'markdown') {
          const converted = loadMarkdownAsHierarchical((data.content as string) || '');

          if (getCurrentTabNumberOfSections() !== 1) {
            updateCurrentTabNumberOfSections(1);
          }

          updateTabState(ensuredTabId, (prevState) => ({
            ...prevState,
            numberOfSections: 1,
            ...(converted
              ? {
                  hierarchicalData: converted,
                }
              : {}),
          }));

          if (converted) {
            updateTabSaveStatus(ensuredTabId, true);
          }

          const serializedForComparison = converted
            ? JSON.stringify(converted)
            : JSON.stringify(data.content);
          lastNotifiedStateRef.current = serializedForComparison;
        } else if (data.content) {
          updateTabState(ensuredTabId, (prevState) => ({
            ...prevState,
            hierarchicalData: data.content as HierarchicalStructure,
          }));
          updateTabSaveStatus(ensuredTabId, true);
          lastNotifiedStateRef.current = JSON.stringify(data.content);
        }

        hasInitializedFromExtensionRef.current = true;
      },
      // ドキュメント更新（更新後の最新データ）
      (data: DocumentUpdatedMessagePayload) => {
        if (currentTabRef.current && data.content) {
          const activeTabId = currentTabId;
          if (!activeTabId) {
            return;
          }

          // extensionからの更新であることを記録
          isUpdatingFromExtensionRef.current = true;
          hasInitializedFromExtensionRef.current = true;

          const fileType = data.fileType === 'markdown' ? 'markdown' : 'json';
          if (data.skipStateUpdate) {
            isUpdatingFromExtensionRef.current = false;
            return;
          }
          currentFileTypeRef.current = fileType;
          setEnvironmentInfo((prev) => ({
            ...prev,
            fileType,
          }));

          if (fileType === 'markdown') {
            const converted = loadMarkdownAsHierarchical((data.content as string) || '');

            if (getCurrentTabNumberOfSections() !== 1) {
              updateCurrentTabNumberOfSections(1);
            }

            updateTabState(activeTabId, (prevState) => ({
              ...prevState,
              numberOfSections: 1,
              ...(converted
                ? {
                    hierarchicalData: converted,
                  }
                : {}),
            }));

            const serializedForComparison = converted
              ? JSON.stringify(converted)
              : JSON.stringify(data.content);
            lastNotifiedStateRef.current = serializedForComparison;
          } else {
            updateTabState(activeTabId, (prevState) => ({
              ...prevState,
              hierarchicalData: data.content as HierarchicalStructure,
            }));
            lastNotifiedStateRef.current = JSON.stringify(data.content);
          }

          // ファイル名も更新（initializeWithFileが呼ばれない場合の対策）
          updateTabName(activeTabId, data.fileName);

          // lastNotifiedStateRefは上記で更新済み
        }
      },
    );

    return cleanup;
  }, [
    addTab,
    updateTabState,
    updateTabName,
    updateTabSaveStatus,
    currentTabId,
    getCurrentTabNumberOfSections,
    updateCurrentTabNumberOfSections,
  ]);

  // エディタモードでの状態変更をVSCodeに通知
  const lastNotifiedStateRef = useRef<string>('');
  const isUpdatingFromExtensionRef = useRef<boolean>(false);

  useEffect(() => {
    if (!environmentInfo.isEditorMode || !currentTab) {
      return;
    }

    if (!hasInitializedFromExtensionRef.current) {
      return;
    }

    // extensionからの更新中はスキップ
    if (isUpdatingFromExtensionRef.current) {
      isUpdatingFromExtensionRef.current = false;
      return;
    }

    // 状態が変更されたかチェック
    const currentStateStr = JSON.stringify(currentTab.state.hierarchicalData);
    if (currentStateStr === lastNotifiedStateRef.current) {
      return;
    }

    lastNotifiedStateRef.current = currentStateStr;

    if (currentTab.state.hierarchicalData) {
      const fileType = currentFileTypeRef.current;
      const payload: DocumentUpdatePayload = {
        hierarchicalData: currentTab.state.hierarchicalData,
        fileType,
        fileName: currentTab.name,
      };

      if (fileType === 'markdown') {
        payload.serializedContent = convertHierarchicalToMarkdown(
          currentTab.state.hierarchicalData,
        );
        payload.hierarchicalData = currentTab.state.hierarchicalData;
      }

      notifyDocumentUpdate(payload);
    }
  }, [currentTab?.state.hierarchicalData, currentTab, environmentInfo.isEditorMode]);

  const memoizedCanvasProvider = useMemo(() => {
    if (!currentTab) return null;

    const editorMode = environmentInfo.isEditorMode;
    const extensionMode = environmentInfo.isExtension;

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
          onToggleSidePanel={toggleSidePanel}
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
    toggleSidePanel,
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

      {/* サイドパネル (AI アシスタント + プロンプト設定) */}
      <SidePanelWrapper
        isOpen={isSidePanelOpen}
        onClose={toggleSidePanel}
        onSendMessage={handleChatMessage}
        isLoading={isChatLoading}
        externalMessage={externalChatMessage}
        onExternalMessageProcessed={() => setExternalChatMessage('')}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// SidePanelWrapper: 外部メッセージ自動送信のラッパー
// ---------------------------------------------------------------------------

interface SidePanelWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (message: string) => Promise<string | void>;
  isLoading: boolean;
  externalMessage: string;
  onExternalMessageProcessed: () => void;
}

function SidePanelWrapper({
  isOpen,
  onClose,
  onSendMessage,
  isLoading,
  externalMessage,
  onExternalMessageProcessed,
}: SidePanelWrapperProps) {
  const [pendingMessage, setPendingMessage] = useState('');

  useEffect(() => {
    if (externalMessage && externalMessage.trim()) {
      setPendingMessage(externalMessage);
      onExternalMessageProcessed();
    }
  }, [externalMessage, onExternalMessageProcessed]);

  const handleSend = useCallback(
    async (message: string) => {
      const result = await onSendMessage(message);
      setPendingMessage('');
      return result;
    },
    [onSendMessage],
  );

  // pendingMessage があれば SidePanel 側で自動送信されるよう渡す仕組みは
  // SidePanel 内部の externalMessage 対応で処理
  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      onSendMessage={handleSend}
      isLoading={isLoading}
      externalMessage={pendingMessage}
    />
  );
}

export default AppContent;
