'use client';

import React, { useCallback } from 'react';
import {
  getAllElementsFromHierarchy,
  createElementsMapFromHierarchy,
} from '../utils/hierarchical/hierarchicalConverter';
import { useToast } from '../context/ToastContext';
import { saveSvg, saveElements, loadElements } from '../utils/file';
import { fileOperationAdapter } from '../utils/file/fileOperationAdapter';
import { convertFlatToHierarchical } from '../utils/hierarchical/hierarchicalConverter';
import { TabState } from '../types/tabTypes';
import { State } from '../state/state';
import { isVSCodeExtension } from '../utils/environment/environmentDetector';
import { storageAdapter } from '../utils/storage/storageAdapter';

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

  const handleSaveSvg = useCallback(async () => {
    try {
      const svgElement = document.querySelector('.svg-element') as SVGSVGElement;
      if (!svgElement) {
        addToast('SVG要素が見つかりませんでした');
        return;
      }

      if (isVSCodeExtension()) {
        // VSCode拡張機能環境ではfileOperationAdapterを使用
        await fileOperationAdapter.saveSvg(svgElement, 'download.svg');
      } else {
        // ブラウザ環境では従来の関数を使用
        saveSvg(svgElement, 'download.svg');
      }
    } catch (error) {
      console.error('[handleSaveSvg] Error during SVG save:', error);
      addToast(error instanceof Error ? error.message : 'SVGの保存中にエラーが発生しました');
    }
  }, [addToast]);

  const handleSaveElements = useCallback(async () => {
    if (!currentTab) return;

    try {
      // hierarchicalDataから要素を取得
      const allElements = currentTab.state.hierarchicalData
        ? getAllElementsFromHierarchy(currentTab.state.hierarchicalData)
        : [];

      // VSCode拡張機能の場合は、現在のファイル名を使用
      let fileName = currentTab.name;
      if (isVSCodeExtension()) {
        if (storageAdapter.getCurrentFileName) {
          const currentFileName = await storageAdapter.getCurrentFileName();
          if (currentFileName) {
            fileName = currentFileName.replace(/\.json$/, ''); // 拡張子を除去
          }
        }
        // VSCode拡張機能環境ではfileOperationAdapterを使用
        await fileOperationAdapter.saveElements(allElements, fileName);
      } else {
        // ブラウザ環境では従来の関数を使用
        saveElements(allElements, fileName);
      }

      // JSON保存後にタブを保存済みとしてマーク
      if (currentTab.id) {
        // 現在の要素の状態をJSON文字列として保存（階層構造から直接ElementsMapを作成）
        const elementsMap = currentTab.state.hierarchicalData
          ? createElementsMapFromHierarchy(currentTab.state.hierarchicalData)
          : {};
        const normalizedElements = JSON.parse(JSON.stringify(elementsMap));
        const currentElementsJson = JSON.stringify(normalizedElements);

        // タブを保存済みとしてマークし、最後に保存された要素の状態を更新
        updateTabSaveStatus(currentTab.id, true, currentElementsJson);
      }
    } catch (error) {
      console.error('[handleSaveElements] Error during file save:', error);
      addToast(error instanceof Error ? error.message : 'ファイルの保存中にエラーが発生しました');
    }
  }, [currentTab, updateTabSaveStatus, addToast]);

  const handleLoadElements = useCallback(
    async (event?: React.ChangeEvent<HTMLInputElement>) => {
      try {
        let result;

        // VSCode拡張環境の場合は、eventを使わずにfileOperationAdapterを直接呼び出し
        if (isVSCodeExtension()) {
          result = await fileOperationAdapter.loadElements();
        } else {
          // ブラウザ環境の場合は、eventが必要
          if (!event) {
            throw new Error('ブラウザ環境ではイベントが必要です');
          }
          result = await loadElements(event.nativeEvent);
        }

        // 新しいタブを作成して、読み込んだ要素をそのタブに適用
        const newTabId = addTab();

        // elementsMapから階層構造を構築
        const hierarchicalData = convertFlatToHierarchical(result.elements);
        if (!hierarchicalData) {
          throw new Error('ファイルから階層構造を作成できませんでした');
        }

        // LOAD_ELEMENTSアクションと同等の処理を手動で実行
        updateTabState(newTabId, (prevState) => {
          return {
            ...prevState,
            hierarchicalData,
          };
        });

        // タブ名を設定
        let newTabName = result.fileName.replace('.json', '');

        // VSCode拡張機能の場合は、ファイル名をそのまま使用（拡張子あり）
        if (isVSCodeExtension()) {
          newTabName = result.fileName;
        }

        updateTabName(newTabId, newTabName);

        // 現在の要素の状態をJSON文字列として保存
        const currentElementsJson = JSON.stringify(result.elements);

        // JSON形式でロードしたタブは保存済みとしてマーク
        updateTabSaveStatus(newTabId, true, currentElementsJson);

        // 新しいタブに切り替え
        switchTab(newTabId);
      } catch (error: unknown) {
        console.error('[handleLoadElements] Error during file load:', error);
        addToast(
          error instanceof Error ? error.message : 'ファイルの読み込み中にエラーが発生しました',
        );
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
