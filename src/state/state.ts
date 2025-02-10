// src/state/state.ts
import { Undo, Redo, saveSnapshot, clearSnapshots } from './undoredo';
import { handleArrowUp, handleArrowDown, handleArrowRight, handleArrowLeft } from '../utils/NodeSelector';
import { Node } from '../types';
import {
    X_OFFSET,
    Y_OFFSET,
    PRESET_Y,
    DEFAULT_X,
    DEFAULT_Y,
    NODE_HEIGHT,
    MIN_WIDTH,
    DEFAULT_SECTION_HEIGHT
} from '../constants/NodeSettings';
import { v4 as uuidv4 } from 'uuid';

export interface State {
    elements: { [key: string]: Node };
    width: number;
    height: number;
    zoomRatio: number;
    cutNodes?: { [key: string]: Node };
}

export type Action = {
    type: string;
    payload?: any;
};

const createNewNode = (parentId: string | null, order: number, depth: number): Node => ({
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

export const initialState: State = {
    elements: {
        '1': {
            ...createNewNode(null, 0, 1),
            id: '1',
            x: DEFAULT_X,
            y: DEFAULT_Y,
            editing: false,
        }
    },
    width: window.innerWidth,
    height: window.innerHeight,
    zoomRatio: 1,
};

const getSelectedNodeAndChildren = (elements: { [key: string]: Node }, targetNode: Node, selectedElement: Node): { [key: string]: Node } => {
    let cutNodes: { [key: string]: Node } = {};
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

const pasteNodes = (elements: { [key: string]: Node }, cutElements: { [key: string]: Node }, parentElement: Node): { [key: string]: Node } => {
    const rootNode = Object.values(cutElements).find(element => element.parentId === null);
    if (!rootNode) {
        return { ...elements, ...cutElements };
    }

    const rootNodeDepth = rootNode.depth;
    const baseDepth = parentElement.depth + 1;
    const depthDelta = baseDepth - rootNodeDepth;
    const idMap = new Map<string, string>();

    const newNodes = Object.values(cutElements).reduce<{ [key: string]: Node }>((acc, cutElement) => {
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

    const updatedNodes = Object.values(newNodes).reduce<{ [key: string]: Node }>((acc, element) => {
        const parentId = idMap.has(element.parentId as string) 
            ? idMap.get(element.parentId as string)!
            : element.parentId;
        const updatedNode = { ...element, parentId };
        acc[updatedNode.id] = updatedNode;
        return acc;
    }, { ...elements });

    const updatedParent = { ...parentElement, children: parentElement.children + 1 };
    updatedNodes[updatedParent.id] = updatedParent;

    return updatedNodes;
};

const setDepthRecursive = (elements: { [key: string]: Node }, parentElement: Node): { [key: string]: Node } => {
    const updatedNodes = { ...elements };
    const processChildren = (parentId: string) => {
        const children = Object.values(updatedNodes).filter(n => n.parentId === parentId);
        children.forEach(child => {
            updatedNodes[child.id] = { ...child, depth: updatedNodes[parentId].depth + 1 };
            processChildren(child.id);
        });
    };
    processChildren(parentElement.id);
    return updatedNodes;
};

const setVisibilityRecursive = (elements: { [key: string]: Node }, parentElement: Node, visible: boolean): { [key: string]: Node } => {
    const updatedNodes = { ...elements };
    const processChildren = (parentId: string) => {
        const children = Object.values(updatedNodes).filter(n => n.parentId === parentId);
        children.forEach(child => {
            updatedNodes[child.id] = { ...child, visible };
            processChildren(child.id);
        });
    };
    processChildren(parentElement.id);
    return updatedNodes;
};

const deleteNodeRecursive = (elements: { [key: string]: Node }, deleteElement: Node): { [key: string]: Node } => {
    if (deleteElement.parentId === null) return elements;

    const updatedNodes = { ...elements };

    const deleteChildren = (parentId: string) => {
        const children = Object.values(updatedNodes).filter(n => n.parentId === parentId);
        children.forEach(child => {
            delete updatedNodes[child.id];
            deleteChildren(child.id);
        });
    };

    delete updatedNodes[deleteElement.id];
    deleteChildren(deleteElement.id);

    if (deleteElement.parentId) {
        const parent = updatedNodes[deleteElement.parentId];
        if (parent) {
            updatedNodes[parent.id] = { ...parent, children: parent.children - 1 };
        }
    }

    return updatedNodes;
};

const isDescendant = (elements: { [key: string]: Node }, nodeId: string, targetParentId: string): boolean => {
    let currentId: string | null = targetParentId;
    while (currentId !== null) {
        if (currentId === nodeId) {
            return true;
        }
        currentId = elements[currentId]?.parentId ?? null;
    }
    return false;
};

const adjustNodeAndChildrenPosition = (
    elements: { [key: string]: Node },
    element: Node,
    currentY: number,
    maxHeight: number,
    visited: Set<string> = new Set()
): number => {
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

const adjustNodePositions = (elements: { [key: string]: Node }): { [key: string]: Node } => {
    const updatedNodes = { ...elements };
    const rootNodes = Object.values(updatedNodes).filter(n => n.parentId === null);

    rootNodes.forEach(rootNode => {
        adjustNodeAndChildrenPosition(updatedNodes, rootNode, PRESET_Y, rootNode.height, new Set());
    });

    const sortedNodes = Object.values(updatedNodes).sort((a, b) => b.depth - a.depth || (a.parentId as string).localeCompare(b.parentId as string) || a.order - b.order);
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

const createNodeAdder = (elements: { [key: string]: Node }, parentElement: Node): { [key: string]: Node } => {
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

const handleZoomIn = (state: State): State => ({
    ...state,
    zoomRatio: state.zoomRatio + 0.1
});

const handleZoomOut = (state: State): State => ({
    ...state,
    zoomRatio: Math.max(state.zoomRatio - 0.1, 0.1)
});

const actionHandlers: { [key: string]: (state: State, action?: any) => State } = {
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

        const updatedNodes = Object.values(action.payload).reduce<{ [key: string]: Node }>((acc, element: unknown) => {
            const el = element as Node;
            acc[el.id] = el.parentId === null ? { ...el, visible: true } : el;
            return acc;
        }, {});

        return {
            ...state,
            elements: adjustNodePositions(updatedNodes)
        };
    },

    SELECT_NODE: (state, action) => {
        const selectedNode = state.elements[action.payload];
        if (!selectedNode) return state;

        const { text, text2, text3, selected, editing, visible, ...rest } = selectedNode;
        console.log('[SELECT_NODE] selectNode:', rest);

        const updatedNodes = Object.values(state.elements).reduce<{ [key: string]: Node }>((acc, element) => {
            acc[element.id] = {
                ...element,
                selected: element.id === action.payload,
                editing: element.id === action.payload ? element.editing : false
            };
            return acc;
        }, {});

        return { ...state, elements: updatedNodes };
    },

    DESELECT_ALL: state => ({
        ...state,
        elements: Object.values(state.elements).reduce<{ [key: string]: Node }>((acc, element) => {
            acc[element.id] = { ...element, selected: false, editing: false };
            return acc;
        }, {})
    }),

    UPDATE_TEXT: (state, action) => ({
        ...state,
        elements: {
            ...state.elements,
            [action.payload.id]: {
                ...state.elements[action.payload.id],
                [action.payload.field]: action.payload.value
            }
        }
    }),

    ADD_NODE: state => handleNodeMutation(state, (elements, selectedNode) => {
        const newNodes = createNodeAdder(elements, selectedNode);
        return { elements: adjustNodePositions(newNodes) };
    }),

    DELETE_NODE: state => handleNodeMutation(state, (elements, selectedElement) => ({
        elements: adjustNodePositions(deleteNodeRecursive(elements, selectedElement))
    })),

    EDIT_NODE: state => handleSelectedNodeAction(state, selectedElement => ({
        elements: {
            ...state.elements,
            [selectedElement.id]: { ...selectedElement, editing: true }
        }
    })),

    END_EDITING: state => ({
        ...state,
        elements: adjustNodePositions(
            Object.values(state.elements).reduce<{ [key: string]: Node }>((acc, element) => {
                acc[element.id] = { ...element, editing: false };
                return acc;
            }, {})
        )
    }),

    UNDO: state => ({ ...state, elements: Undo(state.elements) }),
    REDO: state => ({ ...state, elements: Redo(state.elements) }),
    SNAPSHOT: state => { saveSnapshot(state.elements); return state; },

    DROP_NODE: (state, action) => {
        const { payload } = action;

        if (
            payload.id === payload.newParentId ||
            isDescendant(state.elements, payload.id, payload.newParentId)
        ) {
            return state;
        }
        
        const siblings = Object.values(state.elements).filter(n => n.parentId === payload.newParentId);
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(n => n.order)) + 1 : 0;

        const updatedNodes = Object.values(state.elements).reduce<{ [key: string]: Node }>((acc, element) => {
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
            [payload.oldParentId]: { ...state.elements[payload.oldParentId], children: state.elements[payload.oldParentId].children - 1 },
            [payload.newParentId]: { ...state.elements[payload.newParentId], children: state.elements[payload.newParentId].children + 1 }
        };

        return {
            ...state,
            elements: adjustNodePositions(
                setDepthRecursive(
                    { ...updatedNodes, ...parentUpdates },
                    payload as Node
                )
            )
        };
    },

    MOVE_NODE: (state, action) => ({
        ...state,
        elements: {
            ...state.elements,
            [action.payload.id]: {
                ...state.elements[action.payload.id],
                x: action.payload.x,
                y: action.payload.y
            }
        }
    }),

    CUT_NODE: state => handleNodeMutation(state, (elements, selectedNode) => {
        const cutNodes = getSelectedNodeAndChildren(elements, selectedNode, selectedNode);
        return {
            elements: adjustNodePositions(deleteNodeRecursive(elements, selectedNode)),
            cutNodes
        };
    }),

    COPY_NODE: state => handleSelectedNodeAction(state, selectedNode => ({
        cutNodes: getSelectedNodeAndChildren(state.elements, selectedNode, selectedNode)
    })),

    PASTE_NODE: state => handleNodeMutation(state, (elements, selectedNode) => {
        const pastedNodes = pasteNodes(elements, state.cutNodes!, selectedNode);
        const updatedParent = { ...selectedNode, children: selectedNode.children + 1 };
        return {
            elements: adjustNodePositions({ ...pastedNodes, [updatedParent.id]: updatedParent })
        };
    }),

    EXPAND_NODE: state => handleNodeMutation(state, (elements, selectedNode) => ({
        elements: adjustNodePositions(setVisibilityRecursive(elements, selectedNode, true))
    })),

    COLLAPSE_NODE: state => handleNodeMutation(state, (elements, selectedNode) => ({
        elements: adjustNodePositions(setVisibilityRecursive(elements, selectedNode, false))
    })),

    UPDATE_NODE_SIZE: (state, action) => {
        const updatedElement = {
            ...state.elements[action.payload.id],
            width: action.payload.width,
            height: action.payload.height,
            section1Height: action.payload.sectionHeights[0],
            section2Height: action.payload.sectionHeights[1],
            section3Height: action.payload.sectionHeights[2]
        };

        return {
            ...state,
            elements: adjustNodePositions({
                ...state.elements,
                [action.payload.id]: updatedElement
            })
        };
    },
};
function handleArrowAction(handler: (elements: Record<string, Node>) => string | undefined): (state: State) => State {
// function handleArrowAction(handler: (elements: { [key: string]: Node }) => string | undefined): (state: State) => State {
    return state => {
        const selectedId = handler(state.elements);
        return {
            ...state,
            elements: Object.values(state.elements).reduce<{ [key: string]: Node }>((acc, element) => {
                acc[element.id] = { ...element, selected: element.id === selectedId };
                return acc;
            }, {})
        };
    };
}

function handleNodeMutation(state: State, mutationFn: (elements: { [key: string]: Node }, selectedNode: Node) => { elements: { [key: string]: Node }, cutNodes?: { [key: string]: Node } }): State {
    const selectedNode = Object.values(state.elements).find(element => element.selected);
    if (!selectedNode) return state;

    saveSnapshot(state.elements);
    const mutationResult = mutationFn(state.elements, selectedNode);

    if ('elements' in mutationResult) {
        return {
            ...state,
            elements: mutationResult.elements,
            ...(mutationResult.cutNodes && { cutNodes: mutationResult.cutNodes })
        };
    } else {
        return {
            ...state,
            elements: mutationResult as { [key: string]: Node }
        };
    }
}

function handleSelectedNodeAction(state: State, actionFn: (selectedNode: Node) => Partial<State>): State {
    const selectedNode = Object.values(state.elements).find(element => element.selected);
    return selectedNode ? { ...state, ...actionFn(selectedNode) } : state;
}

function reducer(state: State, action: Action): State {
    const handler = actionHandlers[action.type];
    return handler ? handler(state, action) : state;
}

export { reducer };