// src/types/elementTypes.ts
import { Element, MarkerType, ConnectionPathType, DropPosition, DirectionType } from './types';

/**
 * 要素のマップ型（ID をキーとする要素のコレクション）
 */
export type ElementsMap = Record<string, Element>;

/**
 * 新規要素作成時のオプション
 * @description 階層構造ベースの要素作成オプション
 */
export interface NewElementOptions {
  /** セクション数 */
  numSections?: number;
  /** 追加先のノードID */
  targetNodeId?: string | null;
  /** 追加位置（兄弟要素の場合） */
  targetPosition?: 'before' | 'after' | 'child';
  /** 要素の順序 */
  order?: number;
  /** 選択状態 */
  selected?: boolean;
  /** 編集状態 */
  editing?: boolean;
  /** 表示状態 */
  visible?: boolean;
  /** 仮置き状態 */
  tentative?: boolean;
  /** 開始マーカー */
  startMarker?: MarkerType;
  /** 終了マーカー */
  endMarker?: MarkerType;
  /** 接続パス種類（後方互換用） */
  connectionPathType?: ConnectionPathType;
  /** 終端接続パス種類（後方互換用） */
  endConnectionPathType?: ConnectionPathType;
  /** 要素の方向 */
  direction?: DirectionType;
}

/**
 * 要素作成時の追加オプション
 */
export interface ElementAdderOptions {
  /** 新要素を選択状態にするか */
  newElementSelect?: boolean;
  /** セクション数 */
  numberOfSections?: number;
  /** 仮置き状態かどうか */
  tentative?: boolean;
  /** 要素の順序 */
  order?: number;
  /** 要素の方向 */
  direction?: DirectionType;
}

/**
 * 要素位置調整オプション
 */
export interface PositionAdjustmentOptions {
  /** 仮置き状態かどうか */
  tentative?: boolean;
  /** セクション数 */
  numberOfSections?: number;
  /** ズーム比率 */
  zoomRatio?: number;
}

/**
 * ドロップ処理情報
 * @description 階層構造ベースのドロップ操作情報
 */
export interface DropInfo {
  /** ドロップ対象の要素ID */
  id: string;
  /** ドロップ先のノードID */
  targetNodeId: string;
  /** ドロップ先のインデックス */
  targetIndex?: number;
  /** ドロップ後の順序 */
  newOrder?: number;
  /** ドロップ位置の種類 */
  position?: DropPosition;
}
