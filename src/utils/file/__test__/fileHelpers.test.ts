// src/utils/file/__test__/fileHelpers.test.ts

import { Element } from '../../../types/types';
import { convertLegacyElement } from '../fileHelpers';

// テスト用のサンプルデータ
const createSampleElement = (): Element => ({
  id: 'test001',
  texts: ['テスト要素'],
  x: 100,
  y: 100,
  width: 200,
  height: 24,
  sectionHeights: [24],
  parentId: null,
  order: 0,
  depth: 1,
  children: 0,
  editing: false,
  selected: false,
  visible: true,
  tentative: false,
  startMarker: 'none',
  endMarker: 'none',
  direction: 'none',
});

const createLegacyElement = () => ({
  id: 'legacy001',
  text: 'レガシー要素',
  text2: '2行目',
  text3: '3行目',
  section1Height: 24,
  section2Height: 24,
  section3Height: 24,
  x: 50,
  y: 50,
  width: 300,
  height: 72,
  parentId: null,
  order: 0,
  depth: 1,
  children: 0,
  editing: false,
  selected: false,
  visible: true,
  tentative: false,
  connectionPathType: 'arrow',
  endConnectionPathType: 'circle',
});

describe('fileHelpers', () => {
  describe('convertLegacyElement', () => {
    test('新しい形式の要素はそのまま返される', () => {
      const element = createSampleElement();
      const result = convertLegacyElement(element);

      expect(result.id).toBe(element.id);
      expect(result.texts).toEqual(element.texts);
      expect(result.sectionHeights).toEqual(element.sectionHeights);
      expect(result.startMarker).toBe(element.startMarker);
      expect(result.endMarker).toBe(element.endMarker);
    });

    test('レガシー形式の要素が正しく変換される', () => {
      const legacyElement = createLegacyElement();
      const result = convertLegacyElement(legacyElement);

      expect(result.id).toBe('legacy001');
      expect(result.texts).toEqual(['レガシー要素', '2行目', '3行目']);
      expect(result.sectionHeights).toEqual([24, 24, 24]);
      expect(result.x).toBe(50);
      expect(result.y).toBe(50);
      expect(result.width).toBe(300);
      expect(result.height).toBe(72);
      expect(result.startMarker).toBe('arrow'); // connectionPathTypeから変換
      expect(result.endMarker).toBe('circle'); // endConnectionPathTypeから変換
    });

    test('不正な要素の場合は新しい要素が作成される', () => {
      const invalidElement = { invalid: 'data' };
      const result = convertLegacyElement(invalidElement);

      expect(result.id).toBeDefined();
      expect(result.texts).toBeDefined();
      expect(result.sectionHeights).toBeDefined();
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
    });

    test('部分的なデータでも正しく処理される', () => {
      const partialElement = {
        id: 'partial001',
        texts: ['部分データ'],
        sectionHeights: [30],
        // その他のプロパティは未定義
      };
      const result = convertLegacyElement(partialElement);

      expect(result.id).toBe('partial001');
      expect(result.texts).toEqual(['部分データ']);
      expect(result.sectionHeights).toEqual([30]);
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
      expect(typeof result.width).toBe('number');
      expect(typeof result.height).toBe('number');
    });

    test('direction プロパティが正しく設定される', () => {
      const rootElement = {
        id: 'root',
        texts: ['ルート'],
        sectionHeights: [24],
        parentId: null,
      };
      const childElement = {
        id: 'child',
        texts: ['子要素'],
        sectionHeights: [24],
        parentId: 'root',
      };

      const convertedRoot = convertLegacyElement(rootElement);
      const convertedChild = convertLegacyElement(childElement);

      expect(convertedRoot.direction).toBe('none'); // ルート要素
      expect(convertedChild.direction).toBe('right'); // 子要素
    });
  });

  // 注意: 実際のファイル操作のテスト（DOM操作が必要）は、
  // 統合テストまたはE2Eテストで実装することを推奨します。
  // ここでは純粋な変換ロジックのテストのみを行っています。
});
