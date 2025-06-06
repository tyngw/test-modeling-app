'use client';

import { useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { saveSvg, loadElements, saveElements } from '../utils/file';
import { TabState } from '../types/tabTypes';
import { State } from '../state/state';

interface UseFileOperationsParams {
  currentTab: TabState | undefined;
  addTab: () => string;
  updateTabState: (tabId: string, updater: (prevState: State) => State) => void;
  updateTabName: (tabId: string, name: string) => void;
  switchTab: (tabId: string) => void;
}

/**
 * ファイル操作に関連する機能を提供するカスタムフック
 * SVGの保存、要素のJSONとしての保存と読み込み機能を提供します
 */
export function useFileOperations({
  currentTab,
  addTab,
  updateTabState,
  updateTabName,
  switchTab,
}: UseFileOperationsParams) {
  const { addToast } = useToast();

  const handleSaveSvg = useCallback(() => {
    const svgElement = document.querySelector('.svg-element') as SVGSVGElement;
    if (svgElement) {
      saveSvg(svgElement, 'download.svg');
    }
  }, []);

  const handleSaveElements = useCallback(() => {
    if (!currentTab) return;

    saveElements(Object.values(currentTab.state.elements), currentTab.name);
  }, [currentTab]);

  const handleLoadElements = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        const result = await loadElements(event.nativeEvent);

        // 新しいタブを作成して、読み込んだ要素をそのタブに適用
        const newTabId = addTab();
        updateTabState(newTabId, (prevState) => ({
          ...prevState,
          elements: result.elements,
        }));

        // タブ名を設定
        const newTabName = result.fileName.replace('.json', '');
        updateTabName(newTabId, newTabName);

        // 新しいタブに切り替え
        switchTab(newTabId);
      } catch (error: any) {
        addToast(error.message);
      }
    },
    [addTab, updateTabState, updateTabName, switchTab, addToast],
  );

  return {
    handleSaveSvg,
    handleSaveElements,
    handleLoadElements,
  };
}
