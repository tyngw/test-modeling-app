// src/context/AppContent.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { CanvasProvider } from './CanvasContext';
import CanvasArea from '../components/CanvasArea';
import { Action } from '../state/state'; 
import { useTabs } from './TabsContext';
import { reducer } from '../state/state';
import QuickMenuBar from '../components/QuickMenuBar';
import { saveSvg } from '../utils/FileHelpers';
import { loadElements, saveElements } from '../utils/FileHelpers';
import { ICONBAR_HEIGHT } from '../constants/ElementSettings';
import { TabState } from './TabsContext';

const AppContent: React.FC = () => {
  const { tabs, currentTabId, addTab, closeTab, switchTab, updateTabState } = useTabs();
  const currentTab = useMemo(() => tabs.find(tab => tab.id === currentTabId), [tabs, currentTabId]);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const toggleHelp = useCallback(() => setHelpOpen(prev => !prev), []);

  const dispatch = useCallback((action: Action) => {
    updateTabState(currentTabId, prevState => reducer(prevState, action));
  }, [currentTabId, updateTabState]);

  const memoizedCanvasProvider = useMemo(() => {
    if (!currentTab) return null;
    return (
      <CanvasProvider state={currentTab.state} dispatch={dispatch}>
        <QuickMenuBar
          saveSvg={() => saveSvg(document.querySelector('.svg-element') as SVGSVGElement, 'download.svg')}
          loadElements={(event) => loadElements(event.nativeEvent)
            .then(elements => dispatch({ type: 'LOAD_ELEMENTS', payload: elements }))
            .catch(alert)}
          saveElements={() => saveElements(Object.values(currentTab.state.elements))}
          toggleHelp={toggleHelp}
        />
        <CanvasArea isHelpOpen={isHelpOpen} toggleHelp={toggleHelp} />
      </CanvasProvider>
    );
  }, [currentTab, dispatch, toggleHelp, isHelpOpen]);

  return (
    <div>
      <TabHeaders 
        tabs={tabs}
        currentTabId={currentTabId}
        addTab={addTab}
        closeTab={closeTab}
        switchTab={switchTab}
      />
      {memoizedCanvasProvider}
    </div>
  );
};

const TabHeaders: React.FC<{
  tabs: TabState[];
  currentTabId: string;
  addTab: () => void;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
}> = React.memo(({ tabs, currentTabId, addTab, closeTab, switchTab }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    width: '100%',
    height: ICONBAR_HEIGHT,
    position: 'fixed',
    zIndex: 10001,
  }}>
    {tabs.map(tab => (
      <TabHeader
        key={tab.id}
        tab={tab}
        isCurrent={currentTabId === tab.id}
        closeTab={closeTab}
        switchTab={switchTab}
      />
    ))}
    <button onClick={addTab} style={{ marginLeft: '8px' }}>
      NEW
    </button>
  </div>
));

const TabHeader: React.FC<{
  tab: TabState;
  isCurrent: boolean;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
}> = React.memo(({ tab, isCurrent, closeTab, switchTab }) => (
  <div
    style={{
      padding: '8px',
      marginRight: '4px',
      backgroundColor: isCurrent ? '#fff' : '#ddd',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
    }}
    onClick={() => switchTab(tab.id)}
  >
    <span>Tab {tab.id.slice(0, 4)}</span>
    <button
      onClick={(e) => {
        e.stopPropagation();
        closeTab(tab.id);
      }}
      style={{ marginLeft: '8px' }}
    >
      ×
    </button>
  </div>
));

export default AppContent;