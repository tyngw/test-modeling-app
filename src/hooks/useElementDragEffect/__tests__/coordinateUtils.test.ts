/**
 * coordinateUtils.ts のユニットテスト
 *
 * 座標変換ユーティリティの振る舞いを検証します。
 */

import { isTouchEvent, convertToZoomCoordinates } from '../coordinateUtils';
import { HEADER_HEIGHT } from '../../../config/elementSettings';

describe('coordinateUtils', () => {
  describe('isTouchEvent', () => {
    it('TouchEventの場合はtrueを返す', () => {
      const touchEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
      } as TouchEvent;

      expect(isTouchEvent(touchEvent)).toBe(true);
    });

    it('MouseEventの場合はfalseを返す', () => {
      const mouseEvent = {
        clientX: 100,
        clientY: 100,
      } as MouseEvent;

      expect(isTouchEvent(mouseEvent)).toBe(false);
    });
  });

  describe('convertToZoomCoordinates', () => {
    // window.scrollX, window.scrollYのモック
    beforeEach(() => {
      Object.defineProperty(window, 'scrollX', {
        writable: true,
        value: 0,
      });
      Object.defineProperty(window, 'scrollY', {
        writable: true,
        value: 0,
      });
    });

    it('マウスイベントの座標を正しく変換する（ズーム比率1）', () => {
      const mouseEvent = {
        clientX: 100,
        clientY: 200,
      } as MouseEvent;

      const result = convertToZoomCoordinates(mouseEvent, 1);

      expect(result.x).toBe(100);
      expect(result.y).toBe(200 - HEADER_HEIGHT);
    });

    it('マウスイベントの座標を正しく変換する（ズーム比率2）', () => {
      const mouseEvent = {
        clientX: 200,
        clientY: 400,
      } as MouseEvent;

      const result = convertToZoomCoordinates(mouseEvent, 2);

      expect(result.x).toBe(100); // 200 / 2
      expect(result.y).toBe((400 - HEADER_HEIGHT) / 2);
    });

    it('マウスイベントの座標を正しく変換する（ズーム比率0.5）', () => {
      const mouseEvent = {
        clientX: 100,
        clientY: 200,
      } as MouseEvent;

      const result = convertToZoomCoordinates(mouseEvent, 0.5);

      expect(result.x).toBe(200); // 100 / 0.5
      expect(result.y).toBe((200 - HEADER_HEIGHT) / 0.5);
    });

    it('タッチイベントの座標を正しく変換する（ズーム比率1）', () => {
      const touchEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as TouchEvent;

      const result = convertToZoomCoordinates(touchEvent, 1);

      expect(result.x).toBe(100);
      expect(result.y).toBe(200 - HEADER_HEIGHT);
    });

    it('タッチイベントの座標を正しく変換する（ズーム比率2）', () => {
      const touchEvent = {
        touches: [{ clientX: 200, clientY: 400 }],
      } as TouchEvent;

      const result = convertToZoomCoordinates(touchEvent, 2);

      expect(result.x).toBe(100);
      expect(result.y).toBe((400 - HEADER_HEIGHT) / 2);
    });

    it('スクロール位置を考慮して変換する（マウス）', () => {
      // スクロール位置を設定
      Object.defineProperty(window, 'scrollX', { writable: true, value: 50 });
      Object.defineProperty(window, 'scrollY', { writable: true, value: 100 });

      const mouseEvent = {
        clientX: 100,
        clientY: 200,
      } as MouseEvent;

      const result = convertToZoomCoordinates(mouseEvent, 1);

      expect(result.x).toBe(150); // 100 + 50
      expect(result.y).toBe(300 - HEADER_HEIGHT); // 200 + 100 - HEADER_HEIGHT
    });

    it('スクロール位置を考慮して変換する（タッチ）', () => {
      // スクロール位置を設定
      Object.defineProperty(window, 'scrollX', { writable: true, value: 50 });
      Object.defineProperty(window, 'scrollY', { writable: true, value: 100 });

      const touchEvent = {
        touches: [{ clientX: 100, clientY: 200 }],
      } as TouchEvent;

      const result = convertToZoomCoordinates(touchEvent, 1);

      expect(result.x).toBe(150); // 100 + 50
      expect(result.y).toBe(300 - HEADER_HEIGHT); // 200 + 100 - HEADER_HEIGHT
    });

    it('ズーム比率とスクロールを両方考慮して変換する', () => {
      Object.defineProperty(window, 'scrollX', { writable: true, value: 100 });
      Object.defineProperty(window, 'scrollY', { writable: true, value: 200 });

      const mouseEvent = {
        clientX: 400,
        clientY: 600,
      } as MouseEvent;

      const result = convertToZoomCoordinates(mouseEvent, 2);

      expect(result.x).toBe(250); // (400 + 100) / 2
      expect(result.y).toBe((800 - HEADER_HEIGHT) / 2); // (600 + 200 - HEADER_HEIGHT) / 2
    });
  });
});
