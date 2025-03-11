// src/state/__test__/dragAndDrop.test.ts
import { renderHook, act } from '@testing-library/react';
import { useStore } from './textUtils';
import { Element } from '../../types';


describe('ドラッグ＆ドロップ', () => {
    it('ノードをドロップした時に移動できることを確認する', async () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        await act(async () => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        let state = result.current.state;
        let elementB = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1'
        ) as Element;

        await act(async () => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        state = result.current.state;
        let elementC = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1' && elm.id !== elementB.id
        ) as Element;

        await act(async () => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: elementB.id, ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        state = result.current.state;
        const elementD = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === elementB.id
        ) as Element;

        await act(async () => {
            dispatch({
                type: 'DROP_ELEMENT',
                payload: {
                    id: elementD.id,
                    oldParentId: elementB.id,
                    newParentId: elementC.id,
                    draggingElementOrder: elementD.order,
                    depth: elementC.depth + 1
                }
            });
        });

        await new Promise(resolve => setTimeout(resolve, 0));

        state = result.current.state;
        const oldParentB = Object.values(state.elements).find(
            (elm: Element) => elm.id === elementB.id
        ) as Element;
        const newParentC = Object.values(state.elements).find(
            (elm: Element) => elm.id === elementC.id
        ) as Element;
        const movedElement = Object.values(state.elements).find(
            (elm: Element) => elm.id === elementD.id
        ) as Element;

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
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        const initialState = result.current.state;
        const parentElement = initialState.elements['1'];
        const childElement = Object.values(initialState.elements).find(
            (elm: Element) => elm.parentId === '1'
        ) as Element;

        // 親ノードを子ノードにドロップしようとする
        await act(async () => {
            dispatch({
                type: 'DROP_ELEMENT',
                payload: {
                    id: parentElement.id,
                    oldParentId: null,
                    newParentId: childElement.id,
                    draggingElementOrder: 0,
                    depth: childElement.depth + 1
                }
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
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
            dispatch({ type: 'ADD_ELEMENT' }); // Element 2
        });

        let state = result.current.state;
        const elementB = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1'
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: elementB.id });
            dispatch({ type: 'ADD_ELEMENT' }); // Element 3
        });

        state = result.current.state;
        const elementC = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === elementB.id
        ) as Element;

        // ルートノード(1)を孫ノード(3)にドロップしようとする
        await act(async () => {
            dispatch({
                type: 'DROP_ELEMENT',
                payload: {
                    id: '1',
                    oldParentId: null,
                    newParentId: elementC.id,
                    draggingElementOrder: 0,
                    depth: elementC.depth + 1
                }
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
                    draggingElementOrder: 0,
                    depth: initialElement.depth + 1
                }
            });
        });

        const afterState = result.current.state;

        // 状態が変化していないことを確認
        expect(afterState.elements['1'].parentId).toBeNull();
        expect(afterState.elements['1']).toMatchObject({
            children: 0,
        });
    });
});