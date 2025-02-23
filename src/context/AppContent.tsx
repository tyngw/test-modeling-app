// src/context/AppContent.tsx
import React, { useState, useCallback, useMemo } from 'react';
import CanvasArea from '../components/CanvasArea';
import QuickMenuBar from '../components/QuickMenuBar';
import TabHeaders from '../components/TabHeaders/TabHeaders';
import { CanvasProvider } from './CanvasContext';
import { Action } from '../state/state';
import { useTabs } from './TabsContext';
import { reducer } from '../state/state';
import { saveSvg } from '../utils/FileHelpers';
import { loadElements, saveElements } from '../utils/FileHelpers';
import SettingsModal from '../components/SettingsModal';

const AppContent: React.FC = () => {
  const { tabs, currentTabId, addTab, closeTab, switchTab, updateTabState, updateTabName } = useTabs();
  const currentTab = useMemo(() => tabs.find(tab => tab.id === currentTabId), [tabs, currentTabId]);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const toggleHelp = useCallback(() => setHelpOpen(prev => !prev), []);
  const toggleSettings = useCallback(() => setIsSettingsOpen(prev => !prev), []);

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
          toggleSettings={toggleSettings}
        />
        <CanvasArea isHelpOpen={isHelpOpen} toggleHelp={toggleHelp} />
      </CanvasProvider>
    );
  }, [currentTab, dispatch, toggleHelp, isHelpOpen, currentTabId, updateTabName, toggleSettings]);

  const handleSettingsSave = useCallback((settings: { numberOfSections: number; apiKey: string }) => {
    // ここで設定変更に伴う処理を追加可能
    console.log('設定が保存されました:', settings);
  }, []);

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
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={toggleSettings}
        onSave={handleSettingsSave}
      />
    </div>
  );
};

export default AppContent;