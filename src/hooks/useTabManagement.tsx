'use client';

import { useCallback, useEffect } from 'react';
import { useTabs } from '../context/TabsContext';
import { extractRootElementTextFromElements } from '../utils/file';
import { determineFileName } from '../utils/file/fileHelpers';
import { Action } from '../types/actionTypes';
import { reducer } from '../state/state';

/**
 * タブ管理に関連するカスタムフック
 * タブの状態更新や名前変更、タブ閉じる前の確認などの機能を提供します
 */
export function useTabManagement() {
  const { tabs, currentTabId, addTab, closeTab, switchTab, updateTabState, updateTabName } = useTabs();
  const currentTab = tabs.find(tab => tab.id === currentTabId);

  // タブ状態の更新用のdispatch関数
  const dispatch = useCallback((action: Action) => {
    if (!currentTabId) return;
    updateTabState(currentTabId, prevState => reducer(prevState, action));
  }, [currentTabId, updateTabState]);

  // タブ名を更新する機能
  const updateTabNameFromRootElement = useCallback(() => {
    if (!currentTab || !currentTabId) return;

    const elements = Object.values(currentTab.state.elements);
    const rootElementText = extractRootElementTextFromElements(elements);
    
    if (rootElementText) {
      const newTabName = determineFileName(currentTab.name, rootElementText);
      if (newTabName !== currentTab.name) {
        updateTabName(currentTabId, newTabName);
      }
    }
  }, [currentTab, currentTabId, updateTabName]);

  // 要素が変更されたときにタブ名を自動更新
  useEffect(() => {
    if (currentTab) {
      updateTabNameFromRootElement();
    }
  }, [currentTab?.state.elements, updateTabNameFromRootElement]);

  // タブを閉じる前の確認処理
  const handleCloseTabRequest = useCallback((tabId: string) => {
    // ここは実際の未保存変更の検出ロジックに置き換えるべき
    const hasUnsavedChanges = true;
    
    if (hasUnsavedChanges) {
      return { needsConfirmation: true, tabId };
    } else {
      closeTab(tabId);
      return { needsConfirmation: false };
    }
  }, [closeTab]);

  return {
    tabs,
    currentTabId,
    currentTab,
    addTab,
    closeTab,
    switchTab,
    updateTabState,
    updateTabName, // updateTabNameを追加
    dispatch,
    updateTabNameFromRootElement,
    handleCloseTabRequest
  };
}
