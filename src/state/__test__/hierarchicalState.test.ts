// src/state/__test__/hierarchicalState.test.ts
import { renderHook, act } from '@testing-library/react';
import { Element } from '../../types/types';
import { getAllElementsFromHierarchy } from '../../utils/hierarchical/hierarchicalConverter';
import { useStore } from './textUtils';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';

// テスト用ヘルパー：StateからElement配列を取得
const getAllElements = (state: { hierarchicalData: HierarchicalStructure | null }): Element[] => {
  return state.hierarchicalData ? getAllElementsFromHierarchy(state.hierarchicalData) : [];
};

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
    const elements = getAllElements(state);
    const childElements = elements.filter((elm: Element) => elm.parentId === '1');

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
    const firstChild = getAllElements(firstState).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    // 子要素に孫要素を追加
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: firstChild.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const secondState = result.current.state;
    const elements = getAllElements(secondState);
    const grandChild = elements.find((elm: Element) => elm.parentId === firstChild.id);

    expect(grandChild).toBeDefined();
    expect(grandChild?.parentId).toBe(firstChild.id);
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
    const childElement = getAllElements(state).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    // 子要素を削除
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'DELETE_ELEMENT' });
    });

    const finalState = result.current.state;
    const finalElements = getAllElements(finalState);
    const deletedElementExists = finalElements.some((elm: Element) => elm.id === childElement.id);

    expect(deletedElementExists).toBe(false);
    if (finalState.hierarchicalData) {
      expect((finalState.hierarchicalData.root.children || []).length).toBe(0);
    }
  });
});
