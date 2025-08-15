import { Element } from '../types/types';
import { OFFSET, DEFAULT_POSITION, SIZE } from '../config/elementSettings';
import { debugLog } from './debugLogHelpers';
import { getChildrenFromHierarchy } from './element/elementHelpers';
import { LayoutMode } from '../types/tabTypes';
import { HierarchicalStructure, HierarchicalNode } from '../types/hierarchicalTypes';
import { findParentNodeInHierarchy } from './hierarchical/hierarchicalConverter';

// レイアウト結果の型定義
interface LayoutResult {
  newY: number;
  leftMaxY: number;
  rightMaxY: number;
}

// マインドマップ用の追加オフセット（現在は未使用）
// const MINDMAP_OFFSET = {
//   X: 200, // 右側の子要素用のX軸オフセット
// };

/**
 * 階層構造から子要素の順序を保持してレイアウトする関数
 * （現在は使用していませんが、将来的なレイアウト改善のために保持）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const layoutNode = (
  node: Element,
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

    // 方向に応じてX座標を計算（要素の動的な幅 + 固定オフセットを加算）
    if (node.direction === 'left') {
      // 左側配置：親のX座標 - 子要素の幅 - (親要素の幅 + OFFSET.X)
      node.x = parent.x - node.width - (parent.width + OFFSET.X);
    } else {
      // 右側配置：親のX座標 + 親要素の幅 + OFFSET.X
      node.x = parent.x + parent.width + OFFSET.X;
    }
  }

  // 階層構造から配列順序で子要素を取得（階層構造を優先し、フォールバックも階層構造ベース）
  const children = hierarchicalData ? getChildrenFromHierarchy(hierarchicalData, node.id) : []; // 階層構造がない場合は空配列を返す（フラット構造への依存を排除）
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
        // Y座標で子要素をソートして、実際の最上位・最下位要素を取得
        const sortedChildren = children
          .filter((child: Element) => child.y !== undefined)
          .sort((a, b) => a.y - b.y);

        if (sortedChildren.length > 0) {
          if (sortedChildren.length === 1) {
            // 単一子要素の特殊ケース：親要素と同じY座標に配置
            const singleChild = sortedChildren[0];
            const parentOldY = node.y;
            node.y = singleChild.y;
            debugLog(
              `[layoutNode] マインドマップ単一子要素ケース「${node.texts}」 id=${node.id} - Y座標更新: ${parentOldY} → ${node.y} (子要素と同位置)`,
            );
          } else {
            // 複数子要素の場合：中央配置
            const firstChild = sortedChildren[0]; // Y座標が最小の要素
            const lastChild = sortedChildren[sortedChildren.length - 1]; // Y座標が最大の要素

            debugLog(
              `[layoutNode] マインドマップ中央配置計算 - firstChild: id=${firstChild.id}, y=${firstChild.y}, height=${firstChild.height}`,
            );
            debugLog(
              `[layoutNode] マインドマップ中央配置計算 - lastChild: id=${lastChild.id}, y=${lastChild.y}, height=${lastChild.height}`,
            );

            // 分析結果に基づく正しい中央配置計算
            const childrenTopY = firstChild.y;
            const childrenBottomY = lastChild.y + lastChild.height;
            const childrenMidY = (childrenTopY + childrenBottomY) / 2;

            debugLog(
              `[layoutNode] マインドマップ子要素範囲: ${childrenTopY} - ${childrenBottomY}, 中央Y座標: ${childrenMidY}`,
            );

            const parentOldY = node.y;
            const newParentY = childrenMidY - node.height / 2;
            node.y = newParentY;
            debugLog(
              `[layoutNode] マインドマップ親要素「${node.texts}」 id=${node.id} - Y座標更新: ${parentOldY} → ${node.y}`,
            );
          }

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
      if (children.length > 0) {
        // Y座標で子要素をソートして、実際の最上位・最下位要素を取得
        const sortedChildren = children
          .filter((child: Element) => child.y !== undefined)
          .sort((a, b) => a.y - b.y);

        const firstChild = sortedChildren[0]; // Y座標が最小の要素
        const lastChild = sortedChildren[sortedChildren.length - 1]; // Y座標が最大の要素

        debugLog(
          `[layoutNode] 通常モード中央配置計算 - firstChild: id=${firstChild.id}, y=${firstChild.y}, height=${firstChild.height}`,
        );
        debugLog(
          `[layoutNode] 通常モード中央配置計算 - lastChild: id=${lastChild.id}, y=${lastChild.y}, height=${lastChild.height}`,
        );

        // 分析結果に基づく正しい中央配置計算
        const childrenTopY = firstChild.y;
        const childrenBottomY = lastChild.y + lastChild.height;
        const childrenMidY = (childrenTopY + childrenBottomY) / 2;

        debugLog(
          `[layoutNode] 通常モード子要素範囲: ${childrenTopY} - ${childrenBottomY}, 中央Y座標: ${childrenMidY}`,
        );

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

/**
 * 階層構造ベースで要素の位置を調整する関数
 * ElementsMapに依存せず、階層構造を直接更新する
 */
export const adjustElementPositionsFromHierarchy = (
  hierarchicalData: HierarchicalStructure | null,
  getNumberOfSections: () => number,
  layoutMode: LayoutMode = 'default',
  canvasWidth = 0,
  canvasHeight = 0,
): HierarchicalStructure | null => {
  // 呼び出し元を特定するためのスタックトレース
  const stack = new Error().stack;
  const callerLine = stack?.split('\n')[2]?.trim() || 'Unknown';

  debugLog(
    `adjustElementPositionsFromHierarchy開始: モード=${layoutMode}, 呼び出し元=${callerLine}`,
  );

  // hierarchicalDataがnullの場合は早期リターン
  if (!hierarchicalData) {
    debugLog(`adjustElementPositionsFromHierarchy: hierarchicalDataがnullのため処理をスキップ`);
    return null;
  }

  // 階層構造をディープコピーして更新用に複製
  const updatedHierarchy = JSON.parse(JSON.stringify(hierarchicalData)) as HierarchicalStructure;

  let currentY = DEFAULT_POSITION.Y;

  // マインドマップモードの場合、ルート要素をキャンバス中央に配置
  if (layoutMode === 'mindmap' && updatedHierarchy.root) {
    const rootElement = updatedHierarchy.root.data;
    // ルート要素の方向をnoneに設定
    rootElement.direction = 'none';

    // キャンバス中央に配置（デフォルト値を使用する場合も考慮）
    const centerX = canvasWidth > 0 ? canvasWidth / 2 - rootElement.width / 2 : DEFAULT_POSITION.X;
    const centerY =
      canvasHeight > 0 ? canvasHeight / 2 - rootElement.height / 2 : DEFAULT_POSITION.Y;

    // マインドマップモードでは、ルート要素を右にオフセット
    rootElement.x = centerX + OFFSET.X;
    rootElement.y = centerY;

    // 子要素をレイアウト（階層構造ベース）
    const result = layoutNodeFromHierarchy(
      updatedHierarchy.root,
      centerY,
      0,
      getNumberOfSections,
      layoutMode,
      undefined, // ルート要素には親がない
    );
    currentY = result.newY + OFFSET.Y;
  } else {
    // 通常モード：ルート要素を順番に配置
    if (updatedHierarchy.root) {
      const result = layoutNodeFromHierarchy(
        updatedHierarchy.root,
        currentY,
        0,
        getNumberOfSections,
        layoutMode,
        undefined, // ルート要素には親がない
      );
      currentY = result.newY + OFFSET.Y;
    }
  }

  debugLog(`adjustElementPositionsFromHierarchy終了`);
  return updatedHierarchy;
};

/**
 * 階層構造ベースでのノードレイアウト処理
 * ElementsMapに依存せず、階層ノードを直接更新する
 */
const layoutNodeFromHierarchy = (
  node: HierarchicalNode,
  startY: number,
  level: number,
  getNumberOfSections: () => number,
  layoutMode: LayoutMode,
  parentNode?: HierarchicalNode, // 親要素の情報を追加
): LayoutResult => {
  const element = node.data;

  // 基本の位置設定（親要素の実際の幅 + OFFSET.X による配置）
  if (level === 0) {
    // ルート要素は固定位置
    element.x = DEFAULT_POSITION.X;
  } else if (parentNode) {
    // 親要素がある場合：親のX座標 + 親の幅 + OFFSET.X
    const parent = parentNode.data;
    element.x = parent.x + parent.width + OFFSET.X;
  } else {
    // フォールバック：階層レベルに応じた基本配置
    element.x = DEFAULT_POSITION.X + level * (SIZE.WIDTH.MIN + OFFSET.X);
  }

  element.y = startY;
  let currentY = startY + element.height;

  // 子要素がある場合の処理
  if (node.children && node.children.length > 0) {
    let leftMaxY = currentY;
    let rightMaxY = currentY;

    if (layoutMode === 'mindmap') {
      // マインドマップモードでは左右に分散配置
      const leftChildren = node.children.filter(
        (child: HierarchicalNode) => child.data.direction === 'left',
      );
      const rightChildren = node.children.filter(
        (child: HierarchicalNode) => child.data.direction === 'right',
      );

      // 左側の子要素をレイアウト
      let leftCurrentY = currentY;
      for (const child of leftChildren) {
        // 左側の子要素：親のX座標 - 子要素の幅 - (親要素の幅 + OFFSET.X)
        child.data.x = element.x - child.data.width - (element.width + OFFSET.X);
        const result = layoutNodeFromHierarchy(
          child,
          leftCurrentY,
          level + 1,
          getNumberOfSections,
          layoutMode,
          node, // 親要素の情報を渡す
        );
        // 次の兄弟要素のY座標 = 子要素とその子孫要素の最大Y座標 + OFFSET.Y
        leftCurrentY = result.newY + OFFSET.Y;
        leftMaxY = Math.max(leftMaxY, result.leftMaxY, result.rightMaxY);
      }

      // 右側の子要素をレイアウト
      let rightCurrentY = currentY;
      for (const child of rightChildren) {
        // 右側の子要素：親のX座標 + 親要素の幅 + OFFSET.X
        child.data.x = element.x + element.width + OFFSET.X;
        const result = layoutNodeFromHierarchy(
          child,
          rightCurrentY,
          level + 1,
          getNumberOfSections,
          layoutMode,
          node, // 親要素の情報を渡す
        );
        // 次の兄弟要素のY座標 = 子要素とその子孫要素の最大Y座標 + OFFSET.Y
        rightCurrentY = result.newY + OFFSET.Y;
        rightMaxY = Math.max(rightMaxY, result.leftMaxY, result.rightMaxY);
      }

      currentY = Math.max(leftMaxY, rightMaxY);
    } else {
      // 通常モードでは縦に配置（兄弟要素間のY座標計算）
      for (const child of node.children) {
        const result = layoutNodeFromHierarchy(
          child,
          currentY,
          level + 1,
          getNumberOfSections,
          layoutMode,
          node, // 親要素の情報を渡す
        );
        // 次の兄弟要素のY座標 = 子要素とその子孫要素の最大Y座標 + OFFSET.Y
        currentY = result.newY + OFFSET.Y;
        leftMaxY = Math.max(leftMaxY, result.leftMaxY);
        rightMaxY = Math.max(rightMaxY, result.rightMaxY);
      }
    }

    // 親要素を子要素群の中央に配置（分析結果に基づく修正）
    if (node.children.length > 0) {
      // 全ての子要素をY座標でソートして、最上位・最下位要素を取得
      const allChildElements = node.children.map((child) => child.data);
      const sortedChildren = allChildElements
        .filter((child: Element) => child.y !== undefined)
        .sort((a, b) => a.y - b.y);

      if (sortedChildren.length > 0) {
        if (sortedChildren.length === 1) {
          // 単一子要素の特殊ケース：親要素と同じY座標に配置
          // ただし、親要素の高さが大きい場合は子要素との重なりを回避
          const singleChild = sortedChildren[0];
          const parentOldY = element.y;

          // 親要素の下端が子要素の範囲と重ならないかチェック
          const proposedParentY = singleChild.y;
          const parentBottomY = proposedParentY + element.height;
          const childBottomY = singleChild.y + singleChild.height;

          if (parentBottomY > childBottomY + OFFSET.Y) {
            // 親要素が子要素より大きく、重なりが発生する場合
            // 子要素を親要素の中央に配置するのではなく、親要素を子要素の上に配置
            element.y = singleChild.y - element.height - OFFSET.Y;
            debugLog(
              `[layoutNodeFromHierarchy] 単一子要素（重なり回避）「${element.texts}」 id=${element.id} - Y座標更新: ${parentOldY} → ${element.y}`,
            );
          } else {
            // 通常の単一子要素ケース：親要素と同じY座標に配置
            element.y = singleChild.y;
            debugLog(
              `[layoutNodeFromHierarchy] 単一子要素ケース「${element.texts}」 id=${element.id} - Y座標更新: ${parentOldY} → ${element.y}`,
            );
          }
        } else {
          // 複数子要素の場合：中央配置
          const firstChild = sortedChildren[0]; // Y座標が最小の要素
          const lastChild = sortedChildren[sortedChildren.length - 1]; // Y座標が最大の要素

          // 分析結果に基づく正しい中央配置計算
          const childrenTopY = firstChild.y;
          const childrenBottomY = lastChild.y + lastChild.height;
          const childrenMidY = (childrenTopY + childrenBottomY) / 2;

          const parentOldY = element.y;
          const newParentY = childrenMidY - element.height / 2;
          element.y = newParentY;

          debugLog(
            `[layoutNodeFromHierarchy] 中央配置「${element.texts}」 id=${element.id} - Y座標更新: ${parentOldY} → ${element.y}`,
          );
        }

        // 親要素の位置変更後、実際の最大Y座標を計算
        const allElementsMaxY = Math.max(
          element.y + element.height, // 親要素の下端
          ...sortedChildren.map((child) => child.y + child.height), // 全子要素の下端
        );
        currentY = Math.max(currentY, allElementsMaxY);
      }
    }
    return { newY: currentY, leftMaxY, rightMaxY };
  } else {
    // 子要素がない場合
    return { newY: currentY, leftMaxY: currentY, rightMaxY: currentY };
  }
};
