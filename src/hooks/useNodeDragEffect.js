// src/hooks/useNodeDragEffect.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useNodeDragEffect = (state, dispatch) => {
    const [dragging, setDragging] = useState(null);
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });
    const [overDropTarget, setOverDropTarget] = useState(null);

    const stateRef = useRef(state);
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    const handleMouseDown = useCallback((e, node) => {
        if (!node.id || !node.parentId) return;
        e.stopPropagation();
        setDragging(node);
        setStartPosition({ 
            x: (e.pageX / stateRef.current.zoomRatio ) - node.x, 
            y: (e.pageY / stateRef.current.zoomRatio ) - node.y
        });
        setOriginalPosition({ x: node.x, y: node.y });
    }, []);

    useEffect(() => {
        if (dragging) {
            const handleMouseMove = (e) => {
                const overNode = Object.values(state.nodes).find(node => {
                    const x = e.pageX / state.zoomRatio;
                    const y = e.pageY / state.zoomRatio;
                    return x >= node.x && x <= node.x + node.width &&
                           y >= node.y && y <= node.y + node.height &&
                           node.id !== dragging.id &&
                           node.id !== dragging.parentId;
                });

                setOverDropTarget(overNode || null);
                const newX = (e.pageX / state.zoomRatio ) - startPosition.x;
                const newY = (e.pageY / state.zoomRatio ) - startPosition.y;
                
                dispatch({ 
                    type: 'MOVE_NODE', 
                    payload: { id: dragging.id, x: newX, y: newY } 
                });
            };

            document.addEventListener('mousemove', handleMouseMove);
            return () => document.removeEventListener('mousemove', handleMouseMove);
        }
    }, [dragging, startPosition, state.zoomRatio, state.nodes, dispatch]);

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