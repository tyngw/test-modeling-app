// src/state/state.js

import { useReducer } from 'react';
import { adjustNodePositions } from '../utils/NodeAdjuster';
import { Undo, Redo, saveSnapshot, clearSnapshots } from './undoredo';
import { handleArrowUp, handleArrowDown, handleArrowRight, handleArrowLeft } from '../utils/NodeSelector';
import {
    NODE_HEIGHT,
    MIN_WIDTH
} from '../constants/Node';

const initialState = {
    nodes: [
        {
            id: 1,
            text: 'Node 1',
            text2: '',
            text3: '',
            selected: false,
            x: 50,
            y: 50,
            width: MIN_WIDTH,
            height: NODE_HEIGHT,
            parentId: null,
            order: 0,
            depth: 1,
            children: 0,
            visible: true,
        },
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
        visible: true,
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

const getSelectedNodeAndChildren = (nodeList, targetNode, selectedNode) => {
    let cutNodes = [];


    if (targetNode.id === selectedNode.id) {
        cutNodes.push({ ...targetNode, parentId: null });
    } else {
        cutNodes.push(targetNode);
    }

    // 選択対象のノードIdと一致するparentIdを持つノードを再帰的に取得
    const childNodes = nodeList.filter(node => node.parentId === targetNode.id);
    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            cutNodes = [...cutNodes, ...getSelectedNodeAndChildren(nodeList, childNode, selectedNode)];
        });
    }

    return cutNodes;
};

// cutNodesに含まれるノードをnodesに追加できるように新しいノードを作成する関数
    // 既存のidと重複する場合は、コピーであることを示すので、新しいidを割り当てる
    // idを更新すると、子ノードのparentIdを更新する必要があるので、再帰的に処理する
    // parentIdがnullの場合は、parentNode.idを割り当てる
    // 戻り値として、編集後のcutNodesを返す
const pasteNodes = (nodeList, cutNodes, parentNode) => {
    let newNodes = [];
    const rootNode = cutNodes.find(node => node.parentId === null);
    if (!rootNode) {
        return [...nodeList, ...cutNodes]
    }
    const rootNodeDepth = rootNode.depth;
    const baseDepth = parentNode.depth + 1;
    const depthDelta = baseDepth - rootNodeDepth;
    let newId = Math.max(...nodeList.map(node => node.id), 0) + 1;
    const idMap = new Map();

    cutNodes.forEach(cutNode => {
        if (nodeList.find(node => node.id === cutNode.id)) {
            idMap.set(cutNode.id, newId);
            cutNode.id = newId;
            newId++;
        }
        cutNode.depth = cutNode.depth + depthDelta;
        
        if (cutNode.id === rootNode.id) {
            cutNode.parentId = parentNode.id;
        }

        newNodes.push(cutNode);
    });

    let updatedNodes = [...nodeList];
    newNodes = newNodes.map(node => {
        if (idMap.has(node.parentId)) {
            node.parentId = idMap.get(node.parentId);
        }
        return node;
    });

    updatedNodes = [...updatedNodes, ...newNodes];

    return updatedNodes;
}


// 指定されたノードの子ノードのdepthを再帰的に親ノードのdepth+1に設定する関数
const setDepthRecursive = (nodeList, parentNode) => {
    return nodeList.reduce((updatedNodes, node) => {
        let newNode = node;
        if (node.parentId === parentNode.id) {
            newNode = { ...node, depth: parentNode.depth + 1 };
            updatedNodes = setDepthRecursive(updatedNodes, newNode);
        }
        return [...updatedNodes, newNode];
    }, []);
};

// 指定されたノードの子ノードのvisibleを再帰的にtrueまたはfalseに設定する関数
// 戻り値として、visibleを更新した新しいノードのリストを返す
const setVisibilityRecursive = (nodeList, parentNode, visible) => {
    return nodeList.reduce((updatedNodes, node) => {
        let newNode = node;
        if (node.parentId === parentNode.id) {
            newNode = { ...node, visible: visible };
            updatedNodes = setVisibilityRecursive(updatedNodes, newNode, visible);
        }
        return [...updatedNodes, newNode];
    }, []);
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

function updateChildren(nodes, id, increment) {
    return nodes.map(node => {
        if (node.id === id) {
            return { ...node, children: node.children + increment };
        }
        return node;
    });
}

function reducer(state, action) {
    let updatedNodes;
    const selectedNode = state.nodes.find(node => node.selected);

    switch (action.type) {
        // initialStateを返す
        case 'NEW':
            clearSnapshots();
            return initialState;
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
            if (selectedNode) {
                console.log(`[reducer]SELECT_NODE id: ${selectedNode.id} x: ${selectedNode.x} y: ${selectedNode.y} order: ${selectedNode.order} depth: ${selectedNode.depth} parentId: ${selectedNode.parentId}`);
            }
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
        case 'DECREMENT':
            updatedNodes = state.nodes.map(node => ({
                ...node,
                order: node.parentId === action.payload.parentId && node.order > action.payload.draggingNodeOrder ? node.order - 1 : node.order,
            }));
            // 移動元の親ノードの情報を更新
            updatedNodes = updateChildren(state.nodes, action.payload.oldParentId, -1);
            return { ...state, nodes: updatedNodes };
        case 'DROP_NODE':
            // 移動先の親ノードの情報を更新
            updatedNodes = updateChildren(state.nodes, action.payload.newParentId, 1);
            updatedNodes = setDepthRecursive(state.nodes, action.payload);
            updatedNodes = updatedNodes.map(node => node.id === action.payload.id ? { ...node, parentId: action.payload.newParentId, order: action.payload.order, depth: action.payload.depth } : node);
            updatedNodes = adjustNodePositions(updatedNodes);
            return { ...state, nodes: updatedNodes };
        case 'MOVE_NODE':
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload.id ? { ...node, x: action.payload.x, y: action.payload.y } : node) };
        case 'CUT_NODE':
            if (selectedNode) {
                saveSnapshot(state.nodes);
                const cutNodes = getSelectedNodeAndChildren(state.nodes, selectedNode, selectedNode);
                updatedNodes = deleteNodeRecursive(state.nodes, selectedNode);
                updatedNodes = adjustNodePositions(updatedNodes);
                return { ...state, nodes: updatedNodes, cutNodes: cutNodes };
            } else {
                return state;
            }
        case 'COPY_NODE':
            if (selectedNode) {
                const copyNodes = getSelectedNodeAndChildren(state.nodes, selectedNode, selectedNode);
                return { ...state, cutNodes: copyNodes };
            } else {
                return state;
            }
        case 'PASTE_NODE':
            if (state.cutNodes && selectedNode) {
                saveSnapshot(state.nodes);
                updatedNodes = pasteNodes(state.nodes, state.cutNodes, selectedNode);
                updatedNodes = adjustNodePositions(updatedNodes);
                return { ...state, nodes: updatedNodes};
            } else {
                return state;
            }
        case 'EXPAND_NODE':
            updatedNodes = setVisibilityRecursive(state.nodes, selectedNode, true);
            // updatedNodesをコンソールログにjson形式で整形して出力
            console.log(`[reducer]EXPAND_NODE updatedNodes: ${JSON.stringify(updatedNodes, null, 2)}`);
            updatedNodes = adjustNodePositions(updatedNodes);
            return { ...state, nodes: updatedNodes };
        case 'COLLAPSE_NODE':
            updatedNodes = setVisibilityRecursive(state.nodes, selectedNode, false);
            updatedNodes = adjustNodePositions(updatedNodes);
            return { ...state, nodes: updatedNodes };
        default:
            return state;
    }
}

export function useStore() {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
}