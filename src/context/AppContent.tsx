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
import { ICONBAR_HEIGHT, TABBAR_HEIGHT } from '../constants/ElementSettings';
import { TabState } from './TabsContext';
import TabHeaders from '../components/TabHeaders';

const AppContent: React.FC = () => {
  const { tabs, currentTabId, addTab, closeTab, switchTab, updateTabState, updateTabName } = useTabs();
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
            .then(({ elements, fileName }) => {
              dispatch({ type: 'LOAD_ELEMENTS', payload: elements });
              const newTabName = fileName.replace('.json', '');
              updateTabName(currentTabId, newTabName);
            })
            .catch(alert)}
            saveElements={() => saveElements(Object.values(currentTab.state.elements), currentTab.name)}
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

export default AppContent;