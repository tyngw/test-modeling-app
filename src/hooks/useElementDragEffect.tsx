// src/hooks/useElementDragEffect.tsx
import { useState, useEffect, useCallback } from 'react';
import { Element } from '../types';
import { useCanvas } from '../context/canvasContext';
import { isDescendant } from '../state/state';
import { ToastMessages } from '../constants/toastMessages';
import { HEADER_HEIGHT } from '../constants/elementSettings';
import { useToast } from '../context/toastContext';

interface State {
  zoomRatio: number;
  elements: { [key: string]: Element };
}

type Position = { x: number; y: number };
type DropPosition = 'before' | 'after' | 'child';
type DropTargetInfo = { element: Element; position: DropPosition } | null;

export const useElementDragEffect = () => {
  const { state, dispatch } = useCanvas() as { state: State; dispatch: React.Dispatch<any> };
  const { addToast } = useToast();
  const [draggingElement, setDraggingElement] = useState<Element | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<Position>({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState<Position>({ x: 0, y: 0 });
  const [currentDropTarget, setCurrentDropTarget] = useState<DropTargetInfo>(null);

  const convertToZoomCoordinates = useCallback((e: { pageX: number; pageY: number }): Position => ({
    x: e.pageX / state.zoomRatio,
    y: (e.pageY - HEADER_HEIGHT) / state.zoomRatio,
  }), [state.zoomRatio]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>, element: Element) => {
      if (!element.parentId) return;
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

  const handleMouseUp = useCallback(async () => {
    if (!draggingElement) return;

    try {
      const resetElementPosition = () => {
        dispatch({
          type: 'MOVE_ELEMENT',
          payload: { id: draggingElement.id, ...originalPosition }
        });
      };

      const processChildDrop = (target: Element) => {
        dispatch({ type: 'SNAPSHOT' });
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: draggingElement.id,
            oldParentId: draggingElement.parentId,
            newParentId: target.id,
            newOrder: target.children,
            depth: target.depth + 1,
          },
        });
      };

      const processSiblingDrop = (target: Element, position: DropPosition) => {
        const newOrder = position === 'before' ? target.order : target.order + 1;
        const newParentId = target.parentId;

        dispatch({ type: 'SNAPSHOT' });
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: draggingElement.id,
            oldParentId: draggingElement.parentId,
            newParentId,
            newOrder,
            depth: target.depth,
          },
        });
      };

      if (currentDropTarget) {
        const { element: target, position } = currentDropTarget;

        if (isDescendant(state.elements, draggingElement.id, target.id)) {
          resetElementPosition();
          setDraggingElement(null);
          addToast(ToastMessages.invalidDrop);
          return;
        }

        if (position === 'child') {
          processChildDrop(target);
        } else {
          processSiblingDrop(target, position);
        }
      } else {
        resetElementPosition();
      }
    } catch (error) {
      console.error('Drag error:', error);
      addToast(ToastMessages.dragError);
    } finally {
      setDraggingElement(null);
      setCurrentDropTarget(null);
    }
  }, [draggingElement, currentDropTarget, originalPosition, state.elements, dispatch, addToast]);

  useEffect(() => {
    if (!draggingElement) return;

    const findDropTarget = (e: MouseEvent): DropTargetInfo => {
      const zoomAdjustedPos = convertToZoomCoordinates(e);
      let bestTarget: DropTargetInfo = null;
      let closestDistance = Infinity;

      Object.values(state.elements).forEach(element => {
        if (element.id === draggingElement.id || !element.visible) return;

        // 要素の境界ボックス計算
        const elemLeft = element.x;
        const elemRight = element.x + element.width;
        const elemTop = element.y;
        const elemBottom = element.y + element.height;
        const mouseX = zoomAdjustedPos.x;
        const mouseY = zoomAdjustedPos.y;

        // X座標が要素の範囲内にあるか確認（左右10pxの許容範囲を追加）
        // const isInXRange = mouseX > elemLeft - 10 && mouseX < elemRight + 10;
        const isInXRange = mouseX > elemLeft && mouseX < elemRight;
        if (!isInXRange) return;

        // 挿入位置判定（上下5%を境界と判定）
        const topThreshold = elemTop + element.height * 0.05;
        const bottomThreshold = elemBottom - element.height * 0.05;
        let position: DropPosition = 'child';

        if (mouseY < topThreshold) {
          position = 'before';
        } else if (mouseY > bottomThreshold) {
          position = 'after';
        }

        // 要素中心からの距離計算（X座標も考慮）
        const centerX = elemLeft + element.width / 2;
        const centerY = elemTop + element.height / 2;
        const distance = Math.sqrt(
          Math.pow(mouseX - centerX, 2) +
          Math.pow(mouseY - centerY, 2)
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          bestTarget = { element, position };
        }
      });

      return bestTarget;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const dropTarget = findDropTarget(e);
      setCurrentDropTarget(dropTarget);

      const zoomAdjustedPos = convertToZoomCoordinates(e);
      const newPosition = {
        x: zoomAdjustedPos.x - dragStartOffset.x,
        y: zoomAdjustedPos.y - dragStartOffset.y,
      };

      dispatch({
        type: 'MOVE_ELEMENT',
        payload: { id: draggingElement.id, ...newPosition }
      });
    };

    const handleMouseUpGlobal = () => {
      handleMouseUp();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [draggingElement, dragStartOffset, state.elements, convertToZoomCoordinates, dispatch, handleMouseUp]);

  return {
    handleMouseDown,
    handleMouseUp,
    currentDropTarget: currentDropTarget?.element || null,
    dropPosition: currentDropTarget?.position || null,
    draggingElement
  };
};