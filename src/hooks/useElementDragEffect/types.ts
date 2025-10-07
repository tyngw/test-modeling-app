/**
 * useElementDragEffect関連の型定義
 *
 * ドラッグ&ドロップ機能で使用される型を定義します。
 * - 座標位置
 * - ドロップターゲット情報
 * - フックの戻り値型
 */

import { Element, DropPosition, DirectionType } from '../../types/types';

/**
 * 2次元座標位置
 */
export type Position = { x: number; y: number };

/**
 * ドロップターゲット情報
 *
 * ドラッグ中の要素がドロップ可能な位置とその詳細情報を保持します。
 * - element: ドロップ先の要素
 * - position: ドロップ位置（child: 子要素として、between: 兄弟要素間）
 * - insertY/insertX: ドロップ位置の座標
 * - angle: 親要素からの角度（放射状レイアウト用）
 * - distance: 親要素からの距離
 * - siblingInfo: 兄弟要素の情報（betweenの場合）
 * - direction: ドロップ先の方向（left/right/none）
 */
export type DropTargetInfo = {
  element: Element;
  position: DropPosition;
  insertY?: number;
  insertX?: number;
  angle?: number;
  distance?: number;
  siblingInfo?: { prevElement?: Element; nextElement?: Element };
  direction?: DirectionType;
} | null;

/**
 * useElementDragEffectフックの戻り値型
 *
 * ドラッグ&ドロップ機能で使用するハンドラと状態を提供します。
 */
export interface ElementDragEffectResult {
  /** マウスダウンイベントハンドラ（ドラッグ開始） */
  handleMouseDown: (
    e: React.MouseEvent<HTMLElement | SVGElement> | React.TouchEvent<HTMLElement | SVGElement>,
    element: Element,
  ) => void;
  /** マウスアップイベントハンドラ（ドラッグ終了） */
  handleMouseUp: () => void;
  /** 現在のドロップターゲット要素 */
  currentDropTarget: Element | null;
  /** ドロップ位置（child/between/null） */
  dropPosition: DropPosition;
  /** ドラッグ中の要素 */
  draggingElement: Element | null;
  /** ドロップ位置のY座標 */
  dropInsertY: number | undefined;
  /** ドロップ位置のX座標 */
  dropInsertX: number | undefined;
  /** ドロップ先の方向 */
  dropTargetDirection: DirectionType | undefined;
  /** 兄弟要素の情報 */
  siblingInfo: { prevElement?: Element; nextElement?: Element } | null;
  /** ドラッグ中かどうかを示すフラグ */
  isDragInProgress: boolean;
}
