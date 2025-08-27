// src/utils/clipboard/__tests__/clipboardHelpers.test.ts

import { parseHierarchicalText } from '../clipboardHelpers';
import {
  getIndentSpacesPerLevel,
  setIndentSpacesPerLevel,
} from '../../storage/localStorageHelpers';

// localStorageのモック
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('parseHierarchicalText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('4スペースインデント設定', () => {
    beforeEach(() => {
      // 4スペース設定をモック
      mockLocalStorage.getItem.mockReturnValue('4');
    });

    test('4スペースでインデントレベルを正しく判定する', () => {
      const lines = ['レベル0', '    レベル1', '        レベル2', '    レベル1-2'];

      const result = parseHierarchicalText(lines);

      expect(result).toEqual([
        { text: 'レベル0', level: 0, originalLine: 'レベル0' },
        { text: 'レベル1', level: 1, originalLine: '    レベル1' },
        { text: 'レベル2', level: 2, originalLine: '        レベル2' },
        { text: 'レベル1-2', level: 1, originalLine: '    レベル1-2' },
      ]);
    });

    test('3スペースは0レベルとして扱われる', () => {
      const lines = ['   3スペース'];
      const result = parseHierarchicalText(lines);
      expect(result[0].level).toBe(0);
    });

    test('5スペースは1レベルとして扱われる', () => {
      const lines = ['     5スペース'];
      const result = parseHierarchicalText(lines);
      expect(result[0].level).toBe(1);
    });
  });

  describe('2スペースインデント設定', () => {
    beforeEach(() => {
      // 2スペース設定をモック
      mockLocalStorage.getItem.mockReturnValue('2');
    });

    test('2スペースでインデントレベルを正しく判定する', () => {
      const lines = ['レベル0', '  レベル1', '    レベル2', '  レベル1-2'];

      const result = parseHierarchicalText(lines);

      expect(result).toEqual([
        { text: 'レベル0', level: 0, originalLine: 'レベル0' },
        { text: 'レベル1', level: 1, originalLine: '  レベル1' },
        { text: 'レベル2', level: 2, originalLine: '    レベル2' },
        { text: 'レベル1-2', level: 1, originalLine: '  レベル1-2' },
      ]);
    });

    test('1スペースは0レベルとして扱われる', () => {
      const lines = [' 1スペース'];
      const result = parseHierarchicalText(lines);
      expect(result[0].level).toBe(0);
    });

    test('3スペースは1レベルとして扱われる', () => {
      const lines = ['   3スペース'];
      const result = parseHierarchicalText(lines);
      expect(result[0].level).toBe(1);
    });
  });

  describe('タブ文字', () => {
    test('タブ文字は設定に関係なく1つで1レベル', () => {
      // 4スペース設定
      mockLocalStorage.getItem.mockReturnValue('4');

      const lines = ['レベル0', '\tレベル1', '\t\tレベル2'];

      const result = parseHierarchicalText(lines);

      expect(result).toEqual([
        { text: 'レベル0', level: 0, originalLine: 'レベル0' },
        { text: 'レベル1', level: 1, originalLine: '\tレベル1' },
        { text: 'レベル2', level: 2, originalLine: '\t\tレベル2' },
      ]);
    });
  });

  describe('混在パターン', () => {
    test('タブとスペースが混在している場合', () => {
      mockLocalStorage.getItem.mockReturnValue('4');

      const lines = [
        'レベル0',
        '\tタブレベル1',
        '    スペースレベル1',
        '\t\tタブレベル2',
        '        スペースレベル2',
      ];

      const result = parseHierarchicalText(lines);

      expect(result.map((r) => ({ text: r.text, level: r.level }))).toEqual([
        { text: 'レベル0', level: 0 },
        { text: 'タブレベル1', level: 1 },
        { text: 'スペースレベル1', level: 1 },
        { text: 'タブレベル2', level: 2 },
        { text: 'スペースレベル2', level: 2 },
      ]);
    });
  });
});

describe('インデント設定の保存と読み込み', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('デフォルト値は4', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    expect(getIndentSpacesPerLevel()).toBe(4);
  });

  test('2を設定できる', () => {
    setIndentSpacesPerLevel(2);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('indentSpacesPerLevel', '2');
  });

  test('4を設定できる', () => {
    setIndentSpacesPerLevel(4);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('indentSpacesPerLevel', '4');
  });

  test('無効な値は設定されない', () => {
    setIndentSpacesPerLevel(3 as 2 | 4);
    expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
  });

  test('保存された値を正しく読み込む', () => {
    mockLocalStorage.getItem.mockReturnValue('2');
    expect(getIndentSpacesPerLevel()).toBe(2);
  });

  test('無効な保存値の場合はデフォルト値を返す', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid');
    expect(getIndentSpacesPerLevel()).toBe(4);
  });
});
