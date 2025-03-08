// src/state/__test__/basicOperations.test.ts
import { renderHook, act } from '@testing-library/react';
import { useStore } from './textUtils';
import { Element } from '../../types';
import { SIZE } from '../../constants/elementSettings';

describe('基本操作', () => {
    it('初期状態', () => {
        const { result } = renderHook(() => useStore());
        const state = result.current.state;

        expect(Object.keys(state.elements).length).toBe(1);
        const rootElement = Object.values(state.elements)[0] as Element;
        expect(rootElement.parentId).toBeNull();
        expect(rootElement.selected).toBe(true);
        expect(rootElement.children).toBe(0);
        expect(rootElement.editing).toBe(false);
        expect(rootElement.texts).toEqual(['', '', '']); // texts配列の確認
        expect(rootElement.sectionHeights).toEqual([SIZE.SECTION_HEIGHT, SIZE.SECTION_HEIGHT, SIZE.SECTION_HEIGHT]); // sectionHeights配列の確認
    });

    it('新しいノードを追加する', () => {
        const { result } = renderHook(() => useStore());
        const { state, dispatch } = result.current;

        const initialElement = Object.values(state.elements)[0] as Element;
        const initialElementLength = Object.keys(state.elements).length;

        act(() => {
            dispatch({ type: 'ADD_ELEMENT' });
        });

        const afterState = result.current.state;
        const addedElement = Object.values(afterState.elements).find(
            (element: Element) => element.id !== initialElement.id
        ) as Element;
        const parentElement = Object.values(afterState.elements).find(
            (element: Element) => element.id === initialElement.id
        ) as Element;

        expect(Object.keys(afterState.elements).length).toBe(initialElementLength + 1);
        expect(parentElement.children).toBe(1);
        expect(parentElement.selected).toBe(false);
        expect(addedElement.parentId).toBe(initialElement.id);
        expect(addedElement.selected).toBe(true);
        expect(addedElement.editing).toBe(true);
        expect(addedElement.depth).toBe(2);
    });

    it('子ノードを持たないノードを削除する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const initialElementLength = Object.keys(result.current.state.elements).length;

        act(() => {
            dispatch({ type: 'ADD_ELEMENT' });
        });

        const afterAddState = result.current.state;
        expect(Object.keys(afterAddState.elements).length).toBe(initialElementLength + 1);

        const addedElement = Object.values(afterAddState.elements).find(
            (elm: Element) => elm.id !== '1'
        ) as Element;
        const elementId = addedElement.id;

        act(() => {
            dispatch({ type: 'DELETE_ELEMENT' });
        });

        const afterDeleteState = result.current.state;
        expect(Object.keys(afterDeleteState.elements).length).toBe(initialElementLength);
        expect((Object.values(afterDeleteState.elements)[0] as Element).children).toBe(0);
        expect(Object.values(afterDeleteState.elements).some((elm: Element) => elm.id === elementId)).toBe(false);
    });

    it('子ノードを持つノードを削除する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'ADD_ELEMENT' });
        });

        let state = result.current.state;
        let childElement = Object.values(state.elements).find(
            (elm: Element) => elm.id !== '1'
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: childElement.id });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        state = result.current.state;
        childElement = Object.values(state.elements).find(
            (elm: Element) => elm.id === childElement.id
        ) as Element;
        const grandchildElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === childElement.id
        ) as Element;

        expect(Object.keys(state.elements).length).toBe(3);
        expect(childElement.children).toBe(1);

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: childElement.id });
            dispatch({ type: 'DELETE_ELEMENT' });
        });

        const afterState = result.current.state;
        expect(Object.keys(afterState.elements).length).toBe(1);
        expect(Object.values(afterState.elements).some((elm: Element) => elm.id === '1')).toBe(true);
        expect(Object.values(afterState.elements).some((elm: Element) => elm.id === childElement.id)).toBe(false);
        expect(Object.values(afterState.elements).some((elm: Element) => elm.id === grandchildElement.id)).toBe(false);
    });

    it('テキストを更新できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newText = 'Updated text';
        const index = 0;

        act(() => {
            dispatch({
                type: 'UPDATE_TEXT',
                payload: { id: '1', index, value: newText }
            });
        });

        const newState = result.current.state;
        const element = Object.values(newState.elements)[0] as Element;
        expect(element.texts[index]).toBe(newText);
        expect(element.editing).toBe(false);
    });

    it('複数テキストセクションの更新を確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const testData = [
            { index: 0, value: 'Section 1' },
            { index: 1, value: 'Section 2' },
            { index: 2, value: 'Section 3' }
        ];

        testData.forEach(({ index, value }) => {
            act(() => {
                dispatch({
                    type: 'UPDATE_TEXT',
                    payload: { id: '1', index, value }
                });
            });
        });

        const element = result.current.state.elements['1'];
        testData.forEach(({ index, value }) => {
            expect(element.texts[index]).toBe(value);
        });
    });
});