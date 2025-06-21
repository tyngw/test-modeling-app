// src/utils/hierarchical/hierarchicalConverter.ts

import { Element } from '../../types/types';
import { ElementsMap } from '../../types/elementTypes';
import { HierarchicalNode, HierarchicalStructure } from '../../types/hierarchicalTypes';

/**
 * フラット構造から階層構造への変換
 * @param elements フラット構造の要素マップ
 * @param version バージョン情報
 * @returns 階層構造
 */
export function convertFlatToHierarchical(
  elements: ElementsMap,
  version = '1.4.43',
): HierarchicalStructure | null {
  const elementArray = Object.values(elements);

  if (elementArray.length === 0) {
    return null;
  }

  // ルート要素を見つける
  const rootElement = elementArray.find((element) => element.parentId === null);

  if (!rootElement) {
    // ルート要素が見つかりません
    return null;
  }

  // 子要素のマップを作成（効率的な検索のため）
  const childrenMap = new Map<string, Element[]>();

  elementArray.forEach((element) => {
    if (element.parentId) {
      if (!childrenMap.has(element.parentId)) {
        childrenMap.set(element.parentId, []);
      }
      childrenMap.get(element.parentId)!.push(element);
    }
  });

  // 階層構造では配列の順序をそのまま保持（ソートしない）
  // 各親の子要素は配列の順序通りに管理される

  /**
   * 再帰的に階層ノードを構築
   * @param element 現在の要素
   * @returns 階層ノード
   */
  function buildHierarchicalNode(element: Element): HierarchicalNode {
    const children = childrenMap.get(element.id) || [];

    const node: HierarchicalNode = {
      data: element,
    };

    if (children.length > 0) {
      node.children = children.map(buildHierarchicalNode);
    }

    return node;
  }

  const rootNode = buildHierarchicalNode(rootElement);
  const result = {
    root: rootNode,
    version,
  };

  return result;
}

/**
 * 階層構造からフラット構造への変換
 * @param hierarchical 階層構造
 * @returns フラット構造の要素マップ
 */
export function convertHierarchicalToFlat(hierarchical: HierarchicalStructure): ElementsMap {
  const elements: ElementsMap = {};

  /**
   * 再帰的にノードを展開してフラット構造に変換
   * @param node 階層ノード
   */
  function flattenNode(node: HierarchicalNode): void {
    // ノードのデータを要素マップに追加
    elements[node.data.id] = node.data;

    // 子ノードがある場合は再帰的に処理
    if (node.children && node.children.length > 0) {
      node.children.forEach(flattenNode);
    }
  }

  flattenNode(hierarchical.root);
  return elements;
}

/**
 * Element配列から階層構造への変換
 * @param elementArray Element配列
 * @param version バージョン情報
 * @returns 階層構造
 */
export function convertArrayToHierarchical(
  elementArray: Element[],
  version = '1.4.43',
): HierarchicalStructure | null {
  // Element配列をElementsMapに変換
  const elements = elementArray.reduce((acc, element) => {
    acc[element.id] = element;
    return acc;
  }, {} as ElementsMap);

  return convertFlatToHierarchical(elements, version);
}

/**
 * 階層構造からElement配列への変換
 * @param hierarchical 階層構造
 * @returns Element配列
 */
export function convertHierarchicalToArray(hierarchical: HierarchicalStructure): Element[] {
  const elements: Element[] = [];

  /**
   * 再帰的にノードを展開して配列に変換
   * @param node 階層ノード
   */
  function collectElements(node: HierarchicalNode): void {
    elements.push(node.data);

    if (node.children && node.children.length > 0) {
      node.children.forEach(collectElements);
    }
  }

  collectElements(hierarchical.root);

  return elements;
}

/**
 * 階層構造のバリデーション
 * @param hierarchical 階層構造
 * @returns バリデーション結果
 */
export function validateHierarchicalStructure(hierarchical: HierarchicalStructure): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const visitedIds = new Set<string>();

  /**
   * 再帰的にノードをバリデーション
   * @param node 階層ノード
   * @param depth 現在の深さ
   */
  function validateNode(node: HierarchicalNode, depth = 1): void {
    // IDの重複チェック
    if (visitedIds.has(node.data.id)) {
      errors.push(`重複したIDが検出されました: ${node.data.id}`);
      return;
    }
    visitedIds.add(node.data.id);

    // depthの整合性チェック
    if (node.data.depth !== depth) {
      errors.push(
        `ノード ${node.data.id} のdepth値が不正です。期待値: ${depth}, 実際の値: ${node.data.depth}`,
      );
    }

    // 子要素数の整合性チェック
    const childrenCount = node.children ? node.children.length : 0;
    if (node.data.children !== childrenCount) {
      errors.push(
        `ノード ${node.data.id} の子要素数が不正です。期待値: ${childrenCount}, 実際の値: ${node.data.children}`,
      );
    }

    // 子ノードの再帰的バリデーション
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, _index) => {
        // parentIdの整合性チェック
        if (child.data.parentId !== node.data.id) {
          errors.push(
            `子ノード ${child.data.id} のparentIdが不正です。期待値: ${node.data.id}, 実際の値: ${child.data.parentId}`,
          );
        }
        validateNode(child, depth + 1);
      });
    }
  }

  validateNode(hierarchical.root);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 階層構造内の特定のノードを検索
 * @param hierarchical 階層構造
 * @param nodeId 検索するノードID
 * @returns 見つかったノード（見つからない場合はnull）
 */
export function findNodeInHierarchy(
  hierarchical: HierarchicalStructure,
  nodeId: string,
): HierarchicalNode | null {
  /**
   * 再帰的にノードを検索
   * @param node 現在のノード
   * @returns 見つかったノード
   */
  function searchNode(node: HierarchicalNode): HierarchicalNode | null {
    if (node.data.id === nodeId) {
      return node;
    }

    if (node.children) {
      for (const child of node.children) {
        const found = searchNode(child);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  return searchNode(hierarchical.root);
}

/**
 * 階層構造内の特定のノードの親を検索
 * @param hierarchical 階層構造
 * @param nodeId 検索するノードID
 * @returns 親ノード（見つからない場合やルートノードの場合はnull）
 */
export function findParentNodeInHierarchy(
  hierarchical: HierarchicalStructure,
  nodeId: string,
): HierarchicalNode | null {
  if (hierarchical.root.data.id === nodeId) {
    // ルートノードの場合は親は存在しない
    return null;
  }

  /**
   * 再帰的に親ノードを検索
   * @param node 現在のノード
   * @returns 親ノード
   */
  function searchParent(node: HierarchicalNode): HierarchicalNode | null {
    if (node.children) {
      // 直接の子にターゲットノードがあるかチェック
      const found = node.children.find((child) => child.data.id === nodeId);
      if (found) {
        return node;
      }

      // 子ノードを再帰的に検索
      for (const child of node.children) {
        const parent = searchParent(child);
        if (parent) {
          return parent;
        }
      }
    }

    return null;
  }

  return searchParent(hierarchical.root);
}
