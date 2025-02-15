// src/state/state.ts
import { Undo, Redo, saveSnapshot, clearSnapshots } from './undoredo';
import { handleArrowUp, handleArrowDown, handleArrowRight, handleArrowLeft } from '../utils/ElementSelector';
import { Element } from '../types';
import {
    X_OFFSET,
    Y_OFFSET,
    PRESET_Y,
    DEFAULT_X,
    DEFAULT_Y,
    NODE_HEIGHT,
    MIN_WIDTH,
    DEFAULT_SECTION_HEIGHT
} from '../constants/ElementSettings';
import { v4 as uuidv4 } from 'uuid';

export interface State {
    elements: { [key: string]: Element };
    width: number;
    height: number;
    zoomRatio: number;
    cutElements?: { [key: string]: Element };
}

export type Action = {
    type: string;
    payload?: any;
};

type ElementsMap = { [key: string]: Element };

interface AdjustmentResult {
    elements: ElementsMap;
    currentY: number;
    maxHeight: number;
}

const createNewElement = (parentId: string | null, order: number, depth: number): Element => ({
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
            ...createNewElement(null, 0, 1),
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

const getSelectedAndChildren = (elements: { [key: string]: Element }, targetElement: Element, selectedElement: Element): { [key: string]: Element } => {
    let cutElements: { [key: string]: Element } = {};
    const elementList = Object.values(elements);

    if (targetElement.id === selectedElement.id) {
        cutElements[targetElement.id] = { ...targetElement, parentId: null };
    } else {
        cutElements[targetElement.id] = targetElement;
    }

    const childElements = elementList.filter(element => element.parentId === targetElement.id);
    if (childElements.length > 0) {
        childElements.forEach(childElement => {
            const childCutElements = getSelectedAndChildren(elements, childElement, selectedElement);
            cutElements = { ...cutElements, ...childCutElements };
        });
    }

    return cutElements;
};

const pasteElements = (elements: { [key: string]: Element }, cutElements: { [key: string]: Element }, parentElement: Element): { [key: string]: Element } => {
    const rootElement = Object.values(cutElements).find(element => element.parentId === null);
    if (!rootElement) {
        return { ...elements, ...cutElements };
    }

    const rootElementDepth = rootElement.depth;
    const baseDepth = parentElement.depth + 1;
    const depthDelta = baseDepth - rootElementDepth;
    const idMap = new Map<string, string>();

    // 兄弟要素から最大orderを取得
    const siblings = Object.values(elements).filter(e => e.parentId === parentElement.id);
    const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(e => e.order)) : -1;

    const newElements = Object.values(cutElements).reduce<{ [key: string]: Element }>((acc, cutElement) => {
        const newElement = { ...cutElement };
        const newUUID = uuidv4();
        idMap.set(cutElement.id, newUUID);
        newElement.id = newUUID;
        newElement.depth = cutElement.depth + depthDelta;

        if (cutElement.id === rootElement.id) {
            newElement.parentId = parentElement.id;
            newElement.order = maxOrder + 1; // 最大order+1を設定
            newElement.selected = false;
        }

        acc[newUUID] = newElement;
        return acc;
    }, {});

    const updatedElements = Object.values(newElements).reduce<{ [key: string]: Element }>((acc, element) => {
        const parentId = idMap.has(element.parentId as string)
            ? idMap.get(element.parentId as string)!
            : element.parentId;
        const updatedElement = { ...element, parentId };
        acc[updatedElement.id] = updatedElement;
        return acc;
    }, { ...elements });

    // 親要素のchildrenを更新
    const updatedParent = { ...parentElement, children: parentElement.children + 1 };
    updatedElements[updatedParent.id] = updatedParent;

    return updatedElements;
};

const setDepthRecursive = (elements: { [key: string]: Element }, parentElement: Element): { [key: string]: Element } => {
    const updatedElements = { ...elements };
    const processChildren = (parentId: string) => {
        const children = Object.values(updatedElements).filter(n => n.parentId === parentId);
        children.forEach(child => {
            updatedElements[child.id] = { ...child, depth: updatedElements[parentId].depth + 1 };
            processChildren(child.id);
        });
    };
    processChildren(parentElement.id);
    return updatedElements;
};

const setVisibilityRecursive = (elements: { [key: string]: Element }, parentElement: Element, visible: boolean): { [key: string]: Element } => {
    const updatedElements = { ...elements };
    const processChildren = (parentId: string) => {
        const children = Object.values(updatedElements).filter(n => n.parentId === parentId);
        children.forEach(child => {
            updatedElements[child.id] = { ...child, visible };
            processChildren(child.id);
        });
    };
    processChildren(parentElement.id);
    return updatedElements;
};

const deleteElementRecursive = (elements: { [key: string]: Element }, deleteElement: Element): { [key: string]: Element } => {
    if (deleteElement.parentId === null) return elements;

    const updatedElements = { ...elements };

    const deleteChildren = (parentId: string) => {
        const children = Object.values(updatedElements).filter(n => n.parentId === parentId);
        children.forEach(child => {
            delete updatedElements[child.id];
            deleteChildren(child.id);
        });
    };

    delete updatedElements[deleteElement.id];
    deleteChildren(deleteElement.id);

    if (deleteElement.parentId) {
        const parent = updatedElements[deleteElement.parentId];
        if (parent) {
            updatedElements[parent.id] = { ...parent, children: parent.children - 1 };

            // 同じ parentId を持つ要素の order を再計算
            const siblings = Object.values(updatedElements).filter(n => n.parentId === deleteElement.parentId);
            siblings.sort((a, b) => a.order - b.order).forEach((sibling, index) => {
                if (sibling.order !== index) {
                    updatedElements[sibling.id] = { ...sibling, order: index };
                }
            });
        }
    }

    return updatedElements;
};

export const isDescendant = (elements: { [key: string]: Element }, nodeId: string, targetParentId: string): boolean => {
    let currentId: string | null = targetParentId;
    while (currentId !== null) {
        if (currentId === nodeId) {
            return true;
        }
        currentId = elements[currentId]?.parentId ?? null;
    }
    return false;
};

const calculateElementPosition = (
    element: Element,
    parentElement: Element | null,
    currentY: number
): Element => ({
    ...element,
    x: parentElement ? parentElement.x + parentElement.width + X_OFFSET : DEFAULT_X,
    y: currentY,
});

const adjustElementAndChildren = (
    elements: ElementsMap,
    element: Element,
    currentY: number,
    visited: Set<string>
): { elements: ElementsMap; currentY: number; maxY: number } => {
    if (visited.has(element.id)) return { elements, currentY, maxY: currentY };
    visited.add(element.id);

    const parentElement = element.parentId ? elements[element.parentId] : null;
    const positionedElement = calculateElementPosition(element, parentElement, currentY);
    let updatedElements = { ...elements, [positionedElement.id]: positionedElement };

    const children = Object.values(updatedElements).filter(e => e.parentId === positionedElement.id);

    let updatedY = currentY;
    let maxY = positionedElement.y + positionedElement.height;

    // 子要素を再帰的に処理
    for (const child of children) {
        const result = adjustElementAndChildren(
            updatedElements,
            child,
            updatedY,
            visited
        );
        updatedElements = result.elements;
        updatedY = result.currentY;
        maxY = Math.max(maxY, result.maxY);
    }

    // 子がない場合は自身の高さ分オフセット
    if (children.length === 0 && (positionedElement.visible || positionedElement.order === 0)) {
        updatedY = positionedElement.y + positionedElement.height + Y_OFFSET;
        maxY = positionedElement.y + positionedElement.height;
    }
    // 子がある場合は親と子の最大下端を使用
    else if (children.length > 0) {
        updatedY = maxY + Y_OFFSET;
    }

    return { elements: updatedElements, currentY: updatedY, maxY };
};

const calculateParentPosition = (
    parent: Element,
    children: Element[]
): { needsUpdate: boolean; newY: number } => {
    const visibleChildren = children.filter(child => child.visible);
    if (visibleChildren.length === 0) return { needsUpdate: false, newY: parent.y };

    const childrenCenters = visibleChildren.map(child => child.y + child.height / 2);
    const minChildCenter = Math.min(...childrenCenters);
    const maxChildCenter = Math.max(...childrenCenters);
    
    const targetCenter = (minChildCenter + maxChildCenter) / 2;
    const newY = targetCenter - parent.height / 2;

    return {
        needsUpdate: Math.abs(parent.y - newY) > 1e-3,
        newY: newY,
    };
};

const getSortedElements = (elements: ElementsMap): Element[] =>
    Object.values(elements).sort(
        (a, b) =>
            b.depth - a.depth ||
            (a.parentId ?? "").localeCompare(b.parentId ?? "") ||
            a.order - b.order
    );

const adjustElementPositions = (elements: ElementsMap): ElementsMap => {
    let updatedElements = { ...elements };
    const rootElements = Object.values(updatedElements).filter(e => e.parentId === null);

    // 初期配置：親→子の順で配置
    for (const root of rootElements) {
        const result = adjustElementAndChildren(
            updatedElements,
            root,
            PRESET_Y,
            new Set<string>()
        );
        updatedElements = result.elements;
    }

    // 親要素の位置調整：子→親の順で調整
    const sortedElements = getSortedElements(updatedElements);
    for (const parentElement of sortedElements) {
        const children = Object.values(updatedElements).filter(e => e.parentId === parentElement.id);
        const positionResult = calculateParentPosition(parentElement, children);

        if (positionResult.needsUpdate) {
            updatedElements = {
                ...updatedElements,
                [parentElement.id]: {
                    ...parentElement,
                    y: positionResult.newY,
                },
            };
        }
    }

    return updatedElements;
};

const createElementAdder = (elements: { [key: string]: Element }, parentElement: Element): { [key: string]: Element } => {
    const newId = uuidv4();
    const newOrder = parentElement.children;

    const updatedElements = {
        ...elements,
        [parentElement.id]: { ...parentElement, children: parentElement.children + 1, selected: false },
        [newId]: {
            ...createNewElement(parentElement.id, newOrder, parentElement.depth + 1),
            id: newId,
        }
    };

    return adjustElementPositions(updatedElements);
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

        const updatedElements = Object.values(action.payload).reduce<{ [key: string]: Element }>((acc, element: unknown) => {
            const el = element as Element;
            acc[el.id] = el.parentId === null ? { ...el, visible: true } : el;
            return acc;
        }, {});

        return {
            ...state,
            elements: adjustElementPositions(updatedElements)
        };
    },

    SELECT_NODE: (state, action) => {
        const selectedElement = state.elements[action.payload];
        if (!selectedElement) return state;

        const { text, text2, text3, selected, editing, visible, ...rest } = selectedElement;
        console.log('[SELECT_NODE] selectElement:', rest);

        const updatedElements = Object.values(state.elements).reduce<{ [key: string]: Element }>((acc, element) => {
            acc[element.id] = {
                ...element,
                selected: element.id === action.payload,
                editing: element.id === action.payload ? element.editing : false,
                // text: element.id,
                // text2: 'order: ' + element.order + ' children:' + element.children,
            };
            return acc;
        }, {});

        return { ...state, elements: updatedElements };
    },

    DESELECT_ALL: state => ({
        ...state,
        elements: Object.values(state.elements).reduce<{ [key: string]: Element }>((acc, element) => {
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

    ADD_NODE: state => handleElementMutation(state, (elements, selectedElement) => {
        const newElements = createElementAdder(elements, selectedElement);
        return { elements: adjustElementPositions(newElements) };
    }),

    DELETE_NODE: state => handleElementMutation(state, (elements, selectedElement) => ({
        elements: adjustElementPositions(deleteElementRecursive(elements, selectedElement))
    })),

    EDIT_NODE: state => handleSelectedElementAction(state, selectedElement => ({
        elements: {
            ...state.elements,
            [selectedElement.id]: { ...selectedElement, editing: true }
        }
    })),

    END_EDITING: state => ({
        ...state,
        elements: adjustElementPositions(
            Object.values(state.elements).reduce<{ [key: string]: Element }>((acc, element) => {
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
        const { id, oldParentId, newParentId, newOrder, depth } = payload;
    
        if (id === newParentId || isDescendant(state.elements, id, newParentId)) {
            return state;
        }
    
        let updatedElements = { ...state.elements };
        const element = updatedElements[id];
        const oldParent = updatedElements[oldParentId];
        const newParent = updatedElements[newParentId];
    
        // 同じ親内での移動かどうか
        const isSameParent = oldParentId === newParentId;
    
        // 古い親のchildren更新（異なる親の場合のみ）
        if (!isSameParent && oldParent) {
            updatedElements[oldParentId] = {
                ...oldParent,
                children: Math.max(0, oldParent.children - 1)
            };
        }
    
        updatedElements[id] = {
            ...element,
            parentId: newParentId,
            order: newOrder,
            depth: depth,
            x: newParent ? newParent.x + newParent.width + X_OFFSET : DEFAULT_X,
            y: newParent ? newParent.y : DEFAULT_Y
        };
    
        // 兄弟要素のorder再計算
        const siblings = Object.values(updatedElements)
            .filter(e => e.parentId === newParentId && e.id !== id)
            .sort((a, b) => a.order - b.order);
    
        // 新しい順序に基づいて要素を配置
        const newSiblings = [
            ...siblings.slice(0, newOrder),
            updatedElements[id],
            ...siblings.slice(newOrder)
        ];
    
        // orderプロパティの更新
        newSiblings.forEach((sibling, index) => {
            if (sibling.order !== index) {
                updatedElements[sibling.id] = {
                    ...sibling,
                    order: index
                };
            }
        });
    
        // 新しい親のchildren更新（異なる親の場合のみ）
        if (!isSameParent && newParent) {
            updatedElements[newParentId] = {
                ...newParent,
                children: newParent.children + 1
            };
        }
    
        // 深度の再計算（異なる親の場合）
        if (!isSameParent) {
            updatedElements = setDepthRecursive(updatedElements, updatedElements[id]);
        }
    
        return {
            ...state,
            elements: adjustElementPositions(updatedElements)
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

    CUT_NODE: state => handleElementMutation(state, (elements, selectedElement) => {
        const cutElements = getSelectedAndChildren(elements, selectedElement, selectedElement);
        return {
            elements: adjustElementPositions(deleteElementRecursive(elements, selectedElement)),
            cutElements
        };
    }),

    COPY_NODE: state => handleSelectedElementAction(state, selectedElement => ({
        cutElements: getSelectedAndChildren(state.elements, selectedElement, selectedElement)
    })),

    PASTE_NODE: state => handleElementMutation(state, (elements, selectedElement) => {
        const pastedElements = pasteElements(elements, state.cutElements!, selectedElement);
        return {
            elements: adjustElementPositions(pastedElements)
        };
    }),

    EXPAND_NODE: state => handleElementMutation(state, (elements, selectedElement) => ({
        elements: adjustElementPositions(setVisibilityRecursive(elements, selectedElement, true))
    })),

    COLLAPSE_NODE: state => handleElementMutation(state, (elements, selectedElement) => ({
        elements: adjustElementPositions(setVisibilityRecursive(elements, selectedElement, false))
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
            elements: adjustElementPositions({
                ...state.elements,
                [action.payload.id]: updatedElement
            })
        };
    },
};
function handleArrowAction(handler: (elements: Record<string, Element>) => string | undefined): (state: State) => State {
    return state => {
        const selectedId = handler(state.elements);
        return {
            ...state,
            elements: Object.values(state.elements).reduce<{ [key: string]: Element }>((acc, element) => {
                acc[element.id] = { ...element, selected: element.id === selectedId };
                return acc;
            }, {})
        };
    };
}

function handleElementMutation(state: State, mutationFn: (elements: { [key: string]: Element }, selectedElement: Element) => { elements: { [key: string]: Element }, cutElements?: { [key: string]: Element } }): State {
    const selectedElement = Object.values(state.elements).find(element => element.selected);
    if (!selectedElement) return state;

    saveSnapshot(state.elements);
    const mutationResult = mutationFn(state.elements, selectedElement);

    if ('elements' in mutationResult) {
        return {
            ...state,
            elements: mutationResult.elements,
            ...(mutationResult.cutElements && { cutElements: mutationResult.cutElements })
        };
    } else {
        return {
            ...state,
            elements: mutationResult as { [key: string]: Element }
        };
    }
}

function handleSelectedElementAction(state: State, actionFn: (selectedElement: Element) => Partial<State>): State {
    const selectedElement = Object.values(state.elements).find(element => element.selected);
    return selectedElement ? { ...state, ...actionFn(selectedElement) } : state;
}

function reducer(state: State, action: Action): State {
    const handler = actionHandlers[action.type];
    return handler ? handler(state, action) : state;
}

export { reducer };