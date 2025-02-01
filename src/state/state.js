// src/state/state.js
import { useReducer } from 'react';
import { adjustNodePositions } from '../utils/NodeAdjuster';
import { Undo, Redo, saveSnapshot, clearSnapshots } from './undoredo';
import { handleArrowUp, handleArrowDown, handleArrowRight, handleArrowLeft } from '../utils/NodeSelector';
import {
    DEFAULT_X,
    DEFAULT_Y,
    NODE_HEIGHT,
    MIN_WIDTH
} from '../constants/Node';
import {
    deleteNodeRecursive,
    setDepthRecursive,
    getSelectedNodeAndChildren,
    pasteNodes,
    setVisibilityRecursive
} from '../utils/NodeActionHelper';

const createNewNode = (parentId, order, depth) => ({
    id: 0, // この値は後で上書きされます
    text: '',
    text2: '',
    text3: '',
    x: 0,
    y: 0,
    width: MIN_WIDTH,
    height: NODE_HEIGHT,
    parentId: parentId,
    order: order,
    depth: depth,
    children: 0,
    editing: true,
    selected: true,
    visible: true,
});

const initialState = {
    nodes: [
        {
            ...createNewNode(null, 0, 1),
            id: 1,
            x: DEFAULT_X, y: DEFAULT_Y,
            editing: false,
        },
    ],
    width: Window.innerWidth,
    height: window.innerHeight,
    zoomRatio: 1,
};

const addNode = (allNodes, parentNode) => {
    const newId = Math.max(...allNodes.map(node => node.id), 0) + 1;
    const newOrder = parentNode.children;
    const newRect = {
        ...createNewNode(parentNode.id, newOrder, parentNode.depth + 1),
        id: newId,
    };
    const updatedNodes = allNodes.map(node => {
        if (node.id === parentNode.id) {
            return { ...node, children: node.children + 1, selected: false };
        }
        return node;
    });

    return [...updatedNodes, newRect];
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
                // parentIdがnullのノードはvisibleをtrueに設定
                updatedNodes = action.payload.map(node => node.parentId === null ? { ...node, visible: true } : node);
                updatedNodes = adjustNodePositions(action.payload);
                return { ...state, nodes: updatedNodes };
            }
        case 'SELECT_NODE':
            const selectNode = state.nodes.find(node => node.id === action.payload);
            if (selectNode) {
                const { text, text2, text3, selected, editing, visible, section1Height, section2Height, section3Height, ...selectNodeWithoutText } = selectNode;
                console.log(`[SELECT_NODE] selectNode: ${JSON.stringify(selectNodeWithoutText, null, 2)}`);
            }
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload ? { ...node, selected: true } : { ...node, selected: false, editing: false }) };
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
        case 'SNAPSHOT':
            saveSnapshot(state.nodes);
            return state;
        // case 'DECREMENT':
        //     return { ...state, nodes: updatedNodes };
        case 'DROP_NODE':
            const siblings = state.nodes.filter(node => node.parentId === action.payload.newParentId);
            const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(node => node.order)) + 1 : 0;

            // 移動元の兄弟ノードのorderを更新
            updatedNodes = state.nodes.map(node => ({
                ...node,
                order: node.parentId === action.payload.oldParentId && node.order > action.payload.draggingNodeOrder ? node.order - 1 : node.order,
            }));
            // 移動元の親ノードの情報を更新
            updatedNodes = updateChildren(state.nodes, action.payload.oldParentId, -1);
            // 移動先の親ノードの情報を更新
            updatedNodes = updateChildren(state.nodes, action.payload.newParentId, 1);
            // 移動先のノードの情報を更新
            updatedNodes = setDepthRecursive(state.nodes, action.payload);
            // 移動先のノードのorderを更新
            updatedNodes = updatedNodes.map(node => node.id === action.payload.id ? { ...node, parentId: action.payload.newParentId, order: maxOrder, depth: action.payload.depth } : node);
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
                updatedNodes = updateChildren(updatedNodes, selectedNode.id, 1);
                updatedNodes = adjustNodePositions(updatedNodes);
                return { ...state, nodes: updatedNodes };
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
        case 'UPDATE_NODE_SIZE':
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload.id ? { ...node, width: action.payload.width, height: action.payload.height } : node) };
        default:
            return state;
    }
}

export function useStore() {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
}