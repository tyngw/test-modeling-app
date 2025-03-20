// src/state/state.ts
'use client';

import { Undo, Redo, saveSnapshot } from './undoredo';
import { handleArrowUp, handleArrowDown, handleArrowRight, handleArrowLeft } from '../utils/elementSelector';
import { getNumberOfSections } from '../utils/localStorageHelpers';
import { Element } from '../types';
import {
    OFFSET,
    DEFAULT_POSITION,
    SIZE,
} from '../constants/elementSettings';
import { v4 as uuidv4 } from 'uuid';
import { calculateElementWidth, wrapText } from '../utils/textareaHelpers';
import { TEXTAREA_PADDING, DEFAULT_FONT_SIZE, LINE_HEIGHT_RATIO } from '../constants/elementSettings';
import { debugLog } from '../utils/debugLogHelpers';

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
    numSections = getNumberOfSections(),
}: NewElementParams = {}): Element => {
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
        connectionPathType: 'none', // Add default connectionPathType
    };
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
};

const getSelectedAndChildren = (elements: { [key: string]: Element }, targetElement: Element): { [key: string]: Element } => {
    let cutElements: { [key: string]: Element } = {};
    const elementList = Object.values(elements);

    const rootCopy = { ...targetElement, parentId: null };
    cutElements[rootCopy.id] = rootCopy;

    const collectChildren = (parentId: string) => {
        elementList.filter(e => e.parentId === parentId).forEach(child => {
            const childCopy = { ...child };
            cutElements[childCopy.id] = childCopy;
            collectChildren(child.id);
        });
    };

    collectChildren(targetElement.id);
    return cutElements;
};

const pasteElements = (elements: { [key: string]: Element }, cutElements: { [key: string]: Element }, parentElement: Element): { [key: string]: Element } => {
    if (!cutElements) return elements;

    const rootElement = Object.values(cutElements).find(e => e.parentId === null);
    if (!rootElement) return { ...elements, ...cutElements };

    // ルート要素の元の深さを取得
    const rootElementDepth = rootElement.depth;
    // 深さの差分を貼り付け先に基づいて計算
    const depthDelta = parentElement.depth + 1 - rootElementDepth;

    const idMap = new Map<string, string>();
    const newElements: { [key: string]: Element } = {};

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

    // 貼り付け先のchildren更新
    const updatedParent = {
        ...parentElement,
        children: parentElement.children + 1
    };

    return {
        ...elements,
        ...newElements,
        [parentElement.id]: updatedParent
    };
};

const setDepthRecursive = (
    elements: { [key: string]: Element },
    parentElement: Element
): { [key: string]: Element } => {
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

const setVisibilityRecursive = (
    elements: { [key: string]: Element },
    parentElement: Element,
    visible: boolean
): { [key: string]: Element } => {
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

const deleteElementRecursive = (elements: { [key: string]: Element }, deleteElement: Element): { [key: string]: Element } => {
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
): { newY: number; minY: number; maxY: number } => {
    debugLog(`layoutSubtree開始: id=${node.id}, parentId=${node.parentId}, order=${node.order}, 初期y=${node.y}`);
    
    if (node.parentId !== null) {
        node.x = parentX + OFFSET.X;
    }

    const children = getChildren(node.id, elements);
    debugLog(`  子要素数: ${children.length}`);
    
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
        );
        childY = result.newY;
        minY = Math.min(minY, result.minY);
        maxY = Math.max(maxY, result.maxY);
    }

    // 親要素のY位置計算（子要素の中央配置）
    const oldY = node.y;
    if (children.length > 0) {
        const childrenMinY = Math.min(...children.map(child => child.y));
        const childrenMaxY = Math.max(...children.map(child => child.y + child.height));
        const childrenMidpoint = (childrenMinY + childrenMaxY) / 2;
        node.y = childrenMidpoint - (node.height / 2);
        debugLog(`  子要素あり: id=${node.id}, oldY=${oldY}, newY=${node.y}, 子要素範囲=${childrenMinY}~${childrenMaxY}`);
    } else {
        node.y = currentY;
        debugLog(`  子要素なし: id=${node.id}, oldY=${oldY}, newY=${node.y}, currentY=${currentY}`);
    }

    let adjustedY = node.y;
    let collisionFound = true;

    const siblings = node.parentId === null
        ? getChildren(null, elements).filter(e => e.id !== node.id)
        : getChildren(node.parentId, elements).filter(e => e.id !== node.id);

    // order値でソートして、小さいorderの要素から順に処理
    siblings.sort((a, b) => a.order - b.order);

    // 衝突検出ループ前のY座標
    const beforeCollisionY = adjustedY;
    
    while (collisionFound) {
        collisionFound = false;
        for (const elem of siblings) {
            // 自分よりorderが大きい要素との衝突は考慮しない（自分が優先）
            if (node.order <= elem.order) {
                if (checkCollision(node, adjustedY, elem)) {
                    const oldAdjustedY = adjustedY;
                    adjustedY = elem.y + elem.height + OFFSET.Y;
                    collisionFound = true;
                    debugLog(`  衝突検出: id=${node.id}, 衝突相手=${elem.id}, oldY=${oldAdjustedY}, newY=${adjustedY}`);
                    break;
                }
            }
        }
    }

    // 衝突調整により位置変更があった場合
    if (adjustedY !== beforeCollisionY) {
        debugLog(`  衝突調整: id=${node.id}, 調整前=${beforeCollisionY}, 調整後=${adjustedY}`);
    }

    // 衝突回避によってY座標が変更された場合、再度中央配置計算を行う必要があるか確認
    if (adjustedY > node.y && children.length > 0) {
        // 親の位置が下方向に移動した場合、子要素もそれに合わせて移動する必要がある場合がある
        const deltaY = adjustedY - node.y;
        // 閾値を超える移動の場合のみ子要素を再配置（小さな調整は無視）
        if (deltaY > OFFSET.Y) {
            debugLog(`  親移動に伴う子要素移動: id=${node.id}, 移動量=${deltaY}`);
            for (const child of children) {
                const oldChildY = child.y;
                child.y += deltaY;
                debugLog(`    子要素移動: id=${child.id}, oldY=${oldChildY}, newY=${child.y}`);
            }
            // 子要素の移動に伴い、最小Y値と最大Y値も更新
            minY = Math.min(minY, ...children.map(child => child.y));
            maxY = Math.max(maxY, ...children.map(child => child.y + child.height));
        }
    }

    node.y = adjustedY;
    const nodeBottom = node.y + node.height;
    const newY = Math.max(childY, nodeBottom + OFFSET.Y);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y + node.height);

    debugLog(`layoutSubtree終了: id=${node.id}, 最終y=${node.y}, 次Y=${newY}, minY=${minY}, maxY=${maxY}`);
    return { newY, minY, maxY };
};

const checkCollision = (element: Element, y: number, other: Element): boolean => {
    // 同じ親を持つ要素間の衝突検出
    if (element.parentId === other.parentId) {
        // orderが小さい方が上に配置されるべき
        if (element.order < other.order) {
            // 自分のorderが小さい場合は、他の要素より上に配置され、
            // 衝突があっても自分が動くべきではない
            return false;
        } else if (element.order > other.order) {
            // 自分のorderが大きい場合、衝突時は自分が下に移動すべき
            const isCollision = (
                element.x < other.x + other.width &&
                element.x + element.width > other.x &&
                y < other.y + other.height &&
                y + element.height > other.y
            );
            
            if (isCollision) {
                debugLog(`衝突検出: id=${element.id}(order=${element.order})とid=${other.id}(order=${other.order})の間で衝突`);
            }
            
            return isCollision;
        }
    }
    
    // 異なる親に属する要素間の衝突検出(同じdepthの場合のみ)
    if (element.depth === other.depth) {
        // X座標による衝突判定（要素が視覚的に重なる場合のみ）
        const xOverlap = (
            element.x < other.x + other.width &&
            element.x + element.width > other.x
        );
        
        // X座標で重なっている場合のみY座標の衝突を考慮
        if (xOverlap) {
            const isCollision = (
                y < other.y + other.height &&
                y + element.height > other.y
            );
            
            if (isCollision) {
                debugLog(`同じdepthの要素間衝突検出: id=${element.id}(depth=${element.depth})とid=${other.id}(depth=${other.depth})の間で衝突`);
            }
            
            return isCollision;
        }
    }
    
    return false;
};

const adjustElementPositions = (elements: ElementsMap): ElementsMap => {
    debugLog(`adjustElementPositions開始: 要素数=${Object.keys(elements).length}`);
    
    // 新たなオブジェクトを作成して更新する
    const updatedElements = { ...elements };
    const rootElements = getChildren(null, updatedElements)
        .sort((a, b) => a.order - b.order);
    
    debugLog(`ルート要素数: ${rootElements.length}`);
    
    // 初期Y位置を定数から設定（累積を防ぐ）
    let currentY = DEFAULT_POSITION.Y;

    // まず最初にすべてのルート要素を配置
    for (const root of rootElements) {
        // ルート要素のX位置を固定
        root.x = DEFAULT_POSITION.X;
        
        debugLog(`ルート要素配置: id=${root.id}, order=${root.order}, 開始y=${root.y}, currentY=${currentY}`);
        
        // layoutSubtreeを呼び出す前に一時変数を作成して位置を設定
        const result = layoutSubtree(
            root,
            root.x,
            currentY,
            updatedElements,
        );
        
        // 次の要素のY位置を更新
        currentY = result.newY;
        debugLog(`ルート要素配置結果: id=${root.id}, 配置後y=${root.y}, 次Y=${currentY}`);
    }

    // 階層ごとに要素を確認してorder順に並ぶようにする確認処理
    debugLog(`order順序の確認処理開始`);
    let allCorrect = true;
    let iterationCount = 0;
    do {
        iterationCount++;
        allCorrect = true;
        
        // 親IDごとに子要素をグループ化
        const childrenByParent: { [parentId: string]: Element[] } = {};
        Object.values(updatedElements).forEach(element => {
            if (element.parentId) {
                if (!childrenByParent[element.parentId]) {
                    childrenByParent[element.parentId] = [];
                }
                childrenByParent[element.parentId].push(element);
            }
        });
        
        // 各親ごとに子要素のorderとY座標の関係を確認
        Object.entries(childrenByParent).forEach(([parentId, siblings]) => {
            // orderでソート
            siblings.sort((a, b) => a.order - b.order);
            
            // Y座標が順番通りになっているか確認
            for (let i = 1; i < siblings.length; i++) {
                const prev = siblings[i-1];
                const curr = siblings[i];
                
                // 順番が逆転している場合（orderが大きいのにY座標が小さい）
                if (curr.y < prev.y + prev.height) {
                    const oldY = curr.y;
                    // 修正：順番に合わせてY座標を調整
                    curr.y = prev.y + prev.height + OFFSET.Y;
                    allCorrect = false;
                    
                    debugLog(`順序修正: parentId=${parentId}, 前要素id=${prev.id}(order=${prev.order}), 現在要素id=${curr.id}(order=${curr.order}), oldY=${oldY}, newY=${curr.y}`);
                    
                    // この要素の子要素も移動する必要がある
                    if (curr.children > 0) {
                        const childElements = getChildren(curr.id, updatedElements);
                        const deltaY = curr.y - oldY;
                        debugLog(`  子要素も移動: id=${curr.id}の子要素を移動 deltaY=${deltaY}, 子要素数=${childElements.length}`);
                        childElements.forEach(child => {
                            const oldChildY = child.y;
                            child.y += deltaY;
                            debugLog(`    子要素移動: id=${child.id}, oldY=${oldChildY}, newY=${child.y}`);
                        });
                    }
                }
            }
        });
        
        if (!allCorrect) {
            debugLog(`繰り返し修正: ${iterationCount}回目, 修正が必要`);
        }
    } while (!allCorrect && iterationCount < 10); // 無限ループ防止
    
    if (iterationCount >= 10) {
        debugLog(`警告: 最大繰り返し回数に達しました。完全な修正ができていない可能性あり。`);
    }

    // 同じdepthを持つ要素間の衝突を解決
    debugLog(`同じdepthの要素間の衝突チェック開始`);
    let depthCollisionFixed = true;
    iterationCount = 0;
    
    do {
        iterationCount++;
        depthCollisionFixed = true;
        
        // depthごとに要素をグループ化
        const elementsByDepth: { [depth: number]: Element[] } = {};
        Object.values(updatedElements).forEach(element => {
            if (!elementsByDepth[element.depth]) {
                elementsByDepth[element.depth] = [];
            }
            elementsByDepth[element.depth].push(element);
        });
        
        // 各depth内で要素間の衝突を確認・解決
        Object.entries(elementsByDepth).forEach(([depthStr, elementsWithSameDepth]) => {
            // Y座標でソート
            elementsWithSameDepth.sort((a, b) => a.y - b.y);
            
            for (let i = 0; i < elementsWithSameDepth.length; i++) {
                const element = elementsWithSameDepth[i];
                
                for (let j = i + 1; j < elementsWithSameDepth.length; j++) {
                    const other = elementsWithSameDepth[j];
                    
                    // 同じ親を持つ要素はすでに処理済みなのでスキップ
                    if (element.parentId === other.parentId) {
                        continue;
                    }
                    
                    // X座標で重なっているか確認
                    const xOverlap = (
                        element.x < other.x + other.width &&
                        element.x + element.width > other.x
                    );
                    
                    if (xOverlap) {
                        // Y座標で重なっているか確認
                        const yOverlap = (
                            element.y < other.y + other.height &&
                            element.y + element.height > other.y
                        );
                        
                        if (yOverlap) {
                            // 衝突している場合、下の要素をさらに下に移動
                            const oldY = other.y;
                            other.y = element.y + element.height + OFFSET.Y;
                            depthCollisionFixed = false;
                            
                            debugLog(`同じdepthの要素間衝突修正: id=${element.id}(depth=${element.depth})とid=${other.id}(depth=${other.depth})が衝突, ${other.id}を下に移動, oldY=${oldY}, newY=${other.y}`);
                            
                            // 移動した要素の子要素も移動
                            if (other.children > 0) {
                                const childElements = getChildren(other.id, updatedElements);
                                const deltaY = other.y - oldY;
                                debugLog(`  子要素も移動: id=${other.id}の子要素を移動 deltaY=${deltaY}, 子要素数=${childElements.length}`);
                                childElements.forEach(child => {
                                    const oldChildY = child.y;
                                    child.y += deltaY;
                                    debugLog(`    子要素移動: id=${child.id}, oldY=${oldChildY}, newY=${child.y}`);
                                });
                            }
                            
                            // 衝突は一度に1つずつ修正して再処理
                            break;
                        }
                    }
                }
                
                if (!depthCollisionFixed) {
                    break; // 修正があった時点で再処理
                }
            }
        });
        
        if (!depthCollisionFixed) {
            debugLog(`同じdepthの要素間衝突修正: ${iterationCount}回目, 修正が必要`);
        }
    } while (!depthCollisionFixed && iterationCount < 10); // 無限ループ防止
    
    if (iterationCount >= 10) {
        debugLog(`警告: 同じdepthの要素間衝突チェックで最大繰り返し回数に達しました。完全な修正ができていない可能性あり。`);
    }

    debugLog(`親子中央配置の最適化開始`);
    const elementsByDepth = Object.values(updatedElements)
        .sort((a, b) => a.depth - b.depth);

    for (const element of elementsByDepth) {
        if (element.children > 0) {
            const childElements = getChildren(element.id, updatedElements);
            
            if (childElements.length > 0) {
                // 親の中央位置と子要素の中央位置を再確認
                const childrenMinY = Math.min(...childElements.map(child => child.y));
                const childrenMaxY = Math.max(...childElements.map(child => child.y + child.height));
                const childrenCenter = (childrenMinY + childrenMaxY) / 2;
                const elementCenter = element.y + element.height / 2;
                
                debugLog(`親子配置確認: id=${element.id}, 子要素数=${childElements.length}, 範囲=${childrenMinY}~${childrenMaxY}, 中心=${childrenCenter}`);
                
                // 2つの中心点の差が大きい場合、親要素の位置を調整
                if (Math.abs(childrenCenter - elementCenter) > OFFSET.Y / 2) {
                    const oldY = element.y;
                    element.y = childrenCenter - element.height / 2;
                    
                    debugLog(`親子中央配置調整: id=${element.id}, oldY=${oldY}, newY=${element.y}, 子要素中心=${childrenCenter}, 親中心=${elementCenter}`);
                }
            }
        }
    }

    debugLog(`adjustElementPositions終了`);
    return updatedElements;
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
            if (parentElement.id === '10') {
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

const createElementAdder = (
    elements: { [key: string]: Element },
    parentElement: Element,
    text?: string,
    options?: { newElementSelect?: boolean; tentative?: boolean; order?: number; }
): { [key: string]: Element } => {
    const newId = uuidv4();
    const newOrder = options?.order ?? parentElement.children;

    const initialText = text || '';
    const initialTexts = [initialText, ...Array(getNumberOfSections() - 1).fill('')];

    // // 要素の幅を計算
    // const width = calculateElementWidth(initialTexts, TEXTAREA_PADDING.HORIZONTAL);

    // // セクションの高さを計算
    // const sectionHeights = initialTexts.map(() => {
    //     const lines = wrapText(initialText, width, 1).length;
    //     return Math.max(
    //         SIZE.SECTION_HEIGHT,
    //         lines * DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO + TEXTAREA_PADDING.VERTICAL
    //     );
    // });

    // // 全体の高さを計算
    // const height = sectionHeights.reduce((sum, h) => sum + h, 0);

    const newElement = {
        ...createNewElement({
            parentId: parentElement.id,
            order: newOrder,
            depth: parentElement.depth + 1
        }),
        id: newId,
        texts: initialTexts,
        // width,
        // height,
        // sectionHeights,
        width: SIZE.WIDTH.MIN,
        height: SIZE.SECTION_HEIGHT * getNumberOfSections(),
        sectionHeights: Array(getNumberOfSections()).fill(SIZE.SECTION_HEIGHT),
        selected: options?.newElementSelect ?? false,
        editing: options?.newElementSelect ?? false,
        tentative: options?.tentative ?? false,
        connectionPathType: 'none' as 'arrow' | 'none', // Add default connectionPathType
    };

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
    const newElement = createNewElement({ parentId: parentId, order: newOrder, depth: selectedElement.depth });
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

const handleZoomIn = (state: State): State => ({
    ...state,
    zoomRatio: state.zoomRatio + 0.1
});

const handleZoomOut = (state: State): State => ({
    ...state,
    zoomRatio: Math.max(state.zoomRatio - 0.1, 0.1)
});

const actionHandlers: { [key: string]: (state: State, action?: any) => State } = {
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

        const updatedElements = Object.values(state.elements).reduce<{ [key: string]: Element }>((acc, element) => {
            const selected = validSelectedIds.includes(element.id);
            acc[element.id] = {
                ...element,
                selected,
                editing: selected ? element.editing : false,
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
                texts: state.elements[action.payload.id].texts.map((text, idx) =>
                    idx === action.payload.index ? action.payload.value : text
                )
            }
        }
    }),

    ADD_ELEMENT: (state, action) => handleElementMutation(state, (elements, selectedElement) => {
        const text = action.payload?.text;
        const newElements = createElementAdder(elements, selectedElement, text, { newElementSelect: true });
        return { elements: adjustElementPositions(newElements) };
    }),

    ADD_ELEMENTS_SILENT: (state, action) => handleElementMutation(state, (elements, selectedElement) => {
        const texts: string[] = action.payload?.texts || [];
        const add_tentative = action.payload?.tentative || false;

        let newElements = { ...elements };
        const parent = { ...selectedElement };
        const initialChildren = parent.children;

        texts.forEach((text, index) => {
            newElements = createElementAdder(newElements, parent, text, {
                newElementSelect: false,
                tentative: add_tentative,
                order: initialChildren + index
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

        return { elements: adjustElementPositions(newElements) };
    }),

    ADD_SIBLING_ELEMENT: state => handleElementMutation(state, (elements, selectedElement) => {
        const newElements = createSiblingElementAdder(elements, selectedElement);
        return { elements: adjustElementPositions(newElements) };
    }),

    DELETE_ELEMENT: state => {
        const selectedElements = Object.values(state.elements).filter(e => e.selected);
        if (selectedElements.length === 0) return state;

        debugLog(`DELETE_ELEMENT開始: 削除対象要素数=${selectedElements.length}`);
        
        // 削除操作をする前に現在のY座標を記録
        const parentIds = new Set<string>();
        selectedElements.forEach(element => {
            if (element.parentId) {
                parentIds.add(element.parentId);
            }
            debugLog(`削除対象: id=${element.id}, parentId=${element.parentId}, order=${element.order}, y=${element.y}`);
        });

        let updatedElements = { ...state.elements };

        // 削除前の兄弟要素の位置関係を記録
        const siblingsBefore: { [parentId: string]: Element[] } = {};
        parentIds.forEach(parentId => {
            siblingsBefore[parentId] = Object.values(updatedElements)
                .filter(e => e.parentId === parentId)
                .sort((a, b) => a.order - b.order);
            
            debugLog(`削除前の親id=${parentId}の子要素:`, siblingsBefore[parentId].map(e => ({id: e.id, order: e.order, y: e.y})));
        });

        // 要素を削除
        selectedElements.forEach(element => {
            updatedElements = deleteElementRecursive(updatedElements, element);
        });

        // 明示的にY座標をリセットして完全に再配置を行う
        // これにより累積した座標がクリアされる
        Object.values(updatedElements).forEach(element => {
            if (element.parentId === null) {
                const oldY = element.y;
                element.y = DEFAULT_POSITION.Y;
                debugLog(`ルート要素のY座標リセット: id=${element.id}, oldY=${oldY}, newY=${element.y}`);
            }
        });

        // 削除後の親ごとの子要素を確認
        parentIds.forEach(parentId => {
            if (updatedElements[parentId]) {
                const siblingsAfter = Object.values(updatedElements)
                    .filter(e => e.parentId === parentId)
                    .sort((a, b) => a.order - b.order);
                
                debugLog(`削除後の親id=${parentId}の子要素:`, siblingsAfter.map(e => ({id: e.id, order: e.order, y: e.y})));
            }
        });

        // レイアウトを再計算
        debugLog(`レイアウト再計算開始`);
        const adjustedElements = adjustElementPositions(updatedElements);
        debugLog(`レイアウト再計算完了`);

        // 再計算後の親ごとの子要素を確認
        parentIds.forEach(parentId => {
            if (adjustedElements[parentId]) {
                const siblingsAfterLayout = Object.values(adjustedElements)
                    .filter(e => e.parentId === parentId)
                    .sort((a, b) => a.order - b.order);
                
                debugLog(`再計算後の親id=${parentId}の子要素:`, siblingsAfterLayout.map(e => ({id: e.id, order: e.order, y: e.y})));
            }
        });

        return {
            ...state,
            elements: adjustedElements
        };
    },

    EDIT_ELEMENT: state => handleSelectedElementAction(state, selectedElement => ({
        elements: {
            ...state.elements,
            [selectedElement.id]: { ...selectedElement, editing: true }
        }
    })),

    END_EDITING: state => ({
        ...state,
        elements: Object.values(state.elements).reduce<{ [key: string]: Element }>((acc, element) => {
            acc[element.id] = { ...element, editing: false };
            return acc;
        }, {}
        )
    }),

    CONFIRM_TENTATIVE_ELEMENTS: (state, action) => ({
        ...state,
        elements: Object.values(state.elements).reduce<{ [key: string]: Element }>((acc, element) => {
            if (element.parentId === action.payload && element.tentative) {
                acc[element.id] = { ...element, tentative: false };
            } else {
                acc[element.id] = element;
            }
            return acc;
        }, {})
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
        }, {} as { [key: string]: Element });

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
            elements: adjustElementPositions(updatedElements)
        };
    },

    UNDO: state => ({
        ...state,
        elements: adjustElementPositions(Undo(state.elements))
    }),
    REDO: state => ({
        ...state,
        elements: adjustElementPositions(Redo(state.elements))
    }),
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

        if (!isSameParent && newParent) {
            updatedElements[newParentId] = {
                ...newParent,
                children: newParent.children + 1
            };
        }

        if (!isSameParent) {
            updatedElements = setDepthRecursive(updatedElements, updatedElements[id]);
        }

        return {
            ...state,
            elements: adjustElementPositions(updatedElements)
        };
    },

    MOVE_ELEMENT: (state, action) => {
        const { id, x, y } = action.payload;
        const selectedElements = Object.values(state.elements).filter(e => e.selected);

        // 複数要素移動の場合
        if (selectedElements.length > 1 && selectedElements.some(e => e.id === id)) {
            const deltaX = x - state.elements[id].x;
            const deltaY = y - state.elements[id].y;

            const updatedElements = { ...state.elements };
            selectedElements.forEach(element => {
                updatedElements[element.id] = {
                    ...element,
                    x: element.x + deltaX,
                    y: element.y + deltaY,
                };
            });
            return { ...state, elements: updatedElements };
        }

        // 単一要素移動
        return {
            ...state,
            elements: {
                ...state.elements,
                [id]: {
                    ...state.elements[id],
                    x,
                    y
                }
            }
        };
    },

    CUT_ELEMENT: state => {
        const selectedElements = Object.values(state.elements).filter(e => e.selected);
        if (selectedElements.length === 0) return state;

        let cutElements: { [key: string]: Element } = {};
        let updatedElements = { ...state.elements };

        selectedElements.forEach(selectedElement => {
            const elementsToCut = getSelectedAndChildren(updatedElements, selectedElement);
            Object.values(elementsToCut).forEach(e => {
                elementsToCut[e.id] = { ...e, selected: false };
            });
            cutElements = { ...cutElements, ...elementsToCut };
            updatedElements = deleteElementRecursive(updatedElements, selectedElement);
        });

        return {
            ...state,
        };
    },

    COPY_ELEMENT: state => handleSelectedElementAction(state, selectedElement => ({
        cutElements: getSelectedAndChildren(state.elements, selectedElement)
    })),

    PASTE_ELEMENT: state => {
        const selectedElements = Object.values(state.elements).filter(e => e.selected);
        if (selectedElements.length !== 1 || !state.cutElements) return state;

        return handleElementMutation(state, (elements, selectedElement) => {
            const pastedElements = pasteElements(elements, state.cutElements!, selectedElement);
            return {
                elements: adjustElementPositions(pastedElements)
            };
        });
    },

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
            sectionHeights: action.payload.sectionHeights
        };

        return {
            ...state,
            elements: adjustElementPositions({
                ...state.elements,
                [action.payload.id]: updatedElement
            })
        };
    },
    UPDATE_CONNECTION_PATH_TYPE: (state, action) => {
        const { id, connectionPathType } = action.payload;
        const updatedElement = {
            ...state.elements[id],
            connectionPathType
        };
        return {
            ...state,
            elements: {
                ...state.elements,
                [id]: updatedElement
            }
        };
    },
};
function handleArrowAction(handler: (elements: Record<string, Element>) => string | undefined): (state: State) => State {
    return state => {
        const selectedElements = Object.values(state.elements).filter(e => e.selected);
        if (selectedElements.length > 1) {
            const firstId = selectedElements[0].id;
            const updatedElements = Object.values(state.elements).reduce<{ [key: string]: Element }>((acc, element) => {
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