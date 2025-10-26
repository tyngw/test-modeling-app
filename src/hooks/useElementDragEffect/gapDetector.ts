/**
 * ギャップ検出ロジック
 *
 * 要素間の空間（ギャップ）を検出し、betweenモードでのドロップ位置を計算します。
 * - direction別（left/right）のギャップ検出
 * - グループ最下部のギャップ検出
 * - ルート要素の子要素間の特別処理
 */

import { Element } from '../../types/types';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';
import { OFFSET } from '../../config/elementSettings';
import { debugLog } from '../../utils/debugLogHelpers';
import {
  findParentNodeInHierarchy,
  findElementByIdInHierarchy,
} from '../../utils/hierarchical/hierarchicalConverter';
import { DropTargetInfo } from './types';

/**
 * ギャップ検出のパラメータ
 */
export interface GapDetectionParams {
  mouseX: number;
  mouseY: number;
  draggingElement: Element;
  hierarchicalData: HierarchicalStructure | null;
  elementsByParent: { [parentId: string]: Element[] };
  targetDirection: 'left' | 'right';
}

/**
 * 要素間のギャップを検出（direction別）
 *
 * ルート要素の子要素の場合、left/right方向別にギャップを検出します。
 * 通常の要素の場合は、兄弟要素間のギャップを検出します。
 *
 * @param params - ギャップ検出パラメータ
 * @returns ドロップターゲット情報（見つからない場合はnull）
 */
export const detectGapBetweenElements = (params: GapDetectionParams): DropTargetInfo => {
  const { mouseX, mouseY, draggingElement, hierarchicalData, elementsByParent, targetDirection } =
    params;

  for (const [parentKey, groupElements] of Object.entries(elementsByParent)) {
    if (groupElements.length < 2) continue;

    const parentElement =
      parentKey !== 'root' ? findElementByIdInHierarchy(hierarchicalData, parentKey) : null;
    const isParentRoot =
      parentElement &&
      parentElement.direction === 'none' &&
      hierarchicalData &&
      findParentNodeInHierarchy(hierarchicalData, parentElement.id) === null;

    if (isParentRoot) {
      // ルート要素の子の場合、directionでグループ分け
      const leftChildren = groupElements
        .filter((el) => el.direction === 'left')
        .sort((a, b) => a.y - b.y);
      const rightChildren = groupElements
        .filter((el) => el.direction === 'right')
        .sort((a, b) => a.y - b.y);

      if (targetDirection === 'left') {
        const leftGap = checkDirectionGap(
          leftChildren,
          mouseX,
          mouseY,
          parentElement,
          draggingElement,
          'left',
        );
        if (leftGap) return leftGap;
      } else {
        const rightGap = checkDirectionGap(
          rightChildren,
          mouseX,
          mouseY,
          parentElement,
          draggingElement,
          'right',
        );
        if (rightGap) return rightGap;
      }
    } else if (parentElement) {
      // ルート以外の親の場合
      groupElements.sort((a, b) => a.y - b.y);

      for (let i = 0; i < groupElements.length - 1; i++) {
        const currentElement = groupElements[i];
        const nextElement = groupElements[i + 1];

        const gap = nextElement.y - (currentElement.y + currentElement.height);
        if (gap < 5) continue;

        const gapAreaTop = currentElement.y + currentElement.height;
        const gapAreaBottom = nextElement.y;
        const gapAreaLeft = Math.min(currentElement.x, nextElement.x);
        const gapAreaRight = Math.max(
          currentElement.x + currentElement.width,
          nextElement.x + nextElement.width,
        );

        if (
          mouseX >= gapAreaLeft &&
          mouseX <= gapAreaRight &&
          mouseY >= gapAreaTop &&
          mouseY <= gapAreaBottom
        ) {
          return {
            element: currentElement,
            position: 'between',
            insertY: gapAreaTop + gap / 2,
            siblingInfo: {
              prevElement: currentElement,
              nextElement: nextElement,
            },
          };
        }
      }
    }
  }

  return null;
};

/**
 * 特定方向（left/right）の子要素間のギャップをチェック
 */
const checkDirectionGap = (
  children: Element[],
  mouseX: number,
  mouseY: number,
  parentElement: Element,
  draggingElement: Element,
  direction: 'left' | 'right',
): DropTargetInfo => {
  for (let i = 0; i < children.length - 1; i++) {
    const currentElement = children[i];
    const nextElement = children[i + 1];

    const gap = nextElement.y - (currentElement.y + currentElement.height);
    if (gap < 5) continue;

    const gapAreaTop = currentElement.y + currentElement.height;
    const gapAreaBottom = nextElement.y;

    let gapAreaLeft: number, gapAreaRight: number;
    if (direction === 'left') {
      gapAreaLeft =
        parentElement.x - parentElement.width - OFFSET.X * 2 - (draggingElement?.width ?? 0);
      gapAreaRight = parentElement.x - parentElement.width;
    } else {
      gapAreaLeft = parentElement.x + parentElement.width;
      gapAreaRight = gapAreaLeft + OFFSET.X * 2 + (draggingElement?.width ?? 0);
    }

    if (
      mouseX >= gapAreaLeft &&
      mouseX <= gapAreaRight &&
      mouseY >= gapAreaTop &&
      mouseY <= gapAreaBottom
    ) {
      const insertX =
        direction === 'left'
          ? parentElement.x - parentElement.width - OFFSET.X - (draggingElement?.width ?? 0)
          : parentElement.x + parentElement.width + OFFSET.X;

      return {
        element: currentElement,
        position: 'between',
        insertY: gapAreaTop + gap / 2,
        insertX,
        siblingInfo: {
          prevElement: currentElement,
          nextElement: nextElement,
        },
      };
    }
  }

  return null;
};

/**
 * グループ最下部のギャップを検出
 *
 * 各グループの最後の要素の下部領域にドロップ可能かを判定します。
 *
 * @param params - ギャップ検出パラメータ
 * @returns ドロップターゲット情報（見つからない場合はnull）
 */
export const detectBottomGap = (params: GapDetectionParams): DropTargetInfo => {
  const { mouseX, mouseY, draggingElement, hierarchicalData, elementsByParent, targetDirection } =
    params;

  for (const [parentKey, groupElements] of Object.entries(elementsByParent)) {
    if (groupElements.length === 0) continue;

    const parentElement =
      parentKey !== 'root' ? findElementByIdInHierarchy(hierarchicalData, parentKey) : null;
    const isParentRoot =
      parentElement &&
      parentElement.direction === 'none' &&
      hierarchicalData &&
      findParentNodeInHierarchy(hierarchicalData, parentElement.id) === null;

    if (isParentRoot) {
      const filteredElements = groupElements.filter((el) =>
        targetDirection === 'left' ? el.direction === 'left' : el.direction === 'right',
      );

      if (filteredElements.length === 0) continue;

      const lastElement = filteredElements.reduce((last, current) => {
        return current.y + current.height > last.y + last.height ? current : last;
      }, filteredElements[0]);

      let groupLeft: number, groupRight: number;
      if (targetDirection === 'left') {
        groupLeft =
          parentElement.x - parentElement.width - OFFSET.X * 2 - (draggingElement?.width ?? 0);
        groupRight = parentElement.x - parentElement.width;
      } else {
        groupLeft = parentElement.x + parentElement.width;
        groupRight = groupLeft + OFFSET.X * 2 + (draggingElement?.width ?? 0);
      }

      const bottomThreshold = lastElement.y + lastElement.height + OFFSET.Y * 2;

      debugLog(
        `[Bottom area check] direction:${targetDirection}, mouse(${mouseX},${mouseY}), bottomArea(${groupLeft},${lastElement.y + lastElement.height},${groupRight},${bottomThreshold})`,
      );

      if (
        mouseX >= groupLeft &&
        mouseX <= groupRight &&
        mouseY >= lastElement.y + lastElement.height &&
        mouseY <= bottomThreshold
      ) {
        const insertX =
          targetDirection === 'left'
            ? parentElement.x - parentElement.width - OFFSET.X - (draggingElement?.width ?? 0)
            : parentElement.x + parentElement.width + OFFSET.X;

        return {
          element: lastElement,
          position: 'between',
          insertY: lastElement.y + lastElement.height + OFFSET.Y,
          insertX: insertX,
          siblingInfo: { prevElement: lastElement },
        };
      }
    } else if (parentElement) {
      const lastElement = groupElements.reduce((last, current) => {
        return current.y + current.height > last.y + last.height ? current : last;
      }, groupElements[0]);

      const groupLeft = parentElement.x + parentElement.width;
      const groupRight = groupLeft + OFFSET.X * 2 + lastElement.width;
      const bottomThreshold = lastElement.y + lastElement.height + OFFSET.Y * 2;

      if (
        mouseX >= groupLeft &&
        mouseX <= groupRight &&
        mouseY >= lastElement.y + lastElement.height &&
        mouseY <= bottomThreshold
      ) {
        return {
          element: lastElement,
          position: 'between',
          insertY: lastElement.y + lastElement.height + OFFSET.Y,
          siblingInfo: { prevElement: lastElement },
        };
      }
    }
  }

  return null;
};
