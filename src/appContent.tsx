// src/appContent.tsx
import React, { useState, useCallback, useMemo } from 'react';
import CanvasArea from './components/canvasArea';
import QuickMenuBar from './components/quickMenuBar';
import TabHeaders from './components/TabHeaders/TabHeaders';
import SettingsModal from './components/settingsModal';
import ModalWindow from './components/modalWindow';
import { CanvasProvider } from './context/canvasContext';
import { Action } from './state/state';
import { useTabs } from './context/tabsContext';
import { reducer } from './state/state';
import { saveSvg } from './utils/fileHelpers';
import { loadElements, saveElements } from './utils/fileHelpers';
import { generateWithGemini } from './utils/api';
import { getApiKey } from './utils/localStorageHelpers';
import { formatElementsForPrompt } from './utils/elementHelpers';
import { createSystemPrompt } from './constants/promptHelpers';
import {Button } from '@mui/material';

const AppContent: React.FC = () => {
  const { tabs, currentTabId, addTab, closeTab, switchTab, updateTabState, updateTabName } = useTabs();
  const currentTab = useMemo(() => tabs.find(tab => tab.id === currentTabId), [tabs, currentTabId]);
  const [isHelpOpen, setHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tabToClose, setTabToClose] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const toggleHelp = useCallback(() => setHelpOpen(prev => !prev), []);
  const toggleSettings = useCallback(() => setIsSettingsOpen(prev => !prev), []);

  const dispatch = useCallback((action: Action) => {
    updateTabState(currentTabId, prevState => reducer(prevState, action));
  }, [currentTabId, updateTabState]);

  const handleCloseTabRequest = (tabId: string) => {
    const targetTab = tabs.find(t => t.id === tabId);
    // 仮の未保存チェック（実際はタブの状態に基づく必要あり）
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

    // 選択中の要素取得
    const selectedElement = Object.values(currentTab.state.elements)
      .find(el => el.selected);

    if (!selectedElement) {
      alert('子要素を追加する要素を選択してください');
      return;
    }

    const decryptedApiKey = getApiKey();

    try {
      // 要素データの加工
      const structureText = formatElementsForPrompt(
      currentTab.state.elements,
      selectedElement.id
      );

      const inputText = localStorage.getItem('prompt') || 'なし:';

      // プロンプト構築
      const fullPrompt = createSystemPrompt({ structureText, inputText });

      // Gemini API 呼び出し（Function Calling 対応）
      const result = await generateWithGemini(fullPrompt, decryptedApiKey);

      // extractNextElements の戻り値が配列の場合はそのまま採用、
      // 文字列の場合は従来のコードブロック抽出ロジックを適用
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
          texts: childNodes
        }
      });

    } catch (error: unknown) {
      if (error instanceof Error) {
        alert('AI処理に失敗しました: ' + error.message);
      } else {
        alert('AI処理に失敗しました');
      }
    }
  }, [currentTab, dispatch]);

  const renderConfirmModal = () => (
    <ModalWindow
      isOpen={showCloseConfirm}
      onClose={() => setShowCloseConfirm(false)}
    >
      <div style={{ padding: '20px' }}>
        <p style={{ marginBottom: '20px' }}>
          タブを閉じてよろしいですか？
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <Button
            variant="outlined"
            onClick={() => setShowCloseConfirm(false)}
          >
            いいえ
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (tabToClose) closeTab(tabToClose);
              setShowCloseConfirm(false);
            }}
          >
            はい
          </Button>
        </div>
      </div>
    </ModalWindow>
  );

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
          onAIClick={handleAIClick}
        />
        <CanvasArea isHelpOpen={isHelpOpen} toggleHelp={toggleHelp} />
      </CanvasProvider>
    );
  }, [currentTab, dispatch, toggleHelp, isHelpOpen, currentTabId, updateTabName, toggleSettings]);

  return (
    <div>
      <TabHeaders
        tabs={tabs}
        currentTabId={currentTabId}
        addTab={addTab}
        closeTab={handleCloseTabRequest}
        switchTab={switchTab}
      />
      {memoizedCanvasProvider}

      {renderConfirmModal()}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={toggleSettings}
      />
    </div>
  );
};

export default AppContent;