import { Element } from '../types/types';
import { OFFSET, DEFAULT_POSITION, SIZE } from '../config/elementSettings';
import { debugLog } from './debugLogHelpers';
import { getChildren, getChildrenFromHierarchy } from './element/elementHelpers';
import { LayoutMode } from '../types/tabTypes';
import { HierarchicalStructure } from '../types/hierarchicalTypes';
import { findParentNodeInHierarchy } from './hierarchical/hierarchicalConverter';
import { getAllElementsFromHierarchy } from './hierarchical/hierarchicalConverter';

type ElementsMap = { [key: string]: Element };

const layoutNode = (
  node: Element,
  elements: ElementsMap,
  startY: number,
  depth: number,
  getNumberOfSections: () => number,
  layoutMode: LayoutMode = 'default',
  hierarchicalData: HierarchicalStructure | null = null,
): { newY: number; leftMaxY?: number; rightMaxY?: number } => {
  debugLog(
    `[layoutNode]「${node.texts}」 id=${node.id}, depth=${depth}, startY=${startY}, layoutMode=${layoutMode} ---`,
  );

  // X座標の計算
  // 階層構造から親要素を取得
  const parentNode = hierarchicalData ? findParentNodeInHierarchy(hierarchicalData, node.id) : null;

  if (!parentNode) {
    // ルート要素の場合は既に配置済み
    debugLog(`Root element: ${node.id}`);
  } else {
    const parent = parentNode.data;

    // 親の方向に基づいて子要素の方向を継承
    if (parent.direction === 'none') {
      // マインドマップモード：親がルート要素の場合
      // 明示的な方向指定がない場合は右側に配置
      if (!node.direction || node.direction === 'none') {
        node.direction = 'right';
      }
      // 明示的に方向が指定されている場合はその方向を維持
      debugLog(`Mindmap mode: direction=${node.direction} (explicit or default right)`);
    } else {
      // 通常モード：子要素が方向を持っていない場合のみ親の方向を継承
      // 既に明示的に設定された方向は維持する
      if (!node.direction || node.direction === 'none') {
        node.direction = parent.direction;
      }
    }

    // 方向に応じてX座標を計算
    if (node.direction === 'left') {
      node.x = parent.x - node.width - OFFSET.X;
    } else {
      node.x = parent.x + parent.width + OFFSET.X;
    }
  }

  // 階層構造から配列順序で子要素を取得
  const children = hierarchicalData
    ? getChildrenFromHierarchy(hierarchicalData, node.id)
    : getChildren(node.id, elements); // フォールバック
  debugLog(`children=${children.length}`);
  let currentY = startY;
  let maxChildBottom = startY;
  let leftMaxY = startY;
  let rightMaxY = startY;

  if (children.length > 0) {
    const defaultHeight = SIZE.SECTION_HEIGHT * getNumberOfSections();
    const requiredOffset = Math.max((node.height - defaultHeight) * 0.5, OFFSET.Y);
    currentY = currentY + requiredOffset;

    if (layoutMode === 'mindmap') {
      // マインドマップモード：direction別に分けて配置
      const leftChildren = children.filter((child: Element) => child.direction === 'left');
      const rightChildren = children.filter((child: Element) => child.direction === 'right');

      let leftCurrentY = currentY;
      let rightCurrentY = currentY;

      // 左側の子要素を配置
      for (const child of leftChildren) {
        const result = layoutNode(
          child,
          elements,
          leftCurrentY,
          depth + 1,
          getNumberOfSections,
          layoutMode,
          hierarchicalData,
        );
        leftCurrentY = result.newY + OFFSET.Y;
        leftMaxY = Math.max(leftMaxY, result.newY);
      }

      // 右側の子要素を配置
      for (const child of rightChildren) {
        const result = layoutNode(
          child,
          elements,
          rightCurrentY,
          depth + 1,
          getNumberOfSections,
          layoutMode,
          hierarchicalData,
        );
        rightCurrentY = result.newY + OFFSET.Y;
        rightMaxY = Math.max(rightMaxY, result.newY);
      }

      // 親要素の位置調整（子要素の中央に配置）
      if (children.length > 0) {
        // 元のorder順序を保ったまま、配置済みの子要素の範囲を計算
        const sortedChildren = children.filter((child: Element) => child.y !== undefined);
        if (sortedChildren.length > 0) {
          const firstChild = sortedChildren[0];
          const lastChild = sortedChildren[sortedChildren.length - 1];
          debugLog(
            `[layoutNode] マインドマップ中央配置計算 - firstChild: id=${firstChild.id}, y=${firstChild.y}, height=${firstChild.height}`,
          );
          debugLog(
            `[layoutNode] マインドマップ中央配置計算 - lastChild: id=${lastChild.id}, y=${lastChild.y}, height=${lastChild.height}`,
          );

          const childrenMidY = (firstChild.y + lastChild.y + lastChild.height) / 2;
          debugLog(`[layoutNode] マインドマップ子要素中央Y座標: ${childrenMidY}`);

          const parentOldY = node.y;
          const newParentY = childrenMidY - node.height / 2;
          node.y = newParentY;
          debugLog(
            `[layoutNode] マインドマップ親要素「${node.texts}」 id=${node.id} - Y座標更新: ${parentOldY} → ${node.y}`,
          );

          // 親要素の位置変更に伴う子要素の調整は行わない（絶対的な中央配置のため）
          // maxChildBottomは子要素の実際の位置を基準に計算
          maxChildBottom = Math.max(leftMaxY, rightMaxY);
        }
      }

      currentY = Math.max(maxChildBottom, node.y + node.height);
    } else {
      // 通常モード：従来通りの配置
      for (const child of children) {
        const result = layoutNode(
          child,
          elements,
          currentY,
          depth + 1,
          getNumberOfSections,
          layoutMode,
          hierarchicalData,
        );
        currentY = result.newY + OFFSET.Y;
        maxChildBottom = Math.max(maxChildBottom, result.newY);
      }

      // 親要素の中央配置を行った後、子要素の位置を再調整
      const firstChild = children[0];
      const lastChild = children[children.length - 1];
      debugLog(
        `[layoutNode] 通常モード中央配置計算 - firstChild: id=${firstChild.id}, y=${firstChild.y}, height=${firstChild.height}`,
      );
      debugLog(
        `[layoutNode] 通常モード中央配置計算 - lastChild: id=${lastChild.id}, y=${lastChild.y}, height=${lastChild.height}`,
      );

      const childrenMidY = (firstChild.y + lastChild.y + lastChild.height) / 2;
      debugLog(`[layoutNode] 通常モード子要素中央Y座標: ${childrenMidY}`);

      const parentOldY = node.y;
      const newParentY = childrenMidY - node.height / 2;
      node.y = newParentY;
      debugLog(
        `[layoutNode] 通常モード親要素「${node.texts}」 id=${node.id} - Y座標更新: ${parentOldY} → ${node.y}`,
      );

      // 親要素の位置変更に伴う子要素の調整は行わない（絶対的な中央配置のため）
      // maxChildBottomは子要素の実際の位置を基準に計算
      maxChildBottom = Math.max(leftMaxY, rightMaxY);
      currentY = Math.max(maxChildBottom, node.y + node.height);
    }
    debugLog(
      `[layoutNode](子要素あり)「${node.texts}」 id=${node.id}, y=${node.y}, maxChildBottom=${maxChildBottom}, finalY=${currentY}`,
    );
    return { newY: currentY, leftMaxY, rightMaxY };
  } else {
    node.y = startY;
    currentY = startY + node.height;
    debugLog(
      `[layoutNode](子要素なし)「${node.texts}」 id=${node.id}, y=${node.y}, newY=${currentY}`,
    );
    return { newY: currentY, leftMaxY: currentY, rightMaxY: currentY };
  }
};

export const adjustElementPositions = (
  elements: ElementsMap,
  getNumberOfSections: () => number,
  layoutMode: LayoutMode = 'default',
  canvasWidth = 0,
  canvasHeight = 0,
  hierarchicalData: HierarchicalStructure | null = null,
): ElementsMap => {
  // 呼び出し元を特定するためのスタックトレース
  const stack = new Error().stack;
  const callerLine = stack?.split('\n')[2]?.trim() || 'Unknown';

  debugLog(
    `adjustElementPositions開始: 要素数=${Object.keys(elements).length}, モード=${layoutMode}, 呼び出し元=${callerLine}`,
  );

  // hierarchicalDataがnullの場合は早期リターン
  if (!hierarchicalData) {
    debugLog(`adjustElementPositions: hierarchicalDataがnullのため処理をスキップ`);
    return elements;
  }

  const updatedElements = { ...elements };

  // 階層構造から配列順序でルート要素を取得
  const rootElements =
    hierarchicalData && hierarchicalData.root
      ? [hierarchicalData.root.data]
      : getChildren(null, updatedElements).sort((a: Element, b: Element) =>
          a.id.localeCompare(b.id),
        ); // フォールバック

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

    // マインドマップモードでは、ルート要素を右にオフセット
    rootElement.x = centerX + OFFSET.X;
    rootElement.y = centerY;

    // 子要素をレイアウト
    const result = layoutNode(
      rootElement,
      updatedElements,
      centerY,
      0,
      getNumberOfSections,
      layoutMode,
      hierarchicalData,
    );
    currentY = result.newY + OFFSET.Y;

    // layoutNode後に更新された座標をupdatedElementsに反映
    updatedElements[rootElement.id] = rootElement;
    const allElements = getAllElementsFromHierarchy(hierarchicalData);
    allElements.forEach((element: Element) => {
      updatedElements[element.id] = element;
    });
  } else {
    // 通常モード：ルート要素を順番に配置
    for (const root of rootElements) {
      const result = layoutNode(
        root,
        updatedElements,
        currentY,
        0,
        getNumberOfSections,
        layoutMode,
        hierarchicalData,
      );
      currentY = result.newY + OFFSET.Y;
    }

    // layoutNode後に更新された座標をupdatedElementsに反映
    const allElements = getAllElementsFromHierarchy(hierarchicalData);
    allElements.forEach((element: Element) => {
      updatedElements[element.id] = element;
    });
  }

  debugLog(`adjustElementPositions終了`);
  return updatedElements;
};
