// src/appContent.tsx
'use client';

import { ToastMessages } from './constants/toastMessages';
import React, { useState, useCallback, useMemo } from 'react';
import CanvasArea from './components/canvasArea';
import QuickMenuBar from './components/quickMenuBar';
import TabHeaders from './components/TabHeaders/TabHeaders';
import SettingsModal from './components/settingsModal';
import UnsaveConfirmModal from './components/unsaveConfiromModal';
import ModalWindow from './components/modalWindow';
import { helpContent } from './constants/helpContent';
import { CanvasProvider } from './context/canvasContext';
import { Action } from './state/state';
import { useTabs } from './context/tabsContext';
import { reducer } from './state/state';
import { saveSvg } from './utils/fileHelpers';
import { loadElements, saveElements } from './utils/fileHelpers';
import { generateWithGemini } from './utils/api';
import { getApiKey, getModelType } from './utils/localStorageHelpers';
import { formatElementsForPrompt } from './utils/elementHelpers';
import { createSystemPrompt } from './constants/promptHelpers';
import { useToast } from './context/toastContext';

const AppContent: React.FC = () => {
  const { tabs, currentTabId, addTab, closeTab, switchTab, updateTabState, updateTabName } = useTabs();
  const currentTab = useMemo(() => tabs.find(tab => tab.id === currentTabId), [tabs, currentTabId]);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tabToClose, setTabToClose] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const { addToast } = useToast();

  const toggleHelp = useCallback(() => setHelpOpen(prev => !prev), []);
  const toggleSettings = useCallback(() => setIsSettingsOpen(prev => !prev), []);

  const dispatch = useCallback((action: Action) => {
    updateTabState(currentTabId, prevState => reducer(prevState, action));
  }, [currentTabId, updateTabState]);

  const handleCloseTabRequest = (tabId: string) => {
    const hasUnsavedChanges = true;

    if (hasUnsavedChanges) {
      setTabToClose(tabId);
      setShowCloseConfirm(true);
    } else {
      closeTab(tabId);
    }
  };

  const handleAIClick = useCallback(async () => {
    if (!currentTab) return;

    const selectedElement = Object.values(currentTab.state.elements)
      .find(el => el.selected);

    if (!selectedElement) {
      addToast(ToastMessages.noSelect);
      return;
    }

    const decryptedApiKey = await getApiKey();

    if (!decryptedApiKey) {
      addToast(ToastMessages.noApiKey, "warn");
      return;
    }

    const inputText = localStorage.getItem('prompt') || '';

    if (!inputText) {
      addToast(ToastMessages.noPrompt);
      return;
    }

    try {
      const structureText = formatElementsForPrompt(
        currentTab.state.elements,
        selectedElement.id
      );
      const fullPrompt = createSystemPrompt({ structureText, inputText });
      const modelType = getModelType();
      const result = await generateWithGemini(fullPrompt, decryptedApiKey, modelType);

      let childNodes: string[] = [];
      if (Array.isArray(result)) {
        childNodes = result;
      } else if (typeof result === "string") {
        const codeBlocks = result.match(/```[\s\S]*?```/g) || [];
        childNodes = codeBlocks.flatMap((block: string) => {
          return block
            .replace(/```/g, '')
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0);
        });
      }

      dispatch({
        type: 'ADD_ELEMENTS_SILENT',
        payload: {
          parentId: selectedElement.id,
          texts: childNodes,
          tentative: true,
        }
      });

    } catch (error: unknown) {
      const message = error instanceof Error ?
        `${ToastMessages.aiError}: ${error.message}` :
        ToastMessages.aiError;
      addToast(message);
    }
  }, [currentTab, dispatch, addToast]);

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
          saveSvg={() => saveSvg(document.querySelector('.svg-element') as SVGSVGElement, 'download.svg')}
          loadElements={(event) => loadElements(event.nativeEvent)
            .then(({ elements, fileName }) => {
              dispatch({ type: 'LOAD_ELEMENTS', payload: elements });
              const newTabName = fileName.replace('.json', '');
              updateTabName(currentTabId, newTabName);
            })
            .catch(error => addToast(error.message))}
          saveElements={() => saveElements(Object.values(currentTab.state.elements), currentTab.name)}
          toggleHelp={toggleHelp}
          toggleSettings={toggleSettings}
          onAIClick={handleAIClick}
        />
        
      </CanvasProvider>
    );
  }, [currentTab, dispatch, toggleHelp, isHelpOpen, currentTabId, updateTabName, toggleSettings, addToast, handleAIClick]);

  return (
    <div>
      {memoizedCanvasProvider}
      

      <UnsaveConfirmModal
        showCloseConfirm={showCloseConfirm}
        setShowCloseConfirm={setShowCloseConfirm}
        tabToClose={tabToClose}
        closeTab={closeTab}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={toggleSettings}
      />
      <ModalWindow isOpen={isHelpOpen} onClose={toggleHelp}>
        <div dangerouslySetInnerHTML={{ __html: helpContent }} />
      </ModalWindow>
    </div>
  );
};

export default AppContent;