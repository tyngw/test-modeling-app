// src/state/__test__/undoRedo.test.ts
import { renderHook, act } from '@testing-library/react';
import { useStore } from './textUtils';


describe('UNDO/REDO機能', () => {
    it('ノード追加時、UNDO/REDOできることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const initialElements = result.current.state.elements;
        act(() => { dispatch({ type: 'ADD_ELEMENT' }); });
        const afterAddState = result.current.state.elements;

        act(() => { dispatch({ type: 'UNDO' }); });
        expect(result.current.state.elements).toEqual(initialElements);

        act(() => { dispatch({ type: 'REDO' }); });
        expect(result.current.state.elements).toEqual(afterAddState);
    });

    it('UNDO/REDOがテキスト更新後に動作することを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const initialText = result.current.state.elements['1'].texts[0];
        const newText = 'Updated text';
        
        act(() => {
            dispatch({
                type: 'UPDATE_TEXT',
                payload: { id: '1', index: 0, value: newText }
            });
        });

        act(() => { dispatch({ type: 'UNDO' }); });
        expect(result.current.state.elements['1'].texts[0]).toBe(initialText);

        act(() => { dispatch({ type: 'REDO' }); });
        expect(result.current.state.elements['1'].texts[0]).toBe(newText);
    });
});