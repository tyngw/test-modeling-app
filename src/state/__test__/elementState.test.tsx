// src/state/__test__/elementState.test.ts
import { useStore } from './textUtils';
import { renderHook, act } from '@testing-library/react';
import { Element } from '../../types/types';
import { initialState } from '../state';

describe('要素状態管理', () => {
  it('ノードが選択できることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
    });

    const newState = result.current.state;
    const elements = Object.values(newState.elementsCache) as Element[];
    expect(elements[0].selected).toBe(true);
    expect(elements[0].editing).toBe(false);
    elements
      .filter((elm) => elm.id !== '1')
      .forEach((element) => {
        expect(element.selected).toBe(false);
      });
  });

  it('ノードの選択が解除できることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
    });
    act(() => {
      dispatch({ type: 'DESELECT_ALL' });
    });

    const newState = result.current.state;
    (Object.values(newState.elementsCache) as Element[]).forEach((element) => {
      expect(element.selected).toBe(false);
      expect(element.editing).toBe(false);
    });
  });

  it('ノードを折りたたみ、展開できることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const childElement = Object.values(result.current.state.elementsCache).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'COLLAPSE_ELEMENT' });
    });

    const collapsedState = result.current.state.elementsCache;
    expect(
      (Object.values(collapsedState).find((elm: Element) => elm.id === childElement.id) as Element)
        .visible,
    ).toBe(false);

    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'EXPAND_ELEMENT' });
    });

    const expandedState = result.current.state.elementsCache;
    expect(
      (Object.values(expandedState).find((elm: Element) => elm.id === childElement.id) as Element)
        .visible,
    ).toBe(true);
  });

  it('CONFIRM_TENTATIVE_ELEMENTSが動作することを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
      dispatch({
        type: 'ADD_ELEMENTS_SILENT',
        payload: { tentative: true, texts: ['Test1', 'Test2'] },
      });
    });

    const parentId = '1';
    const tentativeElements = Object.values(result.current.state.elementsCache).filter(
      (e: Element) => e.tentative && e.parentId === parentId,
    );
    expect(tentativeElements.length).toBe(2);

    act(() => {
      dispatch({ type: 'CONFIRM_TENTATIVE_ELEMENTS', payload: parentId });
    });

    const confirmedElements = Object.values(result.current.state.elementsCache).filter(
      (e: Element) => e.parentId === parentId && !e.tentative,
    );
    // expect(confirmedElements.length).toBe(2);
    expect(confirmedElements).toHaveLength(2);
    expect(result.current.state.elementsCache[parentId]).toMatchObject({
      children: 2,
    });
  });

  it('CANCEL_TENTATIVE_ELEMENTSが動作することを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
      dispatch({
        type: 'ADD_ELEMENTS_SILENT',
        payload: { tentative: true, texts: ['Test1', 'Test2'] },
      });
    });

    const parentId = '1';
    act(() => {
      dispatch({ type: 'CANCEL_TENTATIVE_ELEMENTS', payload: parentId });
    });

    const remainingElements = Object.values(result.current.state.elementsCache).filter(
      (e: Element) => e.parentId === parentId,
    );
    expect(remainingElements).toHaveLength(0);

    // 階層構造では children プロパティが自動計算されるため、実際の子要素数を確認
    const actualChildren = Object.values(result.current.state.elementsCache).filter(
      (e: Element) => e.parentId === parentId,
    ).length;
    expect(actualChildren).toBe(0);
  });

  it('LOAD_ELEMENTSで正常なデータをロードできることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    const testElements = {
      test1: {
        ...initialState.elementsCache['1'],
        id: 'test1',
        texts: ['Loaded Element'],
        children: 1,
      },
      test2: {
        ...initialState.elementsCache['1'],
        id: 'test2',
        parentId: 'test1',
        texts: ['Child Element'],
        depth: 2,
      },
    };

    act(() => {
      dispatch({ type: 'LOAD_ELEMENTS', payload: testElements });
    });

    const loadedState = result.current.state;
    expect(Object.keys(loadedState.elementsCache)).toHaveLength(2);
    // expect(loadedState.elementsCache['test1'].children).toBe(1);
    expect(loadedState.elementsCache['test1']).toMatchObject({
      children: 1,
    });
    // expect(loadedState.elementsCache['test2'].depth).toBe(2);
    expect(loadedState.elementsCache['test2']).toMatchObject({
      depth: 2,
    });
  });

  it('UPDATE_ELEMENT_SIZE アクション', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    const newSize = {
      width: 200,
      height: 300,
      sectionHeights: [100, 100, 100],
    };

    act(() => {
      dispatch({
        type: 'UPDATE_ELEMENT_SIZE',
        payload: { id: '1', ...newSize },
      });
    });

    const updatedElement = Object.values(result.current.state.elementsCache)[0] as Element;
    expect(updatedElement.width).toBe(newSize.width);
    expect(updatedElement.height).toBe(newSize.height);
  });

  it('ノードが移動できることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    const newPosition = { x: 100, y: 200 };
    act(() => {
      dispatch({
        type: 'MOVE_ELEMENT',
        payload: { id: '1', ...newPosition },
      });
    });

    const movedElement = Object.values(result.current.state.elementsCache)[0] as Element;
    expect(movedElement.x).toBe(newPosition.x);
    expect(movedElement.y).toBe(newPosition.y);
  });
});
