// src/state/__test__/copyPaste.test.ts
import { renderHook, act } from '@testing-library/react';
import { Element } from '../../types';
import { useStore } from './textUtils';

describe('切り取り、コピー、貼り付け操作', () => {
    it('ノードをコピーして貼り付けられることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => { dispatch({ type: 'SELECT_ELEMENT', payload: '1' }); });
        act(() => { dispatch({ type: 'ADD_ELEMENT' }); });
        act(() => { dispatch({ type: 'COPY_ELEMENT' }); });

        const parentElement = Object.values(result.current.state.elements).find(
            (elm: Element) => elm.id === '1'
        ) as Element;

        act(() => { dispatch({ type: 'SELECT_ELEMENT', payload: '1' }); });
        act(() => { dispatch({ type: 'PASTE_ELEMENT' }); });

        const pastedElement = Object.values(result.current.state.elements)
            .find((elm: Element) => elm.parentId === parentElement.id) as Element;

        expect(pastedElement).toBeDefined();
        expect(parentElement).toMatchObject({
            children: 1,
        });
        expect(pastedElement.depth).toBe(parentElement.depth + 1);
    });

    it('ノードを切り取ることができることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => { dispatch({ type: 'SELECT_ELEMENT', payload: '1' }); });
        act(() => { dispatch({ type: 'ADD_ELEMENT' }); });

        let state = result.current.state;
        const childElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1'
        ) as Element;

        act(() => { dispatch({ type: 'SELECT_ELEMENT', payload: childElement.id }); });
        act(() => { dispatch({ type: 'CUT_ELEMENT' }); });

        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.elements).length).toBe(1);
        expect(Object.values(afterCutState.elements).some(
            (elm: Element) => elm.id === childElement.id
        )).toBe(false);
        expect(Object.keys(afterCutState.cutElements ?? {}).length).toBe(1);
        expect(Object.values(afterCutState.cutElements ?? {}).some(
            (elm: Element) => elm.id === childElement.id
        )).toBe(true);
    });

    it('切り取ったノードが貼り付けられることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
        });

        act(() => {
            dispatch({ type: 'ADD_ELEMENT' });
        });

        let state = result.current.state;
        const childElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1'
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: childElement.id, ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'CUT_ELEMENT' });
        });

        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.elements).length).toBe(1);
        expect(Object.values(afterCutState.elements).some(
            (elm: Element) => elm.id === childElement.id
        )).toBe(false);
        expect(afterCutState.cutElements).toBeDefined();
        expect(Object.keys(afterCutState.cutElements ?? {}).length).toBe(1);
        expect(Object.values(afterCutState.cutElements ?? {}).some(
            (elm: Element) => elm.id === childElement.id
        )).toBe(true);

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        state = result.current.state;
        const newParentElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1' && elm.id !== childElement.id
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: newParentElement.id, ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'PASTE_ELEMENT' });
        });

        const afterPasteState = result.current.state;
        const pastedElement = Object.values(afterPasteState.elements).find(
            (elm: Element) => elm.parentId === newParentElement.id
        ) as Element;

        expect(pastedElement).toBeDefined();
        expect(pastedElement.parentId).toBe(newParentElement.id);
        expect(pastedElement.depth).toBe(newParentElement.depth + 1);

        const updatedParentElement = Object.values(afterPasteState.elements).find(
            (elm: Element) => elm.id === newParentElement.id
        ) as Element;
        expect(updatedParentElement).toMatchObject({
            children: 1,
        })
    });

    it('切り取ったノードが貼り付けられることを確認する(切り取るノードに子が存在するケース)', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        let state = result.current.state;
        const childElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1'
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: childElement.id, ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: childElement.id, ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'CUT_ELEMENT' });
        });

        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.elements).length).toBe(1);
        expect(Object.values(afterCutState.elements).some(
            (elm: Element) => elm.id === childElement.id
        )).toBe(false);
        expect(Object.keys(afterCutState.cutElements ?? {}).length).toBe(2);
        expect(Object.values(afterCutState.cutElements ?? {}).some(
            (elm: Element) => elm.id === childElement.id
        )).toBe(true);

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        state = result.current.state;
        const newParentElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1' && elm.id !== childElement.id
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: newParentElement.id, ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'PASTE_ELEMENT' });
        });

        const afterPasteState = result.current.state;
        const pastedElement = Object.values(afterPasteState.elements).find(
            (elm: Element) => elm.parentId === newParentElement.id
        ) as Element;

        expect(pastedElement.visible).toBe(true);
        expect(pastedElement.depth).toBe(newParentElement.depth + 1);

        const pastedChildElement = Object.values(afterPasteState.elements).find(
            (elm: Element) => elm.parentId === pastedElement.id
        ) as Element;
        expect(pastedChildElement.depth).toBe(pastedElement.depth + 1);
        expect(pastedChildElement.visible).toBe(true);

        const updatedParentElement = Object.values(afterPasteState.elements).find(
            (elm: Element) => elm.id === newParentElement.id
        ) as Element;
        expect(updatedParentElement).toMatchObject({
            children: 1,
        });


        const ids = Object.values(afterPasteState.elements).map((elm: Element) => elm.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('コピーした要素が貼り付けられることを確認する(自身の子要素として追加するケース。ルートに子要素を追加後、追加した要素に子要素を追加する。その後、ルートを親にもつ要素をコピーして孫ノードに貼り付ける)', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        let state = result.current.state;
        const rootElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === null
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: rootElement.id, ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        state = result.current.state;
        const childElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === rootElement.id
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: childElement.id, ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        state = result.current.state;
        const grandchildElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === childElement.id
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: rootElement.id, ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'COPY_ELEMENT' });
        });

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: { id: grandchildElement.id, ctrlKey: false, shiftKey: false } });
            dispatch({ type: 'PASTE_ELEMENT' });
        });

        state = result.current.state;
        const pastedElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === grandchildElement.id
        ) as Element;

        expect(pastedElement).toBeDefined();
        expect(pastedElement.depth).toBe(grandchildElement.depth + 1);
    });
});