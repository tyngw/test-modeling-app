// src/utils/stateHelpers.ts
import { Element } from '../types/types';
import { LayoutMode } from '../types/tabTypes';
import { ElementsMap } from '../types/elementTypes';
import { adjustElementPositions } from './layoutHelpers';

/**
 * 要素の単一プロパティを更新するヘルパー関数
 * @param elements 現在の要素マップ
 * @param elementId 更新する要素のID
 * @param updates 更新する内容
 * @returns 更新された要素マップ
 */
export const updateElementProperties = (
  elements: ElementsMap,
  elementId: string,
  updates: Partial<Element>,
): ElementsMap => {
  const updatedElements = { ...elements };

  if (updatedElements[elementId]) {
    updatedElements[elementId] = {
      ...updatedElements[elementId],
      ...updates,
    };
  }

  return updatedElements;
};

/**
 * 複数の要素のプロパティを一括で更新するヘルパー関数
 * @param elements 現在の要素マップ
 * @param updatesMap 要素IDと更新内容のマップ
 * @returns 更新された要素マップ
 */
export const batchUpdateElements = (
  elements: ElementsMap,
  updatesMap: Record<string, Partial<Element>>,
): ElementsMap => {
  const updatedElements = { ...elements };

  Object.entries(updatesMap).forEach(([elementId, updates]) => {
    if (updatedElements[elementId]) {
      updatedElements[elementId] = {
        ...updatedElements[elementId],
        ...updates,
      };
    }
  });

  return updatedElements;
};

/**
 * 条件に一致する要素を更新するヘルパー関数
 * @param elements 現在の要素マップ
 * @param predicate 要素に適用する条件関数
 * @param updates 条件に一致する要素に適用する更新
 * @returns 更新された要素マップ
 */
export const updateElementsWhere = (
  elements: ElementsMap,
  predicate: (element: Element) => boolean,
  updates: Partial<Element>,
): ElementsMap => {
  const updatedElements = { ...elements };

  Object.entries(updatedElements).forEach(([id, element]) => {
    if (predicate(element)) {
      updatedElements[id] = {
        ...element,
        ...updates,
      };
    }
  });

  return updatedElements;
};

/**
 * 選択された要素に対して処理を行うヘルパー関数
 * @param elements 現在の要素マップ
 * @param updateFn 選択された要素に適用する更新関数
 * @returns 更新された要素マップ
 */
export const updateSelectedElements = (
  elements: ElementsMap,
  updateFn: (element: Element) => Partial<Element>,
): ElementsMap => {
  const selectedElements = Object.values(elements).filter((e) => e.selected);
  if (selectedElements.length === 0) return elements;

  const updates = selectedElements.reduce(
    (acc, element) => {
      acc[element.id] = updateFn(element);
      return acc;
    },
    {} as Record<string, Partial<Element>>,
  );

  return batchUpdateElements(elements, updates);
};

/**
 * 要素の操作後に位置調整を行うヘルパー関数
 * @param state 現在の状態
 * @param elementsUpdater 要素の更新関数
 * @returns 更新された状態
 */
export const withPositionAdjustment = (
  state: {
    elements: ElementsMap;
    numberOfSections: number;
    layoutMode?: LayoutMode;
    width: number;
    height: number;
    zoomRatio: number;
  },
  elementsUpdater: (elements: ElementsMap) => ElementsMap,
): typeof state => {
  const updatedElements = elementsUpdater(state.elements);

  // layoutModeが存在する場合は使用、存在しない場合はmindmap
  const layoutMode = (state.layoutMode || 'mindmap') as LayoutMode;

  // キャンバスサイズを取得（存在する場合）
  const canvasWidth = state.width || 0;
  const canvasHeight = state.height || 0;

  return {
    ...state,
    elements: adjustElementPositions(
      updatedElements,
      () => state.numberOfSections,
      layoutMode,
      canvasWidth,
      canvasHeight,
    ),
  };
};

/**
 * ペイロードから要素IDを取得し、その要素を更新するハンドラー
 * @param updateFn 要素の更新関数
 * @returns アクションハンドラー
 */
export const createElementPropertyHandler = <T extends { id: string } & Record<string, unknown>>(
  updateFn: (element: Element, payload: T) => Partial<Element>,
) => {
  return (state: StateWithElements, action: { payload?: unknown }): StateWithElements => {
    if (!action.payload) return state;
    const { id } = action.payload as T;
    const element = state.elements[id];
    if (!element) return state;

    return {
      ...state,
      elements: updateElementProperties(state.elements, id, updateFn(element, action.payload as T)),
    };
  };
};

/**
 * 選択された要素に対して処理を行うアクションハンドラーを作成
 * @param updateFn 選択された要素に適用する更新関数
 * @param adjustPosition 位置調整が必要かどうか
 * @returns アクションハンドラー
 */
export const createSelectedElementHandler = (
  updateFn: (element: Element, payload?: unknown) => Partial<Element>,
  adjustPosition = false,
) => {
  return (state: StateWithElements, action?: { payload?: unknown }) => {
    const selectedElements = Object.values(state.elements) as Element[];
    const filteredElements = selectedElements.filter((e) => e.selected);

    if (filteredElements.length === 0) return state;

    const updatesMap = filteredElements.reduce(
      (acc, element) => {
        acc[element.id] = updateFn(element, action?.payload);
        return acc;
      },
      {} as Record<string, Partial<Element>>,
    );

    const updatedElements = batchUpdateElements(state.elements, updatesMap);

    if (adjustPosition) {
      // layoutModeが存在する場合は使用、存在しない場合はdefault
      const layoutMode = state.layoutMode || 'default';

      // キャンバスサイズを取得（存在する場合）
      const canvasWidth = state.width || 0;
      const canvasHeight = state.height || 0;

      return {
        ...state,
        elements: adjustElementPositions(
          updatedElements,
          () => state.numberOfSections,
          layoutMode,
          canvasWidth,
          canvasHeight,
        ),
      };
    } else {
      return {
        ...state,
        elements: updatedElements,
      };
    }
  };
};

/**
 * 要素のシンプルなプロパティ更新を行うハンドラー
 * @param propertyName 更新するプロパティ名
 * @returns アクションハンドラー
 */
export const createSimplePropertyHandler = (propertyName: string) => {
  return (state: StateWithElements, action: { payload?: unknown }): StateWithElements => {
    if (!action.payload) return state;
    const { id } = action.payload as { id: string; [key: string]: unknown };
    const value = (action.payload as Record<string, unknown>)[propertyName];

    return {
      ...state,
      elements: updateElementProperties(state.elements, id, {
        [propertyName]: value,
      } as Partial<Element>),
    };
  };
};

// State型の部分的な定義（循環参照を避けるため）
interface StateWithElements {
  elements: ElementsMap;
  width: number;
  height: number;
  zoomRatio: number;
  numberOfSections: number;
  layoutMode?: LayoutMode;
}
