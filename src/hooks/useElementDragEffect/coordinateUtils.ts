/**
 * 座標変換ユーティリティ
 *
 * マウス/タッチイベントの座標をキャンバス座標に変換する関数群。
 * ズーム比率とヘッダーの高さを考慮した座標変換を提供します。
 */

import { HEADER_HEIGHT } from '../../config/elementSettings';
import { Position } from './types';

/**
 * タッチイベントかどうかを判定する型ガード関数
 *
 * @param event - マウスまたはタッチイベント
 * @returns タッチイベントの場合true
 */
export const isTouchEvent = (event: MouseEvent | TouchEvent): event is TouchEvent => {
  return 'touches' in event;
};

/**
 * イベント座標をズーム調整後のキャンバス座標に変換
 *
 * マウスまたはタッチイベントの座標を、ズーム比率とヘッダー高さを考慮した
 * キャンバス上の座標に変換します。
 *
 * 変換ロジック:
 * - X座標: (clientX + scrollX) / zoomRatio
 * - Y座標: (clientY + scrollY - HEADER_HEIGHT) / zoomRatio
 *
 * @param e - マウスまたはタッチイベント
 * @param zoomRatio - ズーム比率
 * @returns ズーム調整後の座標
 */
export const convertToZoomCoordinates = (
  e: MouseEvent | TouchEvent,
  zoomRatio: number,
  offsets: { minX: number; minY: number } = { minX: 0, minY: 0 },
): Position => {
  let clientX: number, clientY: number;

  if (isTouchEvent(e)) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const scrollX = window.scrollX ?? 0;
  const scrollY = window.scrollY ?? 0;

  return {
    x: (clientX + scrollX) / zoomRatio + offsets.minX,
    y: (clientY + scrollY - HEADER_HEIGHT) / zoomRatio + offsets.minY,
  };
};
