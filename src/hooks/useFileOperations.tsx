'use client';

import React, { useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { saveSvg, saveElements, loadElements } from '../utils/file';
import { convertFlatToHierarchical } from '../utils/hierarchical/hierarchicalConverter';
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

    saveElements(Object.values(currentTab.state.elementsCache || {}), currentTab.name);

    // JSON保存後にタブを保存済みとしてマーク
    if (currentTab.id) {
      // 現在の要素の状態をJSON文字列として保存（整形して比較）
      const normalizedElements = JSON.parse(JSON.stringify(currentTab.state.elementsCache || {}));
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
        console.log('[handleLoadElements] Starting file load process...');
        const result = await loadElements(event.nativeEvent);
        console.log('[handleLoadElements] File loaded successfully:', result);

        // 新しいタブを作成して、読み込んだ要素をそのタブに適用
        const newTabId = addTab();
        console.log('[handleLoadElements] Created new tab:', newTabId);

        // elementsMapから階層構造を構築
        console.log('[handleLoadElements] Converting elements to hierarchical structure...');
        const hierarchicalData = convertFlatToHierarchical(result.elements);
        if (!hierarchicalData) {
          throw new Error('ファイルから階層構造を作成できませんでした');
        }
        console.log('[handleLoadElements] Hierarchical structure created:', hierarchicalData);

        // LOAD_ELEMENTSアクションと同等の処理を手動で実行
        updateTabState(newTabId, (prevState) => {
          console.log('[handleLoadElements] Updating tab state with loaded elements');

          return {
            ...prevState,
            hierarchicalData,
            elementsCache: result.elements,
            cacheValid: true,
          };
        });

        // タブ名を設定
        const newTabName = result.fileName.replace('.json', '');
        updateTabName(newTabId, newTabName);

        // 現在の要素の状態をJSON文字列として保存
        const currentElementsJson = JSON.stringify(result.elements);

        // JSON形式でロードしたタブは保存済みとしてマーク
        updateTabSaveStatus(newTabId, true, currentElementsJson);

        // 新しいタブに切り替え
        switchTab(newTabId);

        console.log('[handleLoadElements] File load process completed successfully');
      } catch (error: any) {
        console.error('[handleLoadElements] Error during file load:', error);
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
