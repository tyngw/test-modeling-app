// src/utils/elementHelpers.ts
import { Element } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getMarkerType } from './localStorageHelpers';
import { SIZE, NUMBER_OF_SECTIONS } from '../constants/elementSettings';
import { debugLog } from './debugLogHelpers';
import { MarkerType } from '../types';

export type ElementsMap = { [key: string]: Element };

export interface NewElementParams {
    parentId?: string | null;
    order?: number;
    depth?: number;
    numSections?: number;
}

export const createNewElement = ({
    parentId = null,
    order = 0,
    depth = 1,
    numSections = NUMBER_OF_SECTIONS,
}: NewElementParams = {}): Element => {
    const markerType = getMarkerType();
    
    return {
        id: uuidv4(),
        texts: Array(numSections).fill(''),
        x: 0,
        y: 0,
        width: SIZE.WIDTH.MIN,
        height: SIZE.SECTION_HEIGHT * numSections,
        sectionHeights: Array(numSections).fill(SIZE.SECTION_HEIGHT),
        parentId,
        order,
        depth,
        children: 0,
        editing: true,
        selected: true,
        visible: true,
        tentative: false,
        startMarker: markerType as MarkerType,
        endMarker: 'none' as MarkerType,
    };
};

export const getChildren = (parentId: string | null, elements: ElementsMap): Element[] => {
    return Object.values(elements)
        .filter(e => e.parentId === parentId && e.visible)
        .sort((a, b) => a.order - b.order);
};

export const setDepthRecursive = (
    elements: ElementsMap,
    parentElement: Element
): ElementsMap => {
    const updatedElements = { ...elements };
    const childMap: { [parentId: string]: Element[] } = {};
    Object.values(updatedElements).forEach(el => {
        const pId = el.parentId;
        if (pId) {
            if (!childMap[pId]) {
                childMap[pId] = [];
            }
            childMap[pId].push(el);
        }
    });

    const processChildren = (parentId: string) => {
        const children = childMap[parentId] || [];
        children.forEach(child => {
            updatedElements[child.id] = {
                ...child,
                depth: updatedElements[parentId].depth + 1
            };
            processChildren(child.id);
        });
    };
    processChildren(parentElement.id);
    return updatedElements;
};

export const setVisibilityRecursive = (
    elements: ElementsMap,
    parentElement: Element,
    visible: boolean
): ElementsMap => {
    const updatedElements = { ...elements };
    const childMap: { [parentId: string]: Element[] } = {};
    Object.values(updatedElements).forEach(el => {
        const pId = el.parentId;
        if (pId) {
            if (!childMap[pId]) {
                childMap[pId] = [];
            }
            childMap[pId].push(el);
        }
    });

    const processChildren = (parentId: string) => {
        const children = childMap[parentId] || [];
        children.forEach(child => {
            updatedElements[child.id] = { ...child, visible };
            processChildren(child.id);
        });
    };
    processChildren(parentElement.id);
    return updatedElements;
};

export const deleteElementRecursive = (elements: ElementsMap, deleteElement: Element): ElementsMap => {
    if (deleteElement.parentId === null) return elements;

    debugLog(`deleteElementRecursive: 削除開始 id=${deleteElement.id}, order=${deleteElement.order}, y=${deleteElement.y}`);

    const updatedElements = { ...elements };
    const parent = updatedElements[deleteElement.parentId];
    if (!parent) return updatedElements;

    // 削除要素の位置情報を記録（後で兄弟要素の位置を調整するため）
    const deletedElementPosition = {
        order: deleteElement.order,
        y: deleteElement.y,
        height: deleteElement.height
    };
    debugLog(`削除要素の位置情報:`, deletedElementPosition);

    // 子要素を含めて削除
    const deleteChildren = (parentId: string) => {
        const children = Object.values(updatedElements).filter(n => n.parentId === parentId);
        children.forEach(child => {
            debugLog(`  子要素を削除: id=${child.id}, y=${child.y}`);
            delete updatedElements[child.id];
            deleteChildren(child.id);
        });
    };

    delete updatedElements[deleteElement.id];
    deleteChildren(deleteElement.id);

    // 親のchildren数を更新
    updatedElements[parent.id] = {
        ...parent,
        children: parent.children - 1
    };
    debugLog(`親要素を更新: id=${parent.id}, children=${parent.children-1}, y=${parent.y}`);

    // 同じparentIdを持つ要素のorderを再計算
    const siblings = Object.values(updatedElements)
        .filter(n => n.parentId === parent.id)
        .sort((a, b) => a.order - b.order);

    debugLog(`兄弟要素の数: ${siblings.length}`);
    // まずorderを更新
    siblings.forEach((sibling, index) => {
        if (sibling.order !== index) {
            debugLog(`  兄弟要素のorder更新: id=${sibling.id}, old=${sibling.order}, new=${index}, y=${sibling.y}`);
            updatedElements[sibling.id] = {
                ...sibling,
                order: index
            };
        }
    });

    return updatedElements;
};

export const isDescendant = (elements: ElementsMap, ancestorId: string, descendantId: string): boolean => {
    // ある要素(ancestorId)が別の要素(descendantId)の祖先かどうかをチェック
    // つまり、descendantIdからparentIdを辿っていって、ancestorIdに到達するかどうか
    let currentId: string | null = descendantId;
    
    while (currentId !== null) {
        if (currentId === ancestorId) {
            return true;
        }
        currentId = elements[currentId]?.parentId ?? null;
    }
    
    return false;
};

export const formatElementsForPrompt = (elements: { [key: string]: any }, selectedElementId: string): string => {
    // 型定義を明確化
    type ElementInfo = {
        id: string;
        text: string;
        parentId: string | null;
        depth: number;
    };

    const elementMap: { [key: string]: ElementInfo } = {};

    // 要素情報のマッピング
    Object.values(elements).forEach((element: any) => {
        elementMap[element.id] = {
            id: element.id, // idを明示的に追加
            text: element.texts[0] || '',
            parentId: element.parentId,
            depth: element.depth
        };
    });

    // ツリー構築関数
    const buildTree = (parentId: string | null, depth: number): string[] => {
        return Object.values(elementMap)
            .filter((e): e is ElementInfo => e.parentId === parentId)
            .sort((a, b) => a.depth - b.depth)
            .flatMap(element => {
                const indent = '  '.repeat(element.depth - 1);
                const node = `${indent}- ${element.text}${element.id === selectedElementId ? ' (selected)' : ''}`;
                const children = buildTree(element.id, depth + 1);
                return [node, ...children];
            });
    };

    return buildTree(null, 0).join('\n');
};