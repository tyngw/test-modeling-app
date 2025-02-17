// src/state/state.ts
import { Undo, Redo, saveSnapshot, clearSnapshots } from './undoredo';
import { handleArrowUp, handleArrowDown, handleArrowRight, handleArrowLeft } from '../utils/ElementSelector';
import { Element } from '../types';
import {
    OFFSET,
    // OFFSET.Y,
    DEFAULT_POSITION,
    SIZE,
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
    width: SIZE.WIDTH.MIN,
    height: SIZE.NODE_HEIGHT,
    section1Height: SIZE.SECTION_HEIGHT,
    section2Height: SIZE.SECTION_HEIGHT,
    section3Height: SIZE.SECTION_HEIGHT,
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
            x: DEFAULT_POSITION.X,
            y: DEFAULT_POSITION.Y,
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

const getChildren = (parentId: string | null, elements: ElementsMap): Element[] => {
    return Object.values(elements)
        .filter(e => e.parentId === parentId && e.visible)
        .sort((a, b) => a.order - b.order);
};

const layoutSubtree = (
    node: Element,
    parentX: number,
    currentY: number,
    elements: ElementsMap,
    xOffset: number,
    yOffset: number
): { newY: number; minY: number; maxY: number } => {
    node.x = parentX + xOffset;

    const children = getChildren(node.id, elements);
    let childY = currentY;
    let minY = Infinity;
    let maxY = -Infinity;

    // 子要素を再帰的に配置
    for (const child of children) {
        const result = layoutSubtree(
            child,
            node.x + node.width,
            childY,
            elements,
            OFFSET.X,
            OFFSET.Y
        );
        childY = result.newY;
        minY = Math.min(minY, result.minY);
        maxY = Math.max(maxY, result.maxY);
    }

    // 親要素のY位置計算（子要素の中央配置）
    if (children.length > 0) {
        const firstChild = children[0];
        const lastChild = children[children.length - 1];
        const centerY = (firstChild.y + lastChild.y + lastChild.height) / 2;
        node.y = centerY - node.height / 2;
    } else {
        node.y = currentY;
    }

    // 衝突判定の改良（子孫要素を除外）
    let adjustedY = node.y;
    let collisionFound = true;
    
    while (collisionFound) {
        collisionFound = false;
        for (const elem of Object.values(elements)) {
            if (elem.id === node.id) continue;
            if (isDescendant(elements, elem.id, node.id)) continue; // 子孫要素を除外
            
            if (checkCollision(node, adjustedY, elem)) {
                adjustedY = elem.y + elem.height + OFFSET.Y;
                collisionFound = true;
                break;
            }
        }
    }
    
    node.y = adjustedY;

    const nodeBottom = node.y + node.height;
    const newY = Math.max(childY, nodeBottom + OFFSET.Y);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y + node.height);

    return { newY, minY, maxY };
};

// 衝突チェック関数を追加
const checkCollision = (element: Element, y: number, other: Element): boolean => {
    return (
        element.x < other.x + other.width &&
        element.x + element.width > other.x &&
        y < other.y + other.height &&
        y + element.height > other.y
    );
};

const adjustElementPositions = (elements: ElementsMap): ElementsMap => {
    const newElements = { ...elements };
    const rootElements = getChildren(null, newElements);
    let currentY = OFFSET.Y;

    // 全要素の座標をリセット
    Object.values(newElements).forEach(elem => {
        elem.x = 0;
        elem.y = 0;
    });

    for (const root of rootElements) {
        root.x = DEFAULT_POSITION.X;
        const result = layoutSubtree(
            root,
            0,
            currentY,
            newElements,
            OFFSET.X,
            OFFSET.Y
        );
        currentY = result.newY;
    }

    return newElements;
};

const old_adjustElementAndChildrenPosition = (
    elements: { [key: string]: Element },
    element: Element,
    currentY: number,
    maxHeight: number,
    visited: Set<string> = new Set()
): number => {
    if (visited.has(element.id)) return currentY;
    visited.add(element.id);

    const updatedElements = { ...elements };
    const parentElement = element.parentId ? updatedElements[element.parentId] : null;

    if (!parentElement) {
        element.x = DEFAULT_POSITION.X;
    } else {
        element.x = parentElement.x + parentElement.width + OFFSET.X;
    }

    element.y = currentY;
    maxHeight = Math.max(maxHeight, element.height);
    updatedElements[element.id] = element;

    const childElements = Object.values(updatedElements).filter(n => n.parentId === element.id);
    if (childElements.length > 0) {
        childElements.forEach(childElement => {
            if (!visited.has(childElement.id)) {
                currentY = old_adjustElementAndChildrenPosition(updatedElements, childElement, currentY, maxHeight, visited);
            }
        });
    } else {
        if (element.visible || element.order === 0) {
            currentY += maxHeight + OFFSET.Y;
        }
    }

    return currentY;
};

const old_adjustElementPositions = (elements: { [key: string]: Element }): { [key: string]: Element } => {
    const updatedElements = { ...elements };
    const rootElements = Object.values(updatedElements).filter(n => n.parentId === null);

    rootElements.forEach(rootElement => {
        old_adjustElementAndChildrenPosition(updatedElements, rootElement, OFFSET.Y, rootElement.height, new Set());
    });

    const sortedElements = Object.values(updatedElements).sort((a, b) => b.depth - a.depth || (a.parentId as string).localeCompare(b.parentId as string) || a.order - b.order);
    sortedElements.forEach(parentElement => {
        const children = sortedElements.filter(n => n.parentId === parentElement.id);
        const visibleChildren = children.filter(n => n.visible);
        if (visibleChildren.length > 0) {
            const childrenMinY = Math.min(...children.map(n => n.y));
            const childrenMaxY = Math.max(...children.map(n => n.y + n.height));
            const childrenHeight = childrenMaxY - childrenMinY;
            if (parentElement.id === '10'){
                console.log('[Debug] childrenMinY:' + childrenMinY + ' childrenMaxY:' + childrenMaxY + ' childrenHeight:' + childrenHeight);
            }
            if (parentElement.height > childrenHeight) {
                const tallParentNewY = parentElement.y - ((parentElement.height - childrenHeight) / 2);
                updatedElements[parentElement.id] = { ...parentElement, y: tallParentNewY };
            } else {
                const shortParentNewY = childrenMinY + (childrenHeight / 2) - (parentElement.height / 2);
                if (parentElement.y < shortParentNewY) {
                    updatedElements[parentElement.id] = { ...parentElement, y: shortParentNewY };
                }
            }
        }
    });

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

const createSiblingElementAdder = (elements: ElementsMap, selectedElement: Element): ElementsMap => {
    const parentId = selectedElement.parentId;
    const siblings = Object.values(elements).filter(e => e.parentId === parentId);
    const newOrder = selectedElement.order + 1;

    const updatedElements = { ...elements };

    // 新しいorder以上の兄弟要素のorderを更新
    siblings.forEach(sibling => {
        if (sibling.order >= newOrder) {
            updatedElements[sibling.id] = {
                ...sibling,
                order: sibling.order + 1,
            };
        }
    });

    // 新しい要素を作成
    const newElement = createNewElement(parentId, newOrder, selectedElement.depth);
    updatedElements[newElement.id] = newElement;

    // 親要素のchildrenを更新（親が存在する場合）
    if (parentId !== null) {
        const parent = updatedElements[parentId];
        updatedElements[parentId] = {
            ...parent,
            children: parent.children + 1,
        };
    }

    return updatedElements;
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

    LOAD_ELEMENTS: (state, action) => {
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

    SELECT_ELEMENT: (state, action) => {
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

    ADD_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => {
        const newElements = createElementAdder(elements, selectedElement);
        return { elements: adjustElementPositions(newElements) };
    }),

    ADD_SIBLING_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => {
        const newElements = createSiblingElementAdder(elements, selectedElement);
        return { elements: adjustElementPositions(newElements) };
    }),

    DELETE_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => ({
        elements: adjustElementPositions(deleteElementRecursive(elements, selectedElement))
    })),

    EDIT_ELEMENT: state => handleSelectedElementAction(state, selectedElement => ({
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

    DROP_ELEMENT: (state, action) => {
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

    MOVE_ELEMENT: (state, action) => ({
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

    CUT_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => {
        const cutElements = getSelectedAndChildren(elements, selectedElement, selectedElement);
        return {
            elements: adjustElementPositions(deleteElementRecursive(elements, selectedElement)),
            cutElements
        };
    }),

    COPY_ELEMENT: state => handleSelectedElementAction(state, selectedElement => ({
        cutElements: getSelectedAndChildren(state.elements, selectedElement, selectedElement)
    })),

    PASTE_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => {
        const pastedElements = pasteElements(elements, state.cutElements!, selectedElement);
        return {
            elements: adjustElementPositions(pastedElements)
        };
    }),

    EXPAND_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => ({
        elements: adjustElementPositions(setVisibilityRecursive(elements, selectedElement, true))
    })),

    COLLAPSE_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => ({
        elements: adjustElementPositions(setVisibilityRecursive(elements, selectedElement, false))
    })),

    UPDATE_ELEMENT_SIZE: (state, action) => {
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