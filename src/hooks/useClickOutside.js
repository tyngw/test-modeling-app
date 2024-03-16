// hooks/useClickOutside.js
import { useEffect } from 'react';

export const useClickOutside = (svgRef, dispatch, editingNode, endEditing) => {
    useEffect(() => {
        const svg = svgRef.current;
        const handleMouseDown = (e) => {
            if (e.target.tagName === 'svg') {
                dispatch({ type: 'DESELECT_ALL' });
                if (editingNode) {
                    endEditing();
                }
            }
        };

        svg.addEventListener('mousedown', handleMouseDown);

        // Clean up on unmount
        return () => {
            svg.removeEventListener('mousedown', handleMouseDown);
        };
    }, [svgRef, dispatch, editingNode, endEditing]);
};