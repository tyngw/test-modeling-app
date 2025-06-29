// src/utils/hierarchical/hierarchicalMaintainer.ts

import { HierarchicalStructure, HierarchicalNode } from '../../types/hierarchicalTypes';
import { ElementsMap } from '../../types/elementTypes';

/**
 * 既存の階層構造から親子関係を保持しながら要素を更新
 * @param existingHierarchy 既存の階層構造
 * @param updatedElements 更新された要素マップ
 * @returns 更新された階層構造
 */
export function updateHierarchyWithElementChanges(
  existingHierarchy: HierarchicalStructure,
  updatedElements: ElementsMap,
): HierarchicalStructure {
  // 深いコピーを作成
  const clonedHierarchy = JSON.parse(JSON.stringify(existingHierarchy)) as HierarchicalStructure;

  /**
   * 再帰的にノードを更新
   * @param node 現在のノード
   * @returns 更新されたかどうか
   */
  function updateNodeRecursive(node: HierarchicalNode): boolean {
    let updated = false;

    // 現在のノードの要素が更新されているかチェック
    const updatedElement = updatedElements[node.data.id];
    if (updatedElement) {
      // 要素データを更新
      node.data = updatedElement;
      updated = true;
    }

    // 子ノードがある場合は再帰的に処理
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (updateNodeRecursive(child)) {
          updated = true;
        }
      }
    }

    return updated;
  }

  // ルートから再帰的に更新
  updateNodeRecursive(clonedHierarchy.root);

  return clonedHierarchy;
}

/**
 * 階層構造から消失した要素を除去
 * @param hierarchy 階層構造
 * @param existingElementIds 存在すべき要素IDのセット
 * @returns クリーンアップされた階層構造
 */
export function cleanupHierarchy(
  hierarchy: HierarchicalStructure,
  existingElementIds: Set<string>,
): HierarchicalStructure {
  // 深いコピーを作成
  const clonedHierarchy = JSON.parse(JSON.stringify(hierarchy)) as HierarchicalStructure;

  /**
   * 再帰的にノードをクリーンアップ
   * @param node 現在のノード
   * @returns ノードが削除されたかどうか
   */
  function cleanupNodeRecursive(node: HierarchicalNode): boolean {
    // 現在のノードが存在すべき要素でない場合は削除対象
    if (!existingElementIds.has(node.data.id)) {
      return true; // 削除対象
    }

    // 子ノードがある場合はフィルタリング
    if (node.children && node.children.length > 0) {
      node.children = node.children.filter((child) => !cleanupNodeRecursive(child));
    }

    return false; // 削除対象でない
  }

  // ルートノードが削除対象でない場合のみ処理
  if (!cleanupNodeRecursive(clonedHierarchy.root)) {
    return clonedHierarchy;
  } else {
    // ルートが削除対象の場合は何らかの問題があるため、元の構造を返す
    console.warn('Root node marked for deletion - returning original hierarchy');
    return hierarchy;
  }
}
