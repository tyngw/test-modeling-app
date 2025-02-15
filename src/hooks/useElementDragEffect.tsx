// src/hooks/useElementDragEffect.tsx
import { useEffect, useCallback, useState } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { ICONBAR_HEIGHT } from '../constants/ElementSettings';
import { Element } from '../types';
import { isDescendant } from '../state/state';
import { ToastMessages } from '../constants/ToastMessages';
// import type { DropTargetInfo } from '../state/state';

interface UseElementDragEffectProps {
  showToast: (message: string) => void;
}

type Position = { x: number; y: number };

export const useElementDragEffect = ({ showToast }: UseElementDragEffectProps) => {
  const { state, dispatch } = useCanvas();
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  const convertToZoomCoordinates = useCallback((e: MouseEvent): Position => ({
    x: e.pageX / state.zoomRatio,
    y: (e.pageY - ICONBAR_HEIGHT) / state.zoomRatio,
  }), [state.zoomRatio]);

  const handleMouseDown = useCallback((e: React.MouseEvent, element: Element) => {
    if (!element.parentId) return;
    e.stopPropagation();

    const zoomAdjustedPos = convertToZoomCoordinates(e.nativeEvent);
    const offset = {
      x: zoomAdjustedPos.x - element.x,
      y: zoomAdjustedPos.y - element.y
    };
    setDragOffset(offset);

    dispatch({
      type: 'DRAG_START',
      payload: {
        element,
        startPosition: {
          x: zoomAdjustedPos.x - offset.x,
          y: zoomAdjustedPos.y - offset.y
        }
      }
    });
  }, [dispatch, convertToZoomCoordinates]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const zoomAdjustedPos = convertToZoomCoordinates(e);
    dispatch({
      type: 'DRAG_MOVE',
      payload: {
        x: zoomAdjustedPos.x - dragOffset.x,
        y: zoomAdjustedPos.y - dragOffset.y
      }
    });
  }, [dispatch, dragOffset, convertToZoomCoordinates]);

  const handleMouseUp = useCallback(() => {
    const dragState = state.dragState;
    if (!dragState) return;

    const handleInvalidDrop = () => {
      showToast(ToastMessages.invalidDrop);
      dispatch({ type: 'DRAG_END' });
    };

    if (dragState.dropTarget) {
      const isInvalid = isDescendant(
        state.elements,
        dragState.element.id,
        dragState.dropTarget.element.id
      );

      if (isInvalid) return handleInvalidDrop();

      dispatch({
        type: 'DRAG_END',
        payload: dragState.dropTarget
      });
    } else {
      dispatch({ type: 'DRAG_END' });
    }
  }, [state.dragState, state.elements, dispatch, showToast]);

  useEffect(() => {
    if (!state.dragState) return;

    const handleMove = (e: MouseEvent) => handleMouseMove(e);
    document.addEventListener('mousemove', handleMove);
    return () => document.removeEventListener('mousemove', handleMove);
  }, [handleMouseMove, state.dragState]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  return {
    handleMouseDown,
    currentDropTarget: state.dragState?.dropTarget?.element || null,
    dropPosition: state.dragState?.dropTarget?.position || null,
    draggingElement: state.dragState?.element
  };
};