// src/utils/stateHelpers.ts
import { v4 as uuidv4 } from 'uuid';
import { Element, DirectionType } from '../types/types';
import { LayoutMode } from '../types/tabTypes';
import { ElementsMap, ElementAdderOptions } from '../types/elementTypes';
import { createNewElement } from './element';
import { adjustElementPositions } from './layoutHelpers';
import { calculateElementWidth, wrapText } from './textareaHelpers';
import {
  SIZE,
  TEXTAREA_PADDING,
  DEFAULT_FONT_SIZE,
  LINE_HEIGHT_RATIO,
} from '../config/elementSettings';
// 型定義は直接使用している場所に移動しました

/**
 * 新しい要素を追加するヘルパー関数
 * @param elements 既存の要素マップ
 * @param parentElement 親要素
 * @param text 初期テキスト（省略可）
 * @param options 追加オプション
 * @returns 更新された要素マップ
 */
export const createElementAdder = (
  elements: ElementsMap,
  parentElement: Element,
  text?: string,
  options?: ElementAdderOptions,
): ElementsMap => {
  // directionの設定ロジック
  let direction: DirectionType;

  if (options?.direction) {
    // 明示的な方向指定がある場合はそれを使用
    direction = options.direction;
  } else if (parentElement.direction === 'none') {
    // ルート要素の子の場合は必ずright
    direction = 'right';
  } else {
    // それ以外は親の方向を継承
    direction = parentElement.direction;
  }

  const newElement = createNewElement({
    parentId: parentElement.id,
    depth: parentElement.depth + 1,
    numSections: options?.numberOfSections,
    direction,
  });

  if (text) {
    newElement.texts[0] = text;
  }

  if (options?.newElementSelect !== undefined) {
    newElement.selected = options.newElementSelect;
    newElement.editing = options.newElementSelect;
  }

  if (options?.tentative !== undefined) {
    newElement.tentative = options.tentative;
  }

  const updatedParentElement = {
    ...parentElement,
    children: parentElement.children + 1,
    selected: options?.newElementSelect ? false : parentElement.selected,
  };

  return {
    ...elements,
    [parentElement.id]: updatedParentElement,
    [newElement.id]: newElement,
  };
};

/**
 * 兄弟要素を追加するヘルパー関数
 */
export const createSiblingElementAdder = (
  elements: ElementsMap,
  selectedElement: Element,
  numberOfSections?: number,
): ElementsMap => {
  const parentId = selectedElement.parentId;
  const updatedElements = { ...elements };

  // 選択された要素の方向を継承
  const direction = selectedElement.direction;

  // 新しい要素を作成
  const newElement = createNewElement({
    parentId: parentId,
    depth: selectedElement.depth,
    numSections: numberOfSections,
    direction,
  });
  updatedElements[selectedElement.id] = { ...selectedElement, selected: false };
  updatedElements[newElement.id] = newElement;

  // 親要素のchildrenを更新（親が存在する場合）
  if (parentId !== null) {
    const parent = updatedElements[parentId];
    updatedElements[parentId] = {
      ...parent,
      children: parent.children + 1,
    };
  }

  return updatedElements;
};

/**
 * クリップボードから要素を貼り付けるヘルパー関数
 */
export const pasteElements = (
  elements: ElementsMap,
  cutElements: ElementsMap,
  parentElement: Element,
): ElementsMap => {
  if (!cutElements) return elements;

  const rootElement = Object.values(cutElements).find((e) => e.parentId === null);
  if (!rootElement) return { ...elements, ...cutElements };

  // ルート要素の元の深さを取得
  const rootElementDepth = rootElement.depth;
  // 深さの差分を貼り付け先に基づいて計算
  const depthDelta = parentElement.depth + 1 - rootElementDepth;

  const idMap = new Map<string, string>();
  const newElements: ElementsMap = {};

  Object.values(cutElements).forEach((cutElement) => {
    const newId = uuidv4();
    idMap.set(cutElement.id, newId);

    const newDepth = cutElement.depth + depthDelta;

    newElements[newId] = {
      ...cutElement,
      id: newId,
      depth: newDepth,
      parentId: cutElement.parentId === null ? parentElement.id : idMap.get(cutElement.parentId)!,
    };
  });

  // Set the root element of pasted content as selected, and deselect the parent
  const pastedRootElementId = idMap.get(rootElement.id) || rootElement.id;
  if (newElements[pastedRootElementId]) {
    newElements[pastedRootElementId].selected = true;
  }
  const updatedParent = {
    ...parentElement,
    children: parentElement.children + 1,
    selected: false,
  };

  return {
    ...elements,
    ...newElements,
    [parentElement.id]: updatedParent,
  };
};

/**
 * 要素を追加して自動的に位置調整を行うヘルパー関数
 */
export const addElementsWithAdjustment = (
  elements: ElementsMap,
  parentElement: Element,
  texts: string[],
  options: {
    tentative?: boolean;
    numberOfSections: number;
    zoomRatio: number;
    layoutMode?: string;
    direction?: DirectionType;
  },
  canvasWidth = 0,
  canvasHeight = 0,
) => {
  let newElements = { ...elements };
  const parent = { ...parentElement };
  const initialChildren = parent.children;

  // directionの設定：マインドマップモードでも明示的な指定がない限り'right'
  const direction = options?.direction || 'right';

  texts.forEach((text, index) => {
    newElements = createElementAdder(newElements, parent, text, {
      newElementSelect: false,
      tentative: options.tentative ?? false,
      order: initialChildren + index,
      numberOfSections: options.numberOfSections,
      direction,
    });
  });

  // 親のchildrenを一括更新
  newElements[parent.id] = {
    ...parent,
    children: initialChildren + texts.length,
  };

  // 幅を自動調整
  Object.values(newElements).forEach((element) => {
    if (element.parentId === parent.id) {
      const newWidth = calculateElementWidth(element.texts, TEXTAREA_PADDING.HORIZONTAL);
      const sectionHeights = element.texts.map((text) => {
        const lines = wrapText(text || '', newWidth, options.zoomRatio).length;
        return Math.max(
          SIZE.SECTION_HEIGHT * options.zoomRatio,
          lines * DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO +
            TEXTAREA_PADDING.VERTICAL * options.zoomRatio,
        );
      });
      newElements[element.id] = {
        ...element,
        width: newWidth,
        height: sectionHeights.reduce((sum, h) => sum + h, 0),
        sectionHeights,
      };
    }
  });

  // レイアウトモードとキャンバスサイズを渡す
  return adjustElementPositions(
    newElements,
    () => options.numberOfSections,
    (options.layoutMode || 'mindmap') as LayoutMode,
    canvasWidth,
    canvasHeight,
  );
};

/**
 * 指定された要素のプロパティを更新するヘルパー関数
 * @param elements 現在の要素マップ
 * @param elementId 更新する要素のID
 * @param updates 更新するプロパティのオブジェクト
 * @returns 更新された要素マップ
 */
export const updateElementProperties = <T extends Partial<Element>>(
  elements: ElementsMap,
  elementId: string,
  updates: T,
): ElementsMap => {
  if (!elements[elementId]) return elements;

  return {
    ...elements,
    [elementId]: {
      ...elements[elementId],
      ...updates,
    },
  };
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
  return (state: StateWithElements, action: { payload?: any }): StateWithElements => {
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
  return (state: any, action?: { payload?: any }) => {
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
  return (state: StateWithElements, action: { payload?: any }): StateWithElements => {
    if (!action.payload) return state;
    const { id } = action.payload;
    const value = action.payload[propertyName];

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
