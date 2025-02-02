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

        expect(state.nodes.length).toBe(1);
        expect(state.nodes[0].parentId).toBe(null);
        expect(state.nodes[0].selected).toBe(true);
        expect(state.nodes[0].children).toBe(0);
        expect(state.nodes[0].editing).toBe(false);
    });

    it('新しいノードを追加する', () => {
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
    
        const initialNodeLength = result.current.state.nodes.length;
    
        // ノード追加
        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        
        // 追加後の状態検証
        const afterAddState = result.current.state;
        expect(afterAddState.nodes.length).toBe(initialNodeLength + 1);
        
        // 追加ノードの取得と選択状態確認
        const addedNode = afterAddState.nodes.find(n => n.id !== 1);
        expect(addedNode.selected).toBe(true);
        const nodeId = addedNode.id;
    
        // ノード削除
        act(() => {
            dispatch({ type: 'DELETE_NODE' });
        });
    
        // 削除後の状態検証
        const afterDeleteState = result.current.state;
        expect(afterDeleteState.nodes.length).toBe(initialNodeLength);
        expect(afterDeleteState.nodes[0].children).toBe(0);
        expect(afterDeleteState.nodes.some(n => n.id === nodeId)).toBe(false);
    });

    it('子ノードを持つノードを削除する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        // 親ノード作成（ID:1）
        // 子ノード追加（ID:2）
        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        
        // 最新のstateを取得
        let state = result.current.state;
        let childNode = state.nodes.find(n => n.id !== 1);
        
        // 子ノードを選択してさらに孫ノード追加（ID:3）
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'ADD_NODE' });
        });
    
        // 最新のstateを再取得
        state = result.current.state;
        childNode = state.nodes.find(n => n.id === childNode.id);
        const grandchildNode = state.nodes.find(n => n.parentId === childNode.id);
    
        // 初期状態確認
        expect(state.nodes.length).toBe(3);
        expect(childNode.children).toBe(1);
        
        // 親ノードを選択して削除
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'DELETE_NODE' });
        });
    
        // 削除後の状態確認
        const afterState = result.current.state;
        expect(afterState.nodes.length).toBe(1);
        expect(afterState.nodes.some(n => n.id === 1)).toBe(true);
        expect(afterState.nodes.some(n => n.id === childNode.id)).toBe(false);
        expect(afterState.nodes.some(n => n.id === grandchildNode.id)).toBe(false);
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
        expect(newState.nodes[0][field]).toBe(newText);
        expect(newState.nodes[0].editing).toBe(false);
    });

    it('ノードが選択できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });

        const newState = result.current.state;
        expect(newState.nodes[0].selected).toBe(true);
        expect(newState.nodes[0].editing).toBe(false);
        newState.nodes.filter(n => n.id !== 1).forEach(node => {
            expect(node.selected).toBe(false);
        });
    });

    it('ノードの選択が解除できることを確認する', () => {
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
            expect(node.editing).toBe(false);
        });
    });

    it('拡大表示できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const initialZoomRatio = result.current.state.zoomRatio;

        act(() => {
            dispatch({ type: 'ZOOM_IN' });
        });

        const newState = result.current.state;
        expect(newState.zoomRatio).toBeCloseTo(initialZoomRatio + 0.1);
    });

    it('縮小表示できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const initialZoomRatio = result.current.state.zoomRatio;

        act(() => {
            dispatch({ type: 'ZOOM_OUT' });
        });

        const newState = result.current.state;
        expect(newState.zoomRatio).toBeCloseTo(initialZoomRatio - 0.1);
    });

    it('ノード追加時、UNDO/REDOできることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        // 初期状態を取得
        const initialNodes = initialState.nodes;

        // ノードを追加
        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        const afterAddState = result.current.state.nodes;

        // UNDO→REDOを実行する
        act(() => {
            dispatch({ type: 'UNDO' });
        });
        expect(result.current.state.nodes).toEqual(initialNodes);

        act(() => {
            dispatch({ type: 'REDO' });
        });
        expect(result.current.state.nodes).toEqual(afterAddState);
    });

    it('ノードが移動できることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newPosition = { x: 100, y: 200 };

        act(() => {
            dispatch({ type: 'MOVE_NODE', payload: { id: 1, ...newPosition } });
        });

        const movedNode = result.current.state.nodes[0];
        expect(movedNode.x).toBe(newPosition.x);
        expect(movedNode.y).toBe(newPosition.y);
    });

    it('ノードをコピーして貼り付けられることを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        // 初期ノードを選択してコピー
        act(() => {
            dispatch({ type: 'COPY_NODE' });
        });

        // 新しい親ノードを作成
        act(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        const newParent = result.current.state.nodes[1];

        // ペースト実行
        act(() => {
            dispatch({ type: 'PASTE_NODE' });
        });

        const pastedNode = result.current.state.nodes.find(n => n.parentId === newParent.id);
        expect(pastedNode).toBeDefined();
        expect(newParent.children).toBe(1);
        expect(pastedNode.depth).toBe(newParent.depth + 1);
    });

    it('ノードが選択されていない状態でCUT_NODEを実行しても変化がないことを確認する', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;
    
        act(() => {
            dispatch({ type: 'DESELECT_ALL' });
        });

        // 初期状態を保存
        const initialStateBeforeCut = result.current.state;
    
        // ノードが選択されていない状態でCUT_NODEを実行
        act(() => {
            dispatch({ type: 'CUT_NODE' });
        });
    
        // 実行後の状態を取得
        const stateAfterCut = result.current.state;
    
        // 状態が変化していないことを確認
        expect(stateAfterCut).toEqual(initialStateBeforeCut);
    });

    it('ノードを切り取ることができることを確認する', () => {
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
        const childNode = state.nodes.find(n => n.parentId === 1);
    
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
        expect(afterCutState.nodes.length).toBe(1); // ルートノードのみ残る
        expect(afterCutState.nodes.some(n => n.id === childNode.id)).toBe(false); // 子ノードが削除されている
        expect(afterCutState.cutNodes).toBeDefined(); // cutNodesが設定されている
        expect(afterCutState.cutNodes.length).toBe(1); // 切り取られたノードが1つ
        expect(afterCutState.cutNodes[0].id).toBe(childNode.id); // 切り取られたノードのIDが一致する
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
        const childNode = state.nodes.find(n => n.parentId === 1);
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
        expect(afterCutState.nodes.length).toBe(1); // ルートノードのみ残る
        expect(afterCutState.nodes.some(n => n.id === childNode.id)).toBe(false); // 子ノードが削除されている
        expect(afterCutState.cutNodes).toBeDefined(); // cutNodesが設定されている
        expect(afterCutState.cutNodes.length).toBe(1); // 切り取られたノードが1つ
        expect(afterCutState.cutNodes[0].id).toBe(childNode.id); // 切り取られたノードのIDが一致する
    
        // 新しい親ノードを作成
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 }); // ルートノードを選択
            dispatch({ type: 'ADD_NODE' }); // 新しい子ノードを追加
        });
    
        // 新しい親ノードを取得
        state = result.current.state;
        console.log('State after adding new parent node:', JSON.stringify(state, null, 2)); // デバッグ用
    
        const newParentNode = state.nodes.find(n => n.parentId === 1);
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
    
        const pastedNode = afterPasteState.nodes.find(n => n.parentId === newParentNode.id);
        expect(pastedNode).toBeDefined(); // 貼り付けられたノードが存在する
        expect(pastedNode.parentId).toBe(newParentNode.id); // 貼り付けられたノードのIDが一致する
        expect(pastedNode.depth).toBe(newParentNode.depth + 1); // 深さが親ノードの深さ + 1 になっている
    
        // 新しい親ノードの子ノード数を確認
        const updatedParentNode = afterPasteState.nodes.find(n => n.id === newParentNode.id);
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
        const childNode = state.nodes.find(n => n.parentId === 1);
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
        expect(afterCutState.nodes.length).toBe(1); // ルートノードのみ残る
        expect(afterCutState.nodes.some(n => n.id === childNode.id)).toBe(false); // 子ノードが削除されている
        expect(afterCutState.cutNodes).toBeDefined(); // cutNodesが設定されている
        expect(afterCutState.cutNodes.length).toBe(2); // 切り取られたノードが1つ
        expect(afterCutState.cutNodes[0].id).toBe(childNode.id); // 切り取られたノードのIDが一致する
    
        // 新しい親ノードを作成
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 }); // ルートノードを選択
            dispatch({ type: 'ADD_NODE' }); // 新しい子ノードを追加
        });
    
        // 新しい親ノードを取得
        state = result.current.state;
        console.log('State after adding new parent node:', JSON.stringify(state, null, 2)); // デバッグ用
    
        const newParentNode = state.nodes.find(n => n.parentId === 1);
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
    
        const pastedNode = afterPasteState.nodes.find(n => n.parentId === newParentNode.id);
        expect(pastedNode).toBeDefined(); // 貼り付けられたノードが存在する
        expect(pastedNode.parentId).toBe(newParentNode.id); // 貼り付けられたノードのIDが一致する
        expect(pastedNode.depth).toBe(newParentNode.depth + 1); // 深さが親ノードの深さ + 1 になっている
        expect(pastedNode.visible).toBe(true); // 貼り付けられたノードが表示されている

        const pastedChildNode = afterPasteState.nodes.find(n => n.parentId === pastedNode.id);
        expect(pastedChildNode).toBeDefined(); // 貼り付けられた子ノードが存在する
        expect(pastedChildNode.depth).toBe(pastedNode.depth + 1); // 深さが親ノードの深さ + 1 になっている
        expect(pastedChildNode.visible).toBe(true); // 貼り付けられた子ノードが表示されている
    
        // 新しい親ノードの子ノード数を確認
        const updatedParentNode = afterPasteState.nodes.find(n => n.id === newParentNode.id);
        expect(updatedParentNode.children).toBe(1); // 新しい親ノードの子ノード数が1になっている

        // idに重複がないことを確認
        const ids = afterPasteState.nodes.map(n => n.id);
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
        let nodeB = state.nodes.find(n => n.parentId === 1);
    
        // ルートノードA（ID:1）を選択して子ノードCを追加
        await act(async () => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
            dispatch({ type: 'ADD_NODE' });
        });
        
        state = result.current.state;
        let nodeC = state.nodes.find(n => n.parentId === 1 && n.id !== nodeB.id);
    
        // ノードBを選択して子ノードDを追加
        await act(async () => {
            dispatch({ type: 'SELECT_NODE', payload: nodeB.id });
            dispatch({ type: 'ADD_NODE' });
        });
        
        state = result.current.state;
        const nodeD = state.nodes.find(n => n.parentId === nodeB.id);
    
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
        const oldParentB = state.nodes.find(n => n.id === nodeB.id);
        const newParentC = state.nodes.find(n => n.id === nodeC.id);
        const movedNode = state.nodes.find(n => n.id === nodeD.id);
        
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
        const childNode = result.current.state.nodes.find(n => n.parentId === 1);
    
        // 折りたたみ前に再選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
        
        act(() => {
            dispatch({ type: 'COLLAPSE_NODE' });
        });
        const collapsedState = result.current.state.nodes;
        expect(collapsedState.find(n => n.id === childNode.id).visible).toBe(false);
    
        // 展開前に再選択
        act(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
        
        act(() => {
            dispatch({ type: 'EXPAND_NODE' });
        });
        const expandedState = result.current.state.nodes;
        expect(expandedState.find(n => n.id === childNode.id).visible).toBe(true);
    });

    it('UPDATE_NODE_SIZE アクション', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const newSize = { width: 200, height: 300 };

        act(() => {
            dispatch({ type: 'UPDATE_NODE_SIZE', payload: { id: 1, ...newSize } });
        });

        const updatedNode = result.current.state.nodes[0];
        expect(updatedNode.width).toBe(newSize.width);
        expect(updatedNode.height).toBe(newSize.height);
    });

    it('LOAD_NODES アクション（空の場合）', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        act(() => {
            dispatch({ type: 'LOAD_NODES', payload: [] });
        });

        const loadedState = result.current.state;
        expect(loadedState).toEqual({
            ...initialState,
            nodes: initialState.nodes,
            width: window.innerWidth,
            height: window.innerHeight
        });
    });
});