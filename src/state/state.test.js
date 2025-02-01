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
        expect(parentNode.children).toBe(1);
        expect(parentNode.selected).toBe(false);
        expect(addedNode.parentId).toBe(initialNode.id);
        expect(addedNode.selected).toBe(true);
        expect(addedNode.editing).toBe(true);
        expect(addedNode.depth).toBe(2);
    });

    it('DELETE_NODE アクション', () => {
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

    it('UPDATE_TEXT アクション', () => {
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

    it('SELECT_NODE アクション', () => {
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
            expect(node.editing).toBe(false);
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
        expect(newState.zoomRatio).toBeCloseTo(initialZoomRatio + 0.1);
    });

    it('ZOOM_OUT アクション', () => {
        const { result } = renderHook(() => useStore());
        const { dispatch } = result.current;

        const initialZoomRatio = result.current.state.zoomRatio;

        act(() => {
            dispatch({ type: 'ZOOM_OUT' });
        });

        const newState = result.current.state;
        expect(newState.zoomRatio).toBeCloseTo(initialZoomRatio - 0.1);
    });

    it('UNDO/REDO アクション', () => {
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

    it('MOVE_NODE アクション', () => {
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

    it('COPY_NODE と PASTE_NODE アクション', () => {
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

    it('EXPAND_NODE と COLLAPSE_NODE アクション', () => {
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
            nodes: adjustNodePositions(initialState.nodes), // プロダクションロジックを反映
            width: window.innerWidth,
            height: window.innerHeight
        });
    });
});