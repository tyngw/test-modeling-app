// src/state/__test__/elementState.test.ts
import { useStore } from './textUtils';
import { renderHook, act } from '@testing-library/react';
import { Element } from '../../types/types';
import { getAllElementsFromHierarchy } from '../../utils/hierarchical/hierarchicalConverter';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';

// ヘルパー関数
const getAllElements = (state: { hierarchicalData: HierarchicalStructure | null }): Element[] => {
  return state.hierarchicalData ? getAllElementsFromHierarchy(state.hierarchicalData) : [];
};

describe('要素状態管理', () => {
  it('ノードが選択できることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: '1', ctrlKey: false, shiftKey: false },
      });
    });

    const newState = result.current.state;
    const elements = getAllElements(newState);
    const rootElement = elements.find((elm) => elm.id === '1');
    expect(rootElement?.selected).toBe(true);
    expect(rootElement?.editing).toBe(false);
    elements
      .filter((elm) => elm.id !== '1')
      .forEach((element) => {
        expect(element.selected).toBe(false);
      });
  });

  it('ノードの選択が解除できることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // まず選択してから解除
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: '1', ctrlKey: false, shiftKey: false },
      });
    });

    act(() => {
      dispatch({ type: 'DESELECT_ALL' });
    });

    const newState = result.current.state;
    const elements = getAllElements(newState);
    elements.forEach((element) => {
      expect(element.selected).toBe(false);
      expect(element.editing).toBe(false);
    });
  });

  it('子ノードを追加できることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素を選択して子要素を追加
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: '1', ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const newState = result.current.state;
    const allElements = getAllElements(newState);
    const childElement = allElements.find((elm: Element) => elm.parentId === '1');

    expect(childElement).toBeDefined();
    expect(childElement?.parentId).toBe('1');
  });

  it('単純なテキスト更新ができることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;
    const newText = 'Updated Text';

    act(() => {
      dispatch({
        type: 'UPDATE_TEXT',
        payload: {
          id: '1',
          index: 0,
          value: newText,
        },
      });
    });

    const updatedState = result.current.state;
    const rootElement = getAllElements(updatedState).find((elm) => elm.id === '1');
    expect(rootElement?.texts[0]).toBe(newText);
  });

  it('UPDATE_ELEMENT_SIZE アクション', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;
    const newSize = { width: 300, height: 250, sectionHeights: [100, 150] };

    act(() => {
      dispatch({
        type: 'UPDATE_ELEMENT_SIZE',
        payload: {
          id: '1',
          ...newSize,
        },
      });
    });

    const updatedElement = getAllElements(result.current.state).find((elm) => elm.id === '1');
    expect(updatedElement?.width).toBe(newSize.width);
    expect(updatedElement?.height).toBe(newSize.height);
  });

  it('ノードが移動できることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;
    const newPosition = { x: 150, y: 200 };

    act(() => {
      dispatch({
        type: 'MOVE_ELEMENT',
        payload: { id: '1', x: newPosition.x, y: newPosition.y },
      });
    });

    const movedElement = getAllElements(result.current.state).find((elm) => elm.id === '1');
    expect(movedElement?.x).toBe(newPosition.x);
    expect(movedElement?.y).toBe(newPosition.y);
  });
});
