/**
 * 階層構造操作ヘルパー関数
 *
 * 階層構造データから要素の親子関係や階層情報を取得するヘルパー関数群。
 * - 子要素の取得
 * - 親要素の取得
 * - ルート要素の判定
 * - 兄弟要素の取得（現在未使用だがコメントで保持）
 */

import { Element } from '../../types/types';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';
import {
  getChildrenFromHierarchy,
  findParentNodeInHierarchy,
} from '../../utils/hierarchical/hierarchicalConverter';

/**
 * 要素の子要素を取得（階層構造ベース）
 *
 * 指定された要素の可視な子要素をY座標順にソートして返します。
 *
 * @param element - 対象要素
 * @param hierarchicalData - 階層構造データ
 * @returns 子要素の配列（Y座標でソート済み）
 */
export const getChildren = (
  element: Element,
  hierarchicalData: HierarchicalStructure | null,
): Element[] => {
  if (!hierarchicalData) return [];

  const children = getChildrenFromHierarchy(hierarchicalData, element.id);
  return children.filter((child) => child.visible).sort((a, b) => a.y - b.y);
};

/**
 * 要素の親要素を取得（階層構造ベース）
 *
 * @param element - 対象要素
 * @param hierarchicalData - 階層構造データ
 * @returns 親要素（存在しない場合はnull）
 */
export const getParent = (
  element: Element,
  hierarchicalData: HierarchicalStructure | null,
): Element | null => {
  if (!hierarchicalData) return null;

  const parentNode = findParentNodeInHierarchy(hierarchicalData, element.id);
  return parentNode ? parentNode.data : null;
};

/**
 * ルート要素かどうかを判定（階層構造ベース）
 *
 * 要素がルート要素である条件：
 * - direction が 'none'
 * - 親要素が存在しない
 *
 * @param element - 対象要素
 * @param hierarchicalData - 階層構造データ
 * @returns ルート要素の場合true
 */
export const isRootElement = (
  element: Element,
  hierarchicalData: HierarchicalStructure | null,
): boolean => {
  if (!hierarchicalData) return false;
  const parent = getParent(element, hierarchicalData);
  return element.direction === 'none' && parent === null;
};

/**
 * 兄弟要素を取得（階層構造ベース）
 *
 * 現在は未使用だが、将来的に必要になる可能性があるためコメントアウトで保持。
 *
 * @param element - 対象要素
 * @param hierarchicalData - 階層構造データ
 * @returns 兄弟要素の配列（自身を除く）
 */
// export const getSiblings = (
//   element: Element,
//   hierarchicalData: HierarchicalStructure,
// ): Element[] => {
//   if (!hierarchicalData) return [];
//   const parent = getParent(element, hierarchicalData);
//   if (!parent) return [];
//   const siblings = getChildrenFromHierarchy(hierarchicalData, parent.id);
//   return siblings.filter((sibling) => sibling.id !== element.id && sibling.visible);
// };
