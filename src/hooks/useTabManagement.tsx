'use client';

import { useCallback } from 'react';
import { useTabs } from '../context/TabsContext';
import { extractRootElementTextFromHierarchy } from '../utils/file';
import { determineFileName } from '../utils/file/fileHelpers';
import { Action } from '../types/actionTypes';
import { reducer } from '../state/state';

/**
 * タブ管理に関連するカスタムフック
 * タブの状態更新や名前変更、タブ閉じる前の確認などの機能を提供します
 */
export function useTabManagement() {
  const {
    tabs,
    currentTabId,
    addTab,
    closeTab,
    switchTab,
    updateTabState,
    updateTabName,
    updateTabSaveStatus,
  } = useTabs();
  const currentTab = tabs.find((tab) => tab.id === currentTabId);

  // タブ状態の更新用のdispatch関数
  const dispatch = useCallback(
    (action: Action) => {
      if (!currentTabId) return;
      updateTabState(currentTabId, (prevState) => {
        const newState = reducer(prevState, action);

        // 編集終了時にタブ名を更新
        if (action.type === 'END_EDITING') {
          const rootElementText = extractRootElementTextFromHierarchy(newState.hierarchicalData);

          if (rootElementText) {
            const newTabName = determineFileName(currentTab?.name || '無題', rootElementText);
            if (newTabName !== currentTab?.name) {
              updateTabName(currentTabId, newTabName);
            }
          }
        }

        return newState;
      });
    },
    [currentTabId, updateTabState, currentTab, updateTabName],
  );

  // タブ名を更新する機能（編集完了時のみ使用）
  const updateTabNameFromRootElement = useCallback(() => {
    if (!currentTab || !currentTabId) return;

    const rootElementText = extractRootElementTextFromHierarchy(currentTab.state.hierarchicalData);

    if (rootElementText) {
      const newTabName = determineFileName(currentTab.name, rootElementText);
      if (newTabName !== currentTab.name) {
        updateTabName(currentTabId, newTabName);
      }
    }
  }, [currentTab, currentTabId, updateTabName]);

  // タブを閉じる前の確認処理
  const handleCloseTabRequest = useCallback(
    (tabId: string) => {
      // タブを取得
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab) {
        closeTab(tabId);
        return { needsConfirmation: false };
      }

      // JSON形式で保存されている場合は確認なしで閉じる
      if (tab.isSaved) {
        closeTab(tabId);
        return { needsConfirmation: false };
      } else {
        // 保存されていない場合は確認ダイアログを表示
        return { needsConfirmation: true, tabId };
      }
    },
    [tabs, closeTab],
  );

  // タブを強制的に閉じる関数
  const forceCloseTab = useCallback(
    (tabId: string) => {
      closeTab(tabId);
    },
    [closeTab],
  );

  return {
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
    updateTabNameFromRootElement,
    handleCloseTabRequest,
  };
}
