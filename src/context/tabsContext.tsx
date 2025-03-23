// src/context/tabsContext.tsx
'use client';

import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo, useEffect } from 'react';
import { State, initialState } from '../state/state';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_POSITION, NUMBER_OF_SECTIONS } from '../constants/elementSettings';
import { createNewElement } from '../utils/elementHelpers';
import { convertLegacyElement } from '../utils/fileHelpers';
import { getTabsState, setTabsState } from '../utils/localStorageHelpers';

export interface TabState {
  id: string;
  name: string;
  state: State;
}

type TabsStorage = {
  tabs: TabState[];
  currentTabId: string;
};

export interface TabsContextValue {
  tabs: TabState[];
  currentTabId: string;
  addTab: () => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTabState: (tabId: string, updater: (prevState: State) => State) => void;
  updateTabName: (tabId: string, newName: string) => void;
  getCurrentTabState: () => State | undefined;
  getCurrentTabNumberOfSections: () => number;
  updateCurrentTabNumberOfSections: (value: number) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const createInitialTabState = (): TabState => {
  const newRootId = "1";
  
  return {
    id: uuidv4(),
    name: "無題",
    state: {
      ...initialState,
      numberOfSections: NUMBER_OF_SECTIONS,
      elements: {
        [newRootId]: {
          ...createNewElement({
            numSections: NUMBER_OF_SECTIONS
          }),
          id: newRootId,
          x: DEFAULT_POSITION.X,
          y: DEFAULT_POSITION.Y,
          editing: false,
        },
      },
    },
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
        const convertedTabs = parsed.tabs.map(tab => ({
          ...tab,
          state: {
            ...tab.state,
            elements: Object.fromEntries(
              Object.entries(tab.state.elements).map(([id, element]) => [
                id,
                convertLegacyElement(element)
              ])
            )
          }
        }));

        // 現在のタブIDが存在しない場合は最初のタブを選択
        const validCurrentTabId = convertedTabs.some((t: TabState) => t.id === parsed.currentTabId)
          ? parsed.currentTabId
          : convertedTabs[0]?.id || '';

        return {
          tabs: convertedTabs,
          currentTabId: validCurrentTabId
        };

      }
    }
  } catch (e) {
    console.error('Failed to load tabs state:', e);
  }

  // 新規作成
  const initialTab = createInitialTabState();
  return {
    tabs: [initialTab],
    currentTabId: initialTab.id
  };
};

// ローカルストレージに状態を保存
const saveTabsToLocalStorage = (tabs: TabState[], currentTabId: string) => {
  setTabsState(JSON.stringify({ tabs, currentTabId }));
};

export const TabsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tabsState, setTabsState] = useState(() => loadTabsState());
  const { tabs, currentTabId } = tabsState;

  useEffect(() => {
    saveTabsToLocalStorage(tabs, currentTabId);
  }, [tabs, currentTabId]);

  const addTab = useCallback(() => {
    const newTab = createInitialTabState();
    setTabsState(prev => ({
      tabs: [...prev.tabs, newTab],
      currentTabId: newTab.id
    }));
  }, []);

  const closeTab = useCallback((tabId: string) => {
    setTabsState(prev => {
      if (prev.tabs.length === 1) return prev;
      const newTabs = prev.tabs.filter(tab => tab.id !== tabId);
      const newCurrentTabId = tabId === prev.currentTabId
        ? newTabs[0]?.id || ''
        : prev.currentTabId;
      return { tabs: newTabs, currentTabId: newCurrentTabId };
    });
  }, []);

  const switchTab = useCallback((tabId: string) => {
    setTabsState(prev => ({ ...prev, currentTabId: tabId }));
  }, []);

  const updateTabState = useCallback((tabId: string, updater: (prevState: State) => State) => {
    setTabsState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab =>
        tab.id === tabId ? { ...tab, state: updater(tab.state) } : tab
      )
    }));
  }, []);

  const updateTabName = useCallback((tabId: string, newName: string) => {
    setTabsState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab =>
        tab.id === tabId ? { ...tab, name: newName } : tab
      )
    }));
  }, []);

  const getCurrentTabState = useCallback(() => {
    const currentTab = tabs.find(tab => tab.id === currentTabId);
    return currentTab?.state;
  }, [tabs, currentTabId]);

  const getCurrentTabNumberOfSections = useCallback(() => {
    const currentTab = tabs.find(tab => tab.id === currentTabId);
    return currentTab?.state.numberOfSections ?? NUMBER_OF_SECTIONS;
  }, [tabs, currentTabId]);

  const updateCurrentTabNumberOfSections = useCallback((value: number) => {
    const clampedValue = Math.max(1, Math.min(10, value));
    updateTabState(currentTabId, prevState => ({
      ...prevState,
      numberOfSections: clampedValue
    }));
  }, [currentTabId, updateTabState]);

  const contextValue = useMemo(() => ({
    tabs,
    currentTabId,
    addTab,
    closeTab,
    switchTab,
    updateTabState,
    updateTabName,
    getCurrentTabState,
    getCurrentTabNumberOfSections,
    updateCurrentTabNumberOfSections,
  }), [
    tabs, 
    currentTabId, 
    addTab, 
    closeTab, 
    switchTab, 
    updateTabState, 
    updateTabName, 
    getCurrentTabState,
    getCurrentTabNumberOfSections,
    updateCurrentTabNumberOfSections
  ]);

  return (
    <TabsContext.Provider value={contextValue}>
      {children}
    </TabsContext.Provider>
  );
};

export const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('useTabs must be used within a TabsProvider');
  return context;
};
