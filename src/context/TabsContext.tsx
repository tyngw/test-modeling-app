// src/context/TabsContext.tsx
import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo } from 'react';
import { State, initialState } from '../state/state';
import { v4 as uuidv4 } from 'uuid';
import { DEFAULT_POSITION } from '../constants/ElementSettings';
import { createNewElement } from '../state/state';

export interface TabState {
  id: string;
  state: State;
}

interface TabsContextValue {
  tabs: TabState[];
  currentTabId: string;
  addTab: () => void;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  updateTabState: (tabId: string, updater: (prevState: State) => State) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const createInitialTabState = (): TabState => {
  const newRootId = uuidv4();
  return {
    id: uuidv4(),
    state: {
      ...initialState,
      elements: {
        [newRootId]: {
          ...createNewElement(null, 0, 1),
          id: newRootId,
          x: DEFAULT_POSITION.X,
          y: DEFAULT_POSITION.Y,
          editing: false,
        },
      },
    },
  };
};

export const TabsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<TabState[]>(() => [createInitialTabState()]);
  const [currentTabId, setCurrentTabId] = useState(tabs[0].id);

  const addTab = useCallback(() => {
    const newTab = createInitialTabState();
    console.log('[addTab]');
    setTabs(prev => [...prev, newTab]);
    setCurrentTabId(newTab.id);
  }, []);
  
  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      console.log('[closeTab]');
      if (prev.length === 1) return prev;
      const newTabs = prev.filter(tab => tab.id !== tabId);
      
      // 現在のタブが閉じられた場合、新しいcurrentTabIdを設定
      if (tabId === currentTabId) {
        // 最新のタブリストから最初のタブを選択
        setCurrentTabId(newTabs[0]?.id || '');
      }
      
      return newTabs;
    });
  }, [currentTabId]);

  const switchTab = useCallback((tabId: string) => {
    setCurrentTabId(tabId);
  }, []);

  const updateTabState = useCallback((tabId: string, updater: (prevState: State) => State) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, state: updater(tab.state) } : tab
    ));
  }, []);

  const contextValue = useMemo(() => ({
    tabs,
    currentTabId,
    addTab,
    closeTab,
    switchTab,
    updateTabState
  }), [tabs, currentTabId, addTab, closeTab, switchTab, updateTabState]);

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