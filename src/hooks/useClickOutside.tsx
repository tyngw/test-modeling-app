// src/hooks/useClickOutside.tsx
import { useEffect } from 'react';
import { useCanvas } from '../context/CanvasContext';
import type { MutableRefObject } from 'react';

export const useClickOutside = (
  svgRef: MutableRefObject<SVGSVGElement | null>,
  editingNode: boolean
) => {
  const { dispatch } = useCanvas();
  useEffect(() => {
    const svg = svgRef.current;
    const handleMouseDown = (e: MouseEvent) => {
      if (e.target instanceof SVGElement && e.target.tagName === 'svg') {
        dispatch({ type: 'DESELECT_ALL' });
        if (editingNode) dispatch({ type: 'END_EDITING' });
      }
    };
    svg?.addEventListener('mousedown', handleMouseDown);
    return () => {
      svg?.removeEventListener('mousedown', handleMouseDown);
    };
  }, [svgRef, editingNode, dispatch]);
};