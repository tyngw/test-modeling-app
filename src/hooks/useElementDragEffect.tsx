// src/hooks/useElementDragEffect.tsx
import { useState, useEffect, useCallback } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { ICONBAR_HEIGHT } from '../constants/ElementSettings';
import { Element } from '../types';
import { isDescendant } from '../state/state';
import { ToastMessages } from '../constants/ToastMessages';

interface State {
  zoomRatio: number;
  elements: { [key: string]: Element };
}

interface UseElementDragEffectProps {
  showToast: (message: string) => void;
}

type Position = { x: number; y: number };

const isValidDropTarget = (
  candidate: Element,
  draggingElement: Element,
  mouseX: number,
  mouseY: number
): boolean => {
  const isWithinXBounds = mouseX >= candidate.x && mouseX <= candidate.x + candidate.width;
  const isWithinYBounds = mouseY >= candidate.y && mouseY <= candidate.y + candidate.height;
  const isNotSelfOrParent = candidate.id !== draggingElement.id && candidate.id !== draggingElement.parentId;

  return isWithinXBounds && isWithinYBounds && isNotSelfOrParent;
};

export const useElementDragEffect = ({ showToast }: UseElementDragEffectProps) => {
  const { state, dispatch } = useCanvas() as { state: State; dispatch: React.Dispatch<any> };
  const [draggingElement, setDraggingElement] = useState<Element | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<Position>({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState<Position>({ x: 0, y: 0 });
  const [currentDropTarget, setCurrentDropTarget] = useState<Element | null>(null);

  const convertToZoomCoordinates = useCallback((e: { pageX: number; pageY: number }): Position => ({
    x: e.pageX / state.zoomRatio,
    y: e.pageY / state.zoomRatio,
  }), [state.zoomRatio]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>, element: Element) => {
      // ルート要素はドラッグできないようにする
      if (!element.id || !element.parentId) return;
      e.stopPropagation();

      const zoomAdjustedPos = convertToZoomCoordinates(e);
      setDraggingElement(element);
      setDragStartOffset({
        x: zoomAdjustedPos.x - element.x,
        y: zoomAdjustedPos.y - element.y,
      });
      setOriginalPosition({ x: element.x, y: element.y });
    },
    [convertToZoomCoordinates]
  );

  useEffect(() => {
    if (!draggingElement) return;

    const findDropTarget = (e: MouseEvent): Element | undefined => {
      const zoomAdjustedPos = convertToZoomCoordinates(e);
      // アイコンバーの高さを考慮したY座標計算
      const iconBarAdjustedY = zoomAdjustedPos.y - ICONBAR_HEIGHT;

      return Object.values(state.elements).find((element) =>
        isValidDropTarget(element, draggingElement, zoomAdjustedPos.x, iconBarAdjustedY)
      );
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dropTarget = findDropTarget(e) || null;
      setCurrentDropTarget(dropTarget);

      const zoomAdjustedPos = convertToZoomCoordinates(e);
      const newPosition = {
        x: zoomAdjustedPos.x - dragStartOffset.x,
        y: zoomAdjustedPos.y - dragStartOffset.y,
      };

      dispatch({
        type: 'MOVE_NODE',
        payload: { id: draggingElement.id, ...newPosition },
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [draggingElement, dragStartOffset, state.elements, convertToZoomCoordinates, dispatch]);

  const handleMouseUp = useCallback(() => {
    if (!draggingElement) return;

    const resetElementPosition = () => {
      dispatch({
        type: 'MOVE_NODE',
        payload: { id: draggingElement.id, ...originalPosition },
      });
    };

    const validateDropTarget = (target: Element): boolean => {
      return target.id === draggingElement.id ||
        isDescendant(state.elements, draggingElement.id, target.id);
    };

    const processValidDrop = (target: Element) => {
      dispatch({ type: 'SNAPSHOT' });
      dispatch({
        type: 'DROP_NODE',
        payload: {
          id: draggingElement.id,
          oldParentId: draggingElement.parentId,
          newParentId: target.id,
          depth: target.depth + 1,
          draggingElementOrder: draggingElement.order,
        },
      });
    };

    if (currentDropTarget) {
      if (validateDropTarget(currentDropTarget)) {
        resetElementPosition();
        showToast(ToastMessages.invalidDrop);
      } else {
        processValidDrop(currentDropTarget);
      }
    } else {
      resetElementPosition();
    }

    setDraggingElement(null);
    setCurrentDropTarget(null);
  }, [draggingElement, currentDropTarget, originalPosition, state.elements, dispatch, showToast]);

  return { handleMouseDown, handleMouseUp, currentDropTarget };
};