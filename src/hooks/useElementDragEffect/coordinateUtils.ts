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
): Position => {
  let clientX: number, clientY: number;

  if (isTouchEvent(e)) {
    clientX = e.touches[0].clientX + window.scrollX;
    clientY = e.touches[0].clientY + window.scrollY;
  } else {
    clientX = e.clientX + window.scrollX;
    clientY = e.clientY + window.scrollY;
  }

  return {
    x: clientX / zoomRatio,
    y: (clientY - HEADER_HEIGHT) / zoomRatio,
  };
};
