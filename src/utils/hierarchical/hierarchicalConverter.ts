// src/utils/hierarchical/hierarchicalConverter.ts

import { Element } from '../../types/types';
import { ElementsMap } from '../../types/elementTypes';
import { HierarchicalNode, HierarchicalStructure } from '../../types/hierarchicalTypes';

/**
 * 古いElement型（後方互換性のため）
 * @deprecated 新しい階層構造ベースのロジックに移行中
 */
interface LegacyElement extends Element {
  parentId?: string | null;
  depth?: number;
  children?: number;
}

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
  const elementArray = Object.values(elements) as LegacyElement[];

  console.log('convertFlatToHierarchical - elementArray:', elementArray);

  if (elementArray.length === 0) {
    console.log('convertFlatToHierarchical - No elements found, returning null');
    return null;
  }

  // ルート要素を見つける (parentId が null または undefined の要素)
  const rootElement = elementArray.find(
    (element) => element.parentId === null || element.parentId === undefined,
  );

  console.log('convertFlatToHierarchical - rootElement:', rootElement);

  if (!rootElement) {
    // ルート要素が見つからない場合はnullを返す
    console.log('convertFlatToHierarchical - No root element found, returning null');
    return null;
  }

  // 子要素のマップを作成（効率的な検索のため）
  const childrenMap = new Map<string, LegacyElement[]>();

  elementArray.forEach((element) => {
    if (element.parentId && element.parentId !== null) {
      if (!childrenMap.has(element.parentId)) {
        childrenMap.set(element.parentId, []);
      }
      childrenMap.get(element.parentId)!.push(element);
    }
  });

  console.log('convertFlatToHierarchical - childrenMap:', childrenMap);

  // 階層構造では配列の順序をそのまま保持（ソートしない）
  // 各親の子要素は配列の順序通りに管理される

  /**
   * 再帰的に階層ノードを構築
   * @param element 現在の要素
   * @returns 階層ノード
   */
  function buildHierarchicalNode(element: LegacyElement): HierarchicalNode {
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

  console.log('convertFlatToHierarchical - final result:', result);

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
   * @param parentId 親ノードのID（null の場合はルート）
   */
  function flattenNode(node: HierarchicalNode, parentId: string | null = null): void {
    // ノードのデータを要素マップに追加（parentId情報を含める）
    const elementWithParentId = {
      ...node.data,
      parentId, // 親子関係の情報を保持
    } as LegacyElement; // LegacyElement型として扱う

    elements[node.data.id] = elementWithParentId;

    // 子ノードがある場合は再帰的に処理
    if (node.children && node.children.length > 0) {
      node.children.forEach((child) => flattenNode(child, node.data.id));
    }
  }

  // ルートノードから開始（parentIdはnull）
  flattenNode(hierarchical.root, null);
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

    // depthの整合性チェック（Legacy要素の場合のみ）
    const legacyData = node.data as LegacyElement;
    if (legacyData.depth !== undefined && legacyData.depth !== depth) {
      errors.push(
        `ノード ${node.data.id} のdepth値が不正です。期待値: ${depth}, 実際の値: ${legacyData.depth}`,
      );
    }

    // 子要素数の整合性チェック（Legacy要素の場合のみ）
    const childrenCount = node.children ? node.children.length : 0;
    if (legacyData.children !== undefined && legacyData.children !== childrenCount) {
      errors.push(
        `ノード ${node.data.id} の子要素数が不正です。期待値: ${childrenCount}, 実際の値: ${legacyData.children}`,
      );
    }

    // 子ノードの再帰的バリデーション
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, _index) => {
        // parentIdの整合性チェック（Legacy要素の場合のみ）
        const childLegacyData = child.data as LegacyElement;
        if (childLegacyData.parentId !== undefined && childLegacyData.parentId !== node.data.id) {
          errors.push(
            `子ノード ${child.data.id} のparentIdが不正です。期待値: ${node.data.id}, 実際の値: ${childLegacyData.parentId}`,
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

/**
 * 階層構造から指定されたIDの要素を取得
 * @param hierarchical 階層構造
 * @param elementId 要素ID
 * @returns 見つかった要素、または undefined
 */
export function findElementInHierarchy(
  hierarchical: HierarchicalStructure | null,
  elementId: string,
): Element | undefined {
  if (!hierarchical) {
    return undefined;
  }

  function searchNode(node: HierarchicalNode): Element | undefined {
    if (node.data.id === elementId) {
      return node.data;
    }

    if (node.children) {
      for (const child of node.children) {
        const found = searchNode(child);
        if (found) {
          return found;
        }
      }
    }

    return undefined;
  }

  return searchNode(hierarchical.root);
}

/**
 * 階層構造から選択されている要素一覧を取得
 * @param hierarchical 階層構造
 * @returns 選択されている要素の配列
 */
export function getSelectedElementsFromHierarchy(
  hierarchical: HierarchicalStructure | null,
): Element[] {
  if (!hierarchical) {
    return [];
  }

  const selectedElements: Element[] = [];

  function collectSelectedElements(node: HierarchicalNode): void {
    if (node.data.selected) {
      selectedElements.push(node.data);
    }

    if (node.children) {
      node.children.forEach(collectSelectedElements);
    }
  }

  collectSelectedElements(hierarchical.root);
  return selectedElements;
}

/**
 * 階層構造から編集中の要素一覧を取得
 * @param hierarchical 階層構造
 * @returns 編集中の要素の配列
 */
export function getEditingElementsFromHierarchy(
  hierarchical: HierarchicalStructure | null,
): Element[] {
  if (!hierarchical) {
    return [];
  }

  const editingElements: Element[] = [];

  function collectEditingElements(node: HierarchicalNode): void {
    if (node.data.editing) {
      editingElements.push(node.data);
    }

    if (node.children) {
      node.children.forEach(collectEditingElements);
    }
  }

  collectEditingElements(hierarchical.root);
  return editingElements;
}

/**
 * 階層構造から全要素を配列として取得
 * @param hierarchical 階層構造
 * @returns 全要素の配列
 */
export function getAllElementsFromHierarchy(hierarchical: HierarchicalStructure | null): Element[] {
  if (!hierarchical) {
    return [];
  }

  return convertHierarchicalToArray(hierarchical);
}

/**
 * 階層構造から指定ノードの子要素を取得
 * @param hierarchical 階層構造
 * @param nodeId ノードID
 * @returns 子要素の配列
 */
export function getChildrenFromHierarchy(
  hierarchical: HierarchicalStructure | null,
  nodeId: string,
): Element[] {
  if (!hierarchical) {
    return [];
  }

  const node = findNodeInHierarchy(hierarchical, nodeId);
  if (!node || !node.children) {
    return [];
  }

  return node.children.map((child) => child.data);
}

/**
 * 階層構造から指定ノードの深さを取得
 * @param hierarchical 階層構造
 * @param nodeId ノードID
 * @returns 深さ（ルートノードは0、見つからない場合は-1）
 */
export function getDepthFromHierarchy(
  hierarchical: HierarchicalStructure | null,
  nodeId: string,
): number {
  if (!hierarchical) {
    return -1;
  }

  function searchDepth(node: HierarchicalNode, currentDepth: number): number {
    if (node.data.id === nodeId) {
      return currentDepth;
    }

    if (node.children) {
      for (const child of node.children) {
        const depth = searchDepth(child, currentDepth + 1);
        if (depth >= 0) {
          return depth;
        }
      }
    }

    return -1;
  }

  return searchDepth(hierarchical.root, 0);
}

/**
 * 階層構造から指定ノードの子要素数を取得
 * @param hierarchical 階層構造
 * @param nodeId ノードID
 * @returns 子要素数
 */
export function getChildrenCountFromHierarchy(
  hierarchical: HierarchicalStructure | null,
  nodeId: string,
): number {
  if (!hierarchical) {
    return 0;
  }

  const node = findNodeInHierarchy(hierarchical, nodeId);
  return node?.children?.length || 0;
}

/**
 * 階層構造の総要素数を取得（フラット変換を避けて直接カウント）
 * @param hierarchical 階層構造
 * @returns 総要素数
 */
export function getElementCountFromHierarchy(hierarchical: HierarchicalStructure | null): number {
  if (!hierarchical || !hierarchical.root) {
    return 0;
  }

  function countNodesRecursive(node: HierarchicalNode): number {
    let count = 1; // 現在のノード
    if (node.children) {
      for (const child of node.children) {
        count += countNodesRecursive(child);
      }
    }
    return count;
  }

  return countNodesRecursive(hierarchical.root);
}

/**
 * 階層構造内の全要素の特定の属性を一括更新
 * @param hierarchical 階層構造
 * @param updateFn 更新関数
 * @returns 更新された階層構造
 */
export function updateAllElementsInHierarchy(
  hierarchical: HierarchicalStructure,
  updateFn: (element: Element) => Partial<Element>,
): HierarchicalStructure {
  function updateNodeRecursive(node: HierarchicalNode): HierarchicalNode {
    const updatedElement = { ...node.data, ...updateFn(node.data) };
    const updatedChildren = node.children ? node.children.map(updateNodeRecursive) : [];

    return {
      ...node,
      data: updatedElement,
      children: updatedChildren,
    };
  }

  return {
    ...hierarchical,
    root: hierarchical.root ? updateNodeRecursive(hierarchical.root) : hierarchical.root,
  };
}

/**
 * 階層構造からルート要素を直接取得
 * @param hierarchical 階層構造
 * @returns ルート要素（存在しない場合はnull）
 */
export function getRootElementFromHierarchy(
  hierarchical: HierarchicalStructure | null,
): Element | null {
  if (!hierarchical || !hierarchical.root) {
    return null;
  }
  return hierarchical.root.data;
}

/**
 * 階層構造から直接ElementsMapを作成
 * @param hierarchical 階層構造
 * @returns ElementsMap
 */
export function createElementsMapFromHierarchy(
  hierarchical: HierarchicalStructure | null,
): Record<string, Element> {
  if (!hierarchical) {
    return {};
  }

  const elementsMap: Record<string, Element> = {};

  function collectElementsRecursive(node: HierarchicalNode): void {
    elementsMap[node.data.id] = node.data;

    if (node.children) {
      node.children.forEach(collectElementsRecursive);
    }
  }

  collectElementsRecursive(hierarchical.root);
  return elementsMap;
}

/**
 * 階層構造から可視要素のみを取得
 * @param hierarchical 階層構造
 * @returns 可視要素の配列
 */
export function getVisibleElementsFromHierarchy(
  hierarchical: HierarchicalStructure | null,
): Element[] {
  if (!hierarchical) {
    return [];
  }

  const visibleElements: Element[] = [];

  function collectVisibleElements(node: HierarchicalNode): void {
    if (node.data.visible) {
      visibleElements.push(node.data);
    }

    if (node.children) {
      node.children.forEach(collectVisibleElements);
    }
  }

  collectVisibleElements(hierarchical.root);
  return visibleElements;
}

/**
 * 階層構造内の全要素の座標をデバッグログ出力
 * @param hierarchical 階層構造
 * @param prefix ログの接頭辞
 */
export function logElementPositionsFromHierarchy(
  hierarchical: HierarchicalStructure | null,
  prefix = '',
): void {
  if (!hierarchical || !hierarchical.root) {
    return;
  }

  function logNodeRecursive(node: HierarchicalNode, depth = 0): void {
    const indent = '  '.repeat(depth);
    console.log(
      `${prefix}${indent}- 要素「${node.data.texts}」 id=${node.data.id}: X=${node.data.x}, Y=${node.data.y}`,
    );

    if (node.children) {
      node.children.forEach((child) => logNodeRecursive(child, depth + 1));
    }
  }

  logNodeRecursive(hierarchical.root);
}

/**
 * 指定された深度の要素を階層構造から取得
 * @param hierarchical 階層構造
 * @param targetDepth 取得したい深度
 * @returns 指定された深度の要素配列（Y位置→X位置でソート済み）
 */
export function getElementsByDepthFromHierarchy(
  hierarchical: HierarchicalStructure | null,
  targetDepth: number,
): Element[] {
  if (!hierarchical || !hierarchical.root) {
    return [];
  }

  const elements: Element[] = [];

  function collectElementsAtDepth(node: HierarchicalNode, currentDepth: number): void {
    if (currentDepth === targetDepth) {
      elements.push(node.data);
    }

    if (node.children && currentDepth < targetDepth) {
      node.children.forEach((child) => collectElementsAtDepth(child, currentDepth + 1));
    }
  }

  collectElementsAtDepth(hierarchical.root, 0);

  // Y位置→X位置でソート
  return elements.sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * 階層構造から指定された親IDを持つtentative要素を取得
 * @param hierarchical 階層構造
 * @param parentId 親要素のID（nullの場合はルートレベル）
 * @returns tentative要素の配列
 */
export function getTentativeSiblingsByParentFromHierarchy(
  hierarchical: HierarchicalStructure | null,
  parentId: string | null,
): Element[] {
  if (!hierarchical) return [];

  const tentativeElements: Element[] = [];

  function collectTentativeRecursive(node: HierarchicalNode, currentParentId: string | null): void {
    // 現在のノードが指定された親を持ち、tentativeならば収集
    if (currentParentId === parentId && node.data.tentative) {
      tentativeElements.push(node.data);
    }

    // 子要素を再帰的に処理
    if (node.children) {
      node.children.forEach((child) => collectTentativeRecursive(child, node.data.id));
    }
  }

  if (hierarchical.root) {
    // ルートレベルのtentative要素を探す場合
    if (parentId === null && hierarchical.root.data.tentative) {
      tentativeElements.push(hierarchical.root.data);
    }

    // 子要素から探す
    if (hierarchical.root.children) {
      hierarchical.root.children.forEach((child) => collectTentativeRecursive(child, null));
    }
  }

  return tentativeElements;
}

/**
 * 階層構造から指定された要素とその子孫要素をすべて取得
 * @param hierarchical 階層構造
 * @param elementId 対象要素のID
 * @returns 要素とその子孫要素の配列（要素自身も含む）
 */
export function getElementAndDescendantsFromHierarchy(
  hierarchical: HierarchicalStructure | null,
  elementId: string,
): Element[] {
  if (!hierarchical) {
    return [];
  }

  const targetNode = findNodeInHierarchy(hierarchical, elementId);
  if (!targetNode) {
    return [];
  }

  const result: Element[] = [];

  function collectNodeAndDescendants(node: HierarchicalNode): void {
    result.push(node.data);

    if (node.children) {
      node.children.forEach(collectNodeAndDescendants);
    }
  }

  collectNodeAndDescendants(targetNode);
  return result;
}

/**
 * 階層構造から指定された要素の子孫要素のみを取得（要素自身は含まない）
 * @param hierarchical 階層構造
 * @param elementId 対象要素のID
 * @returns 子孫要素の配列
 */
export function getDescendantsFromHierarchy(
  hierarchical: HierarchicalStructure | null,
  elementId: string,
): Element[] {
  if (!hierarchical) {
    return [];
  }

  const targetNode = findNodeInHierarchy(hierarchical, elementId);
  if (!targetNode || !targetNode.children) {
    return [];
  }

  const result: Element[] = [];

  function collectDescendants(node: HierarchicalNode): void {
    result.push(node.data);

    if (node.children) {
      node.children.forEach(collectDescendants);
    }
  }

  targetNode.children.forEach(collectDescendants);
  return result;
}
