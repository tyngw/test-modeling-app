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
import { Element as DiagramElement } from '../types/types';
import { State } from '../state/state';
import { createElementsMapFromHierarchy } from '../utils/hierarchical/hierarchicalConverter';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_POSITION, NUMBER_OF_SECTIONS } from '../config/elementSettings';
import { createNewElement } from '../utils/element/elementHelpers';
import { convertLegacyElement } from '../utils/file/fileHelpers';
import { getTabsState, setTabsState } from '../utils/storage/localStorageHelpers';
import { TabState, TabsStorage, TabsContextValue, LayoutMode } from '../types/tabTypes';
import { convertFlatToHierarchical } from '../utils/hierarchical/hierarchicalConverter';

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const createInitialTabState = (currentSections?: number): TabState => {
  const newRootId = '1';
  const numSections = currentSections ?? NUMBER_OF_SECTIONS;
  const defaultLayoutMode: LayoutMode = 'default';

  // ルート要素を作成（変換用にparentIdを追加）
  const rootElement = {
    ...createNewElement({
      numSections: numSections,
      selected: true, // 初期ルート要素は選択状態にする
      editing: false, // 編集状態はfalse
    }),
    id: newRootId,
    x: DEFAULT_POSITION.X,
    y: DEFAULT_POSITION.Y,
    editing: false,
  };

  // 変換用にparentIdを追加したLegacyElement型として扱う
  const legacyRootElement = {
    ...rootElement,
    parentId: null as string | null,
  };

  const initialElements = {
    [newRootId]: legacyRootElement,
  };

  console.log('createInitialTabState - initialElements:', initialElements);
  console.log('createInitialTabState - legacyRootElement:', legacyRootElement);

  const hierarchicalData = convertFlatToHierarchical(initialElements);

  console.log('createInitialTabState - hierarchicalData:', hierarchicalData);

  // hierarchicalDataがnullの場合の追加チェック
  if (!hierarchicalData) {
    console.error('Failed to create hierarchical data for new tab');
    // フォールバック：直接階層構造を作成
    const fallbackHierarchicalData = {
      root: {
        data: rootElement,
      },
      version: '1.4.43',
    };

    console.log(
      'createInitialTabState - using fallback hierarchicalData:',
      fallbackHierarchicalData,
    );

    return {
      id: uuidv4(),
      name: '無題',
      isSaved: false,
      lastSavedElements: JSON.stringify({ [newRootId]: rootElement }),
      state: {
        hierarchicalData: fallbackHierarchicalData,
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
        zoomRatio: 1,
        numberOfSections: numSections,
        layoutMode: defaultLayoutMode,
      },
      layoutMode: defaultLayoutMode,
    };
  }

  return {
    id: uuidv4(),
    name: '無題',
    isSaved: false,
    lastSavedElements: JSON.stringify({ [newRootId]: rootElement }),
    state: {
      hierarchicalData,
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      height: typeof window !== 'undefined' ? window.innerHeight : 0,
      zoomRatio: 1,
      numberOfSections: numSections,
      layoutMode: defaultLayoutMode,
    },
    layoutMode: defaultLayoutMode,
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
                Object.entries(
                  (tab.state as { elements: Record<string, DiagramElement> }).elements,
                ).map(([id, element]) => [id, convertLegacyElement(element)]),
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
  } catch {
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

          // hierarchicalDataから要素を取得してJSON文字列に変換（階層構造から直接ElementsMapを作成）
          const elementsMap = updatedState.hierarchicalData
            ? createElementsMapFromHierarchy(updatedState.hierarchicalData)
            : {};
          const normalizedElements = JSON.parse(JSON.stringify(elementsMap));
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
