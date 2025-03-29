import { Element } from '../types';
import { OFFSET, DEFAULT_POSITION, SIZE } from '../constants/elementSettings';
import { debugLog } from './debugLogHelpers';
import { getChildren } from './elementHelpers';

type ElementsMap = { [key: string]: Element };

const layoutNode = (
    node: Element,
    elements: ElementsMap,
    startY: number,
    depth: number,
    getNumberOfSections: () => number
): { newY: number } => {
    // X座標の計算
    if (node.parentId === null) {
        node.x = DEFAULT_POSITION.X;
    } else {
        const parent = elements[node.parentId];
        node.x = parent.x + parent.width + OFFSET.X;
    }

    const children = getChildren(node.id, elements).sort((a, b) => a.order - b.order);
    let currentY = startY;
    let maxChildBottom = startY;

    if (children.length > 0) {
        // 子要素ありの場合の処理
        const defaultHeight = SIZE.SECTION_HEIGHT * getNumberOfSections();
        const requiredOffset = node.height * 0.5 - defaultHeight;
        currentY = currentY + requiredOffset;

        for (const child of children) {
            const result = layoutNode(child, elements, currentY, depth + 1, getNumberOfSections);
            currentY = result.newY + OFFSET.Y;
            maxChildBottom = Math.max(maxChildBottom, child.y + child.height);
        }

        // 親要素のY座標計算
        const firstChild = children[0];
        const lastChild = children[children.length - 1];
        const childrenMidY = (firstChild.y + (lastChild.y + lastChild.height)) / 2;
        node.y = childrenMidY - node.height / 2;

        // 下端比較
        const parentBottom = node.y + node.height;
        currentY = Math.max(maxChildBottom, parentBottom) + OFFSET.Y;
        
        return { newY: currentY };
    } else {
        // 子要素なしの場合の処理
        node.y = startY;
        currentY = node.y + node.height + OFFSET.Y;
        // 子要素なしの場合は追加オフセットなし
        return { newY: currentY };
    }
};

export const adjustElementPositions = (
    elements: ElementsMap,
    getNumberOfSections: () => number
): ElementsMap => {
    debugLog(`adjustElementPositions開始: 要素数=${Object.keys(elements).length}`);
    
    const updatedElements = { ...elements };
    const rootElements = getChildren(null, updatedElements)
        .sort((a, b) => a.order - b.order);
    
    let currentY = DEFAULT_POSITION.Y;

    // ルート要素を順番に配置
    for (const root of rootElements) {
        const result = layoutNode(root, updatedElements, currentY, 0, getNumberOfSections);
        currentY = result.newY + OFFSET.Y;
    }

    debugLog(`adjustElementPositions終了`);
    return updatedElements;
};