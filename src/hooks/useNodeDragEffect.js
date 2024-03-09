// ./hooks/useNodeDragEffect.js
import { useState, useEffect, useCallback } from 'react';
import { 
    ICONBAR_HEIGHT,
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
        setDragging(id);
        setStartPosition({ x: e.pageX - node.x, y: e.pageY - node.y });
        setOriginalPosition({ x: node.x, y: node.y });
        // };
    }, [state.nodes]);

    useEffect(() => {
        if (dragging !== null) {
            console.log(`[useNodeDragEffect]dragging: ${dragging}`)
            const handleMouseMove = (e) => {
                const isMouseOverNode = (e, node) => {
                    const isWithinXBounds = e.pageX >= node.x && e.pageX <= node.x + node.width;
                    const isWithinYBounds = e.pageY >= node.y + ICONBAR_HEIGHT && e.pageY <= node.y + node.height + ICONBAR_HEIGHT;
                    const isNotDraggingNode = node.id !== dragging;

                    return isWithinXBounds && isWithinYBounds && isNotDraggingNode;
                };

                const overNode = state.nodes.find(node => isMouseOverNode(e, node));

                const newX = e.pageX - startPosition.x;
                const newY = e.pageY - startPosition.y;

                if (overNode) {
                    setOverDropTarget(overNode);
                } else {
                    setOverDropTarget(null);
                }

                dispatch({ type: 'MOVE_NODE', payload: { id: dragging, x: newX, y: newY } });
            };

            document.addEventListener('mousemove', handleMouseMove);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [dragging, startPosition, dispatch]);

    const handleMouseUp = useCallback((e) => {
        if (dragging !== null) {
            if (overDropTarget && originalPosition) {
                const draggingNode = getNodeById(state.nodes, dragging);
                const originalParentId = draggingNode.parentId;
                const newParentId = overDropTarget.id;

                dispatch({ type: 'SNAPSHOT', payload: state.nodes });
                // ノードのorderを更新する前に、移動元の兄弟ノードのorderをデクリメント
                dispatch({ type: 'DECREMENT_ORDER', payload: { parentId: originalParentId, draggingNodeOrder: draggingNode.order } });
                // 移動元の親ノードの情報を更新
                dispatch({ type: 'UPDATE_SOURCE_PARENT_NODE', payload: originalParentId });
                // 移動先の親ノードの情報を更新
                dispatch({ type: 'UPDATE_DEST_PARENT_NODE', payload: newParentId });

                // 移動先の子ノードの数に基づいて新しいorderを計算
                const siblings = state.nodes.filter(node => node.parentId === newParentId);
                const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(node => node.order)) + 1 : 0;
                
                dispatch({ type: 'DROP_NODE', payload: { id: dragging, parentId: newParentId, order: maxOrder, depth: overDropTarget.depth + 1 } });
            } else {
                dispatch({ type: 'MOVE_NODE', payload: { id: dragging, x: originalPosition.x, y: originalPosition.y } });
            }
            setDragging(null);
            setOverDropTarget(null);
        }
    }, [overDropTarget, originalPosition.x, originalPosition.y]);

    return { handleMouseDown, handleMouseUp, overDropTarget };
};