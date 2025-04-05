// src/utils/stateHelpers.ts
'use client';

import { v4 as uuidv4 } from 'uuid';
import { ElementsMap, createNewElement, isDescendant, setDepthRecursive, setVisibilityRecursive, deleteElementRecursive } from './elementHelpers';
import { Element } from '../types/types';
import { State } from '../state/state';
import { adjustElementPositions } from '../utils/layoutHelpers';

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

/**
 * 指定されたIDの要素のプロパティを更新する
 */
export function updateElementProperty<K extends keyof Element>(
    elements: ElementsMap,
    elementId: string,
    propertyKey: K,
    propertyValue: Element[K]
): ElementsMap {
    return {
        ...elements,
        [elementId]: {
            ...elements[elementId],
            [propertyKey]: propertyValue
        }
    };
}

/**
 * 複数の要素のプロパティを一括で更新する
 */
export function updateMultipleElements(
    elements: ElementsMap,
    updates: { id: string; properties: Partial<Element> }[]
): ElementsMap {
    const updatedElements = { ...elements };
    
    updates.forEach(update => {
        if (updatedElements[update.id]) {
            updatedElements[update.id] = {
                ...updatedElements[update.id],
                ...update.properties
            };
        }
    });
    
    return updatedElements;
}

/**
 * すべての要素に対して特定の条件を満たすものだけプロパティを更新する
 */
export function updateElementsByCondition(
    elements: ElementsMap,
    condition: (element: Element) => boolean,
    updater: (element: Element) => Partial<Element>
): ElementsMap {
    return Object.values(elements).reduce<ElementsMap>((acc, element) => {
        if (condition(element)) {
            acc[element.id] = { ...element, ...updater(element) };
        } else {
            acc[element.id] = element;
        }
        return acc;
    }, {});
}

/**
 * 全要素の選択状態を解除する
 */
export function deselectAllElements(elements: ElementsMap): ElementsMap {
    return updateElementsByCondition(
        elements,
        () => true,
        () => ({ selected: false, editing: false })
    );
}

/**
 * 要素の移動を処理する関数
 */
export function handleElementMove(
    elements: ElementsMap,
    movingElementId: string,
    newX: number,
    newY: number
): ElementsMap {
    const movingElement = elements[movingElementId];
    if (!movingElement) return elements;

    const selectedElements = Object.values(elements).filter(e => e.selected);

    // 複数要素移動の場合
    if (selectedElements.length > 1 && selectedElements.some(e => e.id === movingElementId)) {
        const deltaX = newX - movingElement.x;
        const deltaY = newY - movingElement.y;
        
        return updateElementsByCondition(
            elements,
            (element) => element.selected,
            (element) => ({
                x: element.x + deltaX,
                y: element.y + deltaY
            })
        );
    }

    // 単一要素移動（パイプライン演算子を使わないよう修正）
    const updatedWithX = updateElementProperty(elements, movingElementId, 'x', newX);
    return updateElementProperty(updatedWithX, movingElementId, 'y', newY);
}

/**
 * 要素サイズの更新を処理する関数
 */
export function handleElementSizeUpdate(
    state: State,
    elementId: string,
    width: number,
    height: number,
    sectionHeights: number[]
): State {
    const updatedElements = updateMultipleElements(state.elements, [{
        id: elementId,
        properties: { width, height, sectionHeights }
    }]);
    
    return {
        ...state,
        elements: adjustElementPositions(updatedElements, () => state.numberOfSections)
    };
}

/**
 * 要素のテキスト更新を処理する関数
 */
export function handleTextUpdate(
    elements: ElementsMap,
    elementId: string,
    textIndex: number,
    newText: string
): ElementsMap {
    const element = elements[elementId];
    if (!element) return elements;
    
    const updatedTexts = [...element.texts];
    updatedTexts[textIndex] = newText;
    
    return updateElementProperty(elements, elementId, 'texts', updatedTexts);
}

/**
 * 要素のロード処理を行う関数
 */
export function handleElementsLoad(state: State, loadedElements: any): State {
    if (!loadedElements || Object.keys(loadedElements).length === 0) {
        // initialStateプロパティが存在しない場合の対処
        return state;
    }
    
    const updatedElements = Object.values(loadedElements).reduce<ElementsMap>((acc, element: unknown) => {
        const el = element as Element;
        acc[el.id] = el.parentId === null ? { ...el, visible: true } : el;
        return acc;
    }, {});
    
    return {
        ...state,
        elements: adjustElementPositions(updatedElements, () => state.numberOfSections)
    };
}

/**
 * 要素ドロップ処理のヘルパー関数
 */
export function handleElementDrop(
    elements: ElementsMap,
    id: string,
    oldParentId: string | null,
    newParentId: string | null,
    newOrder: number,
    depth: number
): ElementsMap {
    if (id === newParentId || (newParentId !== null && isDescendant(elements, id, newParentId))) {
        return elements;
    }
    
    let updatedElements = { ...elements };
    const element = updatedElements[id];
    const oldParent = oldParentId ? updatedElements[oldParentId] : null;
    const newParent = newParentId ? updatedElements[newParentId] : null;
    
    const isSameParent = oldParentId === newParentId;
    
    // 古い親のchildren更新（異なる親の場合のみ）
    if (!isSameParent && oldParent && oldParentId !== null) {
        updatedElements[oldParentId] = {
            ...oldParent,
            children: Math.max(0, oldParent.children - 1)
        };
        
        // 古い親の子要素のorderを再計算
        const oldSiblings = Object.values(updatedElements)
            .filter(e => e.parentId === oldParentId && e.id !== id)
            .sort((a, b) => a.order - b.order);
        
        oldSiblings.forEach((sibling, index) => {
            if (sibling.order !== index) {
                updatedElements[sibling.id] = {
                    ...sibling,
                    order: index
                };
            }
        });
    }
    
    updatedElements[id] = {
        ...element,
        parentId: newParentId,
        order: newOrder,
        depth: depth,
    };
    
    const siblings = Object.values(updatedElements)
        .filter(e => e.parentId === newParentId && e.id !== id)
        .sort((a, b) => a.order - b.order);
    
    const newSiblings = [
        ...siblings.slice(0, newOrder),
        updatedElements[id],
        ...siblings.slice(newOrder)
    ];
    
    newSiblings.forEach((sibling, index) => {
        if (sibling.order !== index) {
            updatedElements[sibling.id] = {
                ...sibling,
                order: index
            };
        }
    });
    
    if (!isSameParent && newParent && newParentId !== null) {
        updatedElements[newParentId] = {
            ...newParent,
            children: newParent.children + 1
        };
    }
    
    if (!isSameParent) {
        updatedElements = setDepthRecursive(updatedElements, updatedElements[id]);
    }
    
    return updatedElements;
}