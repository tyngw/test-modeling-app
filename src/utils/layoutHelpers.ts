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
): { newY: number } => {
    // X座標の計算（親要素の位置と幅に基づく）
    if (node.parentId === null) {
        node.x = DEFAULT_POSITION.X; // ルート要素はデフォルト位置
    } else {
        const parent = elements[node.parentId];
        node.x = parent.x + parent.width + OFFSET.X;
    }

    // 子要素をorder順に取得
    const children = getChildren(node.id, elements).sort((a, b) => a.order - b.order);
    
    let currentY = startY;
    let childrenHeight = 0;

    // 子要素を順番に配置
    if (children.length > 0) {
        for (const child of children) {
            child.y = currentY;
            const result = layoutNode(child, elements, currentY, depth + 1);
            currentY = result.newY + OFFSET.Y;
            childrenHeight += child.height + OFFSET.Y;
        }
        childrenHeight -= OFFSET.Y; // 最後の余分なオフセットを除去

        // 親要素を子要素の中央に配置
        const firstChild = children[0];
        const lastChild = children[children.length - 1];
        const childrenMidY = (firstChild.y + (lastChild.y + lastChild.height)) / 2;
        node.y = childrenMidY - node.height / 2;
    } else {
        node.y = startY;
        currentY = node.y + node.height;
    }

    return { newY: currentY };
};

export const adjustElementPositions = (elements: ElementsMap): ElementsMap => {
    debugLog(`adjustElementPositions開始: 要素数=${Object.keys(elements).length}`);
    
    const updatedElements = { ...elements };
    const rootElements = getChildren(null, updatedElements)
        .sort((a, b) => a.order - b.order);
    
    let currentY = DEFAULT_POSITION.Y;

    // ルート要素を順番に配置
    for (const root of rootElements) {
        const result = layoutNode(root, updatedElements, currentY, 0);
        currentY = result.newY + OFFSET.Y;
    }

    debugLog(`adjustElementPositions終了`);
    return updatedElements;
};