// src/utils/hierarchical/__test__/hierarchicalConverter.test.ts

import { ElementsMap } from '../../../types/elementTypes';
import {
  convertFlatToHierarchical,
  convertHierarchicalToFlat,
  convertArrayToHierarchical,
  convertHierarchicalToArray,
  validateHierarchicalStructure,
  findNodeInHierarchy,
  findParentNodeInHierarchy,
} from '../hierarchicalConverter';

// テスト用のサンプルデータ
const createSampleFlatElements = (): ElementsMap => ({
  root001: {
    id: 'root001',
    texts: ['からあげの作り方'],
    x: 50,
    y: 50,
    width: 300,
    height: 24,
    sectionHeights: [24],
    parentId: null,
    order: 0,
    depth: 1,
    children: 2,
    editing: false,
    selected: false,
    visible: true,
    tentative: false,
    startMarker: 'none',
    endMarker: 'none',
    direction: 'none',
  },
  step1: {
    id: 'step1',
    texts: ['材料'],
    x: 150,
    y: 100,
    width: 300,
    height: 24,
    sectionHeights: [24],
    parentId: 'root001',
    order: 0,
    depth: 2,
    children: 2,
    editing: false,
    selected: false,
    visible: true,
    tentative: false,
    startMarker: 'none',
    endMarker: 'none',
    direction: 'right',
  },
  'step1-1': {
    id: 'step1-1',
    texts: ['鶏もも肉'],
    x: 250,
    y: 130,
    width: 300,
    height: 24,
    sectionHeights: [24],
    parentId: 'step1',
    order: 0,
    depth: 3,
    children: 0,
    editing: false,
    selected: false,
    visible: true,
    tentative: false,
    startMarker: 'none',
    endMarker: 'none',
    direction: 'right',
  },
  'step1-2': {
    id: 'step1-2',
    texts: ['醤油'],
    x: 250,
    y: 160,
    width: 300,
    height: 24,
    sectionHeights: [24],
    parentId: 'step1',
    order: 1,
    depth: 3,
    children: 0,
    editing: false,
    selected: false,
    visible: true,
    tentative: false,
    startMarker: 'none',
    endMarker: 'none',
    direction: 'right',
  },
  step2: {
    id: 'step2',
    texts: ['下ごしらえ'],
    x: 150,
    y: 250,
    width: 300,
    height: 24,
    sectionHeights: [24],
    parentId: 'root001',
    order: 1,
    depth: 2,
    children: 0,
    editing: false,
    selected: false,
    visible: true,
    tentative: false,
    startMarker: 'none',
    endMarker: 'none',
    direction: 'right',
  },
});

describe('hierarchicalConverter', () => {
  describe('convertFlatToHierarchical', () => {
    test('フラット構造から階層構造への変換が正しく動作する', () => {
      const flatElements = createSampleFlatElements();
      const result = convertFlatToHierarchical(flatElements);

      expect(result).not.toBeNull();
      expect(result!.version).toBe('1.4.43');
      expect(result!.root.data.id).toBe('root001');
      expect(result!.root.children).toHaveLength(2);

      // 第1階層の子要素をチェック
      const firstChild = result!.root.children![0];
      expect(firstChild.data.id).toBe('step1');
      expect(firstChild.children).toHaveLength(2);

      // 第2階層の子要素をチェック
      const grandChild1 = firstChild.children![0];
      expect(grandChild1.data.id).toBe('step1-1');
      expect(grandChild1.children).toBeUndefined();

      const grandChild2 = firstChild.children![1];
      expect(grandChild2.data.id).toBe('step1-2');
      expect(grandChild2.children).toBeUndefined();

      const secondChild = result!.root.children![1];
      expect(secondChild.data.id).toBe('step2');
      expect(secondChild.children).toBeUndefined();
    });

    test('空の要素マップの場合はnullを返す', () => {
      const result = convertFlatToHierarchical({});
      expect(result).toBeNull();
    });

    test('ルート要素がない場合はnullを返す', () => {
      const elements: ElementsMap = {
        child1: {
          ...createSampleFlatElements()['step1'],
          parentId: 'nonexistent',
        },
      };
      const result = convertFlatToHierarchical(elements);
      expect(result).toBeNull();
    });
  });

  describe('convertHierarchicalToFlat', () => {
    test('階層構造からフラット構造への変換が正しく動作する', () => {
      const flatElements = createSampleFlatElements();
      const hierarchical = convertFlatToHierarchical(flatElements)!;
      const result = convertHierarchicalToFlat(hierarchical);

      expect(Object.keys(result)).toHaveLength(5);
      expect(result['root001']).toEqual(flatElements['root001']);
      expect(result['step1']).toEqual(flatElements['step1']);
      expect(result['step1-1']).toEqual(flatElements['step1-1']);
      expect(result['step1-2']).toEqual(flatElements['step1-2']);
      expect(result['step2']).toEqual(flatElements['step2']);
    });
  });

  describe('convertArrayToHierarchical', () => {
    test('Element配列から階層構造への変換が正しく動作する', () => {
      const flatElements = createSampleFlatElements();
      const elementArray = Object.values(flatElements);
      const result = convertArrayToHierarchical(elementArray);

      expect(result).not.toBeNull();
      expect(result!.root.data.id).toBe('root001');
      expect(result!.root.children).toHaveLength(2);
    });
  });

  describe('convertHierarchicalToArray', () => {
    test('階層構造からElement配列への変換が正しく動作する', () => {
      const flatElements = createSampleFlatElements();
      const hierarchical = convertFlatToHierarchical(flatElements)!;
      const result = convertHierarchicalToArray(hierarchical);

      expect(result).toHaveLength(5);
      expect(result.find((el) => el.id === 'root001')).toBeDefined();
      expect(result.find((el) => el.id === 'step1')).toBeDefined();
      expect(result.find((el) => el.id === 'step1-1')).toBeDefined();
      expect(result.find((el) => el.id === 'step1-2')).toBeDefined();
      expect(result.find((el) => el.id === 'step2')).toBeDefined();
    });
  });

  describe('validateHierarchicalStructure', () => {
    test('正しい階層構造のバリデーションが成功する', () => {
      const flatElements = createSampleFlatElements();
      const hierarchical = convertFlatToHierarchical(flatElements)!;
      const result = validateHierarchicalStructure(hierarchical);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('不正なdepth値を検出する', () => {
      const flatElements = createSampleFlatElements();
      const hierarchical = convertFlatToHierarchical(flatElements)!;

      // 意図的にdepth値を変更
      hierarchical.root.children![0].data.depth = 999;

      const result = validateHierarchicalStructure(hierarchical);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('depth値が不正');
    });

    test('重複したIDを検出する', () => {
      const flatElements = createSampleFlatElements();
      const hierarchical = convertFlatToHierarchical(flatElements)!;

      // 意図的にIDを重複させる
      hierarchical.root.children![0].data.id = 'root001';

      const result = validateHierarchicalStructure(hierarchical);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('重複したID');
    });
  });

  describe('findNodeInHierarchy', () => {
    test('指定されたIDのノードを正しく見つける', () => {
      const flatElements = createSampleFlatElements();
      const hierarchical = convertFlatToHierarchical(flatElements)!;

      const result = findNodeInHierarchy(hierarchical, 'step1-1');
      expect(result).not.toBeNull();
      expect(result!.data.id).toBe('step1-1');
      expect(result!.data.texts[0]).toBe('鶏もも肉');
    });

    test('存在しないIDの場合はnullを返す', () => {
      const flatElements = createSampleFlatElements();
      const hierarchical = convertFlatToHierarchical(flatElements)!;

      const result = findNodeInHierarchy(hierarchical, 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findParentNodeInHierarchy', () => {
    test('指定されたノードの親を正しく見つける', () => {
      const flatElements = createSampleFlatElements();
      const hierarchical = convertFlatToHierarchical(flatElements)!;

      const result = findParentNodeInHierarchy(hierarchical, 'step1-1');
      expect(result).not.toBeNull();
      expect(result!.data.id).toBe('step1');
    });

    test('ルートノードの場合はnullを返す', () => {
      const flatElements = createSampleFlatElements();
      const hierarchical = convertFlatToHierarchical(flatElements)!;

      const result = findParentNodeInHierarchy(hierarchical, 'root001');
      expect(result).toBeNull();
    });

    test('存在しないIDの場合はnullを返す', () => {
      const flatElements = createSampleFlatElements();
      const hierarchical = convertFlatToHierarchical(flatElements)!;

      const result = findParentNodeInHierarchy(hierarchical, 'nonexistent');
      expect(result).toBeNull();
    });
  });
});
