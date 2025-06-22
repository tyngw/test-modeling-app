import { Element as CanvasElement, DropPosition, DirectionType } from '../types/types';
import { OFFSET } from '../config/elementSettings';

interface DropCoordinates {
  x: number;
  y: number;
}

interface CalculateDropCoordinatesParams {
  elements: Record<string, CanvasElement>;
  currentDropTarget: CanvasElement;
  draggingElement: CanvasElement;
  dropPosition: DropPosition;
  dropInsertY: number | undefined | null;
  dropInsertX?: number; // 追加: ドロップ時のX座標
  dropTargetDirection?: DirectionType; // 追加: ドロップターゲットの方向情報
  direction?: DirectionType; // 追加: ドロップ方向情報
  siblingInfo: {
    prevElement?: CanvasElement;
    nextElement?: CanvasElement;
  } | null;
}

/**
 * ドロップ位置の座標を計算するユーティリティ関数
 */
export const calculateDropCoordinates = ({
  elements,
  currentDropTarget,
  draggingElement,
  dropPosition,
  dropInsertY,
  dropInsertX,
  dropTargetDirection,
  direction: passedDirection,
  siblingInfo,
}: CalculateDropCoordinatesParams): DropCoordinates | null => {
  let x, y;

  // 要素の方向を取得 - passedDirectionが指定されている場合はそれを最優先
  const direction =
    passedDirection || dropTargetDirection || currentDropTarget.direction || 'right';
  const isRootInMindmap =
    currentDropTarget.direction === 'none' && currentDropTarget.parentId === null;

  console.log('[calculateDropCoordinates] Input:', {
    targetId: currentDropTarget.id,
    direction,
    passedDirection,
    dropTargetDirection,
    isRootInMindmap,
    dropPosition,
    dropInsertX,
    dropInsertY,
    currentTargetX: currentDropTarget.x,
    currentTargetWidth: currentDropTarget.width,
    draggingElementWidth: draggingElement.width,
  });

  // ドロップする方向を決定
  // マインドマップのルート要素の場合は、ドロップする側によって子要素の方向が決まる
  // このロジックはdropPositionとsiblingInfoから決定する必要がある
  let childDirection: DirectionType = direction;

  // siblingInfoがある場合、先行または後続要素から方向を推測
  if (isRootInMindmap && dropPosition === 'child' && siblingInfo) {
    if (siblingInfo.prevElement) {
      childDirection = siblingInfo.prevElement.direction;
    } else if (siblingInfo.nextElement) {
      childDirection = siblingInfo.nextElement.direction;
    }
    // どちらもない場合はデフォルトでright
  }

  if (dropPosition === 'child') {
    // 子要素として追加する場合

    // dropInsertXが指定されている場合はそれを使用（ルート要素の左右判定に基づく）
    if (dropInsertX !== undefined) {
      x = dropInsertX;
      console.log('[calculateDropCoordinates] Using dropInsertX:', {
        dropInsertX,
        finalX: x,
        reason: 'dropInsertX provided',
      });
    } else if (direction === 'left' || (isRootInMindmap && childDirection === 'left')) {
      // 左方向の場合
      x = currentDropTarget.x - OFFSET.X - draggingElement.width;
      console.log('[calculateDropCoordinates] Left direction calculated:', {
        targetX: currentDropTarget.x,
        offset: OFFSET.X,
        draggingWidth: draggingElement.width,
        calculatedX: x,
        reason: 'left direction fallback',
      });
    } else {
      // 右方向の場合
      x = currentDropTarget.x + currentDropTarget.width + OFFSET.X;
      console.log('[calculateDropCoordinates] Right direction calculated:', {
        targetX: currentDropTarget.x,
        targetWidth: currentDropTarget.width,
        offset: OFFSET.X,
        calculatedX: x,
        reason: 'right direction fallback',
      });
    }

    // Y座標の計算
    y = dropInsertY
      ? dropInsertY - draggingElement.height / 2
      : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;

    console.log('[calculateDropCoordinates] Final coordinates:', {
      x,
      y,
      dropPosition,
      direction,
      dropTargetDirection,
      isLeftSide: direction === 'left' || dropTargetDirection === 'left',
    });
    return { x, y };
  } else if (dropPosition === 'between' || dropPosition === 'sibling') {
    // 兄弟要素として追加する場合（between/sibling）
    const parentElement = currentDropTarget.parentId ? elements[currentDropTarget.parentId] : null;

    if (parentElement) {
      // 親要素がある場合は、親の方向に応じて配置
      const parentDirection = parentElement.direction || 'right';
      const isParentRoot = parentElement.direction === 'none';

      // 子要素の方向を継承
      childDirection = isParentRoot ? currentDropTarget.direction || 'right' : parentDirection;

      if (childDirection === 'left') {
        // 左方向の場合
        x = parentElement.x - OFFSET.X - draggingElement.width;
      } else {
        // 右方向の場合
        x = parentElement.x + parentElement.width + OFFSET.X;
      }

      // siblingInfo情報に基づいてY座標を決定
      if (siblingInfo) {
        const { prevElement, nextElement } = siblingInfo;

        if (nextElement && !prevElement) {
          // 先頭要素の前にドロップする場合
          y = nextElement.y - draggingElement.height;
        } else if (prevElement && !nextElement) {
          // 末尾要素の後にドロップする場合
          y = prevElement.y + prevElement.height;
        } else if (prevElement && nextElement) {
          // 要素間にドロップする場合
          y = dropInsertY
            ? dropInsertY - draggingElement.height / 2
            : (prevElement.y + prevElement.height + nextElement.y) / 2 - draggingElement.height / 2;
        } else {
          // siblingInfoはあるが、prevもnextも無い場合（通常は発生しない）
          y = dropInsertY
            ? dropInsertY - draggingElement.height / 2
            : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
        }
      } else {
        // siblingInfo情報がない場合は既存の計算方法を使用
        y = dropInsertY
          ? dropInsertY - draggingElement.height / 2
          : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
      }
    } else {
      // 親要素がない場合（ルート要素として配置）
      x = OFFSET.X;
      y = dropInsertY
        ? dropInsertY - draggingElement.height / 2
        : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
    }
  } else {
    return null;
  }

  return { x, y };
};
