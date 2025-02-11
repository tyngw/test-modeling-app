// src/hooks/useElementDragEffect.tsx
import { useState, useEffect, useCallback } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { ICONBAR_HEIGHT } from '../constants/ElementSettings';
import { Element } from '../types';
import { isDescendant } from '../state/state';
import { ToastMessages } from '../constants/ToastMessages';

// interface Element {
//   id: string;
//   parentId: string;
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   depth: number;
// }

interface State {
  zoomRatio: number;
  elements: { [key: string]: Element };
}

type MouseHandler = (e: globalThis.MouseEvent) => void;

interface UseElementDragEffectProps {
  showToast: (message: string) => void;
}

export const useElementDragEffect = ({ showToast }: UseElementDragEffectProps) => {
  const { state, dispatch } = useCanvas() as { state: State; dispatch: React.Dispatch<any> };
  const [dragging, setDragging] = useState<Element | null>(null);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });
  const [overDropTarget, setOverDropTarget] = useState<Element | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>, element: Element) => {
      if (!element.id || !element.parentId) return;
      e.stopPropagation();
      setDragging(element);
      setStartPosition({
        x: e.pageX / state.zoomRatio - element.x,
        y: e.pageY / state.zoomRatio - element.y,
      });
      setOriginalPosition({ x: element.x, y: element.y });
    },
    [state.zoomRatio]
  );

  useEffect(() => {
    if (dragging) {
      const handleMouseMove: MouseHandler = (e) => {
        const overNode = Object.values(state.elements).find((element) => {
          const x = e.pageX / state.zoomRatio;
          const y = e.pageY / state.zoomRatio - ICONBAR_HEIGHT;
          return (
            x >= element.x &&
            x <= element.x + element.width &&
            y >= element.y &&
            y <= element.y + element.height &&
            element.id !== dragging.id &&
            element.id !== dragging.parentId
          );
        });

        setOverDropTarget(overNode || null);
        const newX = e.pageX / state.zoomRatio - startPosition.x;
        const newY = e.pageY / state.zoomRatio - startPosition.y;

        dispatch({
          type: 'MOVE_NODE',
          payload: { id: dragging.id, x: newX, y: newY },
        });
      };

      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [dragging, startPosition, state.zoomRatio, state.elements, dispatch]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      let shouldResetPosition = false;
      let needToast = false;

      if (overDropTarget) {
        // 無効なドロップ条件をチェック
        const isInvalidDrop =
          overDropTarget.id === dragging.id ||
          isDescendant(state.elements, dragging.id, overDropTarget.id);

        if (!isInvalidDrop) {
          dispatch({ type: 'SNAPSHOT' });
          dispatch({
            type: 'DROP_NODE',
            payload: {
              id: dragging.id,
              oldParentId: dragging.parentId,
              newParentId: overDropTarget.id,
              depth: overDropTarget.depth + 1,
              draggingElementOrder: dragging.order,
            },
          });
        } else {
          shouldResetPosition = true;
          needToast = true;
        }
      } else {
        shouldResetPosition = true;
      }

      if (shouldResetPosition) {
        dispatch({
          type: 'MOVE_NODE',
          payload: { id: dragging.id, x: originalPosition.x, y: originalPosition.y },
        });

        if (needToast) {
          // 無効なドロップの場合、トーストでエラーメッセージを表示
          showToast(ToastMessages.invalidDrop);
        }
      }

      setDragging(null);
      setOverDropTarget(null);
    }
  }, [dragging, overDropTarget, originalPosition, dispatch, showToast, state.elements]);

  return { handleMouseDown, handleMouseUp, overDropTarget };
};