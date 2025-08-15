// src/types/hierarchicalTypes.ts

import { Element } from './types';

/**
 * 階層構造のノード（ツリー構造の単一ノード）
 */
export interface HierarchicalNode {
  /** ノードのデータ */
  data: Element;
  /** 子ノードの配列 */
  children?: HierarchicalNode[];
}

/**
 * 階層構造のルート（ツリー構造全体）
 */
export interface HierarchicalStructure {
  /** ルートノード */
  root: HierarchicalNode;
  /** バージョン情報 */
  version: string;
}

/**
 * フラット構造のデータ形式（読み込み時の後方互換性用）
 */
export interface FlatStructure {
  /** 要素の配列 */
  elements: Element[];
  /** バージョン情報 */
  version: string;
}

/**
 * データ構造の種類を判定するための型ガード用
 */
export type DataStructure = HierarchicalStructure | FlatStructure;

/**
 * ファイルデータの種類を判定する関数
 * @param data パースされたJSONデータ
 * @returns 階層構造かどうか
 */
export function isHierarchicalStructure(data: unknown): data is HierarchicalStructure {
  return (
    typeof data === 'object' &&
    data !== null &&
    'root' in data &&
    typeof data.root === 'object' &&
    data.root !== null &&
    'data' in data.root &&
    'version' in data
  );
}

/**
 * フラット構造かどうかを判定する関数
 * @param data パースされたJSONデータ
 * @returns フラット構造かどうか
 */
export function isFlatStructure(data: unknown): data is FlatStructure {
  return (
    typeof data === 'object' &&
    data !== null &&
    'elements' in data &&
    Array.isArray(data.elements) &&
    'version' in data
  );
}

/**
 * レガシー形式（elements配列のみ）かどうかを判定する関数
 * @param data パースされたJSONデータ
 * @returns レガシー形式かどうか
 */
export function isLegacyArrayFormat(data: unknown): data is Element[] {
  return Array.isArray(data);
}

/**
 * レガシー形式（ElementsMapオブジェクト）かどうかを判定する関数
 * @param data パースされたJSONデータ
 * @returns レガシー形式かどうか
 */
export function isLegacyMapFormat(data: unknown): data is Record<string, Element> {
  return (
    typeof data === 'object' &&
    data !== null &&
    !Array.isArray(data) &&
    !('elements' in data) &&
    !('root' in data) &&
    // 少なくとも1つの要素があることを確認
    Object.keys(data).length > 0 &&
    // 最初の値がElement型であることを確認
    Object.values(data).some(
      (value) => typeof value === 'object' && value !== null && 'id' in value && 'texts' in value,
    )
  );
}

/**
 * 階層構造の状態管理用インターフェース
 */
export interface HierarchicalState {
  /** 階層構造のルート */
  hierarchicalData: HierarchicalStructure | null;
  /** フラット構造のキャッシュ（既存コードとの互換性用） */
  elementsCache: Record<string, Element>;
  /** キャッシュが最新かどうか */
  cacheValid: boolean;
}

/**
 * 階層操作の結果
 */
export interface HierarchicalOperationResult {
  /** 更新された階層構造 */
  hierarchicalData: HierarchicalStructure;
}

/**
 * ノード操作の種類
 */
export type NodeOperation = 'add' | 'delete' | 'move' | 'update' | 'select' | 'expand' | 'collapse';

/**
 * 階層構造での要素検索オプション
 */
export interface HierarchicalSearchOptions {
  /** 検索対象のプロパティ */
  property?: keyof Element;
  /** 検索値 */
  value?: unknown;
  /** 深度制限 */
  maxDepth?: number;
  /** 条件関数 */
  predicate?: (element: Element) => boolean;
}
