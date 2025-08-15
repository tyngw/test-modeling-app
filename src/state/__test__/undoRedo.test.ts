// src/state/__test__/undoRedo.test.ts
import { renderHook, act } from '@testing-library/react';
import { useStore } from './textUtils';
import {
  findElementInHierarchy,
  createElementsMapFromHierarchy,
} from '../../utils/hierarchical/hierarchicalConverter';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';

// ヘルパー関数: hierarchicalDataから要素の配列を取得
const getElementsFromState = (state: { hierarchicalData: HierarchicalStructure | null }) => {
  if (!state.hierarchicalData) return [];
  const elementsMap = createElementsMapFromHierarchy(state.hierarchicalData);
  return Object.values(elementsMap);
};

// ヘルパー関数: hierarchicalDataから特定の要素を取得
const getElementById = (state: { hierarchicalData: HierarchicalStructure | null }, id: string) => {
  if (!state.hierarchicalData) return null;
  return findElementInHierarchy(state.hierarchicalData, id);
};

describe('UNDO/REDO機能', () => {
  it('ノード追加時、UNDO/REDOできることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    const initialElements = getElementsFromState(result.current.state);
    act(() => {
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });
    const afterAddState = getElementsFromState(result.current.state);

    act(() => {
      dispatch({ type: 'UNDO' });
    });
    expect(getElementsFromState(result.current.state)).toEqual(initialElements);

    act(() => {
      dispatch({ type: 'REDO' });
    });
    expect(getElementsFromState(result.current.state)).toEqual(afterAddState);
  });

  it('UNDO/REDOがテキスト更新後に動作することを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    const initialElement = getElementById(result.current.state, '1');
    const initialText = initialElement?.texts[0] || '';
    const newText = 'Updated text';

    act(() => {
      dispatch({
        type: 'UPDATE_TEXT',
        payload: { id: '1', index: 0, value: newText },
      });
    });

    act(() => {
      dispatch({ type: 'UNDO' });
    });
    const elementAfterUndo = getElementById(result.current.state, '1');
    expect(elementAfterUndo?.texts[0]).toBe(initialText);

    act(() => {
      dispatch({ type: 'REDO' });
    });
    const elementAfterRedo = getElementById(result.current.state, '1');
    expect(elementAfterRedo?.texts[0]).toBe(newText);
  });
});
