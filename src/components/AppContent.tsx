// src/AppContent.tsx
'use client';

import { ToastMessages } from '../constants/toastMessages';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { CanvasArea } from './canvas';
import QuickMenuBar from './menus/QuickMenuBar';
import TabHeaders from './tabHeaders/TabHeaders';
import SettingsModal from './SettingsModal';
import UnsaveConfirmModal from './UnsaveConfirmModal';
import HelpModal from './HelpModal';
import { CanvasProvider } from '../context/CanvasContext';
import { useTabs } from '../context/TabsContext';
import { reducer } from '../state/state';
import { Action } from '../types/actionTypes';
import { saveSvg, loadElements, saveElements, extractRootElementTextFromElements } from '../utils/file';
import { determineFileName } from '../utils/file/fileHelpers';
import { generateElementSuggestions } from '../utils/api';
import { getApiKey, getModelType } from '../utils/storage';
import { formatElementsForPrompt } from '../utils/element';
import { createUserPrompt } from '../constants/promptHelpers';
import { useToast } from '../context/ToastContext';

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

    const elements = Object.values(currentTab.state.elements);
    const rootElementText = extractRootElementTextFromElements(elements);
    
    if (rootElementText) {
      const newTabName = determineFileName(currentTab.name, rootElementText);
      if (newTabName !== currentTab.name) {
        updateTabName(currentTabId, newTabName);
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

  /**
   * タブを閉じるリクエストを処理する関数
   * 
   * @param tabId - 閉じるタブのID
   */
  const handleCloseTabRequest = (tabId: string): void => {
    // TODO: 実際に変更があるかどうかをチェックする実装に置き換えるべき
    const hasUnsavedChanges = true;

    if (hasUnsavedChanges) {
      setTabToClose(tabId);
      setShowCloseConfirm(true);
    } else {
      closeTab(tabId);
    }
  };

  /**
   * AI機能を使って選択された要素に子要素の提案を追加する
   * 
   * @returns {Promise<void>}
   */
  const handleAIClick = useCallback(async (): Promise<void> => {
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
      
      // ユーザープロンプトのみを作成
      const userPrompt = createUserPrompt({ 
        structureText: structureText,
        inputText: inputText 
      });
      
      const modelType = getModelType();
      
      // JSON形式でレスポンスを取得
      const result = await generateElementSuggestions(userPrompt, decryptedApiKey, modelType);

      // suggestions配列から要素を取得
      let childNodes: string[] = result.suggestions || [];
      
      // 空の配列の場合は処理をスキップ
      if (childNodes.length === 0) {
        addToast("AIが提案する要素がありませんでした。別のテキストを入力するか、選択した要素を変更してください。");
        return;
      }

      // 処理した結果を要素として追加
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
        <HelpModal
          isOpen={isHelpOpen}
          onClose={toggleHelp}
        />
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
