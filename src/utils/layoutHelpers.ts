import { Element } from '../types/types';
import { OFFSET, DEFAULT_POSITION, SIZE, ELEMENT_DIRECTIONS } from '../constants/elementSettings';
import { debugLog } from './debugLogHelpers';
import { getChildren } from './elementHelpers';

type ElementsMap = { [key: string]: Element };

const layoutNode = (
    node: Element,
    elements: ElementsMap,
    startY: number,
    depth: number,
    getNumberOfSections: () => number,
    layoutMode: string = 'default'
): { newY: number } => {
    debugLog(`[layoutNode]「${node.texts}」 id=${node.id}, depth=${depth}, startY=${startY}, layoutMode=${layoutMode} ---`);

    // X座標の計算
    if (node.parentId === null) {
        node.x = DEFAULT_POSITION.X;
    } else {
        const parent = elements[node.parentId];
        // direction に応じてXオフセットの符号を決定
        const xOffsetMultiplier = node.direction === ELEMENT_DIRECTIONS.LEFT ? -1 : 1;
        node.x = parent.x + (OFFSET.X * xOffsetMultiplier * depth);
    }

    const children = getChildren(node.id, elements).sort((a, b) => a.order - b.order);
    debugLog(`children=${children.length}`);
    let currentY = startY;
    let maxChildBottom = startY;

    if (children.length > 0) {
        const defaultHeight = SIZE.SECTION_HEIGHT * getNumberOfSections();
        const requiredOffset = Math.max((node.height - defaultHeight) * 0.5, OFFSET.Y);
        currentY = currentY + requiredOffset;

        for (const child of children) {
            const result = layoutNode(child, elements, currentY, depth + 1, getNumberOfSections, layoutMode);
            currentY = result.newY + OFFSET.Y;
            maxChildBottom = Math.max(maxChildBottom, result.newY);
        }

        const firstChild = children[0];
        const lastChild = children[children.length - 1];
        const childrenMidY = (firstChild.y + lastChild.y + lastChild.height) / 2;
        node.y = childrenMidY - node.height / 2;

        // Use maxChildBottom to ensure we don't overlap with any children
        currentY = Math.max(maxChildBottom, node.y + node.height);
        debugLog(`[layoutNode](子要素あり)「${node.texts}」 id=${node.id}, y=${node.y}, maxChildBottom=${maxChildBottom}, finalY=${currentY}`);
        return { newY: currentY };
    } else {
        node.y = startY;
        currentY = startY + node.height;
        debugLog(`[layoutNode](子要素なし)「${node.texts}」 id=${node.id}, y=${node.y}, newY=${currentY}`);
        return { newY: currentY };
    }
};

export const adjustElementPositions = (
    elements: ElementsMap,
    getNumberOfSections: () => number,
    getLayoutMode: () => string = () => 'default'
): ElementsMap => {
    debugLog(`adjustElementPositions開始: 要素数=${Object.keys(elements).length}`);
    
    const updatedElements = { ...elements };
    const rootElements = getChildren(null, updatedElements)
        .sort((a, b) => a.order - b.order);
    
    let currentY = DEFAULT_POSITION.Y;
    const layoutMode = getLayoutMode();

    // ルート要素を順番に配置
    for (const root of rootElements) {
        const result = layoutNode(root, updatedElements, currentY, 0, getNumberOfSections, layoutMode);
        currentY = result.newY + OFFSET.Y;
    }

    debugLog(`adjustElementPositions終了: レイアウトモード=${layoutMode}`);
    return updatedElements;
};