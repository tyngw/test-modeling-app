// src/state/state.js

import { useReducer } from 'react';
import { adjustNodePositions } from '../utils/NodeAdjuster';
import { Undo, Redo, saveSnapshot } from './undoredo';
import { handleArrowUp, handleArrowDown, handleArrowRight, handleArrowLeft } from '../utils/NodeSelector';
import {
    NODE_HEIGHT,
    MIN_WIDTH
} from '../constants/Node';

const initialState = {
    nodes: [
        { id: 1, text: 'Node 1', text2: '', text3: '', selected: false, x: 50, y: 50, width: MIN_WIDTH, height: NODE_HEIGHT, parentId: null, order: 0, depth: 1, children: 0, },
    ],
    width: Window.innerWidth,
    height: window.innerHeight,
    zoomRatio: 1,
};

const addNode = (allNodes, parentNode) => {
    let newNodes;
    const newId = Math.max(...allNodes.map(node => node.id), 0) + 1;
    const newOrder = parentNode.children;
    const newRect = {
        id: newId,
        text: '',
        text2: '',
        text3: '',
        // text: `Node ${newId}`,
        // text2: `order: ${newOrder}`,
        // text3: `depth: ${parentNode.depth + 1}`,
        selected: false,
        x: 0,
        y: 0,
        width: MIN_WIDTH,
        height: NODE_HEIGHT,
        parentId: parentNode.id,
        order: newOrder,
        depth: parentNode.depth + 1,
        children: 0,
        editing: true,
        selected: true,
    };
    newNodes = [...allNodes, newRect];

    // 親ノードのchildrenをインクリメントするとともに、選択状態を解除する
    newNodes = newNodes.map(node => {
        if (node.id === parentNode.id) {
            // return { ...node, children: node.children + 1 };
            return { ...node, children: node.children + 1, selected: false };
        }
        return node;
    });

    return newNodes;
};

// 指定されたノードの子ノードのdepthを再帰的に親ノードのdepth+1に設定する関数
const incrementDepthRecursive = (nodeList, parentNode) => {
    let updatedNodes = nodeList.map(node => {
        if (node.parentId === parentNode.id) {
            return { ...node, depth: parentNode.depth + 1 };
        }
        return node;
    });

    const childNodes = updatedNodes.filter(node => node.parentId === parentNode.id);
    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            updatedNodes = incrementDepthRecursive(updatedNodes, childNode);
        });
    }
    return updatedNodes;
};

// 与えられたノードを再帰的に削除する関数
// 引数としてノードのリストと削除対象のノードを受け取る
const deleteNodeRecursive = (nodeList, nodeToDelete) => {

    // 与えられたnodeToDeleteのparentIdがnullの場合は処理を終了
    if (nodeToDelete.parentId === null) {
        return nodeList;
    }
    // 指定されたノードを除外して新しいノードのリストを作成
    let updatedNodes = nodeList.filter(node => node.id !== nodeToDelete.id);

    // 削除対象のノードIdと一致するparentIdを持つノードも削除する
    // 再起的に自身のdeleteNode関数を呼び出して処理する
    const childNodes = updatedNodes.filter(node => node.parentId === nodeToDelete.id);
    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            updatedNodes = deleteNodeRecursive(updatedNodes, childNode);
        });
    }

    // 指定されたノードのIdと一致するparentIdを持つノードのchildrenをデクリメント
    updatedNodes = updatedNodes.map(node => {
        if (nodeToDelete.parentId === node.id) {
            return { ...node, children: node.children - 1 };
        }
        return node;
    });

    return updatedNodes;
};

function reducer(state, action) {
    let updatedNodes;
    const selectedNode = state.nodes.find(node => node.selected);

    switch (action.type) {
        case 'ZOOM_IN':
            return { ...state, zoomRatio: state.zoomRatio + 0.1 };
        case 'ZOOM_OUT':
            return { ...state, zoomRatio: state.zoomRatio - 0.1 };
        case 'ARROW_UP':
        case 'ARROW_DOWN':
        case 'ARROW_RIGHT':
        case 'ARROW_LEFT':
            const handler = {
                'ARROW_UP': handleArrowUp,
                'ARROW_DOWN': handleArrowDown,
                'ARROW_RIGHT': handleArrowRight,
                'ARROW_LEFT': handleArrowLeft,
            }[action.type];
            return { ...state, nodes: state.nodes.map(node => node.id === handler(state.nodes) ? { ...node, selected: true } : { ...node, selected: false }) };
        case 'LOAD_NODES':
            if (action.payload.length === 0) {
                return initialState;
            } else {
                return { ...state, nodes: action.payload };
            }
        case 'SELECT_NODE':
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload ? { ...node, selected: true } : { ...node, selected: false }) };
        case 'DESELECT_ALL':
            return { ...state, nodes: state.nodes.map(node => ({ ...node, selected: false, editing: false })) };
        case 'UPDATE_TEXT':
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload.id ? { ...node, [action.payload.field]: action.payload.value } : node) };
        case 'ADD_NODE':
            if (selectedNode) {
                saveSnapshot(state.nodes);
                updatedNodes = addNode(state.nodes, selectedNode);
                updatedNodes = adjustNodePositions(updatedNodes);
                return { ...state, nodes: updatedNodes };
            } else {
                return state;
            }
        case 'DELETE_NODE':
            if (selectedNode) {
                saveSnapshot(state.nodes);
                updatedNodes = deleteNodeRecursive(state.nodes, selectedNode);
                updatedNodes = adjustNodePositions(updatedNodes);
                return { ...state, nodes: updatedNodes };
            } else {
                return state;
            }
        case 'EDIT_NODE':
            if (selectedNode) {
                return { ...state, nodes: state.nodes.map(node => node.id === selectedNode.id ? { ...node, editing: true } : node) };
            } else {
                return state;
            }

        case 'END_EDITING':
            // 編集中のフィールドを終了する
            updatedNodes = adjustNodePositions(state.nodes);
            return { ...state, nodes: updatedNodes.map(node => ({ ...node, editing: false })) };
        case 'UNDO':
            return { ...state, nodes: Undo(state.nodes) };
        case 'REDO':
            return { ...state, nodes: Redo(state.nodes) };
        case 'ZOOM_IN':
            return { ...state, zoomRatio: state.zoomRatio + 0.1 };
        case 'ZOOM_OUT':
            return { ...state, zoomRatio: state.zoomRatio - 0.1 };
        case 'SNAPSHOT':
            saveSnapshot(state.nodes);
            return state;
        case 'DECREMENT_ORDER':
            updatedNodes = state.nodes.map(node => ({
                ...node,
                order: node.parentId === action.payload.parentId && node.order > action.payload.draggingNodeOrder ? node.order - 1 : node.order,
            }));
            return { ...state, nodes: updatedNodes };

        case 'UPDATE_SOURCE_PARENT_NODE':
            updatedNodes = state.nodes.map(node => {
                if (node.id === action.payload) {
                    return { ...node, children: node.children - 1 };
                }
                return node;
            });
            return { ...state, nodes: updatedNodes };
        case 'UPDATE_DEST_PARENT_NODE':
            updatedNodes = state.nodes.map(node => {
                if (node.id === action.payload) {
                    return { ...node, children: node.children + 1 };
                }
                return node;
            });

            return { ...state, nodes: updatedNodes };
        case 'DROP_NODE':
            updatedNodes = incrementDepthRecursive(state.nodes, action.payload);
            updatedNodes = updatedNodes.map(node => node.id === action.payload.id ? { ...node, x: action.payload.x, y: action.payload.y, parentId: action.payload.parentId, order: action.payload.order, depth: action.payload.depth } : node);
            updatedNodes = adjustNodePositions(updatedNodes);
            return { ...state, nodes: updatedNodes };
        case 'MOVE_NODE':
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload.id ? { ...node, x: action.payload.x, y: action.payload.y } : node) };
        default:
            return state;
    }
}

export function useStore() {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
}