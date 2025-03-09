// src/hooks/useElementDragEffect.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Element } from '../types';
import { useCanvas } from '../context/canvasContext';
import { isDescendant } from '../state/state';
import { ToastMessages } from '../constants/toastMessages';
import { HEADER_HEIGHT } from '../constants/elementSettings';
import { useToast } from '../context/toastContext';
import { OFFSET } from '../constants/elementSettings';

const isTouchEvent = (event: MouseEvent | TouchEvent): event is TouchEvent => {
  return 'touches' in event;
};

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

  const convertToZoomCoordinates = useCallback((e: MouseEvent | TouchEvent): Position => {
    let clientX: number, clientY: number;

    if (isTouchEvent(e)) {
      clientX = e.touches[0].clientX + window.scrollX; // スクロールオフセットを追加
      clientY = e.touches[0].clientY + window.scrollY; // スクロールオフセットを追加
    } else {
      clientX = e.clientX + window.scrollX; // スクロールオフセットを追加
      clientY = e.clientY + window.scrollY; // スクロールオフセットを追加
    }

    return {
      x: clientX / state.zoomRatio,
      y: (clientY - HEADER_HEIGHT) / state.zoomRatio,
    };
  }, [state.zoomRatio]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>, element: Element) => {
      if (!element.parentId) return;
      e.stopPropagation();

      let nativeEvent: MouseEvent | TouchEvent;
      if (e.nativeEvent instanceof TouchEvent) {
        e.preventDefault();
        nativeEvent = e.nativeEvent;
      } else {
        nativeEvent = e.nativeEvent;
      }

      const zoomAdjustedPos = convertToZoomCoordinates(nativeEvent);
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
          addToast(ToastMessages.dropChildElement, 'warn');
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
      addToast(ToastMessages.dragError, 'warn');
    } finally {
      setDraggingElement(null);
      setCurrentDropTarget(null);
    }
  }, [draggingElement, currentDropTarget, originalPosition, state.elements, dispatch, addToast]);

  useEffect(() => {
    if (!draggingElement) return;

    const findDropTarget = (e: MouseEvent | TouchEvent): DropTargetInfo => {
      const zoomAdjustedPos = convertToZoomCoordinates(e);
      const mouseX = zoomAdjustedPos.x;
      const mouseY = zoomAdjustedPos.y;

      // 候補要素を事前フィルタリング
      const candidates = Object.values(state.elements).filter(element =>
        element.visible &&
        element.id !== draggingElement?.id &&
        isXInElementRange(element, mouseX)
      );

      let closestTarget: DropTargetInfo = null;
      let minSquaredDistance = Infinity;

      for (const element of candidates) {
        const { position, distanceSq } = calculatePositionAndDistance(element, mouseX, mouseY);

        if (distanceSq < minSquaredDistance) {
          minSquaredDistance = distanceSq;
          closestTarget = { element, position };
        }
      }

      return closestTarget;
    };

    const isXInElementRange = (element: Element, mouseX: number): boolean => {
      return mouseX > element.x && mouseX < element.x + element.width;
    };

    const calculatePositionAndDistance = (element: Element, mouseX: number, mouseY: number) => {
      const elemTop = element.y;
      const elemBottom = element.y + element.height;
      const thresholdY = element.height * 0.1; // 上下10%を境界

      let position: DropPosition = 'child';
      if (mouseY < elemTop + thresholdY) {
        position = 'before';
      } else if (mouseY > elemBottom - thresholdY) {
        position = 'after';
      }

      const centerX = element.x + element.width / 2;
      const centerY = elemTop + element.height / 2;
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;

      return {
        position,
        distanceSq: dx * dx + dy * dy // 平方距離で比較
      };
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (e instanceof TouchEvent && e.touches.length === 1) {
        e.preventDefault();
      }

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

    const handleMouseMove = (e: MouseEvent) => handleMove(e);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) handleMove(e);
    };

    const handleMouseUpGlobal = () => handleMouseUp();
    const handleTouchEnd = () => handleMouseUp();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUpGlobal);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
      document.removeEventListener('touchend', handleTouchEnd);
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