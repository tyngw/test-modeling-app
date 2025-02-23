// src/context/appContent.tsx
import React, { useState, useCallback, useMemo } from 'react';
import CanvasArea from './components/canvasArea';
import QuickMenuBar from './components/quickMenuBar';
import TabHeaders from './components/TabHeaders/TabHeaders';
import SettingsModal from './components/settingsModal';
import { CanvasProvider } from './context/canvasContext';
import { Action } from './state/state';
import { useTabs } from './context/tabsContext';
import { reducer } from './state/state';
import { saveSvg } from './utils/fileHelpers';
import { loadElements, saveElements } from './utils/fileHelpers';
import { generateWithGemini } from './utils/api';
import { getApiKey } from './utils/localStorageHelpers';
import { SYSTEM_PROMPT } from './constants/systemPrompt';
import { formatElementsForPrompt } from './utils/elementHelpers';

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

      // プロンプト構築
      const fullPrompt = [
      localStorage.getItem('systemPrompt'),
      structureText,
      "選択中の要素: " + selectedElement.texts[0],
      "# 4. インプットされた情報",
      localStorage.getItem('prompt') || 'なし:',
      "```"
      ].join('\n\n');

      const response = await generateWithGemini(fullPrompt, decryptedApiKey);

      const codeBlocks = response.match(/```[\s\S]*?```/g) || [];
      const childNodes = codeBlocks.flatMap((block: string) => {
        return block
          .replace(/```/g, '')
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);
      });

      childNodes.forEach((text: string) => {
        dispatch({
          type: 'ADD_ELEMENT_SILENT',
          payload: {
            parentId: selectedElement.id,
            text: text
          }
        });
      });

    } catch (error: unknown) {
      if (error instanceof Error) {
        alert('AI処理に失敗しました: ' + error.message);
      } else {
        alert('AI処理に失敗しました');
      }
    }
  }, [currentTab, dispatch]);

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
        closeTab={closeTab}
        switchTab={switchTab}
      />
      {memoizedCanvasProvider}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={toggleSettings}
      />
    </div>
  );
};

export default AppContent;