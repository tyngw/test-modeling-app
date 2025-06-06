'use client';

import React, { useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { saveSvg, saveElements, loadElements } from '../utils/file';
import { TabState } from '../types/tabTypes';
import { State } from '../state/state';

interface UseFileOperationsParams {
  currentTab: TabState | undefined;
  addTab: () => string;
  updateTabState: (tabId: string, updater: (prevState: State) => State) => void;
  updateTabName: (tabId: string, name: string) => void;
  switchTab: (tabId: string) => void;
  updateTabSaveStatus: (tabId: string, isSaved: boolean, lastSavedElements?: string) => void;
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
  updateTabSaveStatus,
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
    
    // JSON保存後にタブを保存済みとしてマーク
    if (currentTab.id) {
      // 現在の要素の状態をJSON文字列として保存（整形して比較）
      const normalizedElements = JSON.parse(JSON.stringify(currentTab.state.elements));
      const currentElementsJson = JSON.stringify(normalizedElements);
      
      console.log('保存処理: タブID', currentTab.id);
      console.log('保存処理: 要素の状態', currentElementsJson.substring(0, 50) + '...');
      
      // タブを保存済みとしてマークし、最後に保存された要素の状態を更新
      updateTabSaveStatus(currentTab.id, true, currentElementsJson);
      
      console.log('保存処理: 保存済みフラグを設定', true);
    }
  }, [currentTab, updateTabSaveStatus]);

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
        
        // 現在の要素の状態をJSON文字列として保存
        const currentElementsJson = JSON.stringify(result.elements);
        
        // JSON形式でロードしたタブは保存済みとしてマーク
        updateTabSaveStatus(newTabId, true, currentElementsJson);

        // 新しいタブに切り替え
        switchTab(newTabId);
      } catch (error: any) {
        addToast(error.message);
      }
    },
    [addTab, updateTabState, updateTabName, switchTab, updateTabSaveStatus, addToast],
  );

  return {
    handleSaveSvg,
    handleSaveElements,
    handleLoadElements,
  };
}
