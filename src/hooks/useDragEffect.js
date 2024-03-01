// src/hooks/useDragEffect.js
import { useState, useEffect, useCallback } from 'react';
import { calculateNodeWidth } from '../utils/TextNodeHelpers';
import { NODE_HEIGHT, X_OFFSET } from '../constants/Node';

export const useDragEffect = (state, dispatch, getNodeById) => {
    const [dragging, setDragging] = useState(null);
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e, id) => {
        if (id === undefined || id === null) {
            return;
        }

        const node = getNodeById(state.nodes, id);
        setDragging(id);
        setStartPosition({ x: e.clientX - node.x, y: e.clientY - node.y });
        setOriginalPosition({ x: node.x, y: node.y });
        e.stopPropagation();
    };

    useEffect(() => {
        if (dragging !== null) {
            const handleMouseMove = (e) => {
                const newX = e.clientX - startPosition.x;
                const newY = e.clientY - startPosition.y;

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
            const dropX = e.clientX;
            const dropY = e.clientY;

            const droppedOverNode = state.nodes.find(node => {
                const width = calculateNodeWidth([node.text, node.text2, node.text3]);
                return dropX >= node.x && dropX <= node.x + width &&
                    dropY >= node.y && dropY <= node.y + NODE_HEIGHT &&
                    node.id !== dragging;
            });

            if (droppedOverNode) {
                console.log(`droppedOverNode.id: ${droppedOverNode.id}`)
                const draggingNode = getNodeById(state.nodes, dragging);
                const originalParentId = draggingNode.parentId;
                const newParentId = droppedOverNode.id;

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
                const newX = siblings.length > 0 ? siblings[0].x : droppedOverNode.x + X_OFFSET;
                const newY = siblings.length > 0 ? siblings[maxOrder - 1].y + NODE_HEIGHT + 10 : droppedOverNode.y;

                dispatch({ type: 'DROP_NODE', payload: { id: dragging, x: newX, y: newY, parentId: newParentId, order: maxOrder, depth: droppedOverNode.depth + 1 } });
            } else {
                dispatch({ type: 'DRAG_NODE', payload: { id: dragging, x: originalPosition.x, y: originalPosition.y } });
            }

            setDragging(null);
        }
    }, [dragging, originalPosition.x, originalPosition.y]);

    return { handleMouseDown, handleMouseUp };
};