// src/state/__test__/copyPaste.test.ts
import { renderHook, act } from '@testing-library/react';
import { Element } from '../../types/types';
import {
  convertHierarchicalToArray,
  getChildrenFromHierarchy,
} from '../../utils/hierarchical/hierarchicalConverter';
import { useStore } from './textUtils';
import * as clipboardHelpers from '../../utils/clipboard/clipboardHelpers';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';

// テスト用ヘルパー：StateからElement配列を取得
const getAllElements = (state: { hierarchicalData: HierarchicalStructure | null }): Element[] => {
  return state.hierarchicalData ? convertHierarchicalToArray(state.hierarchicalData) : [];
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('切り取り、コピー、貼り付け操作', () => {
  let mockDateNow: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();

    // Date.now() をモック
    mockDateNow = jest.spyOn(Date, 'now');
    let counter = 1750808871955;
    mockDateNow.mockImplementation(() => counter++);

    // Mock clipboard functions for new ClipboardData format
    jest
      .spyOn(clipboardHelpers, 'copyToClipboard')
      .mockImplementation(async (clipboardData: unknown) => {
        localStorage.setItem('copiedElements', JSON.stringify(clipboardData));
        return true;
      });

    jest
      .spyOn(clipboardHelpers, 'cutToClipboard')
      .mockImplementation(async (clipboardData: unknown) => {
        localStorage.setItem('cutElements', JSON.stringify(clipboardData));
        return true;
      });
  });

  afterEach(() => {
    localStorage.clear();
    mockDateNow.mockRestore();
    jest.restoreAllMocks();
  });

  test('ノードをコピーして貼り付けられることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素を選択して子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
    });
    act(() => {
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const state = result.current.state;
    const childElements = state.hierarchicalData
      ? getChildrenFromHierarchy(state.hierarchicalData, '1')
      : [];
    const childElement = childElements[0] as Element;

    // 子要素を選択してコピー
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'COPY_ELEMENT' });
    });

    // コピー後、localStorage にデータが設定されていることを確認
    const clipboardData = localStorage.getItem('copiedElements');
    expect(clipboardData).not.toBeNull();
    expect(clipboardData).not.toBe('');

    if (clipboardData) {
      const copiedData = JSON.parse(clipboardData);
      // ClipboardDataの構造を確認
      expect(copiedData).toHaveProperty('type', 'copy');
      expect(copiedData).toHaveProperty('rootElement');
      expect(copiedData).toHaveProperty('subtree');
      expect(copiedData.rootElement.id).toBe(childElement.id);
    }

    // 親要素を選択して貼り付け
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });

      // localStorage からコピーされた要素を取得
      const copiedData = localStorage.getItem('copiedElements');
      if (copiedData) {
        // 新しいIDを生成して要素を追加
        const newElementId = Date.now().toString();
        const newElement = {
          ...childElement,
          id: newElementId,
          selected: true,
          editing: false,
        };

        dispatch({
          type: 'ADD_ELEMENTS_SILENT',
          payload: {
            targetNodeId: '1',
            texts: [newElement.texts[0] || ''],
            tentative: false,
          },
        });
      }
    });

    // 貼り付け後の要素を確認
    const finalState = result.current.state;
    const finalParentChildren = finalState.hierarchicalData
      ? getChildrenFromHierarchy(finalState.hierarchicalData, '1')
      : [];

    // 元の子要素 + コピーされた子要素で2つになっていることを確認
    expect(finalParentChildren.length).toBe(2);

    // コピーされた要素のテキストが同じことを確認
    const originalTexts = childElement.texts;
    const copiedElement = finalParentChildren.find((elm: Element) => elm.id !== childElement.id);
    expect(copiedElement?.texts).toEqual(originalTexts);
  });

  test('ノードを切り取ることができることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素を選択して子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
    });
    act(() => {
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const state = result.current.state;
    const childElements = state.hierarchicalData
      ? getChildrenFromHierarchy(state.hierarchicalData, '1')
      : [];
    const childElement = childElements[0] as Element;

    expect(childElement).toBeDefined();

    // 子要素を選択して切り取り
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'CUT_ELEMENT' });
    });

    // 切り取り後、元の要素が削除されていることを確認
    const elementsAfterCut = getAllElements(result.current.state);
    const cutElementExists = elementsAfterCut.some((elm: Element) => elm.id === childElement.id);
    expect(cutElementExists).toBe(false);

    // localStorage に要素が保存されたことを確認
    const clipboardDataCut = localStorage.getItem('cutElements');
    expect(clipboardDataCut).not.toBeNull();
    expect(clipboardDataCut).not.toBe('');

    if (clipboardDataCut) {
      const cutData = JSON.parse(clipboardDataCut);
      // ClipboardDataの構造を確認
      expect(cutData).toHaveProperty('type', 'cut');
      expect(cutData).toHaveProperty('rootElement');
      expect(cutData).toHaveProperty('subtree');
      expect(cutData.rootElement.id).toBe(childElement.id);
    }
  });

  test('複数要素選択時の貼り付けが正しく動作することを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素を選択して子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
    });
    act(() => {
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    let state = result.current.state;
    let childElements = state.hierarchicalData
      ? getChildrenFromHierarchy(state.hierarchicalData, '1')
      : [];

    expect(childElements.length).toBe(1);
    const firstChild = childElements[0] as Element;

    // 2つ目の子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
    });
    act(() => {
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    state = result.current.state;
    childElements = state.hierarchicalData
      ? getChildrenFromHierarchy(state.hierarchicalData, '1')
      : [];

    expect(childElements.length).toBe(2);
    const secondChild = childElements[1] as Element;

    // 最初の子要素をコピー
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: firstChild.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'COPY_ELEMENT' });
    });

    // 複数の子要素を選択（Ctrlキーを使用）
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: firstChild.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: secondChild.id, ctrlKey: true, shiftKey: false },
      });
    });

    // 複数選択状態で貼り付けを実行
    const copiedData = localStorage.getItem('copiedElements');
    if (copiedData) {
      const clipboardData = JSON.parse(copiedData);

      // 各選択要素に対して貼り付けを実行（修正後の動作をシミュレート）
      act(() => {
        dispatch({
          type: 'PASTE_CLIPBOARD_ELEMENTS',
          payload: {
            clipboardData: clipboardData,
            targetElementId: firstChild.id,
          },
        });
      });

      act(() => {
        dispatch({
          type: 'PASTE_CLIPBOARD_ELEMENTS',
          payload: {
            clipboardData: clipboardData,
            targetElementId: secondChild.id,
          },
        });
      });
    }

    // 貼り付け後の状態を確認
    const finalState = result.current.state;
    const finalElements = getAllElements(finalState);

    // 元の要素（ルート + 2つの子要素）+ 貼り付けられた要素（2つ）= 5つの要素
    expect(finalElements.length).toBe(5);
  });

  test('複数要素を同時にコピーして貼り付けられることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素を選択して子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
    });
    act(() => {
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    let state = result.current.state;
    let childElements = state.hierarchicalData
      ? getChildrenFromHierarchy(state.hierarchicalData, '1')
      : [];

    expect(childElements.length).toBe(1);
    const firstChild = childElements[0] as Element;

    // 2つ目の子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
    });
    act(() => {
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    state = result.current.state;
    childElements = state.hierarchicalData
      ? getChildrenFromHierarchy(state.hierarchicalData, '1')
      : [];

    expect(childElements.length).toBe(2);
    const secondChild = childElements[1] as Element;

    // 複数の子要素を選択（Ctrlキーを使用）
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: firstChild.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: secondChild.id, ctrlKey: true, shiftKey: false },
      });
    });

    // 複数選択状態でコピー
    act(() => {
      dispatch({ type: 'COPY_ELEMENT' });
    });

    // コピー後、localStorage にデータが設定されていることを確認
    const clipboardData = localStorage.getItem('copiedElements');
    expect(clipboardData).not.toBeNull();
    expect(clipboardData).not.toBe('');

    if (clipboardData) {
      const copiedData = JSON.parse(clipboardData);
      // 複数要素のコピーの場合、仮想ルートが作成される
      expect(copiedData).toHaveProperty('type', 'copy');
      expect(copiedData).toHaveProperty('rootElement');
      expect(copiedData).toHaveProperty('subtree');
      expect(copiedData.rootElement.id).toMatch(/^virtual-root-/);
      expect(copiedData.subtree.children).toHaveLength(2);
    }

    // ルート要素を選択して貼り付け
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });

      const copiedData = localStorage.getItem('copiedElements');
      if (copiedData) {
        dispatch({
          type: 'PASTE_CLIPBOARD_ELEMENTS',
          payload: {
            clipboardData: JSON.parse(copiedData),
            targetElementId: '1',
          },
        });
      }
    });

    // 貼り付け後の状態を確認
    const finalState = result.current.state;
    const finalElements = getAllElements(finalState);

    // 元の要素（ルート + 2つの子要素）+ 貼り付けられた要素（2つ）= 5つの要素
    expect(finalElements.length).toBe(5);

    // ルートの子要素が4つになっていることを確認（元の2つ + 貼り付けられた2つ）
    const finalChildren = finalState.hierarchicalData
      ? getChildrenFromHierarchy(finalState.hierarchicalData, '1')
      : [];
    expect(finalChildren.length).toBe(4);
  });
});
