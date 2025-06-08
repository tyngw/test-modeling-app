import { Element } from '../types/types';
import { OFFSET, DEFAULT_POSITION, SIZE } from '../config/elementSettings';
import { debugLog } from './debugLogHelpers';
import { getChildren } from './element/elementHelpers';
import { LayoutMode } from '../types/tabTypes';

type ElementsMap = { [key: string]: Element };

const layoutNode = (
  node: Element,
  elements: ElementsMap,
  startY: number,
  depth: number,
  getNumberOfSections: () => number,
): { newY: number } => {
  debugLog(`[layoutNode]「${node.texts}」 id=${node.id}, depth=${depth}, startY=${startY} ---`);

  // X座標の計算
  if (node.parentId === null) {
    node.x = DEFAULT_POSITION.X;
  } else {
    const parent = elements[node.parentId];

    // 親の方向に基づいて子要素の方向を継承
    if (node.direction !== parent.direction && parent.direction !== 'none') {
      node.direction = parent.direction;
    }

    // 方向に応じてX座標を計算
    if (node.direction === 'left') {
      node.x = parent.x - node.width - OFFSET.X;
    } else {
      node.x = parent.x + parent.width + OFFSET.X;
    }
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
      const result = layoutNode(child, elements, currentY, depth + 1, getNumberOfSections);
      currentY = result.newY + OFFSET.Y;
      maxChildBottom = Math.max(maxChildBottom, result.newY);
    }

    const firstChild = children[0];
    const lastChild = children[children.length - 1];
    const childrenMidY = (firstChild.y + lastChild.y + lastChild.height) / 2;
    node.y = childrenMidY - node.height / 2;

    // Use maxChildBottom to ensure we don't overlap with any children
    currentY = Math.max(maxChildBottom, node.y + node.height);
    debugLog(
      `[layoutNode](子要素あり)「${node.texts}」 id=${node.id}, y=${node.y}, maxChildBottom=${maxChildBottom}, finalY=${currentY}`,
    );
    return { newY: currentY };
  } else {
    node.y = startY;
    currentY = startY + node.height;
    debugLog(
      `[layoutNode](子要素なし)「${node.texts}」 id=${node.id}, y=${node.y}, newY=${currentY}`,
    );
    return { newY: currentY };
  }
};

export const adjustElementPositions = (
  elements: ElementsMap,
  getNumberOfSections: () => number,
  layoutMode: LayoutMode = 'default',
  canvasWidth: number = 0,
  canvasHeight: number = 0,
): ElementsMap => {
  debugLog(
    `adjustElementPositions開始: 要素数=${Object.keys(elements).length}, モード=${layoutMode}`,
  );

  const updatedElements = { ...elements };
  const rootElements = getChildren(null, updatedElements).sort((a, b) => a.order - b.order);

  let currentY = DEFAULT_POSITION.Y;

  // マインドマップモードの場合、ルート要素をキャンバス中央に配置
  if (layoutMode === 'mindmap' && rootElements.length === 1) {
    const rootElement = rootElements[0];
    // ルート要素の方向をnoneに設定
    rootElement.direction = 'none';

    // キャンバス中央に配置（デフォルト値を使用する場合も考慮）
    const centerX = canvasWidth > 0 ? canvasWidth / 2 - rootElement.width / 2 : DEFAULT_POSITION.X;
    const centerY =
      canvasHeight > 0 ? canvasHeight / 2 - rootElement.height / 2 : DEFAULT_POSITION.Y;

    rootElement.x = centerX;
    rootElement.y = centerY;

    // 子要素をレイアウト
    const result = layoutNode(rootElement, updatedElements, centerY, 0, getNumberOfSections);
    currentY = result.newY + OFFSET.Y;
  } else {
    // 通常モード：ルート要素を順番に配置
    for (const root of rootElements) {
      const result = layoutNode(root, updatedElements, currentY, 0, getNumberOfSections);
      currentY = result.newY + OFFSET.Y;
    }
  }

  debugLog(`adjustElementPositions終了`);
  return updatedElements;
};
