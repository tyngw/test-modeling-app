/**
 * ドロップ処理ロジック
 *
 * 要素のドロップ時の検証と実行処理を担当します。
 * - 親変更の検証（循環参照、深さ制限など）
 * - 子要素としてのドロップ処理
 * - 兄弟要素間へのドロップ処理
 */

import { Element, DirectionType } from '../../types/types';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';
import { ToastMessages } from '../../constants/toastMessages';
import { debugLog } from '../../utils/debugLogHelpers';
import {
  findParentNodeInHierarchy,
  getDepthFromHierarchy,
  getChildrenCountFromHierarchy,
  isDescendantInHierarchy,
  findElementByIdInHierarchy,
} from '../../utils/hierarchical/hierarchicalConverter';
import { DropTargetInfo } from './types';

/**
 * 親変更の検証結果
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * ドロップ処理の共通パラメータ
 */
export interface DropProcessorParams {
  hierarchicalData: HierarchicalStructure | null;
  currentDropTarget: DropTargetInfo;
  dispatch: React.Dispatch<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  addToast: (message: string, type: 'info' | 'warn' | 'error') => void;
  resetElementsPosition: () => void;
  calculateTargetOrderValues?: (
    dropTarget: DropTargetInfo,
    draggedElements: Element[],
    hierarchicalData: HierarchicalStructure | null,
  ) => { baseOrder: number };
  moveElementsWithinSameParent?: (
    draggedElements: Element[],
    targetIndex: number,
    elementParentId: string | null,
  ) => void;
  adjustOrdersForNewElements?: (
    baseIndex: number,
    count: number,
    elementParentId: string | null,
  ) => void;
}

/**
 * 親変更の検証
 *
 * 要素の親を変更する際の制約をチェックします：
 * - 自分自身を親にできない
 * - 子孫要素を親にできない（循環参照防止）
 * - 階層の深さ制限を超えられない
 *
 * @param element - 移動する要素
 * @param newParentId - 新しい親のID（nullの場合はルート要素へ）
 * @param hierarchicalData - 階層構造データ
 * @returns 検証結果
 */
export const validateParentChange = (
  element: Element,
  newParentId: string | null,
  hierarchicalData: HierarchicalStructure | null,
): ValidationResult => {
  // 新しい親IDがない場合は有効（ルート要素への移動）
  if (newParentId === null) {
    return { isValid: true };
  }

  // 自分自身を親にしようとしている場合は無効
  if (element.id === newParentId) {
    return {
      isValid: false,
      errorMessage: ToastMessages.dropSelfChild,
    };
  }

  // 自身の子孫要素に移動しようとしている場合は無効
  if (isDescendantInHierarchy(hierarchicalData, newParentId, element.id)) {
    // 直接の子要素への移動かどうかを判定
    const newParentNode = hierarchicalData
      ? findParentNodeInHierarchy(hierarchicalData, newParentId)
      : null;
    const isDirectChild = newParentNode?.data.id === element.id;
    return {
      isValid: false,
      errorMessage: isDirectChild
        ? ToastMessages.dropSelfChild
        : ToastMessages.dropCircularReference,
    };
  }

  // 階層構造の制約チェック
  const newParentDepth =
    newParentId && hierarchicalData ? getDepthFromHierarchy(hierarchicalData, newParentId) : 0;
  const maxAllowedDepth = 10; // 最大深さの制限値
  if (newParentDepth >= maxAllowedDepth) {
    return {
      isValid: false,
      errorMessage: ToastMessages.dropInvalidHierarchy,
    };
  }

  return { isValid: true };
};

/**
 * 子要素としてのドロップ処理
 *
 * 選択された要素をターゲット要素の子要素としてドロップします。
 * - 検証を実行
 * - スナップショットを作成
 * - 各要素をドロップ位置に移動
 *
 * @param target - ドロップ先の要素
 * @param selectedElements - ドロップする要素の配列
 * @param params - 処理パラメータ
 * @returns 成功した場合true
 */
export const processChildDrop = (
  target: Element,
  selectedElements: Element[],
  params: DropProcessorParams,
): boolean => {
  const { hierarchicalData, currentDropTarget, dispatch, addToast, resetElementsPosition } = params;

  // 自身の子孫要素への移動チェック
  const invalidElement = selectedElements.find(
    (el) => !validateParentChange(el, target.id, hierarchicalData).isValid,
  );
  if (invalidElement) {
    const { errorMessage } = validateParentChange(invalidElement, target.id, hierarchicalData);
    addToast(errorMessage || ToastMessages.dropChildElement, 'warn');
    resetElementsPosition();
    return false;
  }

  dispatch({ type: 'SNAPSHOT' });

  // 全要素に対して移動処理
  selectedElements.forEach((element, index) => {
    // 方向の計算
    let newDirection: DirectionType | undefined = undefined;
    const isTargetRoot =
      target.direction === 'none' &&
      hierarchicalData &&
      findParentNodeInHierarchy(hierarchicalData, target.id) === null;

    if (isTargetRoot) {
      // ルート要素の場合、ドロップターゲット情報から方向を決定
      if (currentDropTarget?.direction) {
        newDirection = currentDropTarget.direction;
      } else if (currentDropTarget?.insertX !== undefined) {
        // fallback: insertXから方向を判定
        const rootCenterX = target.x + target.width / 2;
        newDirection = currentDropTarget.insertX < rootCenterX ? 'left' : 'right';
      } else {
        // fallback: 要素の現在位置に基づいて判定
        newDirection = element.x < target.x ? 'left' : 'right';
      }
    } else {
      // ルート要素以外の場合、親の方向を継承
      newDirection = target.direction || 'right';
    }

    const childrenCount = hierarchicalData
      ? getChildrenCountFromHierarchy(hierarchicalData, target.id)
      : 0;

    // directionがundefinedの場合はペイロードから除外
    const payload: {
      id: string;
      targetNodeId: string;
      targetIndex: number;
      direction?: DirectionType;
    } = {
      id: element.id,
      targetNodeId: target.id,
      targetIndex: childrenCount + index,
    };

    // directionが定義されている場合のみペイロードに含める
    if (newDirection !== undefined) {
      payload.direction = newDirection;
    }

    dispatch({
      type: 'DROP_ELEMENT',
      payload,
    });
  });
  return true;
};

/**
 * 兄弟要素間へのドロップ処理
 *
 * 選択された要素を兄弟要素の間にドロップします。
 * - 親要素を特定
 * - 検証を実行
 * - スナップショットを作成
 * - 挿入位置を計算
 * - 各要素をドロップ位置に移動
 *
 * @param target - ドロップ先の要素
 * @param selectedElements - ドロップする要素の配列
 * @param params - 処理パラメータ
 * @returns 成功した場合true
 */
export const processBetweenDrop = (
  target: Element,
  selectedElements: Element[],
  params: DropProcessorParams,
): boolean => {
  const {
    hierarchicalData,
    currentDropTarget,
    dispatch,
    addToast,
    resetElementsPosition,
    calculateTargetOrderValues,
    moveElementsWithinSameParent,
    adjustOrdersForNewElements,
  } = params;

  // 要素間へのドロップ処理
  let newParentId: string | null;

  if (currentDropTarget?.siblingInfo) {
    // 要素間へのドロップ
    const { prevElement, nextElement } = currentDropTarget.siblingInfo;

    if (prevElement && nextElement) {
      // 2つの要素の間にドロップする場合
      const prevParent = hierarchicalData
        ? findParentNodeInHierarchy(hierarchicalData, prevElement.id)
        : null;
      newParentId = prevParent?.data.id || null;
    } else if (prevElement) {
      // 最後の要素の後にドロップする場合
      const prevParent = hierarchicalData
        ? findParentNodeInHierarchy(hierarchicalData, prevElement.id)
        : null;
      newParentId = prevParent?.data.id || null;
    } else if (nextElement) {
      // 最初の要素の前にドロップする場合
      const nextParent = hierarchicalData
        ? findParentNodeInHierarchy(hierarchicalData, nextElement.id)
        : null;
      newParentId = nextParent?.data.id || null;
    } else {
      // siblingInfoはあるがprevElementもnextElementもない場合
      // 子要素が存在しない場合、親要素の子要素として追加
      newParentId = target.id;
    }
  } else {
    // 子要素が存在しない場合、親要素の子要素として追加
    newParentId = target.id;
  }

  // parentIdがnullの場合、ルート要素以外はドロップできないようにする
  if (
    newParentId === null &&
    !selectedElements.every((el) => {
      return hierarchicalData ? getDepthFromHierarchy(hierarchicalData, el.id) === 1 : false;
    })
  ) {
    addToast(ToastMessages.invalidDrop, 'warn');
    resetElementsPosition();
    return false;
  }

  // 無効な親変更をチェック
  const invalidElement = selectedElements.find(
    (el) => !validateParentChange(el, newParentId, hierarchicalData).isValid,
  );
  if (invalidElement) {
    const { errorMessage } = validateParentChange(invalidElement, newParentId, hierarchicalData);
    addToast(errorMessage || ToastMessages.dropChildElement, 'warn');
    resetElementsPosition(); // 必ず位置をリセットする
    return false;
  }

  dispatch({ type: 'SNAPSHOT' });

  // ドラッグ中の要素が移動元と移動先で同じparentIdを持つ場合の処理
  const isMovingWithinSameParent = selectedElements.some((el) => {
    const parentNode = hierarchicalData ? findParentNodeInHierarchy(hierarchicalData, el.id) : null;
    return parentNode?.data.id === newParentId;
  });

  // 移動対象の要素の現在のorder値を取得
  const draggedElements = selectedElements.filter((el) => {
    const parentNode = hierarchicalData ? findParentNodeInHierarchy(hierarchicalData, el.id) : null;
    return parentNode?.data.id === newParentId;
  });

  const targetOrderValues = calculateTargetOrderValues
    ? calculateTargetOrderValues(currentDropTarget, draggedElements, hierarchicalData)
    : { baseOrder: 0 };

  if (isMovingWithinSameParent && moveElementsWithinSameParent) {
    // 同じ親内での移動の場合、要素の順序を正しく更新
    moveElementsWithinSameParent(draggedElements, targetOrderValues.baseOrder, newParentId);
  } else if (adjustOrdersForNewElements) {
    // 異なる親への移動、または同じ親でも後続要素のorderを調整
    adjustOrdersForNewElements(targetOrderValues.baseOrder, selectedElements.length, newParentId);
  }

  // 全要素に対して移動処理
  // 複数要素をドロップする場合、挿入による配列変化を考慮して逆順で処理
  // 逆順で処理することで、後の要素の挿入位置が前の要素の挿入により影響を受けない
  const elementsToProcess = [...selectedElements].reverse();

  elementsToProcess.forEach((element, _index) => {
    // 方向の計算
    let newDirection: DirectionType | undefined = undefined;

    if (newParentId) {
      const newParent = findElementByIdInHierarchy(hierarchicalData, newParentId);
      const isNewParentRoot =
        newParent?.direction === 'none' &&
        hierarchicalData &&
        findParentNodeInHierarchy(hierarchicalData, newParent.id) === null;

      if (isNewParentRoot) {
        // 新しい親がルート要素の場合
        if (currentDropTarget?.direction) {
          // ドロップターゲットに方向情報がある場合はそれを使用
          newDirection = currentDropTarget.direction;
          debugLog(
            `[processBetweenDrop] Using dropTarget direction: ${newDirection} for element ${element.id}`,
          );
        } else if (currentDropTarget?.siblingInfo) {
          // betweenモードで兄弟要素の間にドロップする場合、兄弟要素のdirectionを継承
          const { prevElement, nextElement } = currentDropTarget.siblingInfo;
          if (prevElement && prevElement.direction) {
            newDirection = prevElement.direction;
          } else if (nextElement && nextElement.direction) {
            newDirection = nextElement.direction;
          } else {
            // 兄弟要素のdirectionが取得できない場合、マウス位置で判定
            if (currentDropTarget && target) {
              const rootCenterX = target.x + target.width / 2;
              const mousePos =
                currentDropTarget.insertX !== undefined ? currentDropTarget.insertX : rootCenterX;
              newDirection = mousePos < rootCenterX ? 'left' : 'right';
            } else {
              newDirection = 'right';
            }
          }
        } else {
          // 通常のドロップ（betweenモードではない）の場合、マウス位置で判定
          if (currentDropTarget && target) {
            const rootCenterX = target.x + target.width / 2;
            const mousePos =
              currentDropTarget.insertX !== undefined ? currentDropTarget.insertX : rootCenterX;
            newDirection = mousePos < rootCenterX ? 'left' : 'right';
          } else {
            newDirection = 'right';
          }
        }
      } else {
        // 新しい親がルート要素以外の場合、親の方向を継承
        newDirection = newParent?.direction || 'right';
      }
    } else {
      // newParentIdがnullの場合（ルート要素レベルへの移動）
      // 兄弟要素のdirectionを継承、または既存のdirectionを保持
      if (currentDropTarget?.direction) {
        newDirection = currentDropTarget.direction;
      } else if (currentDropTarget?.siblingInfo) {
        const { prevElement, nextElement } = currentDropTarget.siblingInfo;
        if (prevElement && prevElement.direction && prevElement.direction !== 'none') {
          newDirection = prevElement.direction;
        } else if (nextElement && nextElement.direction && nextElement.direction !== 'none') {
          newDirection = nextElement.direction;
        } else {
          // デフォルトは要素の既存のdirectionを保持、なければ'right'
          newDirection = element.direction !== 'none' ? element.direction : 'right';
        }
      } else {
        // デフォルトは要素の既存のdirectionを保持、なければ'right'
        newDirection = element.direction !== 'none' ? element.direction : 'right';
      }
    }

    // 逆順処理における各要素の挿入位置を計算
    // 最初の要素（逆順処理では最後に選択された要素）は baseOrder の位置に挿入
    // 後続の要素は baseOrder の位置に挿入（逆順なので同じ位置に連続挿入される）
    const finalOrder = targetOrderValues.baseOrder;

    debugLog(
      `[processBetweenDrop] Dispatching DROP_ELEMENT for: ${element.id}, newOrder: ${finalOrder}, newParentId: ${newParentId}, direction: ${newDirection}`,
    );

    // directionがundefinedの場合はペイロードから除外
    const payload: {
      id: string;
      targetNodeId: string | null;
      targetIndex: number;
      direction?: DirectionType;
    } = {
      id: element.id,
      targetNodeId: newParentId,
      targetIndex: finalOrder,
    };

    // directionが定義されている場合のみペイロードに含める
    if (newDirection !== undefined) {
      payload.direction = newDirection;
    }

    dispatch({
      type: 'DROP_ELEMENT',
      payload,
    });
  });
  return true;
};
