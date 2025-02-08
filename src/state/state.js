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

const getSelectedNodeAndChildren = (elements, targetNode, selectedElement) => {
    let cutNodes = {};
    const elementList = Object.values(elements);

    if (targetNode.id === selectedElement.id) {
        cutNodes[targetNode.id] = { ...targetNode, parentId: null };
    } else {
        cutNodes[targetNode.id] = targetNode;
    }

    const childNodes = elementList.filter(element => element.parentId === targetNode.id);
    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            const childCutNodes = getSelectedNodeAndChildren(elements, childNode, selectedElement);
            cutNodes = { ...cutNodes, ...childCutNodes };
        });
    }

    return cutNodes;
};

const pasteNodes = (elements, cutElements, parentElement) => {
    const rootNode = Object.values(cutElements).find(element => element.parentId === null);
    if (!rootNode) {
        return { ...elements, ...cutElements };
    }

    const rootNodeDepth = rootNode.depth;
    const baseDepth = parentElement.depth + 1;
    const depthDelta = baseDepth - rootNodeDepth;
    const idMap = new Map();

    const newNodes = Object.values(cutElements).reduce((acc, cutElement) => {
        const newNode = { ...cutElement };
        const newUUID = uuidv4();
        idMap.set(cutElement.id, newUUID);
        newNode.id = newUUID;
        newNode.depth = cutElement.depth + depthDelta;

        if (cutElement.id === rootNode.id) {
            newNode.parentId = parentElement.id;
            newNode.order = elements[parentElement.id].children;
            newNode.selected = false;
        }

        acc[newUUID] = newNode;
        return acc;
    }, {});

    const updatedNodes = Object.values(newNodes).reduce((acc, element) => {
        const updatedNode = idMap.has(element.parentId) 
            ? { ...element, parentId: idMap.get(element.parentId) }
            : element;
        acc[updatedNode.id] = updatedNode;
        return acc;
    }, { ...elements });

    // 親ノードのchildrenを更新
    const updatedParent = { ...parentElement, children: parentElement.children + 1 };
    updatedNodes[updatedParent.id] = updatedParent;

    return updatedNodes;
};

const setDepthRecursive = (elements, parentElement) => {
    const updatedNodes = { ...elements };
    const processChildren = (parentId) => {
        const children = Object.values(updatedNodes).filter(n => n.parentId === parentId);
        children.forEach(child => {
            updatedNodes[child.id] = { ...child, depth: updatedNodes[parentId].depth + 1 };
            processChildren(child.id);
        });
    };
    processChildren(parentElement.id);
    return updatedNodes;
};

const setVisibilityRecursive = (elements, parentElement, visible) => {
    const updatedNodes = { ...elements };
    const processChildren = (parentId) => {
        const children = Object.values(updatedNodes).filter(n => n.parentId === parentId);
        children.forEach(child => {
            updatedNodes[child.id] = { ...child, visible };
            processChildren(child.id);
        });
    };
    processChildren(parentElement.id);
    return updatedNodes;
};

const deleteNodeRecursive = (elements, deleteElement) => {
    if (deleteElement.parentId === null) return elements;

    const updatedNodes = { ...elements };

    // 子ノードを再帰的に削除
    const deleteChildren = (parentId) => {
        const children = Object.values(updatedNodes).filter(n => n.parentId === parentId);
        children.forEach(child => {
            delete updatedNodes[child.id]; // 子ノードを削除
            deleteChildren(child.id); // さらに子ノードがあれば再帰的に削除
        });
    };

    // 対象ノードとその子ノードを削除
    delete updatedNodes[deleteElement.id];
    deleteChildren(deleteElement.id);

    // 親ノードのchildrenを更新
    if (deleteElement.parentId) {
        const parent = updatedNodes[deleteElement.parentId];
        if (parent) {
            updatedNodes[parent.id] = { ...parent, children: parent.children - 1 };
        }
    }

    return updatedNodes;
};

const adjustNodeAndChildrenPosition = (elements, element, currentY, maxHeight, visited = new Set()) => {
    if (visited.has(element.id)) return currentY;
    visited.add(element.id);

    const updatedNodes = { ...elements };
    const parentNode = element.parentId ? updatedNodes[element.parentId] : null;

    if (!parentNode) {
        element.x = DEFAULT_X;
    } else {
        element.x = parentNode.x + parentNode.width + X_OFFSET;
    }

    element.y = currentY;
    maxHeight = Math.max(maxHeight, element.height);
    updatedNodes[element.id] = element;

    const childNodes = Object.values(updatedNodes).filter(n => n.parentId === element.id);
    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            if (!visited.has(childNode.id)) {
                currentY = adjustNodeAndChildrenPosition(updatedNodes, childNode, currentY, maxHeight, visited);
            }
        });
    } else {
        if (element.visible || element.order === 0) {
            currentY += maxHeight + Y_OFFSET;
        }
    }

    return currentY;
};

const adjustNodePositions = (elements) => {
    const updatedNodes = { ...elements };
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

const createNodeAdder = (elements, parentElement) => {
    const newId = uuidv4();
    const newOrder = parentElement.children;

    const updatedNodes = {
        ...elements,
        [parentElement.id]: { ...parentElement, children: parentElement.children + 1, selected: false },
        [newId]: {
            ...createNewNode(parentElement.id, newOrder, parentElement.depth + 1),
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

        const updatedNodes = Object.values(action.payload).reduce((acc, element) => {
            acc[element.id] = element.parentId === null ? { ...element, visible: true } : element;
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

        const updatedNodes = Object.values(state.nodes).reduce((acc, element) => {
            acc[element.id] = {
                ...element,
                selected: element.id === action.payload,
                editing: element.id === action.payload ? element.editing : false
            };
            return acc;
        }, {});

        return { ...state, nodes: updatedNodes };
    },

    DESELECT_ALL: state => ({
        ...state,
        nodes: Object.values(state.nodes).reduce((acc, element) => {
            acc[element.id] = { ...element, selected: false, editing: false };
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

    ADD_NODE: state => handleNodeMutation(state, (elements, selectedNode) => {
        const newNodes = createNodeAdder(elements, selectedNode);
        return adjustNodePositions(newNodes);
    }),

    DELETE_NODE: state => handleNodeMutation(state, (elements, selectedElement) =>
        adjustNodePositions(deleteNodeRecursive(elements, selectedElement))
    ),

    EDIT_NODE: state => handleSelectedNodeAction(state, selectedElement => ({
        nodes: {
            ...state.nodes,
            [selectedElement.id]: { ...selectedElement, editing: true }
        }
    })),

    END_EDITING: state => ({
        ...state,
        nodes: adjustNodePositions(
            Object.values(state.nodes).reduce((acc, element) => {
                acc[element.id] = { ...element, editing: false };
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

        const updatedNodes = Object.values(state.nodes).reduce((acc, element) => {
            let updatedNode = element;

            if (element.parentId === payload.oldParentId && element.order > payload.draggingNodeOrder) {
                updatedNode = { ...element, order: element.order - 1 };
            }

            if (element.id === payload.id) {
                updatedNode = {
                    ...element,
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

    CUT_NODE: state => handleNodeMutation(state, (elements, selectedNode) => {
        const cutElements = getSelectedNodeAndChildren(elements, selectedNode, selectedNode);
        return {
            nodes: adjustNodePositions(deleteNodeRecursive(elements, selectedNode)),
            cutNodes: cutElements
        };
    }),

    COPY_NODE: state => handleSelectedNodeAction(state, selectedNode => ({
        cutNodes: getSelectedNodeAndChildren(state.nodes, selectedNode, selectedNode)
    })),

    PASTE_NODE: state => handleNodeMutation(state, (elements, selectedNode) => {
        const pastedNodes = pasteNodes(elements, state.cutNodes, selectedNode);
        const updatedParent = { ...selectedNode, children: selectedNode.children + 1 };
        return adjustNodePositions({ ...pastedNodes, [updatedParent.id]: updatedParent });
    }),

    EXPAND_NODE: state => handleNodeMutation(state, (elements, selectedNode) =>
        adjustNodePositions(setVisibilityRecursive(elements, selectedNode, true))
    ),

    COLLAPSE_NODE: state => handleNodeMutation(state, (elements, selectedNode) =>
        adjustNodePositions(setVisibilityRecursive(elements, selectedNode, false))
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
            nodes: Object.values(state.nodes).reduce((acc, element) => {
                acc[element.id] = { ...element, selected: element.id === selectedId };
                return acc;
            }, {})
        };
    };
}

function handleNodeMutation(state, mutationFn) {
    const selectedNode = Object.values(state.nodes).find(element => element.selected);
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
    const selectedNode = Object.values(state.nodes).find(element => element.selected);
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