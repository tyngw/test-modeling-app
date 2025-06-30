import { useCallback } from 'react';
import { Element as CanvasElement } from '../types/types';
import { ElementsMap } from '../types/elementTypes';
import { keyActionMap } from '../config/keyActionMap';
import { getClipboardDataForPaste } from '../utils/clipboard/clipboardHelpers';
import { ToastMessages } from '../constants/toastMessages';

interface UseKeyboardHandlerProps {
  dispatch: (action: { type: string; payload?: unknown }) => void;
  elements: Record<string, CanvasElement>;
  addToast: (message: string) => void;
}

export const useKeyboardHandler = ({ dispatch, elements, addToast }: UseKeyboardHandlerProps) => {
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

        const selectedElement = Object.values(elements).find((el) => el.selected);
        if (!selectedElement) {
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

          // 新しい階層構造専用アクションを使用
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

          addToast(`${hierarchicalData.length}個の要素を階層構造で貼り付けました`);
        } else if (pasteData.type === 'elements') {
          // クリップボードからの要素貼り付け
          dispatch({
            type: 'PASTE_CLIPBOARD_ELEMENTS',
            payload: {
              elements: pasteData.data as ElementsMap,
              targetElementId: selectedElement.id,
            },
          });

          const elementCount = Object.keys(pasteData.data as ElementsMap).length;
          addToast(`${elementCount}個の要素を貼り付けました`);
        }
      } else if (actionType) {
        if (actionType === 'ADD_ELEMENT') {
          dispatch({ type: actionType, payload: {} });
        } else {
          dispatch({ type: actionType });
        }
      }
    },
    [dispatch, elements, addToast],
  );
};
