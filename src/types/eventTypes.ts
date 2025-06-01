import { Element as CanvasElement } from './types';

/**
 * SVG要素とHTMLElementのイベントを統一的に処理するための共通インターフェイス
 * これにより、handleMouseDownのような関数で複数のタイプのイベントを処理できます
 */
export interface MouseEventHandler {
  (
    e:
      | React.MouseEvent<HTMLElement>
      | React.MouseEvent<SVGElement>
      | React.TouchEvent<HTMLElement>
      | React.TouchEvent<SVGElement>,
    element: CanvasElement,
  ): void;
}

/**
 * 型安全にイベントを変換するためのユーティリティ関数
 * @param event 元のイベント
 * @returns 元のイベント（ランタイム時の型変換のみ）
 */
export function convertEventType<T, U>(event: T): U {
  return event as unknown as U;
}
