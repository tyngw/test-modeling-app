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
} from '../constants/NodeSettings';
// import {
//     deleteNodeRecursive,
//     setDepthRecursive,
//     getSelectedNodeAndChildren,
//     pasteNodes,
//     setVisibilityRecursive
// } from '../utils/NodeActionHelper';
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

export const initialState = {
    nodes: {
        1: {
            ...createNewNode(null, 0, 1),
            id: 1,
            x: DEFAULT_X,
            y: DEFAULT_Y,
            editing: false,
        }
    },
    width: window.innerWidth,
    height: window.innerHeight,
    zoomRatio: 1,
};

const getSelectedNodeAndChildren = (nodes, targetNode, selectedNode) => {
    let cutNodes = {};
    const nodeList = Object.values(nodes);

    if (targetNode.id === selectedNode.id) {
        cutNodes[targetNode.id] = { ...targetNode, parentId: null };
    } else {
        cutNodes[targetNode.id] = targetNode;
    }

    const childNodes = nodeList.filter(node => node.parentId === targetNode.id);
    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            const childCutNodes = getSelectedNodeAndChildren(nodes, childNode, selectedNode);
            cutNodes = { ...cutNodes, ...childCutNodes };
        });
    }

    return cutNodes;
};

const pasteNodes = (nodes, cutNodes, parentNode) => {
    const rootNode = Object.values(cutNodes).find(node => node.parentId === null);
    if (!rootNode) {
        return { ...nodes, ...cutNodes };
    }

    const rootNodeDepth = rootNode.depth;
    const baseDepth = parentNode.depth + 1;
    const depthDelta = baseDepth - rootNodeDepth;
    const idMap = new Map();

    const newNodes = Object.values(cutNodes).reduce((acc, cutNode) => {
        const newNode = { ...cutNode };
        const newUUID = uuidv4();
        idMap.set(cutNode.id, newUUID);
        newNode.id = newUUID;
        newNode.depth = cutNode.depth + depthDelta;

        if (cutNode.id === rootNode.id) {
            newNode.parentId = parentNode.id;
            newNode.order = nodes[parentNode.id].children;
            newNode.selected = false;
        }

        acc[newUUID] = newNode;
        return acc;
    }, {});

    const updatedNodes = Object.values(newNodes).reduce((acc, node) => {
        const updatedNode = idMap.has(node.parentId) 
            ? { ...node, parentId: idMap.get(node.parentId) }
            : node;
        acc[updatedNode.id] = updatedNode;
        return acc;
    }, { ...nodes });

    // 親ノードのchildrenを更新
    const updatedParent = { ...parentNode, children: parentNode.children + 1 };
    updatedNodes[updatedParent.id] = updatedParent;

    return updatedNodes;
};

const setDepthRecursive = (nodes, parentNode) => {
    const updatedNodes = { ...nodes };
    const processChildren = (parentId) => {
        const children = Object.values(updatedNodes).filter(n => n.parentId === parentId);
        children.forEach(child => {
            updatedNodes[child.id] = { ...child, depth: updatedNodes[parentId].depth + 1 };
            processChildren(child.id);
        });
    };
    processChildren(parentNode.id);
    return updatedNodes;
};

const setVisibilityRecursive = (nodes, parentNode, visible) => {
    const updatedNodes = { ...nodes };
    const processChildren = (parentId) => {
        const children = Object.values(updatedNodes).filter(n => n.parentId === parentId);
        children.forEach(child => {
            updatedNodes[child.id] = { ...child, visible };
            processChildren(child.id);
        });
    };
    processChildren(parentNode.id);
    return updatedNodes;
};

const deleteNodeRecursive = (nodes, nodeToDelete) => {
    if (nodeToDelete.parentId === null) return nodes;

    const updatedNodes = { ...nodes };

    // 子ノードを再帰的に削除
    const deleteChildren = (parentId) => {
        const children = Object.values(updatedNodes).filter(n => n.parentId === parentId);
        children.forEach(child => {
            delete updatedNodes[child.id]; // 子ノードを削除
            deleteChildren(child.id); // さらに子ノードがあれば再帰的に削除
        });
    };

    // 対象ノードとその子ノードを削除
    delete updatedNodes[nodeToDelete.id];
    deleteChildren(nodeToDelete.id);

    // 親ノードのchildrenを更新
    if (nodeToDelete.parentId) {
        const parent = updatedNodes[nodeToDelete.parentId];
        if (parent) {
            updatedNodes[parent.id] = { ...parent, children: parent.children - 1 };
        }
    }

    return updatedNodes;
};

const adjustNodeAndChildrenPosition = (nodes, node, currentY, maxHeight, visited = new Set()) => {
    if (visited.has(node.id)) return currentY;
    visited.add(node.id);

    const updatedNodes = { ...nodes };
    const parentNode = node.parentId ? updatedNodes[node.parentId] : null;

    if (!parentNode) {
        node.x = DEFAULT_X;
    } else {
        node.x = parentNode.x + parentNode.width + X_OFFSET;
    }

    node.y = currentY;
    maxHeight = Math.max(maxHeight, node.height);
    updatedNodes[node.id] = node;

    const childNodes = Object.values(updatedNodes).filter(n => n.parentId === node.id);
    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            if (!visited.has(childNode.id)) {
                currentY = adjustNodeAndChildrenPosition(updatedNodes, childNode, currentY, maxHeight, visited);
            }
        });
    } else {
        if (node.visible || node.order === 0) {
            currentY += maxHeight + Y_OFFSET;
        }
    }

    return currentY;
};

const adjustNodePositions = (nodes) => {
    const updatedNodes = { ...nodes };
    const rootNodes = Object.values(updatedNodes).filter(n => n.parentId === null);

    rootNodes.forEach(rootNode => {
        adjustNodeAndChildrenPosition(updatedNodes, rootNode, PRESET_Y, rootNode.height, new Set());
    });

    const sortedNodes = Object.values(updatedNodes).sort((a, b) => b.depth - a.depth || a.parentId - b.parentId || a.order - b.order);
    sortedNodes.forEach(parentNode => {
        const children = sortedNodes.filter(n => n.parentId === parentNode.id);
        const visibleChildren = children.filter(n => n.visible);
        if (visibleChildren.length > 0) {
            const minY = Math.min(...children.map(n => n.y));
            const maxY = Math.max(...children.map(n => n.y + n.height));
            const newHeight = minY + (maxY - minY) / 2 - parentNode.height / 2;
            if (parentNode.y < newHeight) {
                updatedNodes[parentNode.id] = { ...parentNode, y: newHeight };
            }
        }
    });

    return updatedNodes;
};

const createNodeAdder = (nodes, parentNode) => {
    const newId = uuidv4();
    const newOrder = parentNode.children;

    const updatedNodes = {
        ...nodes,
        [parentNode.id]: { ...parentNode, children: parentNode.children + 1, selected: false },
        [newId]: {
            ...createNewNode(parentNode.id, newOrder, parentNode.depth + 1),
            id: newId,
        }
    };

    return adjustNodePositions(updatedNodes);
};

const handleZoomIn = state => ({
    ...state,
    zoomRatio: state.zoomRatio + 0.1
});

const handleZoomOut = state => ({
    ...state,
    zoomRatio: Math.max(state.zoomRatio - 0.1, 0.1)
});

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
        if (Object.keys(action.payload).length === 0) return initialState;

        const updatedNodes = Object.values(action.payload).reduce((acc, node) => {
            acc[node.id] = node.parentId === null ? { ...node, visible: true } : node;
            return acc;
        }, {});

        return {
            ...state,
            nodes: adjustNodePositions(updatedNodes)
        };
    },

    SELECT_NODE: (state, action) => {
        const selectedNode = state.nodes[action.payload];
        if (!selectedNode) return state;

        const { text, text2, text3, selected, editing, visible, ...rest } = selectedNode;
        console.log('[SELECT_NODE] selectNode:', rest);

        const updatedNodes = Object.values(state.nodes).reduce((acc, node) => {
            acc[node.id] = {
                ...node,
                selected: node.id === action.payload,
                editing: node.id === action.payload ? node.editing : false
            };
            return acc;
        }, {});

        return { ...state, nodes: updatedNodes };
    },

    DESELECT_ALL: state => ({
        ...state,
        nodes: Object.values(state.nodes).reduce((acc, node) => {
            acc[node.id] = { ...node, selected: false, editing: false };
            return acc;
        }, {})
    }),

    UPDATE_TEXT: (state, action) => ({
        ...state,
        nodes: {
            ...state.nodes,
            [action.payload.id]: {
                ...state.nodes[action.payload.id],
                [action.payload.field]: action.payload.value
            }
        }
    }),

    ADD_NODE: state => handleNodeMutation(state, (nodes, selectedNode) => {
        const newNodes = createNodeAdder(nodes, selectedNode);
        return adjustNodePositions(newNodes);
    }),

    DELETE_NODE: state => handleNodeMutation(state, (nodes, selectedNode) =>
        adjustNodePositions(deleteNodeRecursive(nodes, selectedNode))
    ),

    EDIT_NODE: state => handleSelectedNodeAction(state, selectedNode => ({
        nodes: {
            ...state.nodes,
            [selectedNode.id]: { ...selectedNode, editing: true }
        }
    })),

    END_EDITING: state => ({
        ...state,
        nodes: adjustNodePositions(
            Object.values(state.nodes).reduce((acc, node) => {
                acc[node.id] = { ...node, editing: false };
                return acc;
            }, {})
        )
    }),

    UNDO: state => ({ ...state, nodes: Undo(state.nodes) }),
    REDO: state => ({ ...state, nodes: Redo(state.nodes) }),
    SNAPSHOT: state => { saveSnapshot(state.nodes); return state; },

    DROP_NODE: (state, action) => {
        const { payload } = action;
        const siblings = Object.values(state.nodes).filter(n => n.parentId === payload.newParentId);
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(n => n.order)) + 1 : 0;

        const updatedNodes = Object.values(state.nodes).reduce((acc, node) => {
            let updatedNode = node;

            if (node.parentId === payload.oldParentId && node.order > payload.draggingNodeOrder) {
                updatedNode = { ...node, order: node.order - 1 };
            }

            if (node.id === payload.id) {
                updatedNode = {
                    ...node,
                    parentId: payload.newParentId,
                    order: maxOrder,
                    depth: payload.depth
                };
            }

            acc[updatedNode.id] = updatedNode;
            return acc;
        }, {});

        const parentUpdates = {
            [payload.oldParentId]: { ...state.nodes[payload.oldParentId], children: state.nodes[payload.oldParentId].children - 1 },
            [payload.newParentId]: { ...state.nodes[payload.newParentId], children: state.nodes[payload.newParentId].children + 1 }
        };

        return {
            ...state,
            nodes: adjustNodePositions(
                setDepthRecursive(
                    { ...updatedNodes, ...parentUpdates },
                    payload
                )
            )
        };
    },

    MOVE_NODE: (state, action) => ({
        ...state,
        nodes: {
            ...state.nodes,
            [action.payload.id]: {
                ...state.nodes[action.payload.id],
                x: action.payload.x,
                y: action.payload.y
            }
        }
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
        const updatedParent = { ...selectedNode, children: selectedNode.children + 1 };
        return adjustNodePositions({ ...pastedNodes, [updatedParent.id]: updatedParent });
    }),

    EXPAND_NODE: state => handleNodeMutation(state, (nodes, selectedNode) =>
        adjustNodePositions(setVisibilityRecursive(nodes, selectedNode, true))
    ),

    COLLAPSE_NODE: state => handleNodeMutation(state, (nodes, selectedNode) =>
        adjustNodePositions(setVisibilityRecursive(nodes, selectedNode, false))
    ),

    UPDATE_NODE_SIZE: (state, action) => ({
        ...state,
        nodes: {
            ...state.nodes,
            [action.payload.id]: {
                ...state.nodes[action.payload.id],
                width: action.payload.width,
                height: action.payload.height,
                section1Height: action.payload.sectionHeights[0],
                section2Height: action.payload.sectionHeights[1],
                section3Height: action.payload.sectionHeights[2]
            }
        }
    })
};

function handleArrowAction(handler) {
    return state => {
        const selectedId = handler(Object.values(state.nodes));
        return {
            ...state,
            nodes: Object.values(state.nodes).reduce((acc, node) => {
                acc[node.id] = { ...node, selected: node.id === selectedId };
                return acc;
            }, {})
        };
    };
}

function handleNodeMutation(state, mutationFn) {
    const selectedNode = Object.values(state.nodes).find(node => node.selected);
    if (!selectedNode) return state;

    saveSnapshot(state.nodes);
    const mutationResult = mutationFn(state.nodes, selectedNode);

    return {
        ...state,
        nodes: mutationResult.nodes || mutationResult,
        ...(mutationResult.cutNodes && { cutNodes: mutationResult.cutNodes })
    };
}

function handleSelectedNodeAction(state, actionFn) {
    const selectedNode = Object.values(state.nodes).find(node => node.selected);
    return selectedNode ? { ...state, ...actionFn(selectedNode) } : state;
}

function reducer(state, action) {
    const handler = actionHandlers[action.type];
    return handler ? handler(state, action) : state;
}

export function useStore() {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
}