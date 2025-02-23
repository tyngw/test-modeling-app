// src/state/__test__/state.test.ts
import { renderHook, act } from '@testing-library/react';
import { useReducer } from 'react';
import { initialState, reducer } from '../state';
import { Element } from '../../types';
import { SIZE } from '../../constants/ElementSettings';

jest.mock('../../constants/ElementSettings', () => ({
    ...jest.requireActual('../../constants/ElementSettings'),
    NUMBER_OF_SECTIONS: 3
  }));

const useStore = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
};

// windowサイズをモック
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

describe('state reducer', () => {
    beforeEach(() => {
        // 各テスト前にwindowサイズをリセット
        window.innerWidth = originalInnerWidth;
        window.innerHeight = originalInnerHeight;
    });

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

    it('ノードが選択できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
        });

        const newState = result.current.state;
        const elements = Object.values(newState.elements) as Element[];
        expect(elements[0].selected).toBe(true);
        expect(elements[0].editing).toBe(false);
        elements.filter(elm => elm.id !== '1').forEach(element => {
            expect(element.selected).toBe(false);
        });
    });

    it('ノードの選択が解除できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => { dispatch({ type: 'SELECT_ELEMENT', payload: '1' }); });
        act(() => { dispatch({ type: 'DESELECT_ALL' }); });

        const newState = result.current.state;
        (Object.values(newState.elements) as Element[]).forEach(element => {
            expect(element.selected).toBe(false);
            expect(element.editing).toBe(false);
        });
    });

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

    it('ノードが移動できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newPosition = { x: 100, y: 200 };
        act(() => {
            dispatch({
                type: 'MOVE_ELEMENT',
                payload: { id: '1', ...newPosition }
            });
        });

        const movedElement = Object.values(result.current.state.elements)[0] as Element;
        expect(movedElement.x).toBe(newPosition.x);
        expect(movedElement.y).toBe(newPosition.y);
    });

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
        expect(parentElement.children).toBe(1);
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
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
        });

        act(() => {
            dispatch({ type: 'ADD_ELEMENT' });
        });

        let state = result.current.state;
        const childElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1'
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: childElement.id });
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
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        state = result.current.state;
        const newParentElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1' && elm.id !== childElement.id
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: newParentElement.id });
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
        expect(updatedParentElement.children).toBe(1);
    });

    it('切り取ったノードが貼り付けられることを確認する(切り取るノードに子が存在するケース)', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        let state = result.current.state;
        const childElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1'
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: childElement.id });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: childElement.id });
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
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        state = result.current.state;
        const newParentElement = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1' && elm.id !== childElement.id
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: newParentElement.id });
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
        expect(updatedParentElement.children).toBe(1);

        const ids = Object.values(afterPasteState.elements).map((elm: Element) => elm.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('ノードをドロップした時に移動できることを確認する', async () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        await act(async () => {
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        let state = result.current.state;
        let elementB = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1'
        ) as Element;

        await act(async () => {
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        state = result.current.state;
        let elementC = Object.values(state.elements).find(
            (elm: Element) => elm.parentId === '1' && elm.id !== elementB.id
        ) as Element;

        await act(async () => {
            dispatch({ type: 'SELECT_ELEMENT', payload: elementB.id });
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
        expect(oldParentB.children).toBe(0);
        expect(newParentC.children).toBe(1);
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
        expect(afterState.elements[childElement.id].children).toBe(0);
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
        expect(afterState.elements[elementC.id].children).toBe(0);
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
        expect(afterState.elements['1'].children).toBe(0);
    });

    it('ノードを折りたたみ、展開できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
            dispatch({ type: 'ADD_ELEMENT' });
        });

        const childElement = Object.values(result.current.state.elements).find(
            (elm: Element) => elm.parentId === '1'
        ) as Element;

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
            dispatch({ type: 'COLLAPSE_ELEMENT' });
        });

        let collapsedState = result.current.state.elements;
        expect((Object.values(collapsedState).find(
            (elm: Element) => elm.id === childElement.id
        ) as Element).visible).toBe(false);

        act(() => {
            dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
            dispatch({ type: 'EXPAND_ELEMENT' });
        });

        const expandedState = result.current.state.elements;
        expect((Object.values(expandedState).find(
            (elm: Element) => elm.id === childElement.id
        ) as Element).visible).toBe(true);
    });

    it('UPDATE_ELEMENT_SIZE アクション', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newSize = {
            width: 200,
            height: 300,
            sectionHeights: [100, 100, 100]
        };

        act(() => {
            dispatch({
                type: 'UPDATE_ELEMENT_SIZE',
                payload: { id: '1', ...newSize }
            });
        });

        const updatedElement = Object.values(result.current.state.elements)[0] as Element;
        expect(updatedElement.width).toBe(newSize.width);
        expect(updatedElement.height).toBe(newSize.height);
    });

    it('LOAD_ELEMENTS アクション（空の場合）', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => { dispatch({ type: 'LOAD_ELEMENTS', payload: [] }); });
        const loadedState = result.current.state;

        expect(loadedState).toEqual({
            ...initialState,
            elements: initialState.elements,
            width: window.innerWidth,
            height: window.innerHeight
        });
    });
});