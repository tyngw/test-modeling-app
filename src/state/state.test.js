// src/state/state.test.js
import { renderHook, act } from '@testing-library/react';
import { useStore, initialState } from './state';
import { adjustNodePositions } from '../utils/NodeAdjuster';

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

        expect(Object.keys(state.nodes).length).toBe(1);
        const rootNode = Object.values(state.nodes)[0];
        expect(rootNode.parentId).toBe(null);
        expect(rootNode.selected).toBe(true);
        expect(rootNode.children).toBe(0);
        expect(rootNode.editing).toBe(false);
    });

    it('新しいノードを追加する', () => {
        const { result } = renderHook(() => useStore());
        const { state, dispatch } = result.current;

        const initialNode = Object.values(result.current.state.nodes)[0];
        const initialNodeLength = Object.keys(state.nodes).length;

        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });

        const afterState = result.current.state;
        const addedNode = Object.values(afterState.nodes).find(node => node.id !== initialNode.id);
        const parentNode = Object.values(afterState.nodes).find(node => node.id === initialNode.id);

        expect(Object.keys(afterState.nodes).length).toBe(initialNodeLength + 1);
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
    
        const initialNodeLength = Object.keys(result.current.state.nodes).length;
    
        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        
        const afterAddState = result.current.state;
        expect(Object.keys(afterAddState.nodes).length).toBe(initialNodeLength + 1);
        
        const addedNode = Object.values(afterAddState.nodes).find(n => n.id !== 1);
        const nodeId = addedNode.id;
    
        act(() => {
            dispatch({ type: 'DELETE_NODE' });
        });
    
        const afterDeleteState = result.current.state;
        expect(Object.keys(afterDeleteState.nodes).length).toBe(initialNodeLength);
        expect(Object.values(afterDeleteState.nodes)[0].children).toBe(0);
        expect(Object.values(afterDeleteState.nodes).some(n => n.id === nodeId)).toBe(false);
    });

    it('子ノードを持つノードを削除する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        
        let state = result.current.state;
        let childNode = Object.values(state.nodes).find(n => n.id !== 1);
        
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'ADD_NODE' });
        });
    
        state = result.current.state;
        childNode = Object.values(state.nodes).find(n => n.id === childNode.id);
        const grandchildNode = Object.values(state.nodes).find(n => n.parentId === childNode.id);
    
        expect(Object.keys(state.nodes).length).toBe(3);
        expect(childNode.children).toBe(1);
        
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'DELETE_NODE' });
        });
    
        const afterState = result.current.state;
        expect(Object.keys(afterState.nodes).length).toBe(1);
        expect(Object.values(afterState.nodes).some(n => n.id === 1)).toBe(true);
        expect(Object.values(afterState.nodes).some(n => n.id === childNode.id)).toBe(false);
        expect(Object.values(afterState.nodes).some(n => n.id === grandchildNode.id)).toBe(false);
    });

    it('テキストを更新できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newText = 'Updated text';
        const field = 'text';

        act(() => {
            dispatch({ type: 'UPDATE_TEXT', payload: { id: 1, field, value: newText } });
        });

        const newState = result.current.state;
        expect(Object.values(newState.nodes)[0][field]).toBe(newText);
        expect(Object.values(newState.nodes)[0].editing).toBe(false);
    });

    it('ノードが選択できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });

        const newState = result.current.state;
        const nodes = Object.values(newState.nodes);
        expect(nodes[0].selected).toBe(true);
        expect(nodes[0].editing).toBe(false);
        nodes.filter(n => n.id !== 1).forEach(node => {
            expect(node.selected).toBe(false);
        });
    });

    it('ノードの選択が解除できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => { dispatch({ type: 'SELECT_NODE', payload: 1 }); });
        act(() => { dispatch({ type: 'DESELECT_ALL' }); });

        const newState = result.current.state;
        Object.values(newState.nodes).forEach(node => {
            expect(node.selected).toBe(false);
            expect(node.editing).toBe(false);
        });
    });

    it('ノード追加時、UNDO/REDOできることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        // const initialNodes = initialState.nodes;
        const initialNodes = result.current.state.nodes;
        act(() => { dispatch({ type: 'ADD_NODE' }); });
        const afterAddState = result.current.state.nodes;

        act(() => { dispatch({ type: 'UNDO' }); });
        expect(result.current.state.nodes).toEqual(initialNodes);

        act(() => { dispatch({ type: 'REDO' }); });
        expect(result.current.state.nodes).toEqual(afterAddState);
    });

    it('ノードが移動できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newPosition = { x: 100, y: 200 };
        act(() => {
            dispatch({ type: 'MOVE_NODE', payload: { id: 1, ...newPosition } });
        });

        const movedNode = Object.values(result.current.state.nodes)[0];
        expect(movedNode.x).toBe(newPosition.x);
        expect(movedNode.y).toBe(newPosition.y);
    });

    it('ノードをコピーして貼り付けられることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => { dispatch({ type: 'SELECT_NODE', payload: 1 }); });
        act(() => { dispatch({ type: 'ADD_NODE' }); });
        act(() => { dispatch({ type: 'COPY_NODE' }); });
        
        const parentNode = Object.values(result.current.state.nodes).find(n => n.id === 1);
        act(() => { dispatch({ type: 'SELECT_NODE', payload: 1 }); });
        act(() => { dispatch({ type: 'PASTE_NODE' }); });

        const pastedNode = Object.values(result.current.state.nodes)
            .find(n => n.parentId === parentNode.id);
        expect(pastedNode).toBeDefined();
        // 貼り付けたノードの親ノードchildrenプロパティが1であることを確認
        expect(parentNode.children).toBe(1);
        expect(pastedNode.depth).toBe(parentNode.depth + 1);
    });

    it('ノードを切り取ることができることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        act(() => { dispatch({ type: 'SELECT_NODE', payload: 1 }); });
        act(() => { dispatch({ type: 'ADD_NODE' }); });
    
        let state = result.current.state;
        const childNode = Object.values(state.nodes).find(n => n.parentId === 1);
    
        act(() => { dispatch({ type: 'SELECT_NODE', payload: childNode.id }); });
        act(() => { dispatch({ type: 'CUT_NODE' }); });
    
        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.nodes).length).toBe(1);
        expect(Object.values(afterCutState.nodes).some(n => n.id === childNode.id)).toBe(false);
        expect(Object.keys(afterCutState.cutNodes).length).toBe(1);
        expect(Object.values(afterCutState.cutNodes).some(n => n.id === childNode.id)).toBe(true);
    });

    it('切り取ったノードが貼り付けられることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        // 初期状態のルートノードを選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
    
        // 子ノードを追加
        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });
    
        // 追加された子ノードを取得
        let state = result.current.state;
        const childNode = Object.values(state.nodes).find(n => n.parentId === 1);
        expect(childNode).toBeDefined(); // 子ノードが正しく追加されていることを確認
    
        // 子ノードを選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
        });
    
        // 子ノードを切り取り
        act(() => {
            dispatch({ type: 'CUT_NODE' });
        });
    
        // 切り取り後の状態を確認
        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.nodes).length).toBe(1); // ルートノードのみ残る
        expect(Object.values(afterCutState.nodes).some(n => n.id === childNode.id)).toBe(false); // 子ノードが削除されている
        expect(afterCutState.cutNodes).toBeDefined(); // cutNodesが設定されている
        expect(Object.keys(afterCutState.cutNodes).length).toBe(1); // 切り取られたノードが1つ
        expect(Object.values(afterCutState.cutNodes).some(n => n.id === childNode.id)).toBe(true); // 切り取られたノードのIDが一致する
    
        // 新しい親ノードを作成
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 }); // ルートノードを選択
            dispatch({ type: 'ADD_NODE' }); // 新しい子ノードを追加
        });
    
        // 新しい親ノードを取得
        state = result.current.state;
        console.log('State after adding new parent node:', JSON.stringify(state, null, 2)); // デバッグ用
    
        const newParentNode = Object.values(state.nodes).find(n => n.parentId === 1);
        expect(newParentNode).toBeDefined(); // 新しい親ノードが正しく追加されていることを確認
        console.log('New Parent Node:', JSON.stringify(newParentNode, null, 2)); // デバッグ用
    
        // 新しい親ノードを選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: newParentNode.id });
        });
    
        // 切り取ったノードを貼り付け
        act(() => {
            dispatch({ type: 'PASTE_NODE' });
        });
    
        // 貼り付け後の状態を確認
        const afterPasteState = result.current.state;
        console.log('After Paste State:', JSON.stringify(afterPasteState, null, 2)); // デバッグ用
    
        const pastedNode = Object.values(afterPasteState.nodes).find(n => n.parentId === newParentNode.id);
        expect(pastedNode).toBeDefined(); // 貼り付けられたノードが存在する
        expect(pastedNode.parentId).toBe(newParentNode.id); // 貼り付けられたノードのIDが一致する
        expect(pastedNode.depth).toBe(newParentNode.depth + 1); // 深さが親ノードの深さ + 1 になっている
    
        // 新しい親ノードの子ノード数を確認
        // const updatedParentNode = afterPasteState.nodes.find(n => n.id === newParentNode.id);
        const updatedParentNode = Object.values(afterPasteState.nodes).find(n => n.id === newParentNode.id);
        expect(updatedParentNode.children).toBe(1); // 新しい親ノードの子ノード数が1になっている
    });

    it('切り取ったノードが貼り付けられることを確認する(切り取るノードに子が存在するケース)', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        // 初期状態のルートノードを選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
    
        // 子ノードを追加
        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });
    
        // 追加された子ノードを取得
        let state = result.current.state;
        const childNode = Object.values(state.nodes).find(n => n.parentId === 1);
        expect(childNode).toBeDefined(); // 子ノードが正しく追加されていることを確認
    
        // 子ノードを選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'ADD_NODE' }); // 新しい子ノードを追加
        });
    
        // 子ノードを切り取り
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'CUT_NODE' });
        });
    
        // 切り取り後の状態を確認
        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.nodes).length).toBe(1); // ルートノードのみ残る
        expect(Object.values(afterCutState.nodes).some(n => n.id === childNode.id)).toBe(false); // 子ノードが削除されている
        expect(afterCutState.cutNodes).toBeDefined(); // cutNodesが設定されている
        expect(Object.keys(afterCutState.cutNodes).length).toBe(2);
        expect(Object.values(afterCutState.cutNodes).some(n => n.id === childNode.id)).toBe(true);
    
        // 新しい親ノードを作成
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 }); // ルートノードを選択
            dispatch({ type: 'ADD_NODE' }); // 新しい子ノードを追加
        });
    
        // 新しい親ノードを取得
        state = result.current.state;
        console.log('State after adding new parent node:', JSON.stringify(state, null, 2)); // デバッグ用
    
        const newParentNode = Object.values(state.nodes).find(n => n.parentId === 1);
        expect(newParentNode).toBeDefined(); // 新しい親ノードが正しく追加されていることを確認
        console.log('New Parent Node:', JSON.stringify(newParentNode, null, 2)); // デバッグ用
    
        // 新しい親ノードを選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: newParentNode.id });
        });
    
        // 切り取ったノードを貼り付け
        act(() => {
            dispatch({ type: 'PASTE_NODE' });
        });
    
        // 貼り付け後の状態を確認
        const afterPasteState = result.current.state;
        console.log('After Paste State:', JSON.stringify(afterPasteState, null, 2)); // デバッグ用
    
        const pastedNode = Object.values(afterPasteState.nodes).find(n => n.parentId === newParentNode.id);
        expect(pastedNode).toBeDefined(); // 貼り付けられたノードが存在する
        expect(pastedNode.parentId).toBe(newParentNode.id); // 貼り付けられたノードのIDが一致する
        expect(pastedNode.depth).toBe(newParentNode.depth + 1); // 深さが親ノードの深さ + 1 になっている
        expect(pastedNode.visible).toBe(true); // 貼り付けられたノードが表示されている

        const pastedChildNode = Object.values(afterPasteState.nodes).find(n => n.parentId === pastedNode.id);
        expect(pastedChildNode).toBeDefined(); // 貼り付けられた子ノードが存在する
        expect(pastedChildNode.depth).toBe(pastedNode.depth + 1); // 深さが親ノードの深さ + 1 になっている
        expect(pastedChildNode.visible).toBe(true); // 貼り付けられた子ノードが表示されている
    
        // 新しい親ノードの子ノード数を確認
        const updatedParentNode = Object.values(afterPasteState.nodes).find(n => n.id === newParentNode.id);
        expect(updatedParentNode.children).toBe(1); // 新しい親ノードの子ノード数が1になっている

        // idに重複がないことを確認
        // const ids = afterPasteState.nodes.map(n => n.id);
        const ids = Object.values(afterPasteState.nodes).map(n => n.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('ノードをドロップした時に移動できることを確認する', async () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        // ルートノードA（ID:1）を選択して子ノードBを追加
        await act(async () => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
            dispatch({ type: 'ADD_NODE' });
        });
        
        let state = result.current.state;
        let nodeB = Object.values(state.nodes).find(n => n.parentId === 1);
    
        // ルートノードA（ID:1）を選択して子ノードCを追加
        await act(async () => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
            dispatch({ type: 'ADD_NODE' });
        });
        
        state = result.current.state;
        let nodeC = Object.values(state.nodes).find(n => n.parentId === 1 && n.id !== nodeB.id);
    
        // ノードBを選択して子ノードDを追加
        await act(async () => {
            dispatch({ type: 'SELECT_NODE', payload: nodeB.id });
            dispatch({ type: 'ADD_NODE' });
        });
        
        state = result.current.state;
        const nodeD = Object.values(state.nodes).find(n => n.parentId === nodeB.id);
    
        // ドロップ操作
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
        const oldParentB = Object.values(state.nodes).find(n => n.id === nodeB.id);
        const newParentC = Object.values(state.nodes).find(n => n.id === nodeC.id);
        const movedNode = Object.values(state.nodes).find(n => n.id === nodeD.id);
        
        expect(movedNode.parentId).toBe(newParentC.id);
        expect(oldParentB.children).toBe(0);
        expect(newParentC.children).toBe(1);
        
    });

    it('ノードを折りたたみ、展開できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        // 親ノードを明示的に選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
    
        // 子ノードを追加
        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        const childNode = Object.values(result.current.state.nodes).find(n => n.parentId === 1);
    
        // 折りたたみ前に再選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
        
        act(() => {
            dispatch({ type: 'COLLAPSE_NODE' });
        });
        const collapsedState = result.current.state.nodes;
        expect(Object.values(collapsedState).find(n => n.id === childNode.id).visible).toBe(false);
    
        // 展開前に再選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
        
        act(() => {
            dispatch({ type: 'EXPAND_NODE' });
        });
        const expandedState = result.current.state.nodes;
        expect(Object.values(expandedState).find(n => n.id === childNode.id).visible).toBe(true);
    });

    it('UPDATE_NODE_SIZE アクション', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newSize = { width: 200, height: 300, sectionHeights: [100, 100, 100] };
        act(() => {
            dispatch({ type: 'UPDATE_NODE_SIZE', payload: { id: 1, ...newSize } });
        });

        const updatedNode = Object.values(result.current.state.nodes)[0];
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
            nodes: initialState.nodes,
            width: window.innerWidth,
            height: window.innerHeight
        });
    });
});