// src/hooks/useNodeDragEffect.tsx
import { useState, useEffect, useCallback } from 'react';
import { useCanvas } from '../context/CanvasContext';
import { ICONBAR_HEIGHT } from '../constants/NodeSettings';

interface Node {
  id: string;
  parentId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

interface State {
  zoomRatio: number;
  elements: { [key: string]: Node };
}

type MouseHandler = (e: globalThis.MouseEvent) => void;

export const useNodeDragEffect = () => {
  const { state, dispatch } = useCanvas() as { state: State; dispatch: React.Dispatch<any> };
  const [dragging, setDragging] = useState<Node | null>(null);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });
  const [overDropTarget, setOverDropTarget] = useState<Node | null>(null);

  const handleMouseDown = useCallback((
    e: React.MouseEvent<HTMLElement>,
    element: Node
  ) => {
    if (!element.id || !element.parentId) return;
    e.stopPropagation();
    setDragging(element);
    setStartPosition({ 
      x: (e.pageX / state.zoomRatio) - element.x, 
      y: (e.pageY / state.zoomRatio) - element.y 
    });
    setOriginalPosition({ x: element.x, y: element.y });
  }, [state.zoomRatio]);

  useEffect(() => {
    if (dragging) {
      const handleMouseMove: MouseHandler = (e) => {
        const overNode = Object.values(state.elements).find(element => {
          const x = e.pageX / state.zoomRatio;
          const y = (e.pageY / state.zoomRatio) - ICONBAR_HEIGHT;
          return x >= element.x && x <= element.x + element.width &&
                 y >= element.y && y <= element.y + element.height &&
                 element.id !== dragging.id &&
                 element.id !== dragging.parentId;
        });
        
        setOverDropTarget(overNode || null);
        const newX = (e.pageX / state.zoomRatio) - startPosition.x;
        const newY = (e.pageY / state.zoomRatio) - startPosition.y;
        
        dispatch({ 
          type: 'MOVE_NODE', 
          payload: { id: dragging.id, x: newX, y: newY } 
        });
      };

      document.addEventListener('mousemove', handleMouseMove);
      return () => document.removeEventListener('mousemove', handleMouseMove);
    }
  }, [dragging, startPosition, state.zoomRatio, state.elements, dispatch]);

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      if (overDropTarget) {
        dispatch({ type: 'SNAPSHOT' });
        dispatch({ 
          type: 'DROP_NODE', 
          payload: { 
            id: dragging.id, 
            oldParentId: dragging.parentId, 
            newParentId: overDropTarget.id, 
            depth: overDropTarget.depth + 1 
          }
        });
      } else {
        dispatch({ 
          type: 'MOVE_NODE', 
          payload: { id: dragging.id, x: originalPosition.x, y: originalPosition.y } 
        });
      }
      setDragging(null);
      setOverDropTarget(null);
    }
  }, [dragging, overDropTarget, originalPosition, dispatch]);

  return { handleMouseDown, handleMouseUp, overDropTarget };
};