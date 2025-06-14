// src/state/__test__/copyPaste.test.ts
import { renderHook, act } from '@testing-library/react';
import { Element } from '../../types/types';
import { useStore } from './textUtils';
import * as clipboardHelpers from '../../utils/clipboard/clipboardHelpers';
import { ElementsMap } from '../../types/elementTypes';

// Get the real implementations before mocking
const originalGetSelectedAndChildren = clipboardHelpers.getSelectedAndChildren;

// Jest のスパイ関数を使用してコピー/切り取り/貼り付けをモックする
describe('切り取り、コピー、貼り付け操作', () => {
  // 各テスト間でストレージを共有するための変数
  let mockStorage: ElementsMap | null = null;

  // Mock the clipboardHelpers functions for each test
  beforeEach(() => {
    mockStorage = null;

    // スパイ関数でクリップボードヘルパーをモック化
    jest.spyOn(clipboardHelpers, 'getGlobalCutElements').mockImplementation(() => mockStorage);
    jest.spyOn(clipboardHelpers, 'copyToClipboard').mockImplementation((elements: ElementsMap) => {
      mockStorage = { ...elements };
    });
    jest
      .spyOn(clipboardHelpers, 'getSelectedAndChildren')
      .mockImplementation(originalGetSelectedAndChildren);
  });

  // テスト後のクリーンアップ
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ノードをコピーして貼り付けられることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素を選択して子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
    });
    act(() => {
      dispatch({ type: 'ADD_ELEMENT' });
    });

    const state = result.current.state;
    const childElement = Object.values(state.elements).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    // 子要素を選択してコピー
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'COPY_ELEMENT' });
    });

    // コピー後、mockStorageにデータが設定されていることを確認
    expect(mockStorage).not.toBeNull();

    const parentElement = Object.values(result.current.state.elements).find(
      (elm: Element) => elm.id === '1',
    ) as Element;

    // 親要素を選択して貼り付け
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'PASTE_ELEMENT' });
    });

    // 貼り付け後の要素を確認
    const afterPasteState = result.current.state;
    const pastedElements = Object.values(afterPasteState.elements).filter(
      (elm: Element) => elm.parentId === parentElement.id && elm.id !== childElement.id,
    );

    expect(pastedElements.length).toBeGreaterThan(0);
    const pastedElement = pastedElements[0];
    expect(pastedElement.depth).toBe(parentElement.depth + 1);
  });

  it('ノードを切り取ることができることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素を選択して子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: '1' });
    });
    act(() => {
      dispatch({ type: 'ADD_ELEMENT' });
    });

    const state = result.current.state;
    const childElement = Object.values(state.elements).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    // 切り取り前の要素数を確認
    const elementsCountBeforeCut = Object.keys(state.elements).length;
    expect(elementsCountBeforeCut).toBeGreaterThan(1);

    // 子要素を選択して切り取り
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'CUT_ELEMENT' });
    });

    // 切り取り後の状態を確認
    const afterCutState = result.current.state;

    // 要素が削除されたことを確認
    expect(Object.keys(afterCutState.elements).length).toBeLessThan(elementsCountBeforeCut);
    expect(
      Object.values(afterCutState.elements).some((elm: Element) => elm.id === childElement.id),
    ).toBe(false);

    // モックストレージに要素が保存されたことを確認
    expect(mockStorage).not.toBeNull();
    expect(Object.keys(mockStorage!).length).toBeGreaterThan(0);
    // 切り取られた要素がモックストレージに存在するか確認
    const cutElement = Object.values(mockStorage!).find(
      (elm) => elm && elm.id === childElement.id,
    ) as Element;
    expect(cutElement).toBeDefined();
  });

  it('切り取ったノードが貼り付けられることを確認する', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素を選択して子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT' });
    });

    let state = result.current.state;
    const childElement = Object.values(state.elements).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    // 子要素を選択して切り取り
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'CUT_ELEMENT' });
    });

    const afterCutState = result.current.state;

    // 要素が削除されたことを確認
    expect(
      Object.values(afterCutState.elements).some((elm: Element) => elm.id === childElement.id),
    ).toBe(false);

    // モックストレージに要素が保存されたことを確認
    expect(mockStorage).not.toBeNull();

    // 親要素を選択して新しい子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT' });
    });

    state = result.current.state;
    const newParentElement = Object.values(state.elements).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    // 新しい子要素を選択して貼り付け
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: newParentElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'PASTE_ELEMENT' });
    });

    // 貼り付け後の状態を確認
    const afterPasteState = result.current.state;
    const pastedElements = Object.values(afterPasteState.elements).filter(
      (elm: Element) => elm.parentId === newParentElement.id,
    );

    expect(pastedElements.length).toBeGreaterThan(0);

    // 親要素の子要素数が更新されていることを確認
    const updatedParentElement = Object.values(afterPasteState.elements).find(
      (elm: Element) => elm.id === newParentElement.id,
    ) as Element;

    expect(updatedParentElement).toMatchObject({
      children: 1,
    });
  });

  it('切り取ったノードが貼り付けられることを確認する(切り取るノードに子が存在するケース)', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素を選択して子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT' });
    });

    let state = result.current.state;
    const childElement = Object.values(state.elements).find(
      (elm: Element) => elm.parentId === '1',
    ) as Element;

    // 子要素を選択して孫要素を追加
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'ADD_ELEMENT' });
    });

    // 子要素を選択してコピー
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'COPY_ELEMENT' });
    });

    // コピー後のストレージ状態を確認
    expect(mockStorage).not.toBeNull();

    // ルート要素を選択して新しい子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT' });
    });

    state = result.current.state;
    const newElements = Object.values(state.elements).filter(
      (elm: Element) => elm.parentId === '1' && elm.id !== childElement.id,
    );
    expect(newElements.length).toBeGreaterThan(0);

    const newParentElement = newElements[0];

    // 新しい子要素を選択して貼り付け
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: newParentElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'PASTE_ELEMENT' });
    });

    // 貼り付け後の状態を確認
    const afterPasteState = result.current.state;
    const pastedElements = Object.values(afterPasteState.elements).filter(
      (elm: Element) => elm.parentId === newParentElement.id,
    );

    expect(pastedElements.length).toBeGreaterThan(0);

    // 要素IDがすべて一意であることを確認
    const ids = Object.values(afterPasteState.elements).map((elm: Element) => elm.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('コピーした要素が貼り付けられることを確認する(自身の子要素として追加するケース)', () => {
    const { result } = renderHook(() => useStore());
    const { dispatch } = result.current;

    // ルート要素を選択して子要素を追加
    act(() => {
      dispatch({ type: 'SELECT_ELEMENT', payload: { id: '1', ctrlKey: false, shiftKey: false } });
      dispatch({ type: 'ADD_ELEMENT' });
    });

    // 子要素に子要素を追加するためにもう一度
    let state = result.current.state;
    const childElements = Object.values(state.elements).filter(
      (elm: Element) => elm.parentId === '1',
    );
    expect(childElements.length).toBeGreaterThan(0);

    const childElement = childElements[0];

    // 子要素を選択して孫要素を追加
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'ADD_ELEMENT' });
    });

    // 現在の状態を確認
    state = result.current.state;
    const grandchildElements = Object.values(state.elements).filter(
      (elm: Element) => elm.parentId === childElement.id,
    );
    expect(grandchildElements.length).toBeGreaterThan(0);

    const grandchildElement = grandchildElements[0];

    // 子要素をコピー (孫要素に貼り付けるため)
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: childElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'COPY_ELEMENT' });
    });

    // コピー後のストレージを確認
    expect(mockStorage).not.toBeNull();

    // 孫要素を選択して貼り付け
    act(() => {
      dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: grandchildElement.id, ctrlKey: false, shiftKey: false },
      });
      dispatch({ type: 'PASTE_ELEMENT' });
    });

    // 貼り付け後の状態を確認
    state = result.current.state;
    const pastedElements = Object.values(state.elements).filter(
      (elm: Element) => elm.parentId === grandchildElement.id,
    );

    expect(pastedElements.length).toBeGreaterThan(0);
  });
});
