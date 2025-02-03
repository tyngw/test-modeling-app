// src/state/state.js
import { useReducer } from 'react';
// import { adjustNodePositions } from '../utils/NodeAdjuster';
import { Undo, Redo, saveSnapshot, clearSnapshots } from './undoredo';
import { handleArrowUp, handleArrowDown, handleArrowRight, handleArrowLeft } from '../utils/NodeSelector';
import {
    X_OFFSET,   // add
    Y_OFFSET,   // add
    PRESET_Y,   // add
    DEFAULT_X,
    DEFAULT_Y,
    NODE_HEIGHT,
    MIN_WIDTH,
    DEFAULT_SECTION_HEIGHT
} from '../constants/Node';
// import {
//     deleteNodeRecursive,
//     setDepthRecursive,
//     getSelectedNodeAndChildren,
//     pasteNodes,
//     setVisibilityRecursive
// } from '../utils/NodeActionHelper';
import { v4 as uuidv4 } from 'uuid';

// ノード生成関数
const createNewNode = (parentId, order, depth) => ({
    id: uuidv4(),
    text: '',
    text2: '',
    text3: '',
    x: 0,
    y: 0,
    width: MIN_WIDTH,
    height: NODE_HEIGHT,
    section1Height: DEFAULT_SECTION_HEIGHT,
    section2Height: DEFAULT_SECTION_HEIGHT,
    section3Height: DEFAULT_SECTION_HEIGHT,
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
const pasteNodes = (nodeList, cutNodes, parentNode) => {
    const rootNode = cutNodes.find(node => node.parentId === null);
    if (!rootNode) {
        return [...nodeList, ...cutNodes]
    }
    const rootNodeDepth = rootNode.depth;
    const baseDepth = parentNode.depth + 1;
    const depthDelta = baseDepth - rootNodeDepth;
    const idMap = new Map();

    const newNodes = cutNodes.map(cutNode => {
        const newNode = { ...cutNode };
        const newUUID = uuidv4(); // UUID を生成

        idMap.set(cutNode.id, newUUID);
        newNode.id = newUUID;

        newNode.depth = cutNode.depth + depthDelta;
        
        if (cutNode.id === rootNode.id) {
            newNode.parentId = parentNode.id;
            const children = nodeList.find(node => node.id === parentNode.id).children;
            newNode.order = children;
            newNode.selected = false;
        }

        return newNode;
    });

    const updatedNodes = nodeList.concat(newNodes.map(node => {
        if (idMap.has(node.parentId)) {
            node.parentId = idMap.get(node.parentId);
        }
        return node;
    }));

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

const updateChildren = (nodes, id, increment) =>
    nodes.map(node =>
        node.id === id ? { ...node, children: node.children + increment } : node
    );

const adjustNodeAndChildrenPosition = (allNodes, node, currentY, maxHeight, visited = new Set()) => {
    // 循環参照を防ぐために、既に訪問したノードは処理しない
    if (visited.has(node.id)) {
        return currentY;
    }
    visited.add(node.id);

    const childNodes = allNodes.filter(n => n.parentId === node.id);
    const parentNode = allNodes.find(n => n.id === node.parentId);

    if (!parentNode) {
        node.x = DEFAULT_X;
    } else {
        // node.xに親ノードのx座標を設定 + X_OFFSET + 親ノードのwidthをセットする
        node.x = parentNode.x + parentNode.width + X_OFFSET;
    }

    node.y = currentY;
    maxHeight = Math.max(maxHeight, node.height);

    // console.log(`[adjustNodeAndChildrenPosition] ${node.id} 「${node.text}」 ${node.x}x${node.y}`);

    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            if (!visited.has(childNode.id)) {
                currentY = adjustNodeAndChildrenPosition(allNodes, childNode, currentY, maxHeight, visited);
            }
        });
    } else {
        if (node.visible || node.order === 0) {
            currentY += maxHeight + Y_OFFSET;
        }
    }
    return currentY;
}

const adjustNodePositions = (allNodes) => {
    const rootNodes = allNodes.filter(n => n.parentId === null);

    // depthが小さい順にノードをソートし、同じdepth内ではparentId, その後orderでソート
    let sortedNodes = [...allNodes].sort((a, b) => b.depth - a.depth || a.parentId - b.parentId || a.order - b.order);
    const adjust = true;

    rootNodes.forEach(rootNode => {
        adjustNodeAndChildrenPosition(allNodes, rootNode, PRESET_Y, rootNode.height, new Set());
    });

    // 親ノードのY座標を子ノードに基づいて更新
    if (adjust) {
        sortedNodes.forEach(parentNode => {
            const children = sortedNodes.filter(n => n.parentId === parentNode.id);
            const visibleChildren = children.filter(n => n.visible);
            if (visibleChildren.length > 0) {
                const minY = Math.min(...children.map(n => n.y));
                const maxY = Math.max(...children.map(n => n.y + n.height));
                const newHeight = minY + (maxY - minY) / 2 - parentNode.height / 2;
                if (parentNode.y < newHeight) {
                    parentNode.y = newHeight;
                }
            }
        });
    }
    return sortedNodes;
};


const createNodeAdder = (allNodes, parentNode) => {
    const newId = uuidv4();
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

function reducer(state, action) {
    const handler = actionHandlers[action.type];
    return handler ? handler(state, action) : state;
}

export function useStore() {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
}