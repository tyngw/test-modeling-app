// src/utils/hierarchical/hierarchicalOperations.ts

import { Element } from '../../types/types';
import {
  HierarchicalNode,
  HierarchicalStructure,
  HierarchicalOperationResult,
  HierarchicalSearchOptions,
} from '../../types/hierarchicalTypes';
import {
  convertHierarchicalToFlat,
  findNodeInHierarchy,
  findParentNodeInHierarchy,
} from './hierarchicalConverter';

/**
 * 階層構造で要素を追加
 * @param hierarchical 現在の階層構造
 * @param parentId 親要素のID
 * @param newElement 新しい要素
 * @returns 更新された階層操作結果
 */
export function addElementToHierarchy(
  hierarchical: HierarchicalStructure,
  parentId: string | null,
  newElement: Element,
): HierarchicalOperationResult {
  // structuredCloneの代わりにJSON.parse(JSON.stringify())を使用
  const clonedHierarchy = JSON.parse(JSON.stringify(hierarchical)) as HierarchicalStructure;

  if (parentId === null) {
    // ルート要素の置き換え（通常は発生しない）
    clonedHierarchy.root = {
      data: newElement,
      children: clonedHierarchy.root.children,
    };
  } else {
    // 親ノードを検索
    const parentNode = findNodeInHierarchy(clonedHierarchy, parentId);
    if (!parentNode) {
      throw new Error(`親ノード ${parentId} が見つかりません`);
    }

    // 新しいノードを作成
    const newNode: HierarchicalNode = {
      data: newElement,
    };

    // 親ノードに子として追加
    if (!parentNode.children) {
      parentNode.children = [];
    }
    parentNode.children.push(newNode);

    // 親ノードのchildren数を更新
    parentNode.data.children = parentNode.children.length;
  }

  const elementsCache = convertHierarchicalToFlat(clonedHierarchy);

  return {
    hierarchicalData: clonedHierarchy,
    elementsCache,
  };
}

/**
 * 階層構造から要素を削除
 * @param hierarchical 現在の階層構造
 * @param elementId 削除する要素のID
 * @returns 更新された階層操作結果
 */
export function deleteElementFromHierarchy(
  hierarchical: HierarchicalStructure,
  elementId: string,
): HierarchicalOperationResult {
  if (hierarchical.root.data.id === elementId) {
    throw new Error('ルート要素は削除できません');
  }

  // structuredCloneの代わりにJSON.parse(JSON.stringify())を使用
  const clonedHierarchy = JSON.parse(JSON.stringify(hierarchical)) as HierarchicalStructure;
  const parentNode = findParentNodeInHierarchy(clonedHierarchy, elementId);

  if (!parentNode || !parentNode.children) {
    throw new Error(`要素 ${elementId} の親が見つかりません`);
  }

  // 対象ノードを削除
  const targetIndex = parentNode.children.findIndex((child) => child.data.id === elementId);
  if (targetIndex === -1) {
    throw new Error(`要素 ${elementId} が見つかりません`);
  }

  parentNode.children.splice(targetIndex, 1);

  // 親ノードのchildren数を更新
  parentNode.data.children = parentNode.children.length;

  const elementsCache = convertHierarchicalToFlat(clonedHierarchy);

  return {
    hierarchicalData: clonedHierarchy,
    elementsCache,
  };
}

/**
 * 階層構造で要素を移動
 * @param hierarchical 現在の階層構造
 * @param elementId 移動する要素のID
 * @param newParentId 新しい親のID
 * @param newOrder 新しい順序
 * @returns 更新された階層操作結果
 */
export function moveElementInHierarchy(
  hierarchical: HierarchicalStructure,
  elementId: string,
  newParentId: string | null,
  newOrder: number,
): HierarchicalOperationResult {
  if (elementId === hierarchical.root.data.id) {
    throw new Error('ルート要素は移動できません');
  }

  if (elementId === newParentId) {
    throw new Error('自分自身を親にすることはできません');
  }

  // 循環参照チェック
  const isDescendant = (nodeId: string, ancestorId: string): boolean => {
    const node = findNodeInHierarchy(hierarchical, nodeId);
    if (!node || !node.children) return false;

    return node.children.some(
      (child) => child.data.id === ancestorId || isDescendant(child.data.id, ancestorId),
    );
  };

  if (newParentId && isDescendant(elementId, newParentId)) {
    throw new Error('循環参照が発生するため移動できません');
  }

  // structuredCloneの代わりにJSON.parse(JSON.stringify())を使用
  const clonedHierarchy = JSON.parse(JSON.stringify(hierarchical)) as HierarchicalStructure;

  // 移動対象ノードを取得
  const targetNode = findNodeInHierarchy(clonedHierarchy, elementId);
  if (!targetNode) {
    throw new Error(`移動対象の要素 ${elementId} が見つかりません`);
  }

  // 元の親から削除
  const oldParentNode = findParentNodeInHierarchy(clonedHierarchy, elementId);
  if (oldParentNode && oldParentNode.children) {
    const oldIndex = oldParentNode.children.findIndex((child) => child.data.id === elementId);
    if (oldIndex !== -1) {
      oldParentNode.children.splice(oldIndex, 1);
      oldParentNode.data.children = oldParentNode.children.length;
    }
  }

  // 新しい親に追加
  if (newParentId === null) {
    // ルートの子として追加（特殊ケース）
    if (!clonedHierarchy.root.children) {
      clonedHierarchy.root.children = [];
    }
    clonedHierarchy.root.children.splice(newOrder, 0, targetNode);
    clonedHierarchy.root.data.children = clonedHierarchy.root.children.length;
  } else {
    const newParentNode = findNodeInHierarchy(clonedHierarchy, newParentId);
    if (!newParentNode) {
      throw new Error(`新しい親 ${newParentId} が見つかりません`);
    }

    if (!newParentNode.children) {
      newParentNode.children = [];
    }

    // 指定位置に挿入
    const insertIndex = Math.min(newOrder, newParentNode.children.length);
    newParentNode.children.splice(insertIndex, 0, targetNode);
    newParentNode.data.children = newParentNode.children.length;
  }

  // 移動した要素のparentIdと深度を更新
  targetNode.data.parentId = newParentId;
  updateDepthRecursive(
    targetNode,
    newParentId ? findNodeInHierarchy(clonedHierarchy, newParentId)!.data.depth + 1 : 1,
  );

  const elementsCache = convertHierarchicalToFlat(clonedHierarchy);

  return {
    hierarchicalData: clonedHierarchy,
    elementsCache,
  };
}

/**
 * 階層構造で要素を更新
 * @param hierarchical 現在の階層構造
 * @param elementId 更新する要素のID
 * @param updates 更新データ
 * @returns 更新された階層操作結果
 */
export function updateElementInHierarchy(
  hierarchical: HierarchicalStructure,
  elementId: string,
  updates: Partial<Element>,
): HierarchicalOperationResult {
  // structuredCloneの代わりにJSON.parse(JSON.stringify())を使用
  const clonedHierarchy = JSON.parse(JSON.stringify(hierarchical)) as HierarchicalStructure;
  const targetNode = findNodeInHierarchy(clonedHierarchy, elementId);

  if (!targetNode) {
    throw new Error(`更新対象の要素 ${elementId} が見つかりません`);
  }

  // 要素を更新（新しいオブジェクトを作成）
  targetNode.data = {
    ...targetNode.data,
    ...updates,
  };

  const elementsCache = convertHierarchicalToFlat(clonedHierarchy);

  return {
    hierarchicalData: clonedHierarchy,
    elementsCache,
  };
}

/**
 * 階層構造で要素を検索
 * @param hierarchical 階層構造
 * @param options 検索オプション
 * @returns 見つかった要素のIDの配列
 */
export function searchElementsInHierarchy(
  hierarchical: HierarchicalStructure,
  options: HierarchicalSearchOptions,
): string[] {
  const results: string[] = [];

  function searchNode(node: HierarchicalNode, currentDepth = 1): void {
    // 深度制限チェック
    if (options.maxDepth && currentDepth > options.maxDepth) {
      return;
    }

    // 条件チェック
    let matches = true;

    if (options.predicate) {
      matches = options.predicate(node.data);
    } else if (options.property && options.value !== undefined) {
      matches = node.data[options.property] === options.value;
    }

    if (matches) {
      results.push(node.data.id);
    }

    // 子ノードを再帰的に検索
    if (node.children) {
      node.children.forEach((child) => searchNode(child, currentDepth + 1));
    }
  }

  searchNode(hierarchical.root);
  return results;
}

/**
 * 階層構造で可視性を設定（折りたたみ/展開）
 * @param hierarchical 現在の階層構造
 * @param parentId 親要素のID
 * @param visible 可視性
 * @returns 更新された階層操作結果
 */
export function setVisibilityInHierarchy(
  hierarchical: HierarchicalStructure,
  parentId: string,
  visible: boolean,
): HierarchicalOperationResult {
  // structuredCloneの代わりにJSON.parse(JSON.stringify())を使用
  const clonedHierarchy = JSON.parse(JSON.stringify(hierarchical)) as HierarchicalStructure;
  const parentNode = findNodeInHierarchy(clonedHierarchy, parentId);

  if (!parentNode) {
    throw new Error(`親要素 ${parentId} が見つかりません`);
  }

  // 子要素の可視性を再帰的に設定
  function setVisibilityRecursive(node: HierarchicalNode): void {
    if (node.children) {
      node.children.forEach((child) => {
        child.data.visible = visible;
        setVisibilityRecursive(child);
      });
    }
  }

  setVisibilityRecursive(parentNode);

  const elementsCache = convertHierarchicalToFlat(clonedHierarchy);

  return {
    hierarchicalData: clonedHierarchy,
    elementsCache,
  };
}

/**
 * 階層構造で選択状態を設定
 * @param hierarchical 現在の階層構造
 * @param elementIds 選択する要素のIDの配列
 * @returns 更新された階層操作結果
 */
export function setSelectionInHierarchy(
  hierarchical: HierarchicalStructure,
  elementIds: string[],
): HierarchicalOperationResult {
  // structuredCloneの代わりにJSON.parse(JSON.stringify())を使用
  const clonedHierarchy = JSON.parse(JSON.stringify(hierarchical)) as HierarchicalStructure;
  const selectedIdSet = new Set(elementIds);

  function updateSelectionRecursive(node: HierarchicalNode): void {
    node.data.selected = selectedIdSet.has(node.data.id);

    if (node.children) {
      node.children.forEach(updateSelectionRecursive);
    }
  }

  updateSelectionRecursive(clonedHierarchy.root);

  const elementsCache = convertHierarchicalToFlat(clonedHierarchy);

  return {
    hierarchicalData: clonedHierarchy,
    elementsCache,
  };
}

/**
 * 深度を再帰的に更新
 * @param node ノード
 * @param depth 新しい深度
 */
function updateDepthRecursive(node: HierarchicalNode, depth: number): void {
  node.data.depth = depth;

  if (node.children) {
    node.children.forEach((child) => updateDepthRecursive(child, depth + 1));
  }
}

/**
 * 階層構造で子要素を取得
 * @param hierarchical 階層構造
 * @param parentId 親要素のID
 * @returns 子要素の配列
 */
export function getChildrenInHierarchy(
  hierarchical: HierarchicalStructure,
  parentId: string,
): Element[] {
  const parentNode = findNodeInHierarchy(hierarchical, parentId);

  if (!parentNode || !parentNode.children) {
    return [];
  }

  return parentNode.children.map((child) => child.data);
}

/**
 * 階層構造で兄弟要素を取得
 * @param hierarchical 階層構造
 * @param elementId 要素のID
 * @returns 兄弟要素の配列（自分自身を除く）
 */
export function getSiblingsInHierarchy(
  hierarchical: HierarchicalStructure,
  elementId: string,
): Element[] {
  const targetNode = findNodeInHierarchy(hierarchical, elementId);
  if (!targetNode) {
    return [];
  }

  const parentNode = findParentNodeInHierarchy(hierarchical, elementId);
  if (!parentNode || !parentNode.children) {
    return [];
  }

  return parentNode.children
    .filter((child) => child.data.id !== elementId)
    .map((child) => child.data);
}
