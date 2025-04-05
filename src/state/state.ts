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
    ElementsMap,
    NewElementParams
} from '../utils/elementHelpers';
import { adjustElementPositions } from '../utils/layoutHelpers';
import { getSelectedAndChildren, copyToClipboard, getGlobalCutElements } from '../utils/clipboardHelpers';
import {
    createElementAdder,
    createSiblingElementAdder,
    pasteElements,
    handleArrowAction,
    handleElementMutation,
    handleSelectedElementAction,
    handleZoomIn,
    handleZoomOut,
    updateElementProperty,
    updateMultipleElements,
    updateElementsByCondition,
    deselectAllElements,
    handleElementMove,
    handleElementSizeUpdate,
    handleTextUpdate,
    handleElementsLoad,
    handleElementDrop
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

const actionHandlers: { [key: string]: (state: State, action?: any) => State } = {
    ZOOM_IN: handleZoomIn,
    ZOOM_OUT: handleZoomOut,

    ARROW_UP: handleArrowAction(handleArrowUp),
    ARROW_DOWN: handleArrowAction(handleArrowDown),
    ARROW_RIGHT: handleArrowAction(handleArrowRight),
    ARROW_LEFT: handleArrowAction(handleArrowLeft),

    LOAD_ELEMENTS: (state, action) => handleElementsLoad(state, action.payload),

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

        return {
            ...state,
            elements: updateElementsByCondition(
                state.elements,
                (element) => true,
                (element) => ({
                    selected: validSelectedIds.includes(element.id),
                    editing: validSelectedIds.includes(element.id) ? element.editing : false
                })
            )
        };
    },

    DESELECT_ALL: state => ({
        ...state,
        elements: deselectAllElements(state.elements)
    }),

    UPDATE_TEXT: (state, action) => ({
        ...state,
        elements: handleTextUpdate(
            state.elements,
            action.payload.id,
            action.payload.index,
            action.payload.value
        )
    }),

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
        const texts: string[] = action.payload?.texts || [];
        const add_tentative = action.payload?.tentative || false;
        const numberOfSections = state.numberOfSections;
        
        let newElements = { ...elements };
        const parent = { ...selectedElement };
        const initialChildren = parent.children;

        texts.forEach((text, index) => {
            newElements = createElementAdder(newElements, parent, text, {
                newElementSelect: false,
                tentative: add_tentative,
                order: initialChildren + index,
                numberOfSections
            });
        });

        // 親のchildrenを一括更新
        newElements[parent.id] = {
            ...parent,
            children: initialChildren + texts.length
        };

        // 幅を自動調整
        Object.values(newElements).forEach(element => {
            if (element.parentId === parent.id) {
                const newWidth = calculateElementWidth(element.texts, TEXTAREA_PADDING.HORIZONTAL);
                const sectionHeights = element.texts.map(text => {
                    const lines = wrapText(text || '', newWidth, state.zoomRatio).length;
                    return Math.max(
                        SIZE.SECTION_HEIGHT * state.zoomRatio,
                        lines * DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO + TEXTAREA_PADDING.VERTICAL * state.zoomRatio
                    );
                });
                newElements[element.id] = {
                    ...element,
                    width: newWidth,
                    height: sectionHeights.reduce((sum, h) => sum + h, 0),
                    sectionHeights
                };
            }
        });

        return {
            elements: adjustElementPositions(newElements, () => state.numberOfSections)
        };
    }),

    ADD_SIBLING_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => {
        const numberOfSections = state.numberOfSections;
        const newElements = createSiblingElementAdder(elements, selectedElement, numberOfSections);
        return { elements: adjustElementPositions(newElements, () => state.numberOfSections) };
    }),

    DELETE_ELEMENT: state => {
        const selectedElements = Object.values(state.elements).filter(e => e.selected);
        if (selectedElements.length === 0) return state;

        debugLog(`DELETE_ELEMENT開始: 削除対象要素数=${selectedElements.length}`);
        
        // 削除操作をする前に、削除後に選択する要素の候補を探す
        let remainingElements = { ...state.elements };
        const nextSelectedId = (() => {
            // すべての選択された要素の親IDを収集
            const parentIds = new Set(selectedElements.map(e => e.parentId).filter(id => id !== null));
            
            // 最初の選択要素の情報を基に兄弟要素を探す
            const firstSelected = selectedElements[0];
            if (!firstSelected.parentId) return null;

            // 兄弟要素の取得（選択されている要素を除く）
            const siblings = Object.values(remainingElements)
                .filter(e => 
                    e.parentId === firstSelected.parentId && 
                    !selectedElements.some(sel => sel.id === e.id)
                )
                .sort((a, b) => a.order - b.order);

            // 兄弟要素がある場合
            if (siblings.length > 0) {
                // 削除する要素の中で最小のorderを持つ要素の直前か直後の要素を選択
                const minOrder = Math.min(...selectedElements.map(e => e.order));
                const maxOrder = Math.max(...selectedElements.map(e => e.order));
                
                // 直後の要素を優先的に選択
                const nextSibling = siblings.find(s => s.order > maxOrder);
                if (nextSibling) return nextSibling.id;
                
                // 直後の要素がない場合は直前の要素を選択
                const prevSibling = siblings.reverse().find(s => s.order < minOrder);
                if (prevSibling) return prevSibling.id;
            }

            // 兄弟要素がない場合は親要素を選択
            return firstSelected.parentId;
        })();
        
        // 要素を削除
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
        const updatedElements = updateElementsByCondition(
            remainingElements,
            () => true,
            (element) => ({ selected: element.id === nextSelectedId })
        );

        return {
            ...state,
            elements: adjustElementPositions(updatedElements, () => state.numberOfSections)
        };
    },

    EDIT_ELEMENT: state => handleSelectedElementAction(state, selectedElement => ({
        elements: updateElementProperty(state.elements, selectedElement.id, 'editing', true)
    })),

    END_EDITING: state => ({
        ...state,
        elements: updateElementsByCondition(
            state.elements,
            () => true,
            () => ({ editing: false })
        )
    }),

    CONFIRM_TENTATIVE_ELEMENTS: (state, action) => ({
        ...state,
        elements: updateElementsByCondition(
            state.elements,
            (element) => element.parentId === action.payload && element.tentative,
            () => ({ tentative: false })
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

        return {
            ...state,
            elements: adjustElementPositions(updatedElements, () => state.numberOfSections)
        };
    },

    UNDO: state => ({
        ...state,
        elements: adjustElementPositions(Undo(state.elements), () => state.numberOfSections)
    }),
    REDO: state => ({
        ...state,
        elements: adjustElementPositions(Redo(state.elements), () => state.numberOfSections)
    }),
    SNAPSHOT: state => { saveSnapshot(state.elements); return state; },

    DROP_ELEMENT: (state, action) => {
        const { payload } = action;
        const { id, oldParentId, newParentId, newOrder, depth } = payload;
        
        const updatedElements = handleElementDrop(
            state.elements,
            id,
            oldParentId,
            newParentId,
            newOrder,
            depth
        );
        
        return {
            ...state,
            elements: adjustElementPositions(updatedElements, () => state.numberOfSections)
        };
    },

    MOVE_ELEMENT: (state, action) => {
        const { id, x, y } = action.payload;
        return {
            ...state,
            elements: handleElementMove(state.elements, id, x, y)
        };
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
        const cutElements = getSelectedAndChildren(state.elements, selectedElement);
        copyToClipboard(cutElements);
        return {}; // No longer need to return cutElements to state
    }),

    PASTE_ELEMENT: state => {
        const selectedElements = Object.values(state.elements).filter(e => e.selected);
        if (selectedElements.length !== 1) return state;
        
        // Get the cut elements from global storage instead of state
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

    UPDATE_ELEMENT_SIZE: (state, action) => 
        handleElementSizeUpdate(
            state,
            action.payload.id,
            action.payload.width,
            action.payload.height,
            action.payload.sectionHeights
        ),

    UPDATE_CONNECTION_PATH_TYPE: (state, action) => ({
        ...state,
        elements: updateElementProperty(
            state.elements,
            action.payload.id,
            'startMarker',
            action.payload.connectionPathType
        )
    }),

    UPDATE_END_CONNECTION_PATH_TYPE: (state, action) => ({
        ...state,
        elements: updateElementProperty(
            state.elements,
            action.payload.id,
            'endMarker',
            action.payload.endConnectionPathType
        )
    }),

    UPDATE_START_MARKER: (state, action) => ({
        ...state,
        elements: updateElementProperty(
            state.elements,
            action.payload.id,
            'startMarker',
            action.payload.startMarker
        )
    }),

    UPDATE_END_MARKER: (state, action) => ({
        ...state,
        elements: updateElementProperty(
            state.elements,
            action.payload.id,
            'endMarker',
            action.payload.endMarker
        )
    }),
};

export const reducer = (state: State, action: Action): State => {
    const handler = actionHandlers[action.type];
    return handler ? handler(state, action) : state;
};