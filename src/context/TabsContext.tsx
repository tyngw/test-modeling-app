// src/context/tabsContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { State, initialState } from '../state/state';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_POSITION, NUMBER_OF_SECTIONS } from '../config/elementSettings';
import { createNewElement } from '../utils/element/elementHelpers';
import { convertLegacyElement } from '../utils/file/fileHelpers';
import { getTabsState, setTabsState } from '../utils/storage/localStorageHelpers';
import { TabState, TabsStorage, TabsContextValue, LayoutMode } from '../types/tabTypes';

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const createInitialTabState = (currentSections?: number): TabState => {
  const newRootId = '1';
  const numSections = currentSections ?? NUMBER_OF_SECTIONS;
  const defaultLayoutMode: LayoutMode = 'default';

  const initialElements = {
    [newRootId]: {
      ...createNewElement({
        numSections: numSections,
      }),
      id: newRootId,
      x: DEFAULT_POSITION.X,
      y: DEFAULT_POSITION.Y,
      editing: false,
    },
  };

  return {
    id: uuidv4(),
    name: '無題',
    isSaved: false,
    lastSavedElements: JSON.stringify(initialElements),
    state: {
      ...initialState,
      numberOfSections: numSections,
      // elementsをelementsCacheに変換
      ...(Object.keys(initialElements).length > 0 && {
        elementsCache: initialElements,
      }),
      layoutMode: defaultLayoutMode, // state.layoutModeも同じ値を設定
    },
    layoutMode: defaultLayoutMode, // tab.layoutModeも同じ値を設定
  };
};

// ローカルストレージから状態を読み込む
const loadTabsState = (): TabsStorage => {
  try {
    const saved = getTabsState();
    if (saved) {
      const parsed: TabsStorage = JSON.parse(saved);
      // データ整合性チェック
      if (Array.isArray(parsed?.tabs) && typeof parsed?.currentTabId === 'string') {
        // タブデータを変換
        const convertedTabs = parsed.tabs.map((tab) => ({
          ...tab,
          // レイアウトモードが設定されていない場合は'default'を設定（後方互換性のため）
          layoutMode: tab.layoutMode || 'default',
          state: {
            ...tab.state,
            // 古いelements形式を新しいelementsCache形式に変換
            ...('elements' in tab.state && {
              elementsCache: Object.fromEntries(
                Object.entries((tab.state as any).elements).map(([id, element]) => [
                  id,
                  convertLegacyElement(element),
                ]),
              ),
            }),
          },
        }));

        // 現在のタブIDが存在しない場合は最初のタブを選択
        const validCurrentTabId = convertedTabs.some((t: TabState) => t.id === parsed.currentTabId)
          ? parsed.currentTabId
          : convertedTabs[0]?.id || '';

        return {
          tabs: convertedTabs,
          currentTabId: validCurrentTabId,
        };
      }
    }
  } catch (e) {
    // エラーが発生した場合は新規作成
  }

  // 新規作成
  const initialTab = createInitialTabState();
  return {
    tabs: [initialTab],
    currentTabId: initialTab.id,
  };
};

// ローカルストレージに状態を保存
const saveTabsToLocalStorage = (tabs: TabState[], currentTabId: string) => {
  const saveData: TabsStorage = { tabs, currentTabId };
  setTabsState(JSON.stringify(saveData));
};

export const TabsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tabsState, setTabsState] = useState(() => loadTabsState());
  const { tabs, currentTabId } = tabsState;

  useEffect(() => {
    saveTabsToLocalStorage(tabs, currentTabId);
  }, [tabs, currentTabId]);

  const addTab = useCallback(() => {
    // 現在のタブのセクション数を取得して新しいタブに適用
    const currentTab = tabs.find((tab) => tab.id === currentTabId);
    const currentSections = currentTab?.state.numberOfSections ?? NUMBER_OF_SECTIONS;
    const newTab = createInitialTabState(currentSections);
    setTabsState((prev) => ({
      tabs: [...prev.tabs, newTab],
      currentTabId: newTab.id,
    }));
    return newTab.id;
  }, [tabs, currentTabId]);

  const closeTab = useCallback((tabId: string) => {
    setTabsState((prev) => {
      if (prev.tabs.length === 1) return prev;
      const newTabs = prev.tabs.filter((tab) => tab.id !== tabId);
      const newCurrentTabId =
        tabId === prev.currentTabId ? newTabs[0]?.id || '' : prev.currentTabId;
      return { tabs: newTabs, currentTabId: newCurrentTabId };
    });
  }, []);

  const switchTab = useCallback((tabId: string) => {
    setTabsState((prev) => {
      const targetTab = prev.tabs.find((tab) => tab.id === tabId);
      if (!targetTab) return prev;

      // 切り替え先のタブのlayoutModeでstateを更新
      const updatedTabs = prev.tabs.map((tab) => {
        if (tab.id === tabId) {
          return {
            ...tab,
            state: {
              ...tab.state,
              layoutMode: tab.layoutMode,
            },
          };
        }
        return tab;
      });

      return {
        ...prev,
        currentTabId: tabId,
        tabs: updatedTabs,
      };
    });
  }, []);

  const updateTabState = useCallback((tabId: string, updater: (prevState: State) => State) => {
    setTabsState((prev) => {
      const updatedTabs = prev.tabs.map((tab) => {
        if (tab.id === tabId) {
          const updatedState = updater(tab.state);

          // 現在の要素の状態をJSON文字列に変換（整形して比較）
          const normalizedElements = JSON.parse(JSON.stringify(updatedState.elementsCache || {}));
          const currentElementsJson = JSON.stringify(normalizedElements);

          // 最後に保存された要素の状態と比較して、変更があるかどうかを判断
          const hasChanges = tab.lastSavedElements !== currentElementsJson;

          return {
            ...tab,
            state: updatedState,
            // 変更がある場合は未保存状態に設定
            isSaved: !hasChanges,
          };
        }
        return tab;
      });

      return {
        ...prev,
        tabs: updatedTabs,
      };
    });
  }, []);

  const updateTabName = useCallback((tabId: string, newName: string) => {
    setTabsState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((tab) => (tab.id === tabId ? { ...tab, name: newName } : tab)),
    }));
  }, []);

  const updateTabSaveStatus = useCallback(
    (tabId: string, isSaved: boolean, lastSavedElements?: string) => {
      setTabsState((prev) => {
        const updatedTabs = prev.tabs.map((tab) => {
          if (tab.id === tabId) {
            return {
              ...tab,
              isSaved,
              // lastSavedElements が指定されている場合は更新
              lastSavedElements: lastSavedElements || tab.lastSavedElements,
            };
          }
          return tab;
        });

        return {
          ...prev,
          tabs: updatedTabs,
        };
      });
    },
    [],
  );

  const getCurrentTabState = useCallback(() => {
    const currentTab = tabs.find((tab) => tab.id === currentTabId);
    return currentTab?.state;
  }, [tabs, currentTabId]);

  const getCurrentTabNumberOfSections = useCallback(() => {
    const currentTab = tabs.find((tab) => tab.id === currentTabId);
    return currentTab?.state.numberOfSections ?? NUMBER_OF_SECTIONS;
  }, [tabs, currentTabId]);

  const updateCurrentTabNumberOfSections = useCallback(
    (value: number) => {
      const clampedValue = Math.max(1, Math.min(10, value));
      updateTabState(currentTabId, (prevState) => ({
        ...prevState,
        numberOfSections: clampedValue,
      }));
    },
    [currentTabId, updateTabState],
  );

  const getCurrentTabLayoutMode = useCallback(() => {
    const currentTab = tabs.find((tab) => tab.id === currentTabId);
    return currentTab?.layoutMode || 'default';
  }, [tabs, currentTabId]);

  const updateCurrentTabLayoutMode = useCallback(
    (mode: LayoutMode) => {
      setTabsState((prev) => ({
        ...prev,
        tabs: prev.tabs.map((tab) =>
          tab.id === currentTabId
            ? {
                ...tab,
                layoutMode: mode,
                state: {
                  ...tab.state,
                  layoutMode: mode,
                },
              }
            : tab,
        ),
      }));
    },
    [currentTabId],
  );

  const contextValue = useMemo(
    () => ({
      tabs,
      currentTabId,
      addTab,
      closeTab,
      switchTab,
      updateTabState,
      updateTabName,
      updateTabSaveStatus,
      getCurrentTabState,
      getCurrentTabNumberOfSections,
      updateCurrentTabNumberOfSections,
      getCurrentTabLayoutMode,
      updateCurrentTabLayoutMode,
    }),
    [
      tabs,
      currentTabId,
      addTab,
      closeTab,
      switchTab,
      updateTabState,
      updateTabName,
      updateTabSaveStatus,
      getCurrentTabState,
      getCurrentTabNumberOfSections,
      updateCurrentTabNumberOfSections,
      getCurrentTabLayoutMode,
      updateCurrentTabLayoutMode,
    ],
  );

  return <TabsContext.Provider value={contextValue}>{children}</TabsContext.Provider>;
};

export const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('useTabs must be used within a TabsProvider');
  return context;
};
