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
        { id: 1, text: 'Node 1', text2: '', text3: '', selected: false, x: 50, y: 50, width:MIN_WIDTH, height: NODE_HEIGHT, parentId: null, order: 0, depth: 1, children: 0, },
    ],
    width: Window.innerWidth,
    height: window.innerHeight,
    zoomRatio: 1,
};

const addNode = (allNodes, parentNode) => {
    console.log(`parentNode: ${parentNode}`)
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
            console.log(`削除対象の子ノードのtext: ${childNode.text}`);
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
    let updatedNodes
    switch (action.type) {
        case 'LOAD_NODES':
            return { ...state, nodes: action.payload };
        case 'SELECT_NODE':
            // ノードを選択状態にする
            let targetNode = state.nodes.find(node => node.id === action.payload);
            console.log(`[SELECT_NODE] id: ${targetNode.id}, text: ${targetNode.text}, text2: ${targetNode.text2}, text3: ${targetNode.text3}, selected: ${targetNode.selected}, x: ${targetNode.x}, y: ${targetNode.y}, width: ${targetNode.width}, height: ${targetNode.height}, parentId: ${targetNode.parentId}, order: ${targetNode.order}, depth: ${targetNode.depth}, children: ${targetNode.children}`);
            // 新しいノードの selected プロパティを true にし、それ以外のノードの selected プロパティを false にする
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload ? { ...node, selected: true } : { ...node, selected: false }) };
        // return { ...state, nodes: state.nodes.map(node => node.id === action.payload ? { ...node, selected: true } : node) };
        case 'DESELECT_ALL':
            // 選択状態、編集状態を解除する
            return { ...state, nodes: state.nodes.map(node => ({ ...node, selected: false, editing: false })) };
        case 'UPDATE_TEXT':
            // テキストを更新する
            console.log(`action.payload.id: ${action.payload.id}, action.payload.field: ${action.payload.field}, action.payload.value: ${action.payload.value}`);
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload.id ? { ...node, [action.payload.field]: action.payload.value } : node) };
        case 'ADD_NODE':
            // Undo/Redoのためのスナップショットを保存
            saveSnapshot(state.nodes);
            updatedNodes = addNode(state.nodes, action.payload);
            updatedNodes = adjustNodePositions(updatedNodes);
            return { ...state, nodes: updatedNodes };
        case 'DELETE_NODE':
            saveSnapshot(state.nodes);
            updatedNodes = deleteNodeRecursive(state.nodes, action.payload);
            updatedNodes = adjustNodePositions(updatedNodes);
            return { ...state, nodes: updatedNodes };
        case 'EDIT_NODE':
            if (action.payload === null || action.payload === undefined) {
                return state;
            }
            // InputFieldsコンポーネントを表示する
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload.id ? { ...node, editing: true } : node) };
        case 'END_EDITING':
            // 編集中のフィールドを終了する
            updatedNodes = adjustNodePositions(state.nodes);
            return { ...state, nodes: updatedNodes.map(node => ({ ...node, editing: false })) };
        case 'ARROW_UP':
            // handleArrowUp関数から返却されたidを持つノードを選択状態にする
            return { ...state, nodes: state.nodes.map(node => node.id === handleArrowUp(state.nodes) ? { ...node, selected: true } : { ...node, selected: false }) };
        case 'ARROW_DOWN':
            return { ...state, nodes: state.nodes.map(node => node.id === handleArrowDown(state.nodes) ? { ...node, selected: true } : { ...node, selected: false }) };
        case 'ARROW_RIGHT':
            return { ...state, nodes: state.nodes.map(node => node.id === handleArrowRight(state.nodes) ? { ...node, selected: true } : { ...node, selected: false }) };
        case 'ARROW_LEFT':
            return { ...state, nodes: state.nodes.map(node => node.id === handleArrowLeft(state.nodes) ? { ...node, selected: true } : { ...node, selected: false }) };
        case 'UNDO':
            updatedNodes = Undo(action.payload);
            return { ...state, nodes: updatedNodes };
        case 'REDO':
            updatedNodes = Redo(action.payload);
            return { ...state, nodes: updatedNodes };
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
            // 子ノードのdepthを再帰的に1インクリメント
            updatedNodes = incrementDepthRecursive(state.nodes, action.payload);
            updatedNodes = updatedNodes.map(node => node.id === action.payload.id ? { ...node, x: action.payload.x, y: action.payload.y, parentId: action.payload.parentId, order: action.payload.order, depth: action.payload.depth } : node);
            updatedNodes = adjustNodePositions(updatedNodes);
            return { ...state, nodes: updatedNodes };
        case 'MOVE_NODE':
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload.id ? { ...node, x: action.payload.x, y: action.payload.y } : node) };
        default:
            throw new Error();
    }
}

export function useStore() {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
}