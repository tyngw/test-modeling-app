import { useCallback } from 'react';
import { Element as CanvasElement } from '../types/types';
import { keyActionMap } from '../config/keyActionMap';
import { getGlobalCutElements } from '../utils/clipboard/clipboardHelpers';
import { ToastMessages } from '../constants/toastMessages';

interface UseKeyboardHandlerProps {
  dispatch: (action: any) => void;
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
        const globalCutElements = getGlobalCutElements();
        if (globalCutElements && Object.keys(globalCutElements).length > 0) {
          dispatch({ type: actionType });
        } else {
          try {
            const text = await navigator.clipboard.readText();
            const selectedElement = Object.values(elements).find((el) => el.selected);
            if (!selectedElement) {
              addToast(ToastMessages.noSelect);
              return;
            }
            if (text) {
              const texts = text.split('\n').filter((t) => t.trim() !== '');
              if (texts.length === 0) {
                addToast(ToastMessages.clipboardEmpty);
                return;
              }
              dispatch({
                type: 'ADD_ELEMENTS_SILENT',
                payload: {
                  parentId: selectedElement.id,
                  texts: texts,
                },
              });
            } else {
              addToast(ToastMessages.clipboardEmpty);
            }
          } catch (error) {
            console.error('クリップボード読み取りエラー:', error);
            addToast(ToastMessages.clipboardReadError);
          }
        }
      } else if (actionType) {
        dispatch({ type: actionType });
      }
    },
    [dispatch, elements, addToast],
  );
};
