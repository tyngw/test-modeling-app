// src/AppContent.tsx
'use client';

import { ToastMessages } from './constants/toastMessages';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { CanvasArea } from './components/canvas';
import QuickMenuBar from './components/menus/QuickMenuBar';
import TabHeaders from './components/tabHeaders/TabHeaders';
import SettingsModal from './components/SettingsModal';
import UnsaveConfirmModal from './components/UnsaveConfirmModal';
import ModalWindow from './components/ModalWindow';
import { helpContent } from './constants/helpContent';
import { CanvasProvider } from './context/CanvasContext';
import { Action } from './state/state';
import { useTabs } from './context/TabsContext';
import { reducer } from './state/state';
import { saveSvg, loadElements, saveElements, extractRootElementTextFromElements } from './utils/file';
import { generateWithGemini } from './utils/api';
import { getApiKey, getModelType } from './utils/storage';
import { formatElementsForPrompt } from './utils/element';
import { createSystemPrompt } from './constants/promptHelpers';
import { useToast } from './context/ToastContext';

const AppContent: React.FC = () => {
  const { tabs, currentTabId, addTab, closeTab, switchTab, updateTabState, updateTabName } = useTabs();
  const currentTab = useMemo(() => tabs.find(tab => tab.id === currentTabId), [tabs, currentTabId]);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tabToClose, setTabToClose] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const { addToast } = useToast();

  const dispatch = useCallback((action: Action) => {
    updateTabState(currentTabId, prevState => reducer(prevState, action));
  }, [currentTabId, updateTabState]);

  // タブ名を更新する機能
  const updateTabNameFromRootElement = useCallback(() => {
    if (!currentTab) return;

    // タブ名が「無題」または「Untitled」の場合のみ処理を実行
    if (currentTab.name === '無題' || currentTab.name === 'Untitled') {
      const elements = Object.values(currentTab.state.elements);
      const rootElementText = extractRootElementTextFromElements(elements);
      
      if (rootElementText?.trim()) {
        // ファイル名と同様の処理でテキストを整形
        const formattedText = rootElementText.trim().substring(0, 30).replace(/[\\/:*?"<>|]/g, '_');
        updateTabName(currentTabId, formattedText);
      }
    }
  }, [currentTab, currentTabId, updateTabName]);

  // 要素が変更されたときにタブ名を更新
  useEffect(() => {
    if (currentTab) {
      updateTabNameFromRootElement();
    }
  }, [currentTab?.state.elements, updateTabNameFromRootElement]);

  const toggleHelp = useCallback(() => {
    dispatch({ type: 'END_EDITING' });
    setHelpOpen(prev => !prev);
  }, [dispatch]);

  const toggleSettings = useCallback(() => {
    dispatch({ type: 'END_EDITING' });
    setIsSettingsOpen(prev => !prev);
  }, [dispatch]);

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
              // 新しいタブを作成して、読み込んだ要素をそのタブに適用
              const newTabId = addTab();
              updateTabState(newTabId, prevState => ({
                ...prevState,
                elements
              }));
              // タブ名を設定
              const newTabName = fileName.replace('.json', '');
              updateTabName(newTabId, newTabName);
              // 新しいタブに切り替え
              switchTab(newTabId);
            })
            .catch(error => addToast(error.message))}
          saveElements={() => saveElements(Object.values(currentTab.state.elements), currentTab.name)}
          toggleHelp={toggleHelp}
          toggleSettings={toggleSettings}
          onAIClick={handleAIClick}
        />

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
      </CanvasProvider>
    );
  }, [currentTab, dispatch, toggleHelp, isHelpOpen, currentTabId, updateTabName, toggleSettings, addToast, handleAIClick, showCloseConfirm, tabToClose, closeTab, isSettingsOpen]);

  return (
    <div>
      {memoizedCanvasProvider}
    </div>
  );
};

export default AppContent;
