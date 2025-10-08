import { useCallback } from 'react';
import { HierarchicalStructure } from '../types/hierarchicalTypes';
import { keyActionMap } from '../config/keyActionMap';
import { getClipboardDataForPaste } from '../utils/clipboard/clipboardHelpers';
import { getSelectedElementsFromHierarchy } from '../utils/hierarchical/hierarchicalConverter';
import { ToastMessages } from '../constants/toastMessages';

interface UseKeyboardHandlerProps {
  dispatch: (action: { type: string; payload?: unknown }) => void;
  hierarchicalData: HierarchicalStructure | null;
  addToast: (message: string) => void;
}

export const useKeyboardHandler = ({
  dispatch,
  hierarchicalData,
  addToast,
}: UseKeyboardHandlerProps) => {
  return useCallback(
    async (e: React.KeyboardEvent) => {
      e.preventDefault();
      const keyCombo = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
      const actionType = keyActionMap[keyCombo];

      if (actionType === 'PASTE_ELEMENT') {
        // クリップボード優先でペーストデータを取得
        const pasteData = await getClipboardDataForPaste();

        if (!pasteData) {
          addToast(ToastMessages.clipboardEmpty);
          return;
        }

        // 階層構造から選択された要素を取得
        const selectedElements = hierarchicalData
          ? getSelectedElementsFromHierarchy(hierarchicalData)
          : [];

        if (selectedElements.length === 0) {
          addToast(ToastMessages.noSelect);
          return;
        }

        if (pasteData.type === 'clipboard') {
          // クリップボードからの階層構造テキスト貼り付け
          const hierarchicalData = pasteData.data as Array<{
            text: string;
            level: number;
            originalLine: string;
          }>;

          // 複数選択要素がある場合は、それぞれに対して貼り付けを実行
          for (const selectedElement of selectedElements) {
            dispatch({
              type: 'ADD_HIERARCHICAL_ELEMENTS',
              payload: {
                targetNodeId: selectedElement.id,
                targetPosition: 'child',
                hierarchicalItems: hierarchicalData,
                onError: (message: string) => {
                  addToast(`エラー: ${message}`);
                },
              },
            });
          }

          addToast(
            `${hierarchicalData.length}個の要素を${selectedElements.length}個の選択要素に階層構造で貼り付けました`,
          );
        } else if (pasteData.type === 'elements') {
          // クリップボードからの要素貼り付け（階層構造ベース）
          const clipboardData = pasteData.data as unknown;

          // 複数選択要素がある場合は、それぞれに対して貼り付けを実行
          for (const selectedElement of selectedElements) {
            dispatch({
              type: 'PASTE_CLIPBOARD_ELEMENTS',
              payload: {
                clipboardData: clipboardData,
                targetElementId: selectedElement.id,
              },
            });
          }

          addToast(`要素を${selectedElements.length}個の選択要素に貼り付けました`);
        }
      } else if (actionType) {
        if (actionType === 'ADD_ELEMENT') {
          dispatch({ type: actionType, payload: {} });
        } else {
          dispatch({ type: actionType });
        }
      }
    },
    [dispatch, hierarchicalData, addToast],
  );
};
