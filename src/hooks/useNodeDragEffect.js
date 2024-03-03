// ./hooks/useNodeDragEffect.js
import { useState, useEffect, useCallback } from 'react';
import { calculateNodeWidth } from '../utils/TextNodeHelpers';
import { NODE_HEIGHT, X_OFFSET } from '../constants/Node';
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
        setStartPosition({ x: e.clientX - node.x, y: e.clientY - node.y });
        setOriginalPosition({ x: node.x, y: node.y });
        // };
    }, [state.nodes]);

    useEffect(() => {
        if (dragging !== null) {
            console.log(`[useNodeDragEffect]dragging: ${dragging}`)
            const handleMouseMove = (e) => {
                const newX = e.clientX - startPosition.x;
                const newY = e.clientY - startPosition.y;

                const overNode = state.nodes.find(node => {
                    return newX >= node.x && newX <= node.x + node.width &&
                        newY >= node.y && newY <= node.y + node.height &&
                        node.id !== dragging;
                });

                if (overNode) {
                    setOverDropTarget(overNode);
                } else {
                    setOverDropTarget(null);
                }

                dispatch({ type: 'DRAG_NODE', payload: { id: dragging, x: newX, y: newY } });
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
                const newX = siblings.length > 0 ? siblings[0].x : overDropTarget.x + X_OFFSET;
                const newY = siblings.length > 0 ? siblings[maxOrder - 1].y + NODE_HEIGHT + 10 : overDropTarget.y;

                dispatch({ type: 'DROP_NODE', payload: { id: dragging, x: newX, y: newY, parentId: newParentId, order: maxOrder, depth: overDropTarget.depth + 1 } });
            } else {
                dispatch({ type: 'DRAG_NODE', payload: { id: dragging, x: originalPosition.x, y: originalPosition.y } });
            }
            setDragging(null);
            setOverDropTarget(null);
        }
    }, [overDropTarget, originalPosition.x, originalPosition.y]);

    return { handleMouseDown, handleMouseUp, overDropTarget };
};