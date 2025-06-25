import { renderHook, act } from '@testing-library/react';
import { useStore } from './textUtils';
import { Element } from '../../types/types';
import { getAllElementsFromHierarchy } from '../../utils/hierarchical/hierarchicalConverter';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';

// ヘルパー関数
const getAllElements = (state: { hierarchicalData: HierarchicalStructure | null }): Element[] => {
  return state.hierarchicalData ? getAllElementsFromHierarchy(state.hierarchicalData) : [];
};

describe('ドラッグ＆ドロップ', () => {
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
  it('子要素が正しく追加されることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // 子要素を追加
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: '1', ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const state = result.current.state;
    const allElements = getAllElements(state);
    const childElement = allElements.find((elm: Element) => elm.parentId === '1');

    expect(childElement).toBeDefined();
    expect(childElement?.parentId).toBe('1');
  });

  it('親ノードを子ノードにドロップできないことを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // 子要素を追加
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: '1', ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const state = result.current.state;
    const allElements = getAllElements(state);
    const parentElement = allElements.find((elm) => elm.id === '1') as Element;
    const childElement = allElements.find((elm: Element) => elm.parentId === '1') as Element;

    // 親要素を子要素にドロップしようとする（これは無効な操作）
    act(() => {
      dispatch({
        type: 'DROP_ELEMENT',
        payload: {
          id: parentElement.id,
          newParentId: childElement.id,
          newOrder: 0,
        },
      });
    });

    const afterState = result.current.state;
    const afterElements = getAllElements(afterState);
    const parentAfter = afterElements.find((elm) => elm.id === parentElement.id);
    const childAfter = afterElements.find((elm) => elm.id === childElement.id);

    // 状態が変化していないか、適切に処理されていることを確認
    // 親要素は依然として子要素の親である
    expect(parentAfter?.parentId).toBeNull();
    expect(childAfter?.parentId).toBe(parentElement.id);
  });

  it('ノードを自身にドロップできないことを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // 自分自身にドロップしようとする
    act(() => {
      dispatch({
        type: 'DROP_ELEMENT',
        payload: {
          id: '1',
          newParentId: '1',
          newOrder: 0,
        },
      });
    });

    const finalState = result.current.state;
    const finalElements = getAllElements(finalState);
    const finalElement = finalElements.find((elm) => elm.id === '1');

    // 状態が変化していない
    expect(finalElement?.parentId).toBeNull();
  });

  it('複数の子要素が正しく追加されることを確認', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // 複数の子要素を追加
    for (let i = 0; i < 3; i++) {
      act(() => {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: '1', ctrlKey: false, shiftKey: false },
        });
        dispatch({ type: 'ADD_ELEMENT', payload: {} });
      });
    }

    const finalState = result.current.state;
    const finalElements = getAllElements(finalState);
    const finalChildren = finalElements.filter((e) => e.parentId === '1');

    // 3つの子要素が追加されていることを確認
    expect(finalChildren.length).toBe(3);
  });
});
