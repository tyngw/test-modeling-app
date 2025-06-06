// src/utils/stateHelpers.ts
import { v4 as uuidv4 } from 'uuid';
import { Element } from '../types/types';
import { createNewElement } from './element';
import { adjustElementPositions } from './layoutHelpers';
import { calculateElementWidth, wrapText } from './textareaHelpers';
import {
  SIZE,
  TEXTAREA_PADDING,
  DEFAULT_FONT_SIZE,
  LINE_HEIGHT_RATIO,
} from '../config/elementSettings';
import { ElementsMap, ElementAdderOptions } from '../types/elementTypes';
import {
  ElementUpdaterFunction,
  ElementFilterFunction,
  ElementPropertyUpdater,
  ElementUpdatesMap,
} from '../types/stateHelpers';

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
  const newElement = createNewElement({
    parentId: parentElement.id,
    order: options?.order ?? parentElement.children,
    depth: parentElement.depth + 1,
    numSections: options?.numberOfSections,
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
  const siblings = Object.values(elements).filter((e) => e.parentId === parentId);
  const newOrder = selectedElement.order + 1;

  const updatedElements = { ...elements };

  // 新しいorder以上の兄弟要素のorderを更新
  siblings.forEach((sibling) => {
    if (sibling.order >= newOrder) {
      updatedElements[sibling.id] = {
        ...sibling,
        order: sibling.order + 1,
      };
    }
  });

  // 新しい要素を作成
  const newElement = createNewElement({
    parentId: parentId,
    order: newOrder,
    depth: selectedElement.depth,
    numSections: numberOfSections,
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
      order: cutElement.parentId === null ? parentElement.children : cutElement.order,
    };
  });

  // Set the root element of pasted content as selected, and deselect the parent
  const pastedRootElementId = idMap.get(rootElement.id)!;
  newElements[pastedRootElementId].selected = true;
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
  },
) => {
  let newElements = { ...elements };
  const parent = { ...parentElement };
  const initialChildren = parent.children;

  texts.forEach((text, index) => {
    newElements = createElementAdder(newElements, parent, text, {
      newElementSelect: false,
      tentative: options.tentative ?? false,
      order: initialChildren + index,
      numberOfSections: options.numberOfSections,
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

  return adjustElementPositions(newElements, () => options.numberOfSections);
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
  state: any,
  elementsUpdater: (elements: ElementsMap) => ElementsMap,
): any => {
  const updatedElements = elementsUpdater(state.elements);
  return {
    ...state,
    elements: adjustElementPositions(updatedElements, () => state.numberOfSections),
  };
};

/**
 * ペイロードから要素IDを取得し、その要素を更新するハンドラー
 * @param updateFn 要素の更新関数
 * @returns アクションハンドラー
 */
export const createElementPropertyHandler = <T extends Record<string, any>>(
  updateFn: (element: Element, payload: T) => Partial<Element>,
) => {
  return (state: any, action: { payload: T }) => {
    const { id } = action.payload;
    const element = state.elements[id];
    if (!element) return state;

    return {
      ...state,
      elements: updateElementProperties(state.elements, id, updateFn(element, action.payload)),
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
  updateFn: (element: Element, payload?: any) => Partial<Element>,
  adjustPosition: boolean = false,
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
      return {
        ...state,
        elements: adjustElementPositions(updatedElements, () => state.numberOfSections),
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
export const createSimplePropertyHandler = <T>(propertyName: string) => {
  return (state: any, action: { payload: { id: string } & Record<string, T> }) => {
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
