// src/state/__test__/edgeCases.test.ts
import { renderHook, act } from '@testing-library/react';
import { useReducer } from 'react';
import { initialState, reducer } from '../state';

const useStore = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return { state, dispatch };
};

describe('境界値・異常系', () => {
  it('LOAD_ELEMENTS アクション（空の場合）', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    act(() => {
      dispatch({ type: 'LOAD_ELEMENTS', payload: [] });
    });
    const loadedState = result.current.state;

    expect(loadedState).toEqual({
      ...initialState,
      elements: initialState.elements,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  });

  it('ZOOM_IN/ZOOM_OUTが正しく動作することを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    const initialZoom = result.current.state.zoomRatio;

    act(() => {
      dispatch({ type: 'ZOOM_IN' });
    });
    expect(result.current.state.zoomRatio).toBe(initialZoom + 0.1);

    act(() => {
      dispatch({ type: 'ZOOM_OUT' });
    });
    expect(result.current.state.zoomRatio).toBe(initialZoom);

    // 最小値の確認（0.1以下にならない）
    Array(10)
      .fill(0)
      .forEach(() =>
        act(() => {
          dispatch({ type: 'ZOOM_OUT' });
        }),
      );
    expect(result.current.state.zoomRatio).toBe(0.1);
  });
});
