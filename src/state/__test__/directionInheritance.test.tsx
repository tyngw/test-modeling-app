import { renderHook, act } from '@testing-library/react';
import { useStore } from './textUtils';
import { Element } from '../../types/types';

describe('Direction Inheritance Tests', () => {
  beforeEach(() => {
    // LocalStorageをクリア
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('ADD_ELEMENT direction inheritance', () => {
    it('direction:leftの要素を選択して子要素を追加すると、direction:leftが継承される', () => {
      const { result } = renderHook(() => useStore());
      const { dispatch } = result.current;

      // ルート要素を取得
      const rootId = '1';

      // ルート要素を選択して子要素を追加
      act(() => {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: rootId, ctrlKey: false, shiftKey: false },
        });
        dispatch({ type: 'ADD_ELEMENT', payload: {} });
      });

      // 最初の子要素を取得
      let state = result.current.state;
      const firstChild = Object.values(state.elementsCache).find(
        (elm: Element) => elm.parentId === rootId,
      ) as Element;
      expect(firstChild).toBeDefined();

      // 最初の子要素のdirectionをleftに変更（DROP_ELEMENTを模擬）
      act(() => {
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: firstChild.id,
            newParentId: rootId,
            newOrder: 0,
            direction: 'left' as const,
          },
        });
      });

      // 状態を更新
      state = result.current.state;
      const updatedFirstChild = state.elementsCache[firstChild.id];
      expect(updatedFirstChild.direction).toBe('left');

      // direction:leftの要素を選択して新しい子要素を追加
      act(() => {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: firstChild.id, ctrlKey: false, shiftKey: false },
        });
        dispatch({ type: 'ADD_ELEMENT', payload: {} });
      });

      // 新しく追加された子要素を取得
      state = result.current.state;
      const newChild = Object.values(state.elementsCache).find(
        (elm: Element) => elm.parentId === firstChild.id,
      ) as Element;

      expect(newChild).toBeDefined();
      expect(newChild.direction).toBe('left'); // direction:leftが継承されるべき
    });

    it('direction:rightの要素を選択して子要素を追加すると、direction:rightが継承される', () => {
      const { result } = renderHook(() => useStore());
      const { dispatch } = result.current;

      // ルート要素を取得
      const rootId = '1';

      // ルート要素を選択して子要素を追加
      act(() => {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: rootId, ctrlKey: false, shiftKey: false },
        });
        dispatch({ type: 'ADD_ELEMENT', payload: {} });
      });

      // 最初の子要素を取得
      let state = result.current.state;
      const firstChild = Object.values(state.elementsCache).find(
        (elm: Element) => elm.parentId === rootId,
      ) as Element;
      expect(firstChild).toBeDefined();

      // 最初の子要素のdirectionをrightに変更（DROP_ELEMENTを模擬）
      act(() => {
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: firstChild.id,
            newParentId: rootId,
            newOrder: 0,
            direction: 'right' as const,
          },
        });
      });

      // 状態を更新
      state = result.current.state;
      const updatedFirstChild = state.elementsCache[firstChild.id];
      expect(updatedFirstChild.direction).toBe('right');

      // direction:rightの要素を選択して新しい子要素を追加
      act(() => {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: firstChild.id, ctrlKey: false, shiftKey: false },
        });
        dispatch({ type: 'ADD_ELEMENT', payload: {} });
      });

      // 新しく追加された子要素を取得
      state = result.current.state;
      const newChild = Object.values(state.elementsCache).find(
        (elm: Element) => elm.parentId === firstChild.id,
      ) as Element;

      expect(newChild).toBeDefined();
      expect(newChild.direction).toBe('right'); // direction:rightが継承されるべき
    });

    it('direction:noneの要素を選択して子要素を追加すると、direction:rightが設定される', () => {
      const { result } = renderHook(() => useStore());
      const { dispatch } = result.current;

      // ルート要素を取得（direction:none）
      const rootId = '1';
      let state = result.current.state;
      const rootElement = state.elementsCache[rootId];
      expect(rootElement.direction).toBe('none');

      // ルート要素を選択して子要素を追加
      act(() => {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: rootId, ctrlKey: false, shiftKey: false },
        });
        dispatch({ type: 'ADD_ELEMENT', payload: {} });
      });

      // 新しく追加された子要素を取得
      state = result.current.state;
      const newChild = Object.values(state.elementsCache).find(
        (elm: Element) => elm.parentId === rootId,
      ) as Element;

      expect(newChild).toBeDefined();
      expect(newChild.direction).toBe('right'); // direction:noneの場合は'right'が設定されるべき
    });
  });

  describe('ADD_SIBLING_ELEMENT direction inheritance', () => {
    it('direction:leftの要素を選択して兄弟要素を追加すると、direction:leftが継承される', () => {
      const { result } = renderHook(() => useStore());
      const { dispatch } = result.current;

      // ルート要素を取得
      const rootId = '1';

      // ルート要素を選択して子要素を追加
      act(() => {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: rootId, ctrlKey: false, shiftKey: false },
        });
        dispatch({ type: 'ADD_ELEMENT', payload: {} });
      });

      // 最初の子要素を取得
      let state = result.current.state;
      const firstChild = Object.values(state.elementsCache).find(
        (elm: Element) => elm.parentId === rootId,
      ) as Element;
      expect(firstChild).toBeDefined();

      // 最初の子要素のdirectionをleftに変更
      act(() => {
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: firstChild.id,
            newParentId: rootId,
            newOrder: 0,
            direction: 'left' as const,
          },
        });
      });

      // direction:leftの要素を選択して兄弟要素を追加
      act(() => {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: firstChild.id, ctrlKey: false, shiftKey: false },
        });
        dispatch({ type: 'ADD_SIBLING_ELEMENT' });
      });

      // 新しく追加された兄弟要素を取得
      state = result.current.state;
      const siblings = Object.values(state.elementsCache).filter(
        (elm: Element) => elm.parentId === rootId && elm.id !== firstChild.id,
      );

      expect(siblings.length).toBe(1);
      const newSibling = siblings[0] as Element;
      expect(newSibling.direction).toBe('left'); // direction:leftが継承されるべき
    });
  });

  describe('DROP_ELEMENT direction changes', () => {
    it('要素をDROP_ELEMENTでdirection:leftに変更できる', () => {
      const { result } = renderHook(() => useStore());
      const { dispatch } = result.current;

      // ルート要素を取得
      const rootId = '1';

      // ルート要素を選択して子要素を追加
      act(() => {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: rootId, ctrlKey: false, shiftKey: false },
        });
        dispatch({ type: 'ADD_ELEMENT', payload: {} });
      });

      // 最初の子要素を取得
      let state = result.current.state;
      const firstChild = Object.values(state.elementsCache).find(
        (elm: Element) => elm.parentId === rootId,
      ) as Element;
      expect(firstChild).toBeDefined();

      // ルート要素の左側にドロップ（direction:leftに変更）
      act(() => {
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: firstChild.id,
            newParentId: rootId,
            newOrder: 0,
            direction: 'left' as const,
          },
        });
      });

      // 変更後の状態を確認
      state = result.current.state;
      const updatedChild = state.elementsCache[firstChild.id];
      expect(updatedChild.direction).toBe('left');
    });

    it('要素をDROP_ELEMENTでdirection:rightに変更できる', () => {
      const { result } = renderHook(() => useStore());
      const { dispatch } = result.current;

      // ルート要素を取得
      const rootId = '1';

      // ルート要素を選択して子要素を追加
      act(() => {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: rootId, ctrlKey: false, shiftKey: false },
        });
        dispatch({ type: 'ADD_ELEMENT', payload: {} });
      });

      // 最初の子要素を取得
      let state = result.current.state;
      const firstChild = Object.values(state.elementsCache).find(
        (elm: Element) => elm.parentId === rootId,
      ) as Element;
      expect(firstChild).toBeDefined();

      // ルート要素の右側にドロップ（direction:rightに変更）
      act(() => {
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: firstChild.id,
            newParentId: rootId,
            newOrder: 0,
            direction: 'right' as const,
          },
        });
      });

      // 変更後の状態を確認
      state = result.current.state;
      const updatedChild = state.elementsCache[firstChild.id];
      expect(updatedChild.direction).toBe('right');
    });
  });
});
