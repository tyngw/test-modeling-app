// src/utils/stateHelpers.ts
'use client';

import { v4 as uuidv4 } from 'uuid';
import { ElementsMap, createNewElement, isDescendant, setDepthRecursive, setVisibilityRecursive, deleteElementRecursive } from './elementHelpers';
import { Element } from '../types/types';
import { State } from '../state/state';

export const createElementAdder = (
    elements: ElementsMap,
    parentElement: Element,
    text?: string,
    options?: { 
        newElementSelect?: boolean; 
        tentative?: boolean; 
        order?: number; 
        numberOfSections?: number; 
    }
): ElementsMap => {
    const newElement = createNewElement({
        parentId: parentElement.id,
        order: options?.order ?? parentElement.children,
        depth: parentElement.depth + 1,
        numSections: options?.numberOfSections
    });

    if (text) {
        newElement.texts[0] = text;
    }

    if (options?.newElementSelect !== undefined) {
        newElement.selected = options.newElementSelect;
        newElement.editing = options.newElementSelect;
    }

    if (options?.tentative !== undefined) {
        newElement.tentative = options.tentative;
    }

    const updatedParentElement = {
        ...parentElement,
        children: parentElement.children + 1,
        selected: options?.newElementSelect ? false : parentElement.selected
    };

    return {
        ...elements,
        [parentElement.id]: updatedParentElement,
        [newElement.id]: newElement
    };
};

export const createSiblingElementAdder = (elements: ElementsMap, selectedElement: Element, numberOfSections?: number): ElementsMap => {
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
    const newElement = createNewElement({
        parentId: parentId,
        order: newOrder,
        depth: selectedElement.depth,
        numSections: numberOfSections
    });
    updatedElements[selectedElement.id] = { ...selectedElement, selected: false };
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

export const pasteElements = (elements: ElementsMap, cutElements: ElementsMap, parentElement: Element): ElementsMap => {
    if (!cutElements) return elements;

    const rootElement = Object.values(cutElements).find(e => e.parentId === null);
    if (!rootElement) return { ...elements, ...cutElements };

    // ルート要素の元の深さを取得
    const rootElementDepth = rootElement.depth;
    // 深さの差分を貼り付け先に基づいて計算
    const depthDelta = parentElement.depth + 1 - rootElementDepth;

    const idMap = new Map<string, string>();
    const newElements: ElementsMap = {};

    Object.values(cutElements).forEach(cutElement => {
        const newId = uuidv4();
        idMap.set(cutElement.id, newId);

        const newDepth = cutElement.depth + depthDelta;

        newElements[newId] = {
            ...cutElement,
            id: newId,
            depth: newDepth,
            parentId: cutElement.parentId === null
                ? parentElement.id
                : idMap.get(cutElement.parentId)!,
            order: cutElement.parentId === null
                ? parentElement.children
                : cutElement.order
        };
    });

    // Set the root element of pasted content as selected, and deselect the parent
    const pastedRootElementId = idMap.get(rootElement.id)!;
    newElements[pastedRootElementId].selected = true;
    const updatedParent = {
        ...parentElement,
        children: parentElement.children + 1,
        selected: false
    };

    return {
        ...elements,
        ...newElements,
        [parentElement.id]: updatedParent
    };
};

export function handleArrowAction(handler: (elements: ElementsMap) => string | undefined): (state: State) => State {
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

export function handleElementMutation(state: State, mutationFn: (elements: ElementsMap, selectedElement: Element) => { elements: ElementsMap }): State {
    const selectedElement = Object.values(state.elements).find(element => element.selected);
    if (!selectedElement) return state;

    const { saveSnapshot } = require('../state/undoredo');
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

export function handleSelectedElementAction(state: State, actionFn: (selectedElement: Element) => Partial<State>): State {
    const selectedElement = Object.values(state.elements).find(element => element.selected);
    return selectedElement ? { ...state, ...actionFn(selectedElement) } : state;
}

export const handleZoomIn = (state: State): State => ({
    ...state,
    zoomRatio: state.zoomRatio + 0.1
});

export const handleZoomOut = (state: State): State => ({
    ...state,
    zoomRatio: Math.max(state.zoomRatio - 0.1, 0.1)
});