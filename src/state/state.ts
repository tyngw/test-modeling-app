// src/state/state.ts
'use client';

import { v4 as uuidv4 } from 'uuid';
import { Undo, Redo, saveSnapshot } from './undoredo';
import { handleArrowUp, handleArrowDown, handleArrowRight, handleArrowLeft } from '../utils/elementSelector';
import { Element } from '../types/types';
import { SIZE, TEXTAREA_PADDING, DEFAULT_FONT_SIZE, LINE_HEIGHT_RATIO, DEFAULT_POSITION, NUMBER_OF_SECTIONS } from '../constants/elementSettings';
import { calculateElementWidth, wrapText } from '../utils/textareaHelpers';
import { debugLog } from '../utils/debugLogHelpers';
import { 
    createNewElement, 
    getChildren, 
    setDepthRecursive, 
    setVisibilityRecursive, 
    deleteElementRecursive, 
    isDescendant,
    ElementsMap
} from '../utils/elementHelpers';
import { adjustElementPositions } from '../utils/layoutHelpers';
import { getSelectedAndChildren, copyToClipboard, getGlobalCutElements } from '../utils/clipboardHelpers';
import {
    createElementAdder,
    createSiblingElementAdder,
    pasteElements,
    addElementsWithAdjustment,
    updateElementProperties,
    batchUpdateElements,
    updateElementsWhere,
    updateSelectedElements,
    withPositionAdjustment,
    createElementPropertyHandler,
    createSelectedElementHandler,
    createSimplePropertyHandler
} from '../utils/stateHelpers';

export interface State {
    elements: ElementsMap;
    width: number;
    height: number;
    zoomRatio: number;
    numberOfSections: number;
}

export type Action = {  
    type: string;
    payload?: any;
};

export const initialState: State = {
    elements: {
        '1': {
            ...createNewElement(),
            id: '1',
            x: DEFAULT_POSITION.X,
            y: DEFAULT_POSITION.Y,
            editing: false,
        }
    },
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    zoomRatio: 1,
    numberOfSections: NUMBER_OF_SECTIONS,
};

const handleZoomIn = (state: State): State => ({
    ...state,
    zoomRatio: state.zoomRatio + 0.1
});

const handleZoomOut = (state: State): State => ({
    ...state,
    zoomRatio: Math.max(state.zoomRatio - 0.1, 0.1)
});

function handleArrowAction(handler: (elements: ElementsMap) => string | undefined): (state: State) => State {
    return state => {
        const selectedElements = Object.values(state.elements).filter(e => e.selected);
        if (selectedElements.length > 1) {
            const firstId = selectedElements[0].id;
            const updatedElements = Object.values(state.elements).reduce<ElementsMap>((acc, element) => {
                acc[element.id] = {
                    ...element,
                    selected: element.id === firstId,
                    editing: element.id === firstId ? element.editing : false,
                };
                return acc;
            }, {});
            return { ...state, elements: updatedElements };
        }

        const selectedId = handler(state.elements);
        return {
            ...state,
            elements: Object.values(state.elements).reduce<ElementsMap>((acc, element) => {
                acc[element.id] = { ...element, selected: element.id === selectedId };
                return acc;
            }, {})
        };
    };
}

function handleElementMutation(state: State, mutationFn: (elements: ElementsMap, selectedElement: Element) => { elements: ElementsMap }): State {
    const selectedElement = Object.values(state.elements).find(element => element.selected);
    if (!selectedElement) return state;

    saveSnapshot(state.elements);
    const mutationResult = mutationFn(state.elements, selectedElement);

    if ('elements' in mutationResult) {
        return {
            ...state,
            elements: mutationResult.elements
        };
    } else {
        return {
            ...state,
            elements: mutationResult as ElementsMap
        };
    }
}

function handleSelectedElementAction(state: State, actionFn: (selectedElement: Element) => Partial<State>): State {
    const selectedElement = Object.values(state.elements).find(element => element.selected);
    return selectedElement ? { ...state, ...actionFn(selectedElement) } : state;
}

const actionHandlers: { [key: string]: (state: State, action?: any) => State } = {
    ZOOM_IN: handleZoomIn,
    ZOOM_OUT: handleZoomOut,

    ARROW_UP: handleArrowAction(handleArrowUp),
    ARROW_DOWN: handleArrowAction(handleArrowDown),
    ARROW_RIGHT: handleArrowAction(handleArrowRight),
    ARROW_LEFT: handleArrowAction(handleArrowLeft),

    LOAD_ELEMENTS: (state, action) => {
        if (Object.keys(action.payload).length === 0) return initialState;

        const updatedElements = Object.values(action.payload).reduce<ElementsMap>((acc, element: unknown) => {
            const el = element as Element;
            acc[el.id] = el.parentId === null ? { ...el, visible: true } : el;
            return acc;
        }, {});

        return withPositionAdjustment(state, () => updatedElements);
    },

    SELECT_ELEMENT: (state, action) => {
        const { id, ctrlKey, shiftKey } = action.payload;
        const selectedElement = state.elements[id];
        if (!selectedElement) return state;

        const currentSelected = Object.values(state.elements).filter(e => e.selected);
        const firstSelected = currentSelected[0];

        // 異なるparentIdの要素が含まれる場合は何もしない
        if ((shiftKey || ctrlKey) && currentSelected.length > 0 && currentSelected.some(e => e.parentId !== selectedElement.parentId)) {
            return state;
        }

        let newSelectedIds: string[] = [];

        if (shiftKey && currentSelected.length > 0) {
            const parentId = firstSelected.parentId;
            const siblings = Object.values(state.elements)
                .filter(e => e.parentId === parentId)
                .sort((a, b) => a.order - b.order);

            const startIndex = siblings.findIndex(e => e.id === firstSelected.id);
            const endIndex = siblings.findIndex(e => e.id === id);
            const [start, end] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
            newSelectedIds = siblings.slice(start, end + 1).map(e => e.id);
        } else if (ctrlKey) {
            const isAlreadySelected = currentSelected.some(e => e.id === id);
            newSelectedIds = isAlreadySelected
                ? currentSelected.filter(e => e.id !== id).map(e => e.id)
                : [...currentSelected.map(e => e.id), id];
        } else {
            newSelectedIds = [id];
        }

        const parentId = selectedElement.parentId;
        const validSelectedIds = newSelectedIds.filter(id => {
            const elem = state.elements[id];
            return elem.parentId === parentId;
        });

        // まず全ての要素を非選択状態に
        let updatedElements = updateElementsWhere(
            state.elements, 
            () => true, 
            { selected: false, editing: false }
        );
        
        // 次に対象の要素を選択状態に
        updatedElements = updateElementsWhere(
            updatedElements,
            element => validSelectedIds.includes(element.id),
            { selected: true }
        );

        return {
            ...state,
            elements: updatedElements
        };
    },

    DESELECT_ALL: state => ({
        ...state,
        elements: updateElementsWhere(state.elements, () => true, { selected: false, editing: false })
    }),

    UPDATE_TEXT: createElementPropertyHandler<{ id: string, index: number, value: string }>(
        (element, { index, value }) => ({
            texts: element.texts.map((text, idx) => idx === index ? value : text)
        })
    ),

    UPDATE_START_MARKER: createSimplePropertyHandler('startMarker'),
    
    UPDATE_END_MARKER: createSimplePropertyHandler('endMarker'),
    
    // 後方互換性のために残す
    UPDATE_CONNECTION_PATH_TYPE: (state, action) => {
        const { id, connectionPathType } = action.payload;
        return {
            ...state,
            elements: updateElementProperties(state.elements, id, { 
                startMarker: connectionPathType,
                connectionPathType 
            })
        };
    },
    
    // 後方互換性のために残す
    UPDATE_END_CONNECTION_PATH_TYPE: (state, action) => {
        const { id, endConnectionPathType } = action.payload;
        return {
            ...state,
            elements: updateElementProperties(state.elements, id, { 
                endMarker: endConnectionPathType,
                endConnectionPathType 
            })
        };
    },

    EDIT_ELEMENT: createSelectedElementHandler(
        element => ({ editing: true }),
        false
    ),

    END_EDITING: state => ({
        ...state,
        elements: updateElementsWhere(state.elements, () => true, { editing: false })
    }),

    MOVE_ELEMENT: (state, action) => {
        const { id, x, y } = action.payload;
        const selectedElements = Object.values(state.elements).filter(e => e.selected);

        // 複数要素移動の場合
        if (selectedElements.length > 1 && selectedElements.some(e => e.id === id)) {
            const deltaX = x - state.elements[id].x;
            const deltaY = y - state.elements[id].y;

            const updateMap = selectedElements.reduce((acc, element) => {
                acc[element.id] = {
                    x: element.x + deltaX,
                    y: element.y + deltaY
                };
                return acc;
            }, {} as Record<string, Partial<Element>>);

            return {
                ...state,
                elements: batchUpdateElements(state.elements, updateMap)
            };
        }

        // 単一要素移動
        return {
            ...state,
            elements: updateElementProperties(state.elements, id, { x, y })
        };
    },

    UPDATE_ELEMENT_SIZE: createElementPropertyHandler<{ id: string, width: number, height: number, sectionHeights: number[] }>(
        (element, { width, height, sectionHeights }) => ({
            width,
            height,
            sectionHeights
        })
    ),

    ADD_ELEMENT: (state, action) => handleElementMutation(state, (elements, selectedElement) => {
        const text = action.payload?.text;
        const numberOfSections = state.numberOfSections;
        
        const newElements = createElementAdder(elements, selectedElement, text, { 
            newElementSelect: true,
            numberOfSections 
        });
        return {
            elements: adjustElementPositions(newElements, () => state.numberOfSections)
        };
    }),

    ADD_ELEMENTS_SILENT: (state, action) => handleElementMutation(state, (elements, selectedElement) => {
        const texts = action.payload?.texts || [];
        const tentative = action.payload?.tentative || false;
        const numberOfSections = state.numberOfSections;
        
        return {
            elements: addElementsWithAdjustment(elements, selectedElement, texts, {
                tentative,
                numberOfSections,
                zoomRatio: state.zoomRatio
            })
        };
    }),

    ADD_SIBLING_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => {
        const numberOfSections = state.numberOfSections;
        const newElements = createSiblingElementAdder(elements, selectedElement, numberOfSections);
        return { 
            elements: adjustElementPositions(newElements, () => state.numberOfSections) 
        };
    }),

    DELETE_ELEMENT: state => {
        const selectedElements = Object.values(state.elements).filter(e => e.selected);
        if (selectedElements.length === 0) return state;

        debugLog(`DELETE_ELEMENT開始: 削除対象要素数=${selectedElements.length}`);
        
        // 削除操作をする前に、削除後に選択する要素の候補を探す
        let remainingElements = { ...state.elements };
        const nextSelectedId = (() => {
            const firstElement = selectedElements[0];
            const siblings = Object.values(remainingElements)
                .filter(e => e.parentId === firstElement.parentId && !e.selected)
                .sort((a, b) => a.order - b.order);

            // 選択要素より前にある兄弟要素の最後の要素
            const prevSibling = siblings.filter(e => e.order < firstElement.order).pop();
            // 選択要素より後にある兄弟要素の最初の要素
            const nextSibling = siblings.find(e => e.order > firstElement.order);

            // 兄弟要素があればそれを選択、なければ親要素を選択
            return prevSibling?.id || nextSibling?.id || firstElement.parentId;
        })();

        selectedElements.forEach(element => {
            remainingElements = deleteElementRecursive(remainingElements, element);
        });

        // 明示的にY座標をリセットして完全に再配置を行う
        Object.values(remainingElements).forEach(element => {
            if (element.parentId === null) {
                element.y = DEFAULT_POSITION.Y;
            }
        });

        // 次に選択する要素があれば、その要素のみを選択状態にし、他の要素は非選択状態にする
        const updatedElements = updateElementsWhere(
            remainingElements,
            element => element.id === nextSelectedId,
            { selected: true }
        );

        return withPositionAdjustment(state, () => updatedElements);
    },

    CONFIRM_TENTATIVE_ELEMENTS: (state, action) => ({
        ...state,
        elements: updateElementsWhere(
            state.elements,
            element => element.parentId === action.payload && element.tentative,
            { tentative: false }
        )
    }),

    CANCEL_TENTATIVE_ELEMENTS: (state, action) => {
        const tentativeElements = Object.values(state.elements).filter(e =>
            e.tentative && e.parentId === action.payload
        );

        const parentIds = Array.from(
            new Set(
                tentativeElements
                    .map(e => e.parentId)
                    .filter((id): id is string => id !== null)
            )
        );

        const filteredElements = Object.values(state.elements).reduce((acc, element) => {
            if (!(element.tentative && element.parentId === action.payload)) {
                acc[element.id] = element;
            }
            return acc;
        }, {} as ElementsMap);

        const updatedElements = parentIds.reduce((acc, parentId) => {
            if (acc[parentId]) {
                const childrenCount = Object.values(acc).filter(e =>
                    e.parentId === parentId && !e.tentative
                ).length;
                
                acc[parentId] = {
                    ...acc[parentId],
                    children: childrenCount
                };
            }
            return acc;
        }, filteredElements);

        return withPositionAdjustment(state, () => updatedElements);
    },

    UNDO: state => withPositionAdjustment(state, () => Undo(state.elements)),
    
    REDO: state => withPositionAdjustment(state, () => Redo(state.elements)),
    
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

        const isSameParent = oldParentId === newParentId;

        // 古い親のchildren更新（異なる親の場合のみ）
        if (!isSameParent && oldParent) {
            updatedElements[oldParentId] = {
                ...oldParent,
                children: Math.max(0, oldParent.children - 1)
            };
        }

        // 対象要素の更新
        updatedElements[id] = {
            ...element,
            parentId: newParentId,
            depth: depth,
            order: newOrder
        };

        // 同じ親の兄弟要素の順序更新
        const siblings = Object.values(updatedElements).filter(e => e.parentId === newParentId && e.id !== id);
        siblings.sort((a, b) => a.order - b.order);
        siblings.forEach((sibling, index) => {
            const siblingIndex = index >= newOrder ? index + 1 : index;
            if (sibling.order !== siblingIndex) {
                updatedElements[sibling.id] = {
                    ...sibling,
                    order: siblingIndex
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

        // 親が変わった場合は深さを再設定
        if (!isSameParent) {
            updatedElements = setDepthRecursive(updatedElements, updatedElements[id]);
        }

        return withPositionAdjustment(state, () => updatedElements);
    },

    CUT_ELEMENT: state => {
        const selectedElements = Object.values(state.elements).filter(e => e.selected);
        if (selectedElements.length === 0) return state;

        let cutElements: ElementsMap = {};
        let updatedElements = { ...state.elements };

        selectedElements.forEach(selectedElement => {
            const elementsToCut = getSelectedAndChildren(updatedElements, selectedElement);
            Object.values(elementsToCut).forEach(e => {
                elementsToCut[e.id] = { ...e, selected: false };
            });
            cutElements = { ...cutElements, ...elementsToCut };
            updatedElements = deleteElementRecursive(updatedElements, selectedElement);
        });

        copyToClipboard(cutElements);

        return {
            ...state,
            elements: updatedElements
        };
    },

    COPY_ELEMENT: state => handleSelectedElementAction(state, selectedElement => {
        const currentState = state;  // 現在のstateをローカル変数として保存
        const cutElements = getSelectedAndChildren(currentState.elements, selectedElement);
        copyToClipboard(cutElements);
        return {};
    }),

    PASTE_ELEMENT: state => {
        const selectedElements = Object.values(state.elements).filter(e => e.selected);
        if (selectedElements.length !== 1) return state;
        
        const globalCutElements = getGlobalCutElements();
        if (!globalCutElements) return state;

        return handleElementMutation(state, (elements, selectedElement) => {
            const pastedElements = pasteElements(elements, globalCutElements, selectedElement);
            return {
                elements: adjustElementPositions(pastedElements, () => state.numberOfSections)
            };
        });
    },

    EXPAND_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => ({
        elements: adjustElementPositions(setVisibilityRecursive(elements, selectedElement, true), () => state.numberOfSections)
    })),

    COLLAPSE_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => ({
        elements: adjustElementPositions(setVisibilityRecursive(elements, selectedElement, false), () => state.numberOfSections)
    })),
};

export const reducer = (state: State, action: Action): State => {
    const handler = actionHandlers[action.type];
    return handler ? handler(state, action) : state;
};