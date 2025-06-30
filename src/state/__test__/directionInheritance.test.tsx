import { renderHook, act } from '@testing-library/react';
import { useStore } from './textUtils';
import { Element } from '../../types/types';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';
import { getAllElementsFromHierarchy } from '../../utils/hierarchical/hierarchicalConverter';
import { getChildrenFromHierarchy } from '../../utils/element/elementHelpers';

describe('direction inheritance', () => {
  // テスト用のヘルパー関数
  const getAllElements = (state: { hierarchicalData: HierarchicalStructure | null }): Element[] => {
    return state.hierarchicalData ? getAllElementsFromHierarchy(state.hierarchicalData) : [];
  };

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
      const childElements = state.hierarchicalData
        ? getChildrenFromHierarchy(state.hierarchicalData, rootId)
        : [];
      const firstChild = childElements[0] as Element;
      expect(firstChild).toBeDefined();

      // 最初の子要素のdirectionをleftに変更（DROP_ELEMENTを模擬）
      act(() => {
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: firstChild.id,
            targetNodeId: rootId,
            targetIndex: 0,
            direction: 'left' as const,
          },
        });
      });

      // 状態を更新
      state = result.current.state;
      const updatedAllElements = getAllElements(state);
      const updatedFirstChild = updatedAllElements.find((elm) => elm.id === firstChild.id);
      expect(updatedFirstChild?.direction).toBe('left');

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
      const newChildElements = state.hierarchicalData
        ? getChildrenFromHierarchy(state.hierarchicalData, firstChild.id)
        : [];
      const newChild = newChildElements[0] as Element;

      expect(newChild).toBeDefined();
      expect(newChild.direction).toBe('left'); // 親のdirection:leftが継承されている
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
      const childElements = state.hierarchicalData
        ? getChildrenFromHierarchy(state.hierarchicalData, rootId)
        : [];
      const firstChild = childElements[0] as Element;
      expect(firstChild).toBeDefined();

      // 最初の子要素のdirectionをrightに変更（DROP_ELEMENTを模擬）
      act(() => {
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: firstChild.id,
            targetNodeId: rootId,
            targetIndex: 0,
            direction: 'right' as const,
          },
        });
      });

      // 状態を更新
      state = result.current.state;
      const updatedAllElements = getAllElements(state);
      const updatedFirstChild = updatedAllElements.find((elm) => elm.id === firstChild.id);
      expect(updatedFirstChild?.direction).toBe('right');

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
      const newChildElements = state.hierarchicalData
        ? getChildrenFromHierarchy(state.hierarchicalData, firstChild.id)
        : [];
      const newChild = newChildElements[0] as Element;

      expect(newChild).toBeDefined();
      expect(newChild.direction).toBe('right'); // 親のdirection:rightが継承されている
    });

    it('direction:noneの要素を選択して子要素を追加すると、direction:rightが設定される', () => {
      const { result } = renderHook(() => useStore());
      const { dispatch } = result.current;

      // ルート要素を取得
      const rootId = '1';
      let state = result.current.state;
      const allElements = getAllElements(state);
      const rootElement = allElements.find((elm) => elm.id === rootId);
      expect(rootElement?.direction).toBe('none');

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
      const childElements = state.hierarchicalData
        ? getChildrenFromHierarchy(state.hierarchicalData, rootId)
        : [];
      const newChild = childElements[0] as Element;

      expect(newChild).toBeDefined();
      expect(newChild.direction).toBe('right'); // direction:noneの場合、子要素はrightが設定される
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
      const childElements = state.hierarchicalData
        ? getChildrenFromHierarchy(state.hierarchicalData, rootId)
        : [];
      const firstChild = childElements[0] as Element;
      expect(firstChild).toBeDefined();

      // 最初の子要素のdirectionをleftに変更
      act(() => {
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: firstChild.id,
            targetNodeId: rootId,
            targetIndex: 0,
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

      // 兄弟要素を取得
      state = result.current.state;
      const siblingElements = state.hierarchicalData
        ? getChildrenFromHierarchy(state.hierarchicalData, rootId).filter(
            (elm) => elm.id !== firstChild.id,
          )
        : [];

      expect(siblingElements.length).toBeGreaterThan(0);
      // 兄弟要素のdirectionがleftになっていることを確認
      expect(siblingElements[0].direction).toBe('left');
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
      const childElements = state.hierarchicalData
        ? getChildrenFromHierarchy(state.hierarchicalData, rootId)
        : [];
      const firstChild = childElements[0] as Element;
      expect(firstChild).toBeDefined();

      // 最初の子要素のdirectionをleftに変更
      act(() => {
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: firstChild.id,
            targetNodeId: rootId,
            targetIndex: 0,
            direction: 'left' as const,
          },
        });
      });

      // directionが変更されたことを確認
      state = result.current.state;
      const updatedAllElements = getAllElements(state);
      const updatedChild = updatedAllElements.find((elm) => elm.id === firstChild.id);
      expect(updatedChild?.direction).toBe('left');
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
      const childElements = state.hierarchicalData
        ? getChildrenFromHierarchy(state.hierarchicalData, rootId)
        : [];
      const firstChild = childElements[0] as Element;
      expect(firstChild).toBeDefined();

      // 最初の子要素のdirectionをrightに変更
      act(() => {
        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: firstChild.id,
            targetNodeId: rootId,
            targetIndex: 0,
            direction: 'right' as const,
          },
        });
      });

      // directionが変更されたことを確認
      state = result.current.state;
      const updatedAllElements = getAllElements(state);
      const updatedChild = updatedAllElements.find((elm) => elm.id === firstChild.id);
      expect(updatedChild?.direction).toBe('right');
    });
  });
});
