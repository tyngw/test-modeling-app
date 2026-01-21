/**
 * 並び順計算ロジック
 *
 * ドロップ時の要素の並び順（order/index）を計算する関数群。
 * - ドロップターゲットから挿入位置を計算
 * - 同じ親内での移動時の順序調整（現在は階層操作で自動処理）
 * - 新しい要素追加時の順序調整（現在は階層操作で自動処理）
 */

import { Element } from '../../types/types';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';
import {
  findParentNodeInHierarchy,
  getChildrenFromHierarchy,
} from '../../utils/hierarchical/hierarchicalConverter';
import { DropTargetInfo } from './types';

/**
 * ドロップ先のorder値を計算
 *
 * ドロップターゲット情報から、要素を挿入すべき位置（インデックス）を計算します。
 * - betweenモード: 兄弟要素の間に挿入する位置を計算
 * - childモード: 親要素の子要素として追加する位置（末尾）を計算
 *
 * @param dropTarget - ドロップターゲット情報
 * @param draggedElements - ドラッグ中の要素配列
 * @param hierarchicalData - 階層構造データ
 * @returns 挿入位置（baseOrder）
 */
export const calculateTargetOrderValues = (
  dropTarget: DropTargetInfo,
  draggedElements: Element[],
  hierarchicalData: HierarchicalStructure | null,
): { baseOrder: number } => {
  let baseOrder = 0;

  if (dropTarget?.siblingInfo) {
    const { prevElement, nextElement } = dropTarget.siblingInfo;

    // between ドロップの場合、兄弟要素の親を取得
    let targetParentId: string | null = null;
    if (prevElement) {
      const prevParent = hierarchicalData
        ? findParentNodeInHierarchy(hierarchicalData, prevElement.id)
        : null;
      targetParentId = prevParent?.data.id || null;
    } else if (nextElement) {
      const nextParent = hierarchicalData
        ? findParentNodeInHierarchy(hierarchicalData, nextElement.id)
        : null;
      targetParentId = nextParent?.data.id || null;
    } else {
      // 兄弟要素がない場合は、ドロップターゲットを親とする
      targetParentId = dropTarget.element.id;
    }

    // ドラッグ中の要素のIDリストを作成
    const draggedElementIds = draggedElements.map((el) => el.id);

    // 同じ親を持つ兄弟要素を取得（ドラッグ中の要素を除外、階層構造ベース）
    const siblings =
      hierarchicalData && targetParentId
        ? getChildrenFromHierarchy(hierarchicalData, targetParentId)
            .filter((el) => el.visible && !draggedElementIds.includes(el.id))
            .sort((a, b) => a.y - b.y) // Y座標で並び替え
        : [];

    if (prevElement && nextElement) {
      // 2つの要素の間にドロップする場合
      const nextIndex = siblings.findIndex((el) => el.id === nextElement.id);
      baseOrder = Math.max(0, nextIndex); // nextElementの位置に挿入
    } else if (prevElement) {
      // 最後の要素の後にドロップする場合
      const prevIndex = siblings.findIndex((el) => el.id === prevElement.id);
      baseOrder = prevIndex >= 0 ? prevIndex + 1 : siblings.length; // prevElementの次の位置に挿入
    } else if (nextElement) {
      // 最初の要素の前にドロップする場合
      baseOrder = 0; // 配列の最初に挿入
    } else {
      // 兄弟要素がない場合（最初の子要素として追加）
      baseOrder = 0;
    }
  } else if (dropTarget) {
    // child ドロップの場合
    const targetParentId = dropTarget.element.id;
    const siblings = hierarchicalData
      ? getChildrenFromHierarchy(hierarchicalData, targetParentId).filter((el) => el.visible)
      : [];
    baseOrder = siblings.length; // 末尾に追加
  }

  return { baseOrder };
};

/**
 * 同じ親内での要素移動時の配列順序調整
 *
 * 注意: 現在の実装では階層構造の操作で自動的に処理されるため、
 * この関数は空実装となっています。将来の拡張のために残されています。
 *
 * @param _draggedElements - ドラッグ中の要素配列（未使用）
 * @param _targetIndex - 目標インデックス（未使用）
 * @param _elementParentId - 親要素のID（未使用）
 */
export const moveElementsWithinSameParent = (
  _draggedElements: Element[],
  _targetIndex: number,
  _elementParentId: string | null,
): void => {
  // 階層構造では配列の順序で管理されるため、orderベースのロジックを階層操作に置き換える
  // この実装は階層構造の操作で自動的に処理されるため、ここでは何もしない
};

/**
 * 新しい要素追加時の配列順序調整
 *
 * 注意: 現在の実装では階層構造の操作で自動的に処理されるため、
 * この関数は空実装となっています。将来の拡張のために残されています。
 *
 * @param _baseIndex - 挿入位置のインデックス（未使用）
 * @param _count - 追加する要素の数（未使用）
 * @param _elementParentId - 親要素のID（未使用）
 */
export const adjustOrdersForNewElements = (
  _baseIndex: number,
  _count: number,
  _elementParentId: string | null,
): void => {
  // 階層構造では配列の順序で管理されるため、orderベースのロジックを階層操作に置き換える
  // この実装は階層構造の操作で自動的に処理されるため、ここでは何もしない
};
