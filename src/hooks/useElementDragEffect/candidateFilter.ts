/**
 * 候補フィルタリングロジック
 *
 * ドロップ可能な要素の候補を絞り込み、親要素ごとにグループ化します。
 * - ドロップエリアの判定
 * - direction別のフィルタリング
 * - 親要素ごとのグループ化
 */

import { Element } from '../../types/types';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';
import { OFFSET } from '../../config/elementSettings';
import { debugLog } from '../../utils/debugLogHelpers';
import { findParentNodeInHierarchy } from '../../utils/hierarchical/hierarchicalConverter';

/**
 * ドロップエリア判定のパラメータ
 */
export interface DropAreaCheckParams {
  element: Element;
  mouseX: number;
  mouseY: number;
  draggingElement: Element;
  hierarchicalData: HierarchicalStructure | null;
  rootElement: Element | null;
  targetDirection: 'left' | 'right';
}

/**
 * 要素がドロップエリア内にあるかを判定
 *
 * ルート要素と通常要素で異なるドロップエリアを計算します。
 *
 * @param params - ドロップエリア判定パラメータ
 * @returns ドロップエリア内の場合true
 */
export const isInDropArea = (params: DropAreaCheckParams): boolean => {
  const {
    element,
    mouseX,
    mouseY,
    draggingElement,
    hierarchicalData,
    rootElement,
    targetDirection,
  } = params;

  const elemTop = element.y;
  const elemBottom = element.y + element.height;
  const elemLeft = element.x;
  const elemRight = element.x + element.width;

  const isRootElement =
    element.direction === 'none' &&
    hierarchicalData &&
    findParentNodeInHierarchy(hierarchicalData, element.id) === null;

  if (isRootElement) {
    // ルート要素の場合は左右の半分ごとにドロップエリアを分割し、狙っている方向と一致する場合のみ許可
    const leftPadding = OFFSET.X * 2 + (draggingElement?.width ?? 0);
    const rightPadding = OFFSET.X * 2 + (draggingElement?.width ?? 0);
    const rootCenterX = elemLeft + element.width / 2;

    const dropAreaTop = elemTop - OFFSET.Y;
    const dropAreaBottom = elemBottom + OFFSET.Y;
    const dropAreaLeft = targetDirection === 'left' ? elemLeft - leftPadding : rootCenterX;
    const dropAreaRight = targetDirection === 'left' ? rootCenterX : elemRight + rightPadding;

    const inArea =
      mouseX >= dropAreaLeft &&
      mouseX <= dropAreaRight &&
      mouseY >= dropAreaTop &&
      mouseY <= dropAreaBottom;

    debugLog(
      `[Root drop area] direction:${targetDirection}, mouse(${mouseX},${mouseY}), area(${dropAreaLeft},${dropAreaTop},${dropAreaRight},${dropAreaBottom}), inArea: ${inArea}`,
    );

    return inArea;
  } else {
    // 非ルート要素の場合
    // ルート要素の子要素の場合は、targetDirectionと一致する要素のみを候補とする
    const parentNode = hierarchicalData
      ? findParentNodeInHierarchy(hierarchicalData, element.id)
      : null;

    if (parentNode?.data.id === rootElement?.id) {
      if (element.direction !== targetDirection) {
        debugLog(
          `[Direction filter] Excluding ${element.id} (direction: ${element.direction}, target: ${targetDirection})`,
        );
        return false;
      }
    }

    // 要素の周辺領域を含めたドロップ可能範囲で判定
    const leftPadding = OFFSET.X;
    const rightPadding = OFFSET.X;

    const dropAreaTop = elemTop - OFFSET.Y;
    const dropAreaBottom = elemBottom + OFFSET.Y;
    const dropAreaLeft = elemLeft - leftPadding;
    const dropAreaRight = elemRight + rightPadding;

    const inArea =
      mouseX >= dropAreaLeft &&
      mouseX <= dropAreaRight &&
      mouseY >= dropAreaTop &&
      mouseY <= dropAreaBottom;

    if (inArea) {
      debugLog(
        `[Candidate found] ${element.id} (direction: ${element.direction}, target: ${targetDirection})`,
      );
    }

    return inArea;
  }
};

/**
 * ドロップ候補要素をフィルタリング
 *
 * 可視要素から、自分自身と選択中の要素を除外し、
 * ドロップエリア内にある要素のみを返します。
 *
 * @param allElements - 全ての要素
 * @param selectedElementIds - 選択中の要素のIDリスト
 * @param mouseX - マウスX座標
 * @param mouseY - マウスY座標
 * @param draggingElement - ドラッグ中の要素
 * @param hierarchicalData - 階層構造データ
 * @param rootElement - ルート要素
 * @param targetDirection - ターゲット方向
 * @returns ドロップ候補要素の配列
 */
export const filterDropCandidates = (
  allElements: Element[],
  selectedElementIds: string[],
  mouseX: number,
  mouseY: number,
  draggingElement: Element,
  hierarchicalData: HierarchicalStructure | null,
  rootElement: Element | null,
  targetDirection: 'left' | 'right',
): Element[] => {
  const candidates = allElements.filter((element: Element) => {
    if (!element.visible || selectedElementIds.includes(element.id)) {
      return false;
    }

    if (
      element.direction &&
      element.direction !== 'none' &&
      element.direction !== targetDirection
    ) {
      return false;
    }

    return isInDropArea({
      element,
      mouseX,
      mouseY,
      draggingElement,
      hierarchicalData,
      rootElement,
      targetDirection,
    });
  });

  debugLog(`[filterDropCandidates] Found ${candidates.length} candidates`);
  candidates.forEach((candidate: Element) => {
    const isRoot =
      candidate.direction === 'none' &&
      hierarchicalData &&
      findParentNodeInHierarchy(hierarchicalData, candidate.id) === null;
    debugLog(`[filterDropCandidates] Candidate: ${candidate.id}, isRoot: ${isRoot}`);
  });

  return candidates;
};

/**
 * 要素を親IDでグループ化
 *
 * すべての可視要素を親のIDでグループ化し、各グループをY座標でソートします。
 *
 * @param allElements - 全ての要素
 * @param selectedElementIds - 選択中の要素のIDリスト
 * @param hierarchicalData - 階層構造データ
 * @returns 親IDをキーとした要素の配列
 */
export const groupElementsByParent = (
  allElements: Element[],
  selectedElementIds: string[],
  hierarchicalData: HierarchicalStructure | null,
): { [parentId: string]: Element[] } => {
  const elementsByParent: { [parentId: string]: Element[] } = {};

  Object.values(allElements)
    .filter((el: Element) => el.visible && !selectedElementIds.includes(el.id))
    .forEach((el: Element) => {
      const parentNode = hierarchicalData
        ? findParentNodeInHierarchy(hierarchicalData, el.id)
        : null;
      const parentId = parentNode?.data.id || 'root';
      if (!elementsByParent[parentId]) {
        elementsByParent[parentId] = [];
      }
      elementsByParent[parentId].push(el);
    });

  // 各グループを順序でソート
  for (const parentId in elementsByParent) {
    elementsByParent[parentId].sort((a, b) => a.y - b.y);
  }

  return elementsByParent;
};
