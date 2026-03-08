// src/state/__test__/hierarchicalState.test.ts
import { renderHook, act } from '@testing-library/react';
import { Element } from '../../types/types';
import {
  getChildrenFromHierarchy,
  findParentNodeInHierarchy,
  findElementInHierarchy,
} from '../../utils/hierarchical/hierarchicalConverter';
import { useStore } from './textUtils';

describe('Hierarchical Data State Management', () => {
  let mockDateNow: jest.SpyInstance;

  beforeEach(() => {
    // テスト間の状態をクリーンアップ
    localStorage.clear();
    sessionStorage.clear();

    // Date.now() をモック
    mockDateNow = jest.spyOn(Date, 'now');
    let counter = 1750808871955;
    mockDateNow.mockImplementation(() => counter++);
  });

  afterEach(() => {
    mockDateNow.mockRestore();
  });
  test('階層データが正しく管理されることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // 初期状態の確認
    expect(result.current.state.hierarchicalData).toBeDefined();
    if (result.current.state.hierarchicalData) {
      expect(result.current.state.hierarchicalData.root.data.id).toBe('1');
      expect(result.current.state.hierarchicalData.root.children || []).toEqual([]);
    }

    // 子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const state = result.current.state;
    const childElements = state.hierarchicalData
      ? getChildrenFromHierarchy(state.hierarchicalData, '1')
      : [];

    expect(childElements.length).toBe(1);
    if (state.hierarchicalData) {
      expect((state.hierarchicalData.root.children || []).length).toBe(1);
    }
  });

  test('要素が階層構造で正しく追加されることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素に子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const firstState = result.current.state;
    const firstChildElements = firstState.hierarchicalData
      ? getChildrenFromHierarchy(firstState.hierarchicalData, '1')
      : [];
    const firstChild = firstChildElements[0] as Element;

    // 子要素に孫要素を追加
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: firstChild.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const secondState = result.current.state;
    const grandChildElements = secondState.hierarchicalData
      ? getChildrenFromHierarchy(secondState.hierarchicalData, firstChild.id)
      : [];
    const grandChild = grandChildElements[0];

    expect(grandChild).toBeDefined();
    // 階層構造で親子関係が正しく設定されていることを確認
    if (secondState.hierarchicalData && grandChild) {
      const parentNode = findParentNodeInHierarchy(secondState.hierarchicalData, grandChild.id);
      expect(parentNode?.data.id).toBe(firstChild.id);
    }
  });

  test('要素が削除された時に階層データから正しく削除されることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // 子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const state = result.current.state;
    const childElements = state.hierarchicalData
      ? getChildrenFromHierarchy(state.hierarchicalData, '1')
      : [];
    const childElement = childElements[0] as Element;

    // 子要素を削除
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'DELETE_ELEMENT' });
    });

    const finalState = result.current.state;

    // 階層構造から直接削除された要素が存在しないことを確認
    const deletedElementExists = finalState.hierarchicalData
      ? findElementInHierarchy(finalState.hierarchicalData, childElement.id) !== undefined
      : false;

    expect(deletedElementExists).toBe(false);
    if (finalState.hierarchicalData) {
      expect((finalState.hierarchicalData.root.children || []).length).toBe(0);
    }
  });

  test('選択要素配下の階層全体を置き換えできることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    act(() => {
      dispatch({
        type: 'REPLACE_CHILDREN_WITH_HIERARCHY',
        payload: {
          targetNodeId: '1',
          rootText: '更新後ルート',
          hierarchicalItems: [
            { text: '分類A', level: 0, originalLine: '- 分類A' },
            { text: '分類A-詳細1', level: 1, originalLine: '  - 分類A-詳細1' },
            { text: '分類B', level: 0, originalLine: '- 分類B' },
          ],
        },
      });
    });

    const state = result.current.state;
    const rootChildren = state.hierarchicalData ? getChildrenFromHierarchy(state.hierarchicalData, '1') : [];

    expect(rootChildren).toHaveLength(2);
  expect(state.hierarchicalData?.root.data.texts[0]).toBe('更新後ルート');
    expect(rootChildren[0].texts[0]).toBe('分類A');
    expect(rootChildren[1].texts[0]).toBe('分類B');

    if (state.hierarchicalData) {
      const nestedChildren = getChildrenFromHierarchy(state.hierarchicalData, rootChildren[0].id);
      expect(nestedChildren).toHaveLength(1);
      expect(nestedChildren[0].texts[0]).toBe('分類A-詳細1');
    }
  });
});
