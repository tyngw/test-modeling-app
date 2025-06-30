// src/utils/hierarchical/hierarchicalPositionHelpers.ts

import { HierarchicalStructure, HierarchicalNode } from '../../types/hierarchicalTypes';
import { Element } from '../../types/types';

/**
 * 階層構造内の特定要素の位置情報を更新
 * @param hierarchical 階層構造
 * @param elementId 更新する要素のID
 * @param updates 更新する位置情報
 * @returns 更新された階層構造
 */
export function updateElementPositionInHierarchy(
  hierarchical: HierarchicalStructure,
  elementId: string,
  updates: Partial<Pick<Element, 'x' | 'y' | 'width' | 'height'>>,
): HierarchicalStructure {
  // 深いコピーを作成
  const clonedHierarchy = JSON.parse(JSON.stringify(hierarchical)) as HierarchicalStructure;

  /**
   * 再帰的にノードを検索して更新
   * @param node 現在のノード
   * @returns 更新されたかどうか
   */
  function updateNodeRecursive(node: HierarchicalNode): boolean {
    if (node.data.id === elementId) {
      // 要素が見つかった場合、位置情報を更新
      node.data = {
        ...node.data,
        ...updates,
      };
      return true;
    }

    // 子ノードがある場合は再帰的に検索
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (updateNodeRecursive(child)) {
          return true;
        }
      }
    }

    return false;
  }

  updateNodeRecursive(clonedHierarchy.root);
  return clonedHierarchy;
}

/**
 * 階層構造内の複数要素の位置情報を一括更新
 * @param hierarchical 階層構造
 * @param positionUpdates 位置更新マップ（elementId -> 位置情報）
 * @returns 更新された階層構造
 */
export function updateMultipleElementPositionsInHierarchy(
  hierarchical: HierarchicalStructure,
  positionUpdates: Record<string, Partial<Pick<Element, 'x' | 'y' | 'width' | 'height'>>>,
): HierarchicalStructure {
  // 深いコピーを作成
  const clonedHierarchy = JSON.parse(JSON.stringify(hierarchical)) as HierarchicalStructure;

  /**
   * 再帰的にノードを検索して更新
   * @param node 現在のノード
   */
  function updateNodesRecursive(node: HierarchicalNode): void {
    // 現在のノードの更新があるかチェック
    const updates = positionUpdates[node.data.id];
    if (updates) {
      node.data = {
        ...node.data,
        ...updates,
      };
    }

    // 子ノードがある場合は再帰的に処理
    if (node.children && node.children.length > 0) {
      node.children.forEach(updateNodesRecursive);
    }
  }

  updateNodesRecursive(clonedHierarchy.root);
  return clonedHierarchy;
}
