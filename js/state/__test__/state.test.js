"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/state/__test__/state.test.js
const react_1 = require("@testing-library/react");
const state_1 = require("../state");
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
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const state = result.current.state;
        expect(Object.keys(state.elements).length).toBe(1);
        const rootNode = Object.values(state.elements)[0];
        expect(rootNode.parentId).toBe(null);
        expect(rootNode.selected).toBe(true);
        expect(rootNode.children).toBe(0);
        expect(rootNode.editing).toBe(false);
    });
    it('新しいノードを追加する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { state, dispatch } = result.current;
        const initialNode = Object.values(result.current.state.elements)[0];
        const initialNodeLength = Object.keys(state.elements).length;
        (0, react_1.act)(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        const afterState = result.current.state;
        const addedNode = Object.values(afterState.elements).find(node => node.id !== initialNode.id);
        const parentNode = Object.values(afterState.elements).find(node => node.id === initialNode.id);
        expect(Object.keys(afterState.elements).length).toBe(initialNodeLength + 1);
        expect(parentNode.children).toBe(1);
        expect(parentNode.selected).toBe(false);
        expect(addedNode.parentId).toBe(initialNode.id);
        expect(addedNode.selected).toBe(true);
        expect(addedNode.editing).toBe(true);
        expect(addedNode.depth).toBe(2);
    });
    it('子ノードを持たないノードを削除する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        const initialNodeLength = Object.keys(result.current.state.elements).length;
        (0, react_1.act)(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        const afterAddState = result.current.state;
        expect(Object.keys(afterAddState.elements).length).toBe(initialNodeLength + 1);
        const addedNode = Object.values(afterAddState.elements).find(n => n.id !== 1);
        const nodeId = addedNode.id;
        (0, react_1.act)(() => {
            dispatch({ type: 'DELETE_NODE' });
        });
        const afterDeleteState = result.current.state;
        expect(Object.keys(afterDeleteState.elements).length).toBe(initialNodeLength);
        expect(Object.values(afterDeleteState.elements)[0].children).toBe(0);
        expect(Object.values(afterDeleteState.elements).some(n => n.id === nodeId)).toBe(false);
    });
    it('子ノードを持つノードを削除する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        (0, react_1.act)(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        let state = result.current.state;
        let childNode = Object.values(state.elements).find(n => n.id !== 1);
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'ADD_NODE' });
        });
        state = result.current.state;
        childNode = Object.values(state.elements).find(n => n.id === childNode.id);
        const grandchildNode = Object.values(state.elements).find(n => n.parentId === childNode.id);
        expect(Object.keys(state.elements).length).toBe(3);
        expect(childNode.children).toBe(1);
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'DELETE_NODE' });
        });
        const afterState = result.current.state;
        expect(Object.keys(afterState.elements).length).toBe(1);
        expect(Object.values(afterState.elements).some(n => n.id === 1)).toBe(true);
        expect(Object.values(afterState.elements).some(n => n.id === childNode.id)).toBe(false);
        expect(Object.values(afterState.elements).some(n => n.id === grandchildNode.id)).toBe(false);
    });
    it('テキストを更新できることを確認する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        const newText = 'Updated text';
        const field = 'text';
        (0, react_1.act)(() => {
            dispatch({ type: 'UPDATE_TEXT', payload: { id: 1, field, value: newText } });
        });
        const newState = result.current.state;
        expect(Object.values(newState.elements)[0][field]).toBe(newText);
        expect(Object.values(newState.elements)[0].editing).toBe(false);
    });
    it('ノードが選択できることを確認する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
        const newState = result.current.state;
        const elements = Object.values(newState.elements);
        expect(elements[0].selected).toBe(true);
        expect(elements[0].editing).toBe(false);
        elements.filter(n => n.id !== 1).forEach(node => {
            expect(node.selected).toBe(false);
        });
    });
    it('ノードの選択が解除できることを確認する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        (0, react_1.act)(() => { dispatch({ type: 'SELECT_NODE', payload: 1 }); });
        (0, react_1.act)(() => { dispatch({ type: 'DESELECT_ALL' }); });
        const newState = result.current.state;
        Object.values(newState.elements).forEach(node => {
            expect(node.selected).toBe(false);
            expect(node.editing).toBe(false);
        });
    });
    it('ノード追加時、UNDO/REDOできることを確認する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        // const initialNodes = initialState.elements;
        const initialNodes = result.current.state.elements;
        (0, react_1.act)(() => { dispatch({ type: 'ADD_NODE' }); });
        const afterAddState = result.current.state.elements;
        (0, react_1.act)(() => { dispatch({ type: 'UNDO' }); });
        expect(result.current.state.elements).toEqual(initialNodes);
        (0, react_1.act)(() => { dispatch({ type: 'REDO' }); });
        expect(result.current.state.elements).toEqual(afterAddState);
    });
    it('ノードが移動できることを確認する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        const newPosition = { x: 100, y: 200 };
        (0, react_1.act)(() => {
            dispatch({ type: 'MOVE_NODE', payload: { id: 1, ...newPosition } });
        });
        const movedNode = Object.values(result.current.state.elements)[0];
        expect(movedNode.x).toBe(newPosition.x);
        expect(movedNode.y).toBe(newPosition.y);
    });
    it('ノードをコピーして貼り付けられることを確認する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        (0, react_1.act)(() => { dispatch({ type: 'SELECT_NODE', payload: 1 }); });
        (0, react_1.act)(() => { dispatch({ type: 'ADD_NODE' }); });
        (0, react_1.act)(() => { dispatch({ type: 'COPY_NODE' }); });
        const parentNode = Object.values(result.current.state.elements).find(n => n.id === 1);
        (0, react_1.act)(() => { dispatch({ type: 'SELECT_NODE', payload: 1 }); });
        (0, react_1.act)(() => { dispatch({ type: 'PASTE_NODE' }); });
        const pastedNode = Object.values(result.current.state.elements)
            .find(n => n.parentId === parentNode.id);
        expect(pastedNode).toBeDefined();
        // 貼り付けたノードの親ノードchildrenプロパティが1であることを確認
        expect(parentNode.children).toBe(1);
        expect(pastedNode.depth).toBe(parentNode.depth + 1);
    });
    it('ノードを切り取ることができることを確認する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        (0, react_1.act)(() => { dispatch({ type: 'SELECT_NODE', payload: 1 }); });
        (0, react_1.act)(() => { dispatch({ type: 'ADD_NODE' }); });
        let state = result.current.state;
        const childNode = Object.values(state.elements).find(n => n.parentId === 1);
        (0, react_1.act)(() => { dispatch({ type: 'SELECT_NODE', payload: childNode.id }); });
        (0, react_1.act)(() => { dispatch({ type: 'CUT_NODE' }); });
        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.elements).length).toBe(1);
        expect(Object.values(afterCutState.elements).some(n => n.id === childNode.id)).toBe(false);
        expect(Object.keys(afterCutState.cutNodes).length).toBe(1);
        expect(Object.values(afterCutState.cutNodes).some(n => n.id === childNode.id)).toBe(true);
    });
    it('切り取ったノードが貼り付けられることを確認する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        // 初期状態のルートノードを選択
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
        // 子ノードを追加
        (0, react_1.act)(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        // 追加された子ノードを取得
        let state = result.current.state;
        const childNode = Object.values(state.elements).find(n => n.parentId === 1);
        expect(childNode).toBeDefined(); // 子ノードが正しく追加されていることを確認
        // 子ノードを選択
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
        });
        // 子ノードを切り取り
        (0, react_1.act)(() => {
            dispatch({ type: 'CUT_NODE' });
        });
        // 切り取り後の状態を確認
        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.elements).length).toBe(1); // ルートノードのみ残る
        expect(Object.values(afterCutState.elements).some(n => n.id === childNode.id)).toBe(false); // 子ノードが削除されている
        expect(afterCutState.cutNodes).toBeDefined(); // cutNodesが設定されている
        expect(Object.keys(afterCutState.cutNodes).length).toBe(1); // 切り取られたノードが1つ
        expect(Object.values(afterCutState.cutNodes).some(n => n.id === childNode.id)).toBe(true); // 切り取られたノードのIDが一致する
        // 新しい親ノードを作成
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 }); // ルートノードを選択
            dispatch({ type: 'ADD_NODE' }); // 新しい子ノードを追加
        });
        // 新しい親ノードを取得
        state = result.current.state;
        console.log('State after adding new parent node:', JSON.stringify(state, null, 2)); // デバッグ用
        const newParentNode = Object.values(state.elements).find(n => n.parentId === 1);
        expect(newParentNode).toBeDefined(); // 新しい親ノードが正しく追加されていることを確認
        console.log('New Parent Node:', JSON.stringify(newParentNode, null, 2)); // デバッグ用
        // 新しい親ノードを選択
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: newParentNode.id });
        });
        // 切り取ったノードを貼り付け
        (0, react_1.act)(() => {
            dispatch({ type: 'PASTE_NODE' });
        });
        // 貼り付け後の状態を確認
        const afterPasteState = result.current.state;
        console.log('After Paste State:', JSON.stringify(afterPasteState, null, 2)); // デバッグ用
        const pastedNode = Object.values(afterPasteState.elements).find(n => n.parentId === newParentNode.id);
        expect(pastedNode).toBeDefined(); // 貼り付けられたノードが存在する
        expect(pastedNode.parentId).toBe(newParentNode.id); // 貼り付けられたノードのIDが一致する
        expect(pastedNode.depth).toBe(newParentNode.depth + 1); // 深さが親ノードの深さ + 1 になっている
        // 新しい親ノードの子ノード数を確認
        // const updatedParentNode = afterPasteState.elements.find(n => n.id === newParentNode.id);
        const updatedParentNode = Object.values(afterPasteState.elements).find(n => n.id === newParentNode.id);
        expect(updatedParentNode.children).toBe(1); // 新しい親ノードの子ノード数が1になっている
    });
    it('切り取ったノードが貼り付けられることを確認する(切り取るノードに子が存在するケース)', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        // 初期状態のルートノードを選択
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
        // 子ノードを追加
        (0, react_1.act)(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        // 追加された子ノードを取得
        let state = result.current.state;
        const childNode = Object.values(state.elements).find(n => n.parentId === 1);
        expect(childNode).toBeDefined(); // 子ノードが正しく追加されていることを確認
        // 子ノードを選択
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'ADD_NODE' }); // 新しい子ノードを追加
        });
        // 子ノードを切り取り
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: childNode.id });
            dispatch({ type: 'CUT_NODE' });
        });
        // 切り取り後の状態を確認
        const afterCutState = result.current.state;
        expect(Object.keys(afterCutState.elements).length).toBe(1); // ルートノードのみ残る
        expect(Object.values(afterCutState.elements).some(n => n.id === childNode.id)).toBe(false); // 子ノードが削除されている
        expect(afterCutState.cutNodes).toBeDefined(); // cutNodesが設定されている
        expect(Object.keys(afterCutState.cutNodes).length).toBe(2);
        expect(Object.values(afterCutState.cutNodes).some(n => n.id === childNode.id)).toBe(true);
        // 新しい親ノードを作成
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 }); // ルートノードを選択
            dispatch({ type: 'ADD_NODE' }); // 新しい子ノードを追加
        });
        // 新しい親ノードを取得
        state = result.current.state;
        console.log('State after adding new parent node:', JSON.stringify(state, null, 2)); // デバッグ用
        const newParentNode = Object.values(state.elements).find(n => n.parentId === 1);
        expect(newParentNode).toBeDefined(); // 新しい親ノードが正しく追加されていることを確認
        console.log('New Parent Node:', JSON.stringify(newParentNode, null, 2)); // デバッグ用
        // 新しい親ノードを選択
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: newParentNode.id });
        });
        // 切り取ったノードを貼り付け
        (0, react_1.act)(() => {
            dispatch({ type: 'PASTE_NODE' });
        });
        // 貼り付け後の状態を確認
        const afterPasteState = result.current.state;
        console.log('After Paste State:', JSON.stringify(afterPasteState, null, 2)); // デバッグ用
        const pastedNode = Object.values(afterPasteState.elements).find(n => n.parentId === newParentNode.id);
        expect(pastedNode).toBeDefined(); // 貼り付けられたノードが存在する
        expect(pastedNode.parentId).toBe(newParentNode.id); // 貼り付けられたノードのIDが一致する
        expect(pastedNode.depth).toBe(newParentNode.depth + 1); // 深さが親ノードの深さ + 1 になっている
        expect(pastedNode.visible).toBe(true); // 貼り付けられたノードが表示されている
        const pastedChildNode = Object.values(afterPasteState.elements).find(n => n.parentId === pastedNode.id);
        expect(pastedChildNode).toBeDefined(); // 貼り付けられた子ノードが存在する
        expect(pastedChildNode.depth).toBe(pastedNode.depth + 1); // 深さが親ノードの深さ + 1 になっている
        expect(pastedChildNode.visible).toBe(true); // 貼り付けられた子ノードが表示されている
        // 新しい親ノードの子ノード数を確認
        const updatedParentNode = Object.values(afterPasteState.elements).find(n => n.id === newParentNode.id);
        expect(updatedParentNode.children).toBe(1); // 新しい親ノードの子ノード数が1になっている
        // idに重複がないことを確認
        // const ids = afterPasteState.elements.map(n => n.id);
        const ids = Object.values(afterPasteState.elements).map(n => n.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
    it('ノードをドロップした時に移動できることを確認する', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        // ルートノードA（ID:1）を選択して子ノードBを追加
        await (0, react_1.act)(async () => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
            dispatch({ type: 'ADD_NODE' });
        });
        let state = result.current.state;
        let nodeB = Object.values(state.elements).find(n => n.parentId === 1);
        // ルートノードA（ID:1）を選択して子ノードCを追加
        await (0, react_1.act)(async () => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
            dispatch({ type: 'ADD_NODE' });
        });
        state = result.current.state;
        let nodeC = Object.values(state.elements).find(n => n.parentId === 1 && n.id !== nodeB.id);
        // ノードBを選択して子ノードDを追加
        await (0, react_1.act)(async () => {
            dispatch({ type: 'SELECT_NODE', payload: nodeB.id });
            dispatch({ type: 'ADD_NODE' });
        });
        state = result.current.state;
        const nodeD = Object.values(state.elements).find(n => n.parentId === nodeB.id);
        // ドロップ操作(ノードDをノードCの子ノードに移動)
        await (0, react_1.act)(async () => {
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
        const oldParentB = Object.values(state.elements).find(n => n.id === nodeB.id);
        const newParentC = Object.values(state.elements).find(n => n.id === nodeC.id);
        const movedNode = Object.values(state.elements).find(n => n.id === nodeD.id);
        expect(movedNode.parentId).toBe(newParentC.id);
        expect(oldParentB.children).toBe(0);
        expect(newParentC.children).toBe(1);
    });
    it('子ノードにドラッグした時に移動できないことを確認する', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        // ルートノードA（ID:1）を選択して子ノードBを追加
        await (0, react_1.act)(async () => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
            dispatch({ type: 'ADD_NODE' });
        });
        let state = result.current.state;
        let nodeB = Object.values(state.elements).find(n => n.parentId === 1);
        // ノードBを選択して子ノードCを追加
        await (0, react_1.act)(async () => {
            dispatch({ type: 'SELECT_NODE', payload: nodeB.id });
            dispatch({ type: 'ADD_NODE' });
        });
        state = result.current.state;
        let nodeC = Object.values(state.elements).find(n => n.parentId === nodeB.id);
        // ドロップ操作(ノードBをノードCの子ノードに移動)
        await (0, react_1.act)(async () => {
            dispatch({
                type: 'DROP_NODE',
                payload: {
                    id: nodeB.id,
                    oldParentId: 1,
                    newParentId: nodeC.id,
                    draggingNodeOrder: nodeB.order,
                    depth: nodeC.depth + 1
                }
            });
        });
        const dragAfterState = result.current.state;
        // assertion(ドロップ前後で状態が変化していないことを確認)
        expect(dragAfterState).toEqual(state);
    });
    it('孫ノードにドラッグした時に移動できないことを確認する', async () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        // ルートノードA（ID:1）を選択して子ノードBを追加
        await (0, react_1.act)(async () => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
            dispatch({ type: 'ADD_NODE' });
        });
        let state = result.current.state;
        let nodeB = Object.values(state.elements).find(n => n.parentId === 1);
        // ノードBを選択して子ノードCを追加
        await (0, react_1.act)(async () => {
            dispatch({ type: 'SELECT_NODE', payload: nodeB.id });
            dispatch({ type: 'ADD_NODE' });
        });
        state = result.current.state;
        let nodeC = Object.values(state.elements).find(n => n.parentId === nodeB.id);
        // ノードCを選択して子ノードDを追加
        await (0, react_1.act)(async () => {
            dispatch({ type: 'SELECT_NODE', payload: nodeC.id });
            dispatch({ type: 'ADD_NODE' });
        });
        state = result.current.state;
        let nodeD = Object.values(state.elements).find(n => n.parentId === nodeC.id);
        // ドロップ操作(ノードBをノードDの子ノードに移動)
        await (0, react_1.act)(async () => {
            dispatch({
                type: 'DROP_NODE',
                payload: {
                    id: nodeB.id,
                    oldParentId: 1,
                    newParentId: nodeC.id,
                    draggingNodeOrder: nodeB.order,
                    depth: nodeC.depth + 1
                }
            });
        });
        const dragAfterState = result.current.state;
        // assertion(ドロップ前後で状態が変化していないことを確認)
        expect(dragAfterState).toEqual(state);
    });
    it('ノードを折りたたみ、展開できることを確認する', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        // 親ノードを明示的に選択
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
        // 子ノードを追加
        (0, react_1.act)(() => {
            dispatch({ type: 'ADD_NODE' });
        });
        const childNode = Object.values(result.current.state.elements).find(n => n.parentId === 1);
        // 折りたたみ前に再選択
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
        (0, react_1.act)(() => {
            dispatch({ type: 'COLLAPSE_NODE' });
        });
        const collapsedState = result.current.state.elements;
        expect(Object.values(collapsedState).find(n => n.id === childNode.id).visible).toBe(false);
        // 展開前に再選択
        (0, react_1.act)(() => {
            dispatch({ type: 'SELECT_NODE', payload: 1 });
        });
        (0, react_1.act)(() => {
            dispatch({ type: 'EXPAND_NODE' });
        });
        const expandedState = result.current.state.elements;
        expect(Object.values(expandedState).find(n => n.id === childNode.id).visible).toBe(true);
    });
    it('UPDATE_NODE_SIZE アクション', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        const newSize = { width: 200, height: 300, sectionHeights: [100, 100, 100] };
        (0, react_1.act)(() => {
            dispatch({ type: 'UPDATE_NODE_SIZE', payload: { id: 1, ...newSize } });
        });
        const updatedNode = Object.values(result.current.state.elements)[0];
        expect(updatedNode.width).toBe(newSize.width);
        expect(updatedNode.height).toBe(newSize.height);
    });
    it('LOAD_NODES アクション（空の場合）', () => {
        const { result } = (0, react_1.renderHook)(() => (0, state_1.useStore)());
        const { dispatch } = result.current;
        (0, react_1.act)(() => { dispatch({ type: 'LOAD_NODES', payload: [] }); });
        const loadedState = result.current.state;
        expect(loadedState).toEqual({
            ...state_1.initialState,
            elements: state_1.initialState.elements,
            width: window.innerWidth,
            height: window.innerHeight
        });
    });
});
