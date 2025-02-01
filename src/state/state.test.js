// src/state/state.test.js
import { renderHook, act } from '@testing-library/react';
import { useStore } from './state';

describe('state reducer', () => {
    it('初期状態', () => {
        const { result } = renderHook(() => useStore());
        const state = result.current.state;

        expect(state.nodes.length).toBe(1);
        expect(state.nodes[0].parentId).toBe(null);
        expect(state.nodes[0].selected).toBe(true);
    });

    it('ADD_NODE アクション', () => {
        const { result } = renderHook(() => useStore());
        const { state, dispatch } = result.current;

        const initialNode = result.current.state.nodes[0];
        const initialNodeLength = state.nodes.length;

        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });

        const afterState = result.current.state;
        const addedNode = afterState.nodes.find(node => node.id !== initialNode.id);
        const parentNode = afterState.nodes.find(node => node.id === initialNode.id);

        expect(afterState.nodes.length).toBe(initialNodeLength + 1);
        expect(parentNode.children).toBe(1)
        expect(addedNode.parentId).toBe(initialNode.id);
    });

    it('DELETE_NODE アクション', () => {
        const { result } = renderHook(() => useStore());
        const { state, dispatch } = result.current;

        const initialNodeLength = state.nodes.length;

        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });

        const nodeId = result.current.state.nodes[1].id;

        act(() => {
            dispatch({ type: 'DELETE_NODE', payload: nodeId });
        });

        const afterState = result.current.state;
        expect(afterState.nodes.length).toBe(initialNodeLength);
    });

    it('UPDATE_TEXT アクション', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newText = 'Updated text';

        act(() => {
            dispatch({ type: 'UPDATE_TEXT', payload: { id: 1, field: 'text', value: newText } });
        });

        const newState = result.current.state;
        expect(newState.nodes[0].text).toBe(newText);
    });

    it('SELECT_NODE アクション', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });

        const newState = result.current.state;
        expect(newState.nodes[0].selected).toBe(true);
    });

    it('DESELECT_ALL アクション', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });

        act(() => {
            dispatch({ type: 'DESELECT_ALL' });
        });

        const newState = result.current.state;
        newState.nodes.forEach(node => {
            expect(node.selected).toBe(false);
        });
    });

    it('ZOOM_IN アクション', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const initialZoomRatio = result.current.state.zoomRatio;

        act(() => {
            dispatch({ type: 'ZOOM_IN' });
        });

        const newState = result.current.state;
        expect(newState.zoomRatio).toBe(initialZoomRatio + 0.1);
    });

    it('ZOOM_OUT アクション', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const initialZoomRatio = result.current.state.zoomRatio;

        act(() => {
            dispatch({ type: 'ZOOM_OUT' });
        });

        const newState = result.current.state;
        expect(newState.zoomRatio).toBe(initialZoomRatio - 0.1);
    });
});