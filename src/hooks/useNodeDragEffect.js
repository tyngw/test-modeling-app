// ./hooks/useNodeDragEffect.js
import { useState, useEffect, useCallback } from 'react';
import { 
    NODE_HEIGHT, 
    X_OFFSET } from '../constants/Node';
import { getNodeById } from '../utils/NodeSelector';

export const useNodeDragEffect = (state, dispatch) => {
    const [dragging, setDragging] = useState(null);
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });
    const [overDropTarget, setOverDropTarget] = useState(null);

    const handleMouseDown = useCallback((e, id) => {
        if (id === undefined || id === null) {
            return;
        }
        e.stopPropagation();
        const node = getNodeById(state.nodes, id);
        setDragging(node);
        setStartPosition({ x: e.pageX - node.x, y: e.pageY - node.y });
        setOriginalPosition({ x: node.x, y: node.y });
        // };
    }, [state.nodes]);

    useEffect(() => {
        if (dragging !== null) {
            console.log(`[useNodeDragEffect]dragging: ${dragging.id}`)
            const handleMouseMove = (e) => {
                const isMouseOverNode = (e, node) => {
                    const isWithinXBounds = e.pageX >= node.x && e.pageX <= node.x + node.width;
                    const isWithinYBounds = e.pageY >= node.y  && e.pageY <= node.y + node.height;
                    const isNotDraggingNode = node.id !== dragging.id;
                    const isNotParentNode = dragging.parentId !== node.id;

                    return isWithinXBounds && isWithinYBounds && isNotDraggingNode && isNotParentNode;
                };

                const overNode = state.nodes.find(node => isMouseOverNode(e, node));

                const newX = e.pageX - startPosition.x;
                const newY = e.pageY - startPosition.y;

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
    }, [dragging, startPosition, dispatch]);

    const handleMouseUp = useCallback((e) => {
        if (dragging !== null) {
            
            if (overDropTarget) {
                // const draggingNode = getNodeById(state.nodes, dragging);    
                const oldParentId = dragging.parentId;
                const newParentId = overDropTarget.id;

                dispatch({ type: 'SNAPSHOT', payload: state.nodes });
                // ノードのorderを更新する前に、移動元の兄弟ノードのorderをデクリメント
                dispatch({ type: 'DECREMENT', payload: { oldParentId: oldParentId, draggingNodeOrder: dragging.order } });
                // 移動先の子ノードの数に基づいて新しいorderを計算
                const siblings = state.nodes.filter(node => node.parentId === newParentId);
                const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(node => node.order)) + 1 : 0;
                
                dispatch({ type: 'DROP_NODE', payload: { id: dragging.id, newParentId: newParentId, order: maxOrder, depth: overDropTarget.depth + 1 } });
            } else {
                dispatch({ type: 'MOVE_NODE', payload: { id: dragging.id, x: originalPosition.x, y: originalPosition.y } });
            }
            setDragging(null);
            setOverDropTarget(null);
        }
    }, [overDropTarget, originalPosition.x, originalPosition.y]);

    return { handleMouseDown, handleMouseUp, overDropTarget };
};