'use client';

import React, { useMemo } from 'react';
import { CanvasProvider } from '../../context/CanvasContext';
import { CanvasArea } from '../../components/canvas';
import QuickMenuBar from '../../components/menus/QuickMenuBar';
import TabHeaders from '../../components/tabHeaders/TabHeaders';
import HelpModal from '../../components/HelpModal';
import SettingsModal from '../../components/SettingsModal';
import UnsaveConfirmModal from '../../components/UnsaveConfirmModal';
import { TabState } from '../../types/tabTypes';
import { Action } from '../../types/actionTypes';

interface AppLayoutProps {
  // タブ関連
  tabs: TabState[];
  currentTabId: string;
  currentTab: TabState | undefined;
  addTab: () => string;
  closeTab: (tabId: string) => void;
  forceCloseTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  dispatch: (action: Action) => void;

  // モーダル関連
  isHelpOpen: boolean;
  isSettingsOpen: boolean;
  showCloseConfirm: boolean;
  tabToClose: string | null;
  toggleHelp: () => void;
  toggleSettings: () => void;
  handleCloseTabRequest: (tabId: string) => { needsConfirmation: boolean; tabId?: string };
  setShowCloseConfirm: (value: boolean) => void; // 追加

  // ファイル操作関連
  handleSaveSvg: () => void;
  handleSaveElements: () => void;
  handleLoadElements: (event: React.ChangeEvent<HTMLInputElement>) => void;

  // AI機能
  handleAIClick: () => void;
}

/**
 * アプリケーションのメインレイアウトを提供するコンポーネント
 * キャンバスエリア、メニュー、タブ、モーダルなどを配置します
 */
export function AppLayout({
  // タブ関連
  tabs,
  currentTabId,
  currentTab,
  addTab,
  closeTab,
  forceCloseTab,
  switchTab,
  dispatch,

  // モーダル関連
  isHelpOpen,
  isSettingsOpen,
  showCloseConfirm,
  tabToClose,
  toggleHelp,
  toggleSettings,
  handleCloseTabRequest,
  setShowCloseConfirm, // プロパティを追加

  // ファイル操作関連
  handleSaveSvg,
  handleSaveElements,
  handleLoadElements,

  // AI機能
  handleAIClick,
}: AppLayoutProps) {
  const memoizedCanvasProvider = useMemo(() => {
    if (!currentTab) return null;

    return (
      <CanvasProvider state={currentTab.state} dispatch={dispatch}>
        <CanvasArea isHelpOpen={isHelpOpen} toggleHelp={toggleHelp} />

        <TabHeaders
          tabs={tabs}
          currentTabId={currentTabId}
          addTab={addTab}
          closeTab={handleCloseTabRequest}
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

        <UnsaveConfirmModal
          showCloseConfirm={showCloseConfirm}
          setShowCloseConfirm={setShowCloseConfirm}
          tabToClose={tabToClose}
          closeTab={forceCloseTab}
          dispatch={dispatch}
        />

        <SettingsModal isOpen={isSettingsOpen} onClose={toggleSettings} dispatch={dispatch} />

        <HelpModal isOpen={isHelpOpen} onClose={toggleHelp} dispatch={dispatch} />
      </CanvasProvider>
    );
  }, [
    currentTab,
    dispatch,
    isHelpOpen,
    isSettingsOpen,
    showCloseConfirm,
    tabToClose,
    tabs,
    currentTabId,
    addTab,
    closeTab,
    switchTab,
    toggleHelp,
    toggleSettings,
    handleCloseTabRequest,
    setShowCloseConfirm,
    handleSaveSvg,
    handleSaveElements,
    handleLoadElements,
    handleAIClick,
  ]);

  return <div>{memoizedCanvasProvider}</div>;
}
