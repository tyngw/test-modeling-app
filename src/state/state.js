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

// ノード生成関数
const createNewNode = (parentId, order, depth) => ({
    id: 0, // 後で上書きされる
    text: '',
    text2: '',
    text3: '',
    x: 0,
    y: 0,
    width: MIN_WIDTH,
    height: NODE_HEIGHT,
    parentId,
    order,
    depth,
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
            x: DEFAULT_X,
            y: DEFAULT_Y,
            editing: false,
        },
    ],
    width: window.innerWidth,
    height: window.innerHeight,
    zoomRatio: 1,
};

const updateChildren = (nodes, id, increment) =>
    nodes.map(node =>
        node.id === id ? { ...node, children: node.children + increment } : node
    );

const createNodeAdder = (allNodes, parentNode) => {
    const newId = Math.max(...allNodes.map(node => node.id), 0) + 1;
    const newOrder = parentNode.children;
    
    const updatedParentNodes = allNodes.map(node =>
        node.id === parentNode.id
            ? { ...node, children: node.children + 1, selected: false }
            : node
    );

    return [
        ...updatedParentNodes,
        {
            ...createNewNode(parentNode.id, newOrder, parentNode.depth + 1),
            id: newId,
        }
    ];
};

// アクションハンドラー群
const actionHandlers = {
    NEW: () => {
        clearSnapshots();
        return initialState;
    },

    ZOOM_IN: state => ({
        ...state,
        zoomRatio: state.zoomRatio + 0.1
    }),

    ZOOM_OUT: state => ({
        ...state,
        zoomRatio: state.zoomRatio - 0.1
    }),

    ARROW_UP: handleArrowAction(handleArrowUp),
    ARROW_DOWN: handleArrowAction(handleArrowDown),
    ARROW_RIGHT: handleArrowAction(handleArrowRight),
    ARROW_LEFT: handleArrowAction(handleArrowLeft),

    LOAD_NODES: (state, action) => {
        if (action.payload.length === 0) return initialState;

        const updatedVisibilityNodes = action.payload.map(node =>
            node.parentId === null ? { ...node, visible: true } : node
        );

        return {
            ...state,
            nodes: adjustNodePositions(updatedVisibilityNodes)
        };
    },

    SELECT_NODE: (state, action) => {
        const selectedNode = state.nodes.find(node => node.id === action.payload);
        if (!selectedNode) return state;

        const { text, text2, text3, selected, editing, visible, ...rest } = selectedNode;
        console.log('[SELECT_NODE] selectNode:', rest);

        return {
            ...state,
            nodes: state.nodes.map(node => ({
                ...node,
                selected: node.id === action.payload,
                editing: node.id === action.payload ? node.editing : false
            }))
        };
    },

    DESELECT_ALL: state => ({
        ...state,
        nodes: state.nodes.map(node => ({
            ...node,
            selected: false,
            editing: false
        }))
    }),

    UPDATE_TEXT: (state, action) => ({
        ...state,
        nodes: state.nodes.map(node =>
            node.id === action.payload.id
                ? { ...node, [action.payload.field]: action.payload.value }
                : node
        )
    }),

    ADD_NODE: state => handleNodeMutation(state, (nodes, selectedNode) => {
        const newNodes = createNodeAdder(nodes, selectedNode);
        return adjustNodePositions(newNodes);
    }),

    DELETE_NODE: state => handleNodeMutation(state, (nodes, selectedNode) =>
        adjustNodePositions(deleteNodeRecursive(nodes, selectedNode))
    ),

    EDIT_NODE: state => handleSelectedNodeAction(state, selectedNode => ({
        nodes: state.nodes.map(node =>
            node.id === selectedNode.id
                ? { ...node, editing: true }
                : node
        )
    })),

    END_EDITING: state => ({
        ...state,
        nodes: adjustNodePositions(state.nodes).map(node =>
            ({ ...node, editing: false })
        )
    }),

    UNDO: state => ({ ...state, nodes: Undo(state.nodes) }),
    REDO: state => ({ ...state, nodes: Redo(state.nodes) }),
    SNAPSHOT: state => { saveSnapshot(state.nodes); return state; },

    DROP_NODE: (state, action) => {
        const { payload } = action;
        const siblings = state.nodes.filter(node =>
            node.parentId === payload.newParentId
        );

        const maxOrder = siblings.length > 0
            ? Math.max(...siblings.map(node => node.order)) + 1
            : 0;

        const updatedNodes = state.nodes
            .map(updateOldParentNodes(payload))
            .map(updateNewParentNodes(payload, maxOrder));

        return {
            ...state,
            nodes: adjustNodePositions(
                setDepthRecursive(
                    updateChildren(
                        updateChildren(updatedNodes, payload.oldParentId, -1),
                        payload.newParentId,
                        1
                    ),
                    payload
                )
            )
        };
    },

    MOVE_NODE: (state, action) => ({
        ...state,
        nodes: state.nodes.map(node =>
            node.id === action.payload.id
                ? { ...node, x: action.payload.x, y: action.payload.y }
                : node
        )
    }),

    CUT_NODE: state => handleNodeMutation(state, (nodes, selectedNode) => {
        const cutNodes = getSelectedNodeAndChildren(nodes, selectedNode, selectedNode);
        return {
            nodes: adjustNodePositions(deleteNodeRecursive(nodes, selectedNode)),
            cutNodes
        };
    }),

    COPY_NODE: state => handleSelectedNodeAction(state, selectedNode => ({
        cutNodes: getSelectedNodeAndChildren(state.nodes, selectedNode, selectedNode)
    })),

    PASTE_NODE: state => handleNodeMutation(state, (nodes, selectedNode) => {
        const pastedNodes = pasteNodes(nodes, state.cutNodes, selectedNode);
        return adjustNodePositions(updateChildren(pastedNodes, selectedNode.id, 1));
    }),

    EXPAND_NODE: state => handleNodeMutation(state, (nodes, selectedNode) => 
        adjustNodePositions(
          setVisibilityRecursive(nodes, selectedNode, true)
        )
      ),

    COLLAPSE_NODE: state => handleNodeMutation(state, (nodes, selectedNode) => 
    adjustNodePositions(
      setVisibilityRecursive(nodes, selectedNode, false)
    )
  ),

    UPDATE_NODE_SIZE: (state, action) => ({
        ...state,
        nodes: state.nodes.map(node =>
            node.id === action.payload.id
                ? { ...node, ...action.payload }
                : node
        )
    })
};

// 共通処理ヘルパー
function handleArrowAction(handler) {
    return state => ({
        ...state,
        nodes: state.nodes.map(node => ({
            ...node,
            selected: node.id === handler(state.nodes)
        }))
    });
}

function handleNodeMutation(state, mutationFn) {
    const selectedNode = state.nodes.find(node => node.selected);
    if (!selectedNode) return state;

    saveSnapshot(state.nodes);
    const mutationResult = mutationFn(state.nodes, selectedNode);
    
    return {
        ...state,
        nodes: Array.isArray(mutationResult) ? mutationResult : mutationResult.nodes,
        ...(mutationResult.cutNodes && { cutNodes: mutationResult.cutNodes })
    };
}

function handleSelectedNodeAction(state, actionFn) {
    const selectedNode = state.nodes.find(node => node.selected);
    return selectedNode ? { ...state, ...actionFn(selectedNode) } : state;
}

function updateOldParentNodes(payload) {
    return node => ({
        ...node,
        order: node.parentId === payload.oldParentId && node.order > payload.draggingNodeOrder
            ? node.order - 1
            : node.order
    });
}

function updateNewParentNodes(payload, maxOrder) {
    return node => node.id === payload.id ? {
        ...node,
        parentId: payload.newParentId,
        order: maxOrder,
        depth: payload.depth
    } : node;
}

// Reducer
function reducer(state, action) {
    const handler = actionHandlers[action.type];
    return handler ? handler(state, action) : state;
}

export function useStore() {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
}