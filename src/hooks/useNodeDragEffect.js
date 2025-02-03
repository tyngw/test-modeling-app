// ./hooks/useNodeDragEffect.js
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
        if (node.id === undefined || node.id === null || node.parentId === null) {
            return;
        }
        e.stopPropagation();
        setDragging(node);
        setStartPosition({ 
            x: (e.pageX / stateRef.current.zoomRatio ) - node.x, 
            y: (e.pageY / stateRef.current.zoomRatio ) - node.y
        });
        setOriginalPosition({ 
            x: node.x, 
            y: node.y, 
        });
    }, [dispatch, state.zoomRatio]);

    useEffect(() => {
        if (dragging !== null) {
            const handleMouseMove = (e) => {
                const isMouseOverNode = (e, node) => {
                    const isWithinXBounds = (e.pageX / state.zoomRatio ) >= node.x && (e.pageX / state.zoomRatio ) <= node.x + node.width;
                    const isWithinYBounds = (e.pageY / state.zoomRatio ) >= node.y  && (e.pageY / state.zoomRatio ) <= node.y + node.height;
                    const isNotDraggingNode = node.id !== dragging.id;
                    const isNotParentNode = dragging.parentId !== node.id;

                    return isWithinXBounds && isWithinYBounds && isNotDraggingNode && isNotParentNode;
                };

                const overNode = state.nodes.find(node => isMouseOverNode(e, node));

                const newX = (e.pageX / state.zoomRatio ) - startPosition.x;
                const newY = (e.pageY / state.zoomRatio ) - startPosition.y;

                if (overNode) {
                    setOverDropTarget(overNode);
                } else {
                    setOverDropTarget(null);
                }

                dispatch({ type: 'MOVE_NODE', payload: { id: dragging.id, x: newX, y: newY } });
            };

            document.addEventListener('mousemove', handleMouseMove);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [dragging, startPosition, state.zoomRatio, state.nodes, dispatch]);

    const handleMouseUp = useCallback((e) => {
        if (dragging !== null) {
            
            if (overDropTarget) {
                // const draggingNode = getNodeById(state.nodes, dragging);    
                const oldParentId = dragging.parentId;
                const newParentId = overDropTarget.id;

                dispatch({ type: 'SNAPSHOT', payload: state.nodes });                
                dispatch({ type: 'DROP_NODE', payload: { id: dragging.id, oldParentId: oldParentId, newParentId: newParentId, depth: overDropTarget.depth + 1 } });
            } else {
                dispatch({ type: 'MOVE_NODE', payload: { id: dragging.id, x: originalPosition.x, y: originalPosition.y } });
            }
            setDragging(null);
            setOverDropTarget(null);
        }
    }, [dispatch, overDropTarget, originalPosition.x, originalPosition.y, dragging, state.nodes]);

    return { handleMouseDown, handleMouseUp, overDropTarget };
};