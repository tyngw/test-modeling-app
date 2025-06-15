// src/state/__test__/dragAndDrop.test.ts
import { renderHook, act } from '@testing-library/react';
import { useStore } from './textUtils';
import { Element } from '../../types/types';

describe('ドラッグ＆ドロップ', () => {
  it('ノードをドロップした時に移動できることを確認する', async () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    await act(async () => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    let state = result.current.state;
    const elementB = Object.values(state.elements).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    await act(async () => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    state = result.current.state;
    const elementC = Object.values(state.elements).find(
      (elm: Element) => elm.parentId === '1' && elm.id !== elementB.id,
    ) as Element;

    await act(async () => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: elementB.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    state = result.current.state;
    const elementD = Object.values(state.elements).find(
      (elm: Element) => elm.parentId === elementB.id,
    ) as Element;

    await act(async () => {
      dispatch({
        type: 'DROP_ELEMENT',
        payload: {
          id: elementD.id,
          oldParentId: elementB.id,
          newParentId: elementC.id,
          newOrder: 0, // draggingElementOrder → newOrderに修正
          depth: elementC.depth + 1,
        },
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    state = result.current.state;
    const oldParentB = Object.values(state.elements).find(
      (elm: Element) => elm.id === elementB.id,
    ) as Element;
    const newParentC = Object.values(state.elements).find(
      (elm: Element) => elm.id === elementC.id,
    ) as Element;
    const movedElement = Object.values(state.elements).find(
      (elm: Element) => elm.id === elementD.id,
    ) as Element;

    // 移動元のorder再計算を確認
    const oldSiblings = Object.values(state.elements)
      .filter((e) => e.parentId === elementB.id)
      .sort((a, b) => a.order - b.order);

    expect(oldSiblings.length).toBe(0);
    expect(movedElement.parentId).toBe(newParentC.id);
    expect(oldParentB).toMatchObject({
      children: 0,
    });
    expect(newParentC).toMatchObject({
      children: 1,
    });
  });

  it('親ノードを子ノードにドロップできないことを確認する', async () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // 親ノードと子ノードを作成
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    const initialState = result.current.state;
    const parentElement = initialState.elements['1'];
    const childElement = Object.values(initialState.elements).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    // 親ノードを子ノードにドロップしようとする
    await act(async () => {
      dispatch({
        type: 'DROP_ELEMENT',
        payload: {
          id: parentElement.id,
          oldParentId: null,
          newParentId: childElement.id,
          newOrder: 0,
          depth: childElement.depth + 1,
        },
      });
    });

    const afterState = result.current.state;

    // 状態が変化していないことを確認
    expect(afterState.elements).toEqual(initialState.elements);
    expect(afterState.elements[parentElement.id].parentId).toBeNull();
    expect(afterState.elements[childElement.id]).toMatchObject({
      children: 0,
    });
  });

  it('親ノードを孫ノードにドロップできないことを確認する', async () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // 3階層のノードを作成 (1 -> 2 -> 3)
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    let state = result.current.state;
    const elementB = Object.values(state.elements).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: elementB.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'ADD_ELEMENT', payload: {} });
    });

    state = result.current.state;
    const elementC = Object.values(state.elements).find(
      (elm: Element) => elm.parentId === elementB.id,
    ) as Element;

    // ルートノード(1)を孫ノード(3)にドロップしようとする
    await act(async () => {
      dispatch({
        type: 'DROP_ELEMENT',
        payload: {
          id: '1',
          oldParentId: null,
          newParentId: elementC.id,
          newOrder: 0,
          depth: elementC.depth + 1,
        },
      });
    });

    const afterState = result.current.state;

    // 状態が変化していないことを確認
    expect(afterState.elements['1'].parentId).toBeNull();
    expect(afterState.elements[elementC.id]).toMatchObject({
      children: 0,
    });
  });

  it('ノードを自身にドロップできないことを確認する', async () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    const initialElement = result.current.state.elements['1'];

    // 自分自身にドロップしようとする
    await act(async () => {
      dispatch({
        type: 'DROP_ELEMENT',
        payload: {
          id: '1',
          oldParentId: null,
          newParentId: '1',
          newOrder: 0,
          depth: initialElement.depth + 1,
        },
      });
    });

    const afterState = result.current.state;

    // 状態が変化していないことを確認
    expect(afterState.elements['1'].parentId).toBeNull();
    expect(afterState.elements['1']).toMatchObject({
      children: 0,
    });
  });

  it('中間要素を移動後にorderが連番になることを確認', async () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // 親要素に3つの子要素を作成
    await act(async () => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} }); // order 0
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} }); // order 1
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT', payload: {} }); // order 2
    });

    let state = result.current.state;
    const children = Object.values(state.elements)
      .filter((e) => e.parentId === '1')
      .sort((a, b) => a.order - b.order);

    // 要素が3つ作成されていることを確認
    expect(children).toHaveLength(3);

    // 中間要素（order 1）をルートに移動
    await act(async () => {
      dispatch({
        type: 'DROP_ELEMENT',
        payload: {
          id: children[1].id,
          oldParentId: '1',
          newParentId: null, // ルートに移動
          newOrder: 1, // 既存のルート要素（id:1）の後ろに配置
          depth: 1,
        },
      });
    });

    state = result.current.state;

    // 移動後の元の親要素（id:1）の子要素を確認
    const updatedChildren = Object.values(state.elements)
      .filter((e) => e.parentId === '1')
      .sort((a, b) => a.order - b.order);

    // 残った要素のorderが0,1になっていることを確認
    expect(updatedChildren.map((e) => e.order)).toEqual([0, 1]);
    expect(updatedChildren).toHaveLength(2);

    // 移動された要素の状態を確認
    const movedElement = state.elements[children[1].id];
    expect(movedElement.parentId).toBeNull();
    expect(movedElement.order).toBe(1);
    expect(movedElement.depth).toBe(1);
  });
});
