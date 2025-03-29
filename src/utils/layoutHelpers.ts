import { Element } from '../types';
import { OFFSET, DEFAULT_POSITION } from '../constants/elementSettings';
import { debugLog } from './debugLogHelpers';
import { getChildren } from './elementHelpers';

type ElementsMap = { [key: string]: Element };

const layoutNode = (
    node: Element,
    elements: ElementsMap,
    startY: number,
    depth: number
): { newY: number; subtreeBottom: number } => {
    // X座標の計算
    if (node.parentId === null) {
        node.x = DEFAULT_POSITION.X;
    } else {
        const parent = elements[node.parentId];
        node.x = parent.x + parent.width + OFFSET.X;
    }

    const children = getChildren(node.id, elements).sort((a, b) => a.order - b.order);
    let currentY = startY;
    let maxSubtreeBottom = startY;
    let maxChildBottom = startY;

    if (children.length > 0) {
        // 子要素の配置とサブツリー情報の収集
        for (const child of children) {
            const result = layoutNode(child, elements, currentY, depth + 1);
            
            // 子要素の下端とサブツリー下端を追跡
            maxChildBottom = Math.max(maxChildBottom, child.y + child.height);
            maxSubtreeBottom = Math.max(maxSubtreeBottom, result.subtreeBottom);
            
            currentY = result.newY + OFFSET.Y;
        }

        // 親要素のY座標計算（子要素の中央配置）
        const childrenMidY = (children[0].y + (children[children.length - 1].y + children[children.length - 1].height)) / 2;
        node.y = childrenMidY - node.height / 2;

        // 有効下端の計算（子要素のサブツリー下端と親要素自身の下端の最大値）
        const parentBottom = node.y + node.height;
        const effectiveBottom = Math.max(maxSubtreeBottom, parentBottom);

        return {
            newY: effectiveBottom + OFFSET.Y,
            subtreeBottom: effectiveBottom
        };
    } else {
        node.y = startY;
        const bottom = node.y + node.height;
        return {
            newY: bottom + OFFSET.Y,
            subtreeBottom: bottom
        };
    }
};

export const adjustElementPositions = (elements: ElementsMap): ElementsMap => {
    debugLog(`adjustElementPositions開始: 要素数=${Object.keys(elements).length}`);
    
    const updatedElements = { ...elements };
    const rootElements = getChildren(null, updatedElements).sort((a, b) => a.order - b.order);
    
    let currentY = DEFAULT_POSITION.Y;

    // ルート要素を順番に配置
    for (const root of rootElements) {
        const result = layoutNode(root, updatedElements, currentY, 0);
        currentY = result.newY;
    }

    debugLog(`adjustElementPositions終了`);
    return updatedElements;
};