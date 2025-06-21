// src/state/__test__/hierarchicalState.test.ts

import { reducer, initialState } from '../state';
import { Action } from '../../types/actionTypes';

describe('階層構造ベースの状態管理', () => {
  test('初期状態が正しく階層構造で設定される', () => {
    expect(initialState.hierarchicalData).toBeTruthy();
    expect(initialState.elementsCache).toBeTruthy();
    expect(initialState.cacheValid).toBe(true);
    expect(Object.keys(initialState.elementsCache)).toHaveLength(1);

    const rootElement = Object.values(initialState.elementsCache)[0];
    expect(rootElement.id).toBe('1');
    expect(rootElement.parentId).toBeNull();
  });

  test('要素の追加が階層構造で正しく処理される', () => {
    // 親要素を選択状態にする
    const selectAction: Action = {
      type: 'SELECT_ELEMENT',
      payload: { id: '1', ctrlKey: false, shiftKey: false },
    };
    const stateWithSelection = reducer(initialState, selectAction);

    // 要素を追加
    const addAction: Action = {
      type: 'ADD_ELEMENT',
      payload: { text: 'テスト要素' },
    };
    const stateAfterAdd = reducer(stateWithSelection, addAction);

    // 階層構造とキャッシュが更新されているか確認
    expect(stateAfterAdd.hierarchicalData).toBeTruthy();
    expect(stateAfterAdd.cacheValid).toBe(true);
    expect(Object.keys(stateAfterAdd.elementsCache)).toHaveLength(2);

    // 新しい要素が正しく追加されているか確認
    const newElement = Object.values(stateAfterAdd.elementsCache).find((el) => el.parentId === '1');
    expect(newElement).toBeTruthy();
    expect(newElement?.texts[0]).toBe('テスト要素');
    expect(newElement?.depth).toBe(1);
    expect(newElement?.selected).toBe(true); // 新要素は選択状態
  });

  test('要素の削除が階層構造で正しく処理される', () => {
    // まず要素を追加
    let state = reducer(initialState, {
      type: 'SELECT_ELEMENT',
      payload: { id: '1' },
    });
    state = reducer(state, {
      type: 'ADD_ELEMENT',
      payload: { text: '削除テスト要素' },
    });

    const beforeDeleteCount = Object.keys(state.elementsCache).length;
    expect(beforeDeleteCount).toBe(2);

    // 追加した要素を削除
    const deleteAction: Action = { type: 'DELETE_ELEMENT' };
    const stateAfterDelete = reducer(state, deleteAction);

    // 要素が削除されているか確認
    expect(Object.keys(stateAfterDelete.elementsCache)).toHaveLength(1);
    expect(stateAfterDelete.hierarchicalData).toBeTruthy();
    expect(stateAfterDelete.cacheValid).toBe(true);

    // ルート要素のみが残っているか確認
    const remainingElement = Object.values(stateAfterDelete.elementsCache)[0];
    expect(remainingElement.id).toBe('1');
    expect(remainingElement.parentId).toBeNull();
  });

  test('テキスト更新が階層構造で正しく処理される', () => {
    const updateAction: Action = {
      type: 'UPDATE_TEXT',
      payload: { id: '1', index: 0, value: '更新されたテキスト' },
    };
    const updatedState = reducer(initialState, updateAction);

    expect(updatedState.hierarchicalData).toBeTruthy();
    expect(updatedState.cacheValid).toBe(true);
    expect(updatedState.elementsCache['1'].texts[0]).toBe('更新されたテキスト');
  });

  test('要素選択が階層構造で正しく処理される', () => {
    const selectAction: Action = {
      type: 'SELECT_ELEMENT',
      payload: { id: '1', ctrlKey: false, shiftKey: false },
    };
    const selectedState = reducer(initialState, selectAction);

    expect(selectedState.hierarchicalData).toBeTruthy();
    expect(selectedState.cacheValid).toBe(true);
    expect(selectedState.elementsCache['1'].selected).toBe(true);
  });

  test('全選択解除が階層構造で正しく処理される', () => {
    // まず選択状態にする
    const state = reducer(initialState, {
      type: 'SELECT_ELEMENT',
      payload: { id: '1' },
    });

    // 選択解除
    const deselectAction: Action = { type: 'DESELECT_ALL' };
    const deselectedState = reducer(state, deselectAction);

    expect(deselectedState.hierarchicalData).toBeTruthy();
    expect(deselectedState.cacheValid).toBe(true);
    expect(deselectedState.elementsCache['1'].selected).toBe(false);
  });

  test('要素の移動が階層構造で正しく処理される', () => {
    const moveAction: Action = {
      type: 'MOVE_ELEMENT',
      payload: { id: '1', x: 100, y: 200 },
    };
    const movedState = reducer(initialState, moveAction);

    expect(movedState.hierarchicalData).toBeTruthy();
    expect(movedState.cacheValid).toBe(true);
    expect(movedState.elementsCache['1'].x).toBe(100);
    expect(movedState.elementsCache['1'].y).toBe(200);
  });

  test('編集状態の管理が階層構造で正しく処理される', () => {
    // まず選択状態にする
    const state = reducer(initialState, {
      type: 'SELECT_ELEMENT',
      payload: { id: '1' },
    });

    // 編集開始
    const editAction: Action = { type: 'EDIT_ELEMENT' };
    const editingState = reducer(state, editAction);

    expect(editingState.hierarchicalData).toBeTruthy();
    expect(editingState.cacheValid).toBe(true);
    expect(editingState.elementsCache['1'].editing).toBe(true);

    // 編集終了
    const endEditAction: Action = { type: 'END_EDITING' };
    const nonEditingState = reducer(editingState, endEditAction);

    expect(nonEditingState.hierarchicalData).toBeTruthy();
    expect(nonEditingState.cacheValid).toBe(true);
    expect(nonEditingState.elementsCache['1'].editing).toBe(false);
  });

  test('ズーム操作が正しく処理される', () => {
    const zoomInAction: Action = { type: 'ZOOM_IN' };
    const zoomedInState = reducer(initialState, zoomInAction);

    expect(zoomedInState.zoomRatio).toBe(1.1);
    expect(zoomedInState.hierarchicalData).toBe(initialState.hierarchicalData);

    const zoomOutAction: Action = { type: 'ZOOM_OUT' };
    const zoomedOutState = reducer(zoomedInState, zoomOutAction);

    expect(zoomedOutState.zoomRatio).toBe(1.0);
  });

  test('不正なアクションタイプは状態を変更しない', () => {
    const invalidAction: Action = { type: 'INVALID_ACTION' as any };
    const unchangedState = reducer(initialState, invalidAction);

    expect(unchangedState).toEqual(initialState);
  });

  test('キャッシュの整合性が保たれる', () => {
    // 複数の操作を行ってキャッシュが正しく更新されるかテスト
    let state = reducer(initialState, {
      type: 'SELECT_ELEMENT',
      payload: { id: '1' },
    });

    state = reducer(state, {
      type: 'ADD_ELEMENT',
      payload: { text: 'キャッシュテスト' },
    });

    state = reducer(state, {
      type: 'UPDATE_TEXT',
      payload: { id: '1', index: 0, value: '更新テスト' },
    });

    // キャッシュが有効であることを確認
    expect(state.cacheValid).toBe(true);

    // 階層構造とキャッシュの整合性を確認
    expect(state.hierarchicalData).toBeTruthy();
    const flatFromHierarchy = Object.keys(state.elementsCache);
    expect(flatFromHierarchy.length).toBe(2);

    // 更新されたテキストが反映されているか確認
    expect(state.elementsCache['1'].texts[0]).toBe('更新テスト');
  });
});
