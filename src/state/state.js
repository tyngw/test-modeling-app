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
import { v4 as uuidv4 } from 'uuid';

const createNewNode = (parentId, order, depth) => ({
    id: uuidv4(),
    text: '',
    text2: '',
    text3: '',
    x: 0,
    y: 0,
    width: MIN_WIDTH,
    height: NODE_HEIGHT,
    section1Height: 20,
    section2Height: 20,
    section3Height: 20,
    parentId,
    order,
    depth,
    children: 0,
    editing: true,
    selected: true,
    visible: true,
});

export const initialState = {  // exportを追加
    nodes: [
        {
            ...createNewNode(null, 0, 1),
            id: 1,
            x: DEFAULT_X, y: DEFAULT_Y,
            editing: false,
        },
    ],
    width: window.innerWidth,  // タイポ修正（Window → window）
    height: window.innerHeight,
    zoomRatio: 1,
};

const addNode = (allNodes, parentNode, cutNodes = null) => {
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

const handleZoomIn = state => ({
    ...state,
    zoomRatio: state.zoomRatio + 0.1
  });
  
const handleZoomOut = state => ({
    ...state,
    zoomRatio: Math.max(state.zoomRatio - 0.1, 0.1) // 最小値制限を追加
});

// アクションハンドラー群
const actionHandlers = {
    NEW: () => {
        clearSnapshots();
        return initialState;
    },

    ZOOM_IN: handleZoomIn,
    ZOOM_OUT: handleZoomOut,

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
              ? { 
                  ...node, 
                  width: action.payload.width,
                  height: action.payload.height,
                  section1Height: action.payload.sectionHeights[0],
                  section2Height: action.payload.sectionHeights[1],
                  section3Height: action.payload.sectionHeights[2]
                }
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
                updatedNodes = addNode(state.nodes, selectedNode, state.cutNodes);
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
            updatedNodes = updateChildren(updatedNodes, action.payload.oldParentId, -1);
            // 移動先の親ノードの情報を更新
            updatedNodes = updateChildren(updatedNodes, action.payload.newParentId, 1);
            // 移動先のノードの情報を更新
            updatedNodes = setDepthRecursive(updatedNodes, action.payload);
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