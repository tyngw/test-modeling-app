import { useEffect } from 'react';
import { useCanvas } from '../context/CanvasContext';

export const useClickOutside = (svgRef, editingNode) => {
  const { dispatch } = useCanvas();
  useEffect(() => {
    const svg = svgRef.current;
    const handleMouseDown = (e) => {
      if (e.target.tagName === 'svg') {
        dispatch({ type: 'DESELECT_ALL' });
        if (editingNode) dispatch({ type: 'END_EDITING' });
      }
    };
    svg.addEventListener('mousedown', handleMouseDown);
    return () => {
        svg.removeEventListener('mousedown', handleMouseDown);
    };
  }, [svgRef, editingNode, dispatch]);
};