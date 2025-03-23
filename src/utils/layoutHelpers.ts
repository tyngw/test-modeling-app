import { Element } from '../types';
import { OFFSET, DEFAULT_POSITION } from '../constants/elementSettings';
import { debugLog } from './debugLogHelpers';
import { getChildren } from './elementHelpers';

type ElementsMap = { [key: string]: Element };

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

export const adjustElementPositions = (elements: ElementsMap): ElementsMap => {
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

    // 親子中央配置の最適化
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