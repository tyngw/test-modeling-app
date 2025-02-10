// src/state/__test__/state.test.js
import { renderHook, act } from '@testing-library/react';
import { useReducer } from 'react';
import { initialState, reducer } from '../state';
import { Node } from '../../types';


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
        const rootNode = Object.values(state.elements)[0] as Node;
        expect(rootNode.parentId).toBeNull();
        expect(rootNode.selected).toBe(true);
        expect(rootNode.children).toBe(0);
        expect(rootNode.editing).toBe(false);
    });

    it('新しいノードを追加する', () => {
        const { result } = renderHook(() => useStore());
        const { state, dispatch } = result.current;

        const initialNode = Object.values(state.elements)[0] as Node;
        const initialNodeLength = Object.keys(state.elements).length;

        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });

        const afterState = result.current.state;
        const addedNode = Object.values(afterState.elements).find(
            (node: Node) => node.id !== initialNode.id
        ) as Node;
        const parentNode = Object.values(afterState.elements).find(
            (node: Node) => node.id === initialNode.id
        ) as Node;

        expect(Object.keys(afterState.elements).length).toBe(initialNodeLength + 1);
        expect(parentNode.children).toBe(1);
        expect(parentNode.selected).toBe(false);
        expect(addedNode.parentId).toBe(initialNode.id);
        expect(addedNode.selected).toBe(true);
        expect(addedNode.editing).toBe(true);
        expect(addedNode.depth).toBe(2);
    });

    it('子ノードを持たないノードを削除する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const initialNodeLength = Object.keys(result.current.state.elements).length;

        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });

        const afterAddState = result.current.state;
        expect(Object.keys(afterAddState.elements).length).toBe(initialNodeLength + 1);

        const addedNode = Object.values(afterAddState.elements).find(
            (n: Node) => n.id !== '1'
        ) as Node;
        const nodeId = addedNode.id;

        act(() => {
            dispatch({ type: 'DELETE_NODE' });
        });

        const afterDeleteState = result.current.state;
        expect(Object.keys(afterDeleteState.elements).length).toBe(initialNodeLength);
        expect((Object.values(afterDeleteState.elements)[0] as Node).children).toBe(0);
        expect(Object.values(afterDeleteState.elements).some((n: Node) => n.id === nodeId)).toBe(false);
    });

    it('子ノードを持つノードを削除する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });

        let state = result.current.state;
        let childNode = Object.values(state.elements).find(
            (n: Node) => n.id !== '1'
        ) as Node;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'ADD_NODE' });
        });

        state = result.current.state;
        childNode = Object.values(state.elements).find(
            (n: Node) => n.id === childNode.id
        ) as Node;
        const grandchildNode = Object.values(state.elements).find(
            (n: Node) => n.parentId === childNode.id
        ) as Node;

        expect(Object.keys(state.elements).length).toBe(3);
        expect(childNode.children).toBe(1);

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'DELETE_NODE' });
        });

        const afterState = result.current.state;
        expect(Object.keys(afterState.elements).length).toBe(1);
        expect(Object.values(afterState.elements).some((n: Node) => n.id === '1')).toBe(true);
        expect(Object.values(afterState.elements).some((n: Node) => n.id === childNode.id)).toBe(false);
        expect(Object.values(afterState.elements).some((n: Node) => n.id === grandchildNode.id)).toBe(false);
    });

    it('テキストを更新できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newText = 'Updated text';
        const field = 'text';

        act(() => {
            dispatch({
                type: 'UPDATE_TEXT',
                payload: { id: '1', field, value: newText }
            });
        });

        const newState = result.current.state;
        const node = Object.values(newState.elements)[0] as Node;
        expect(node[field]).toBe(newText);
        expect(node.editing).toBe(false);
    });

    it('ノードが選択できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
        });

        const newState = result.current.state;
        const elements = Object.values(newState.elements) as Node[];
        expect(elements[0].selected).toBe(true);
        expect(elements[0].editing).toBe(false);
        elements.filter(n => n.id !== '1').forEach(node => {
            expect(node.selected).toBe(false);
        });
    });

    it('ノードの選択が解除できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => { dispatch({ type: 'SELECT_NODE', payload: '1' }); });
        act(() => { dispatch({ type: 'DESELECT_ALL' }); });

        const newState = result.current.state;
        (Object.values(newState.elements) as Node[]).forEach(node => {
            expect(node.selected).toBe(false);
            expect(node.editing).toBe(false);
        });
    });

    it('ノード追加時、UNDO/REDOできることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const initialNodes = result.current.state.elements;
        act(() => { dispatch({ type: 'ADD_NODE' }); });
        const afterAddState = result.current.state.elements;

        act(() => { dispatch({ type: 'UNDO' }); });
        expect(result.current.state.elements).toEqual(initialNodes);

        act(() => { dispatch({ type: 'REDO' }); });
        expect(result.current.state.elements).toEqual(afterAddState);
    });

    it('ノードが移動できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newPosition = { x: 100, y: 200 };
        act(() => {
            dispatch({
                type: 'MOVE_NODE',
                payload: { id: '1', ...newPosition }
            });
        });

        const movedNode = Object.values(result.current.state.elements)[0] as Node;
        expect(movedNode.x).toBe(newPosition.x);
        expect(movedNode.y).toBe(newPosition.y);
    });

    it('ノードをコピーして貼り付けられることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => { dispatch({ type: 'SELECT_NODE', payload: '1' }); });
        act(() => { dispatch({ type: 'ADD_NODE' }); });
        act(() => { dispatch({ type: 'COPY_NODE' }); });

        const parentNode = Object.values(result.current.state.elements).find(
            (n: Node) => n.id === '1'
        ) as Node;

        act(() => { dispatch({ type: 'SELECT_NODE', payload: '1' }); });
        act(() => { dispatch({ type: 'PASTE_NODE' }); });

        const pastedNode = Object.values(result.current.state.elements)
            .find((n: Node) => n.parentId === parentNode.id) as Node;

        expect(pastedNode).toBeDefined();
        expect(parentNode.children).toBe(1);
        expect(pastedNode.depth).toBe(parentNode.depth + 1);
    });

    it('ノードを切り取ることができることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => { dispatch({ type: 'SELECT_NODE', payload: '1' }); });
        act(() => { dispatch({ type: 'ADD_NODE' }); });

        let state = result.current.state;
        const childNode = Object.values(state.elements).find(
            (n: Node) => n.parentId === '1'
        ) as Node;

        act(() => { dispatch({ type: 'SELECT_NODE', payload: childNode.id }); });
        act(() => { dispatch({ type: 'CUT_NODE' }); });

        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.elements).length).toBe(1);
        expect(Object.values(afterCutState.elements).some(
            (n: Node) => n.id === childNode.id
        )).toBe(false);
        expect(Object.keys(afterCutState.cutNodes ?? {}).length).toBe(1);
        expect(Object.values(afterCutState.cutNodes ?? {}).some(
            (n: Node) => n.id === childNode.id
        )).toBe(true);
    });

    it('切り取ったノードが貼り付けられることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
        });

        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });

        let state = result.current.state;
        const childNode = Object.values(state.elements).find(
            (n: Node) => n.parentId === '1'
        ) as Node;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'CUT_NODE' });
        });

        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.elements).length).toBe(1);
        expect(Object.values(afterCutState.elements).some(
            (n: Node) => n.id === childNode.id
        )).toBe(false);
        expect(afterCutState.cutNodes).toBeDefined();
        expect(Object.keys(afterCutState.cutNodes ?? {}).length).toBe(1);
        expect(Object.values(afterCutState.cutNodes ?? {}).some(
            (n: Node) => n.id === childNode.id
        )).toBe(true);

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
            dispatch({ type: 'ADD_NODE' });
        });

        state = result.current.state;
        const newParentNode = Object.values(state.elements).find(
            (n: Node) => n.parentId === '1' && n.id !== childNode.id
        ) as Node;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: newParentNode.id });
            dispatch({ type: 'PASTE_NODE' });
        });

        const afterPasteState = result.current.state;
        const pastedNode = Object.values(afterPasteState.elements).find(
            (n: Node) => n.parentId === newParentNode.id
        ) as Node;

        expect(pastedNode).toBeDefined();
        expect(pastedNode.parentId).toBe(newParentNode.id);
        expect(pastedNode.depth).toBe(newParentNode.depth + 1);

        const updatedParentNode = Object.values(afterPasteState.elements).find(
            (n: Node) => n.id === newParentNode.id
        ) as Node;
        expect(updatedParentNode.children).toBe(1);
    });

    it('切り取ったノードが貼り付けられることを確認する(切り取るノードに子が存在するケース)', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
            dispatch({ type: 'ADD_NODE' });
        });

        let state = result.current.state;
        const childNode = Object.values(state.elements).find(
            (n: Node) => n.parentId === '1'
        ) as Node;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'ADD_NODE' });
        });

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'CUT_NODE' });
        });

        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.elements).length).toBe(1);
        expect(Object.values(afterCutState.elements).some(
            (n: Node) => n.id === childNode.id
        )).toBe(false);
        expect(Object.keys(afterCutState.cutNodes ?? {}).length).toBe(2);
        expect(Object.values(afterCutState.cutNodes ?? {}).some(
            (n: Node) => n.id === childNode.id
        )).toBe(true);

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
            dispatch({ type: 'ADD_NODE' });
        });

        state = result.current.state;
        const newParentNode = Object.values(state.elements).find(
            (n: Node) => n.parentId === '1' && n.id !== childNode.id
        ) as Node;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: newParentNode.id });
            dispatch({ type: 'PASTE_NODE' });
        });

        const afterPasteState = result.current.state;
        const pastedNode = Object.values(afterPasteState.elements).find(
            (n: Node) => n.parentId === newParentNode.id
        ) as Node;

        expect(pastedNode.visible).toBe(true);
        expect(pastedNode.depth).toBe(newParentNode.depth + 1);

        const pastedChildNode = Object.values(afterPasteState.elements).find(
            (n: Node) => n.parentId === pastedNode.id
        ) as Node;
        expect(pastedChildNode.depth).toBe(pastedNode.depth + 1);
        expect(pastedChildNode.visible).toBe(true);

        const updatedParentNode = Object.values(afterPasteState.elements).find(
            (n: Node) => n.id === newParentNode.id
        ) as Node;
        expect(updatedParentNode.children).toBe(1);

        const ids = Object.values(afterPasteState.elements).map((n: Node) => n.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('ノードをドロップした時に移動できることを確認する', async () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        await act(async () => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
            dispatch({ type: 'ADD_NODE' });
        });

        let state = result.current.state;
        let nodeB = Object.values(state.elements).find(
            (n: Node) => n.parentId === '1'
        ) as Node;

        await act(async () => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
            dispatch({ type: 'ADD_NODE' });
        });

        state = result.current.state;
        let nodeC = Object.values(state.elements).find(
            (n: Node) => n.parentId === '1' && n.id !== nodeB.id
        ) as Node;

        await act(async () => {
            dispatch({ type: 'SELECT_NODE', payload: nodeB.id });
            dispatch({ type: 'ADD_NODE' });
        });

        state = result.current.state;
        const nodeD = Object.values(state.elements).find(
            (n: Node) => n.parentId === nodeB.id
        ) as Node;

        await act(async () => {
            dispatch({
                type: 'DROP_NODE',
                payload: {
                    id: nodeD.id,
                    oldParentId: nodeB.id,
                    newParentId: nodeC.id,
                    draggingNodeOrder: nodeD.order,
                    depth: nodeC.depth + 1
                }
            });
        });

        await new Promise(resolve => setTimeout(resolve, 0));

        state = result.current.state;
        const oldParentB = Object.values(state.elements).find(
            (n: Node) => n.id === nodeB.id
        ) as Node;
        const newParentC = Object.values(state.elements).find(
            (n: Node) => n.id === nodeC.id
        ) as Node;
        const movedNode = Object.values(state.elements).find(
            (n: Node) => n.id === nodeD.id
        ) as Node;

        expect(movedNode.parentId).toBe(newParentC.id);
        expect(oldParentB.children).toBe(0);
        expect(newParentC.children).toBe(1);
    });

    it('親ノードを子ノードにドロップできないことを確認する', async () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        // 親ノードと子ノードを作成
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
            dispatch({ type: 'ADD_NODE' });
        });
    
        const initialState = result.current.state;
        const parentNode = initialState.elements['1'];
        const childNode = Object.values(initialState.elements).find(
            (n: Node) => n.parentId === '1'
        ) as Node;
    
        // 親ノードを子ノードにドロップしようとする
        await act(async () => {
            dispatch({
                type: 'DROP_NODE',
                payload: {
                    id: parentNode.id,
                    oldParentId: null,
                    newParentId: childNode.id,
                    draggingNodeOrder: 0,
                    depth: childNode.depth + 1
                }
            });
        });
    
        const afterState = result.current.state;
        
        // 状態が変化していないことを確認
        expect(afterState.elements).toEqual(initialState.elements);
        expect(afterState.elements[parentNode.id].parentId).toBeNull();
        expect(afterState.elements[childNode.id].children).toBe(0);
    });

    it('親ノードを孫ノードにドロップできないことを確認する', async () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        // 3階層のノードを作成 (1 -> 2 -> 3)
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
            dispatch({ type: 'ADD_NODE' }); // Node 2
        });
    
        let state = result.current.state;
        const node2 = Object.values(state.elements).find(
            (n: Node) => n.parentId === '1'
        ) as Node;
    
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: node2.id });
            dispatch({ type: 'ADD_NODE' }); // Node 3
        });
    
        state = result.current.state;
        const node3 = Object.values(state.elements).find(
            (n: Node) => n.parentId === node2.id
        ) as Node;
    
        // ルートノード(1)を孫ノード(3)にドロップしようとする
        await act(async () => {
            dispatch({
                type: 'DROP_NODE',
                payload: {
                    id: '1',
                    oldParentId: null,
                    newParentId: node3.id,
                    draggingNodeOrder: 0,
                    depth: node3.depth + 1
                }
            });
        });
    
        const afterState = result.current.state;
        
        // 状態が変化していないことを確認
        expect(afterState.elements['1'].parentId).toBeNull();
        expect(afterState.elements[node3.id].children).toBe(0);
    });

    it('ノードを自身にドロップできないことを確認する', async () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        const initialNode = result.current.state.elements['1'];
    
        // 自分自身にドロップしようとする
        await act(async () => {
            dispatch({
                type: 'DROP_NODE',
                payload: {
                    id: '1',
                    oldParentId: null,
                    newParentId: '1',
                    draggingNodeOrder: 0,
                    depth: initialNode.depth + 1
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
            dispatch({ type: 'SELECT_NODE', payload: '1' });
            dispatch({ type: 'ADD_NODE' });
        });

        const childNode = Object.values(result.current.state.elements).find(
            (n: Node) => n.parentId === '1'
        ) as Node;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
            dispatch({ type: 'COLLAPSE_NODE' });
        });

        let collapsedState = result.current.state.elements;
        expect((Object.values(collapsedState).find(
            (n: Node) => n.id === childNode.id
        ) as Node).visible).toBe(false);

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: '1' });
            dispatch({ type: 'EXPAND_NODE' });
        });

        const expandedState = result.current.state.elements;
        expect((Object.values(expandedState).find(
            (n: Node) => n.id === childNode.id
        ) as Node).visible).toBe(true);
    });

    it('UPDATE_NODE_SIZE アクション', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newSize = {
            width: 200,
            height: 300,
            sectionHeights: [100, 100, 100]
        };

        act(() => {
            dispatch({
                type: 'UPDATE_NODE_SIZE',
                payload: { id: '1', ...newSize }
            });
        });

        const updatedNode = Object.values(result.current.state.elements)[0] as Node;
        expect(updatedNode.width).toBe(newSize.width);
        expect(updatedNode.height).toBe(newSize.height);
    });

    it('LOAD_NODES アクション（空の場合）', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => { dispatch({ type: 'LOAD_NODES', payload: [] }); });
        const loadedState = result.current.state;

        expect(loadedState).toEqual({
            ...initialState,
            elements: initialState.elements,
            width: window.innerWidth,
            height: window.innerHeight
        });
    });
});