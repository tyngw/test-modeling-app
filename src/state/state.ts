// src/state/state.ts
'use client';

import { Undo, Redo, saveSnapshot } from './undoredo';
import {
  handleArrowUp,
  handleArrowDown,
  handleArrowRight,
  handleArrowLeft,
} from '../utils/elementSelector';
import { Element } from '../types/types';
import { DirectionType } from '../types/types';
import { DEFAULT_POSITION, NUMBER_OF_SECTIONS } from '../config/elementSettings';
import { Action } from '../types/actionTypes';
import { debugLog } from '../utils/debugLogHelpers';
import {
  createNewElement,
  setDepthRecursive,
  setVisibilityRecursive,
  deleteElementRecursive,
  isDescendant,
} from '../utils/element/elementHelpers';
import { ElementsMap } from '../types/elementTypes';
import { adjustElementPositions } from '../utils/layoutHelpers';
import {
  getSelectedAndChildren,
  copyToClipboard,
  getGlobalCutElements,
} from '../utils/clipboard/clipboardHelpers';
import {
  createElementAdder,
  createSiblingElementAdder,
  pasteElements,
  addElementsWithAdjustment,
  updateElementProperties,
  batchUpdateElements,
  updateElementsWhere,
  withPositionAdjustment,
  createElementPropertyHandler,
  createSelectedElementHandler,
  createSimplePropertyHandler,
} from '../utils/stateHelpers';
import { LayoutMode } from '../types/tabTypes';

// 具体的なペイロード型の定義
interface SelectElementPayload {
  id: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
}

interface MoveElementPayload {
  id: string;
  x: number;
  y: number;
}

interface UpdateElementSizePayload {
  id: string;
  width: number;
  height: number;
  sectionHeights: number[];
}

interface UpdateMarkerPayload {
  id: string;
  connectionPathType?: any;
  endConnectionPathType?: any;
  [key: string]: unknown;
}

interface DropElementPayload {
  id: string;
  oldParentId: string | null;
  newParentId: string | null;
  newOrder: number;
  depth: number;
  direction?: DirectionType;
}

interface AddElementPayload {
  text?: string;
}

interface AddElementsSilentPayload {
  texts?: string[];
  tentative?: boolean;
}

// 型ガード関数
const isSelectElementPayload = (payload: unknown): payload is SelectElementPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    typeof (payload as any).id === 'string'
  );
};

const isMoveElementPayload = (payload: unknown): payload is MoveElementPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'x' in payload &&
    'y' in payload &&
    typeof (payload as any).id === 'string' &&
    typeof (payload as any).x === 'number' &&
    typeof (payload as any).y === 'number'
  );
};

const isUpdateElementSizePayload = (payload: unknown): payload is UpdateElementSizePayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'width' in payload &&
    'height' in payload &&
    'sectionHeights' in payload &&
    typeof (payload as any).id === 'string' &&
    typeof (payload as any).width === 'number' &&
    typeof (payload as any).height === 'number' &&
    Array.isArray((payload as any).sectionHeights)
  );
};

const isUpdateMarkerPayload = (payload: unknown): payload is UpdateMarkerPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    typeof (payload as any).id === 'string'
  );
};

const isDropElementPayload = (payload: unknown): payload is DropElementPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'newOrder' in payload &&
    'depth' in payload &&
    typeof (payload as any).id === 'string' &&
    typeof (payload as any).newOrder === 'number' &&
    typeof (payload as any).depth === 'number'
  );
};

const isElementsMapPayload = (payload: unknown): payload is ElementsMap => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    Object.values(payload as Record<string, unknown>).every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        typeof (item as any).id === 'string',
    )
  );
};

const isAddElementPayload = (payload: unknown): payload is AddElementPayload => {
  return (
    payload === null ||
    payload === undefined ||
    (typeof payload === 'object' &&
      payload !== null &&
      (!('text' in payload) || typeof (payload as any).text === 'string'))
  );
};

const isAddElementsSilentPayload = (payload: unknown): payload is AddElementsSilentPayload => {
  return (
    payload === null ||
    payload === undefined ||
    (typeof payload === 'object' &&
      payload !== null &&
      (!('texts' in payload) || Array.isArray((payload as any).texts)) &&
      (!('tentative' in payload) || typeof (payload as any).tentative === 'boolean'))
  );
};

/**
 * アプリケーションの状態を表す型
 */
export interface State {
  /** 要素のマップ - IDをキーとする */
  elements: ElementsMap;
  /** キャンバス幅 */
  width: number;
  /** キャンバス高さ */
  height: number;
  /** ズーム比率 */
  zoomRatio: number;
  /** セクション数 */
  numberOfSections: number;
  /** レイアウトモード */
  layoutMode?: LayoutMode;
}

export const initialState: State = {
  elements: {
    '1': {
      ...createNewElement(),
      id: '1',
      x: DEFAULT_POSITION.X,
      y: DEFAULT_POSITION.Y,
      editing: false,
    },
  },
  width: typeof window !== 'undefined' ? window.innerWidth : 0,
  height: typeof window !== 'undefined' ? window.innerHeight : 0,
  zoomRatio: 1,
  numberOfSections: NUMBER_OF_SECTIONS,
};

const handleZoomIn = (state: State): State => ({
  ...state,
  zoomRatio: state.zoomRatio + 0.1,
});

const handleZoomOut = (state: State): State => ({
  ...state,
  zoomRatio: Math.max(state.zoomRatio - 0.1, 0.1),
});

function handleArrowAction(
  handler: (elements: ElementsMap) => string | undefined,
): (state: State) => State {
  return (state) => {
    const selectedElements = Object.values(state.elements).filter((e) => e.selected);
    if (selectedElements.length > 1) {
      const firstId = selectedElements[0].id;
      const updatedElements = Object.values(state.elements).reduce<ElementsMap>((acc, element) => {
        acc[element.id] = {
          ...element,
          selected: element.id === firstId,
          editing: element.id === firstId ? element.editing : false,
        };
        return acc;
      }, {});
      return { ...state, elements: updatedElements };
    }

    const selectedId = handler(state.elements);
    return {
      ...state,
      elements: Object.values(state.elements).reduce<ElementsMap>((acc, element) => {
        acc[element.id] = { ...element, selected: element.id === selectedId };
        return acc;
      }, {}),
    };
  };
}

function handleElementMutation(
  state: State,
  mutationFn: (elements: ElementsMap, selectedElement: Element) => { elements: ElementsMap },
): State {
  const selectedElement = Object.values(state.elements).find((element) => element.selected);
  if (!selectedElement) return state;

  saveSnapshot(state.elements);
  const mutationResult = mutationFn(state.elements, selectedElement);

  if ('elements' in mutationResult) {
    return {
      ...state,
      elements: mutationResult.elements,
    };
  } else {
    return {
      ...state,
      elements: mutationResult as ElementsMap,
    };
  }
}

function handleSelectedElementAction(
  state: State,
  actionFn: (selectedElement: Element) => Partial<State>,
): State {
  const selectedElement = Object.values(state.elements).find((element) => element.selected);
  return selectedElement ? { ...state, ...actionFn(selectedElement) } : state;
}

/**
 * アクションハンドラーの型定義
 * 各アクションタイプに対応する状態更新関数のマップ
 */
type ActionHandler<T = unknown> = (state: State, action: { type: string; payload?: T }) => State;

/**
 * 安全なアクションハンドラーのラッパー
 * 型ガードを使用してペイロードの型安全性を保証
 */
const createSafeHandler = <T>(
  typeGuard: (payload: unknown) => payload is T,
  handler: (state: State, payload: T) => State,
): ActionHandler => {
  return (state: State, action: { type: string; payload?: unknown }) => {
    if (!action.payload || !typeGuard(action.payload)) {
      debugLog(`Invalid payload for action ${action.type}:`, action.payload);
      return state;
    }
    return handler(state, action.payload);
  };
};

/**
 * ペイロードなしのアクションハンドラー
 */
const createNoPayloadHandler = (handler: (state: State) => State): ActionHandler => {
  return (state: State) => handler(state);
};

/**
 * すべてのアクションハンドラーのマップ
 */
const actionHandlers: Record<string, ActionHandler> = {
  ZOOM_IN: createNoPayloadHandler(handleZoomIn),
  ZOOM_OUT: createNoPayloadHandler(handleZoomOut),

  ARROW_UP: createNoPayloadHandler(handleArrowAction(handleArrowUp)),
  ARROW_DOWN: createNoPayloadHandler(handleArrowAction(handleArrowDown)),
  ARROW_RIGHT: createNoPayloadHandler(handleArrowAction(handleArrowRight)),
  ARROW_LEFT: createNoPayloadHandler(handleArrowAction(handleArrowLeft)),

  LOAD_ELEMENTS: createSafeHandler(isElementsMapPayload, (state: State, payload: ElementsMap) => {
    if (Object.keys(payload).length === 0) {
      debugLog('Loading empty elements map, returning initial state');
      return initialState;
    }

    const updatedElements = Object.values(payload).reduce<ElementsMap>((acc, element) => {
      // 要素の妥当性チェック
      if (!element.id) {
        debugLog('Skipping invalid element without id:', element);
        return acc;
      }

      acc[element.id] = element.parentId === null ? { ...element, visible: true } : element;
      return acc;
    }, {});

    return withPositionAdjustment(state, () => updatedElements);
  }),

  SELECT_ELEMENT: createSafeHandler(
    isSelectElementPayload,
    (state: State, payload: SelectElementPayload) => {
      const { id, ctrlKey = false, shiftKey = false } = payload;
      const selectedElement = state.elements[id];
      if (!selectedElement) {
        debugLog(`Element with id ${id} not found`);
        return state;
      }

      const currentSelected = Object.values(state.elements).filter((e) => e.selected);
      const firstSelected = currentSelected[0];

      // 異なるparentIdの要素が含まれる場合は何もしない
      if (
        (shiftKey || ctrlKey) &&
        currentSelected.length > 0 &&
        currentSelected.some((e) => e.parentId !== selectedElement.parentId)
      ) {
        return state;
      }

      let newSelectedIds: string[] = [];

      if (shiftKey && currentSelected.length > 0) {
        const parentId = firstSelected.parentId;
        const siblings = Object.values(state.elements)
          .filter((e) => e.parentId === parentId)
          .sort((a, b) => a.order - b.order);

        const startIndex = siblings.findIndex((e) => e.id === firstSelected.id);
        const endIndex = siblings.findIndex((e) => e.id === id);
        const [start, end] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
        newSelectedIds = siblings.slice(start, end + 1).map((e) => e.id);
      } else if (ctrlKey) {
        const isAlreadySelected = currentSelected.some((e) => e.id === id);
        newSelectedIds = isAlreadySelected
          ? currentSelected.filter((e) => e.id !== id).map((e) => e.id)
          : [...currentSelected.map((e) => e.id), id];
      } else {
        newSelectedIds = [id];
      }

      const parentId = selectedElement.parentId;
      const validSelectedIds = newSelectedIds.filter((id) => {
        const elem = state.elements[id];
        return elem && elem.parentId === parentId;
      });

      // まず全ての要素を非選択状態に
      let updatedElements = updateElementsWhere(state.elements, () => true, {
        selected: false,
        editing: false,
      });

      // 次に対象の要素を選択状態に
      updatedElements = updateElementsWhere(
        updatedElements,
        (element) => validSelectedIds.includes(element.id),
        { selected: true },
      );

      return {
        ...state,
        elements: updatedElements,
      };
    },
  ),

  DESELECT_ALL: createNoPayloadHandler((state) => ({
    ...state,
    elements: updateElementsWhere(state.elements, () => true, { selected: false, editing: false }),
  })),

  UPDATE_TEXT: createElementPropertyHandler<{ id: string; index: number; value: string }>(
    (element, { index, value }) => ({
      texts: element.texts.map((text, idx) => (idx === index ? value : text)),
    }),
  ),

  UPDATE_START_MARKER: createSimplePropertyHandler('startMarker'),

  UPDATE_END_MARKER: createSimplePropertyHandler('endMarker'),

  // 後方互換性のために残す
  UPDATE_CONNECTION_PATH_TYPE: createSafeHandler(
    isUpdateMarkerPayload,
    (state: State, payload: UpdateMarkerPayload) => {
      const { id, connectionPathType } = payload;
      if (!connectionPathType) {
        debugLog('connectionPathType is missing in payload');
        return state;
      }
      return {
        ...state,
        elements: updateElementProperties(state.elements, id, {
          startMarker: connectionPathType as any,
          connectionPathType: connectionPathType as any,
        }),
      };
    },
  ),

  // 後方互換性のために残す
  UPDATE_END_CONNECTION_PATH_TYPE: createSafeHandler(
    isUpdateMarkerPayload,
    (state: State, payload: UpdateMarkerPayload) => {
      const { id, endConnectionPathType } = payload;
      if (!endConnectionPathType) {
        debugLog('endConnectionPathType is missing in payload');
        return state;
      }
      return {
        ...state,
        elements: updateElementProperties(state.elements, id, {
          endMarker: endConnectionPathType as any,
          endConnectionPathType: endConnectionPathType as any,
        }),
      };
    },
  ),

  EDIT_ELEMENT: createSelectedElementHandler((_element) => ({ editing: true }), false),

  END_EDITING: (state) =>
    withPositionAdjustment(state, () =>
      updateElementsWhere(state.elements, () => true, { editing: false }),
    ),

  MOVE_ELEMENT: createSafeHandler(
    isMoveElementPayload,
    (state: State, payload: MoveElementPayload) => {
      const { id, x, y } = payload;
      const selectedElements = Object.values(state.elements).filter((e) => e.selected);

      // 要素が存在するかチェック
      if (!state.elements[id]) {
        debugLog(`Element with id ${id} not found for move operation`);
        return state;
      }

      // 複数要素移動の場合
      if (selectedElements.length > 1 && selectedElements.some((e) => e.id === id)) {
        const deltaX = x - state.elements[id].x;
        const deltaY = y - state.elements[id].y;

        const updateMap = selectedElements.reduce(
          (acc, element) => {
            acc[element.id] = {
              x: element.x + deltaX,
              y: element.y + deltaY,
            };
            return acc;
          },
          {} as Record<string, Partial<Element>>,
        );

        return {
          ...state,
          elements: batchUpdateElements(state.elements, updateMap),
        };
      }

      // 単一要素移動
      return {
        ...state,
        elements: updateElementProperties(state.elements, id, { x, y }),
      };
    },
  ),

  UPDATE_ELEMENT_SIZE: createSafeHandler(
    isUpdateElementSizePayload,
    (state: State, payload: UpdateElementSizePayload) => {
      const { id, width, height, sectionHeights } = payload;
      const element = state.elements[id];
      if (!element) {
        debugLog(`Element with id ${id} not found for size update`);
        return state;
      }

      // 値の妥当性チェック
      if (width <= 0 || height <= 0) {
        debugLog(`Invalid size values: width=${width}, height=${height}`);
        return state;
      }

      const updatedElements = updateElementProperties(state.elements, id, {
        width,
        height,
        sectionHeights,
      });

      return withPositionAdjustment(state, () => updatedElements);
    },
  ),

  ADD_ELEMENT: createSafeHandler(isAddElementPayload, (state: State, payload: AddElementPayload) =>
    handleElementMutation(state, (elements, selectedElement) => {
      const text = payload?.text;
      const numberOfSections = state.numberOfSections;

      const newElements = createElementAdder(elements, selectedElement, text, {
        newElementSelect: true,
        numberOfSections,
      });
      return {
        elements: adjustElementPositions(
          newElements,
          () => state.numberOfSections,
          state.layoutMode,
          state.width || 0,
          state.height || 0,
        ),
      };
    }),
  ),

  ADD_ELEMENTS_SILENT: createSafeHandler(
    isAddElementsSilentPayload,
    (state: State, payload: AddElementsSilentPayload) =>
      handleElementMutation(state, (elements, selectedElement) => {
        const texts = payload?.texts || [];
        const tentative = payload?.tentative || false;
        const numberOfSections = state.numberOfSections;

        return {
          elements: addElementsWithAdjustment(
            elements,
            selectedElement,
            texts,
            {
              tentative,
              numberOfSections,
              zoomRatio: state.zoomRatio,
              layoutMode: state.layoutMode,
              // directionは既存通り
            },
            state.width || 0,
            state.height || 0,
          ),
        };
      }),
  ),

  ADD_SIBLING_ELEMENT: (state) =>
    handleElementMutation(state, (elements, selectedElement) => {
      const numberOfSections = state.numberOfSections;
      const newElements = createSiblingElementAdder(elements, selectedElement, numberOfSections);

      // layoutModeとキャンバスサイズを渡す
      return {
        elements: adjustElementPositions(
          newElements,
          () => state.numberOfSections,
          (state.layoutMode || 'default') as LayoutMode,
          state.width || 0,
          state.height || 0,
        ),
      };
    }),

  DELETE_ELEMENT: (state) => {
    const selectedElements = Object.values(state.elements).filter((e) => e.selected);
    if (selectedElements.length === 0) return state;

    debugLog(`DELETE_ELEMENT開始: 削除対象要素数=${selectedElements.length}`);

    // 削除操作をする前に、削除後に選択する要素の候補を探す
    let remainingElements = { ...state.elements };
    const nextSelectedId = (() => {
      const firstElement = selectedElements[0];
      const siblings = Object.values(remainingElements)
        .filter((e) => e.parentId === firstElement.parentId && !e.selected)
        .sort((a, b) => a.order - b.order);

      // 選択要素より前にある兄弟要素の最後の要素
      const prevSibling = siblings.filter((e) => e.order < firstElement.order).pop();
      // 選択要素より後にある兄弟要素の最初の要素
      const nextSibling = siblings.find((e) => e.order > firstElement.order);

      // 兄弟要素があればそれを選択、なければ親要素を選択
      return prevSibling?.id || nextSibling?.id || firstElement.parentId;
    })();

    selectedElements.forEach((element) => {
      remainingElements = deleteElementRecursive(remainingElements, element);
    });

    // 明示的にY座標をリセットして完全に再配置を行う
    Object.values(remainingElements).forEach((element) => {
      if (element.parentId === null) {
        element.y = DEFAULT_POSITION.Y;
      }
    });

    // 次に選択する要素があれば、その要素のみを選択状態にし、他の要素は非選択状態にする
    const updatedElements = updateElementsWhere(
      remainingElements,
      (element) => element.id === nextSelectedId,
      { selected: true },
    );

    return withPositionAdjustment(state, () => updatedElements);
  },

  CONFIRM_TENTATIVE_ELEMENTS: (state, action) => ({
    ...state,
    elements: updateElementsWhere(
      state.elements,
      (element) => element.parentId === action.payload && element.tentative,
      { tentative: false },
    ),
  }),

  CANCEL_TENTATIVE_ELEMENTS: (state, action) => {
    if (!action.payload) return state;
    const tentativeElements = Object.values(state.elements).filter(
      (e) => e.tentative && e.parentId === action.payload,
    );

    const parentIds = Array.from(
      new Set(tentativeElements.map((e) => e.parentId).filter((id): id is string => id !== null)),
    );

    const filteredElements = Object.values(state.elements).reduce((acc, element) => {
      if (!(element.tentative && element.parentId === action.payload)) {
        acc[element.id] = element;
      }
      return acc;
    }, {} as ElementsMap);

    const updatedElements = parentIds.reduce((acc, parentId) => {
      if (acc[parentId]) {
        const childrenCount = Object.values(acc).filter(
          (e) => e.parentId === parentId && !e.tentative,
        ).length;

        acc[parentId] = {
          ...acc[parentId],
          children: childrenCount,
        };
      }
      return acc;
    }, filteredElements);

    return withPositionAdjustment(state, () => updatedElements);
  },

  UNDO: (state) => withPositionAdjustment(state, () => Undo(state.elements)),

  REDO: (state) => withPositionAdjustment(state, () => Redo(state.elements)),

  SNAPSHOT: (state) => {
    saveSnapshot(state.elements);
    return state;
  },

  DROP_ELEMENT: createSafeHandler(
    isDropElementPayload,
    (state: State, payload: DropElementPayload) => {
      const { id, oldParentId, newParentId, newOrder, depth, direction } = payload;

      // 基本的な妥当性チェック
      if (!state.elements[id]) {
        debugLog(`Element with id ${id} not found for drop operation`);
        return state;
      }

      if (id === newParentId || (newParentId && isDescendant(state.elements, id, newParentId))) {
        debugLog(`Invalid drop operation: circular reference detected`);
        return state;
      }

      if (newOrder < 0 || depth < 0) {
        debugLog(`Invalid drop values: newOrder=${newOrder}, depth=${depth}`);
        return state;
      }

      let updatedElements = { ...state.elements };
      const element = updatedElements[id];
      const oldParent = oldParentId ? updatedElements[oldParentId] : null;
      const newParent = newParentId ? updatedElements[newParentId] : null;

      const isSameParent = oldParentId === newParentId;

      // 古い親のchildren更新（異なる親の場合のみ）
      if (!isSameParent && oldParent && oldParentId) {
        updatedElements[oldParentId] = {
          ...oldParent,
          children: Math.max(0, oldParent.children - 1),
        };

        // 元の親の下にある兄弟要素のorderを再計算
        const oldSiblings = Object.values(updatedElements)
          .filter((n) => n.parentId === oldParentId && n.id !== id)
          .sort((a, b) => a.order - b.order);

        oldSiblings.forEach((sibling, index) => {
          if (sibling.order !== index) {
            updatedElements[sibling.id] = {
              ...sibling,
              order: index,
            };
          }
        });
      }

      // 対象要素の更新
      updatedElements[id] = {
        ...element,
        parentId: newParentId,
        depth: depth,
        order: newOrder,
        ...(direction !== undefined && { direction }),
      };

      // 同じ親の兄弟要素の順序更新
      const siblings = Object.values(updatedElements).filter(
        (e) => e.parentId === newParentId && e.id !== id,
      );
      siblings.sort((a, b) => a.order - b.order);
      siblings.forEach((sibling, index) => {
        const siblingIndex = index >= newOrder ? index + 1 : index;
        if (sibling.order !== siblingIndex) {
          updatedElements[sibling.id] = {
            ...sibling,
            order: siblingIndex,
          };
        }
      });

      // 新しい親のchildren更新（異なる親の場合のみ）
      if (!isSameParent && newParent && newParentId) {
        updatedElements[newParentId] = {
          ...newParent,
          children: newParent.children + 1,
        };
      }

      // 親が変わった場合は深さを再設定
      if (!isSameParent) {
        updatedElements = setDepthRecursive(updatedElements, updatedElements[id]);
      }

      return withPositionAdjustment(state, () => updatedElements);
    },
  ),

  CUT_ELEMENT: (state) => {
    const selectedElements = Object.values(state.elements).filter((e) => e.selected);
    if (selectedElements.length === 0) return state;

    let cutElements: ElementsMap = {};
    let updatedElements = { ...state.elements };

    selectedElements.forEach((selectedElement) => {
      // 選択された要素とその子要素を取得
      const elementsToCut = getSelectedAndChildren(updatedElements, selectedElement);

      // 選択状態をリセット
      Object.keys(elementsToCut).forEach((id) => {
        if (elementsToCut[id]) {
          elementsToCut[id] = { ...elementsToCut[id], selected: false };
        }
      });

      cutElements = { ...cutElements, ...elementsToCut };
      updatedElements = deleteElementRecursive(updatedElements, selectedElement);
    });

    copyToClipboard(cutElements);

    return {
      ...state,
      elements: updatedElements,
    };
  },

  COPY_ELEMENT: (state) =>
    handleSelectedElementAction(state, (selectedElement) => {
      const currentState = state; // 現在のstateをローカル変数として保存
      const elementsToCopy = getSelectedAndChildren(currentState.elements, selectedElement);

      // 選択状態をリセット（コピー時には選択状態をfalseに）
      const copyElements: ElementsMap = {};
      Object.keys(elementsToCopy).forEach((id) => {
        copyElements[id] = { ...elementsToCopy[id], selected: false };
      });

      copyToClipboard(copyElements);
      return {};
    }),

  PASTE_ELEMENT: (state) => {
    const selectedElements = Object.values(state.elements).filter((e) => e.selected);
    if (selectedElements.length !== 1) return state;

    const globalCutElements = getGlobalCutElements();
    if (!globalCutElements) return state;

    return handleElementMutation(state, (elements, selectedElement) => {
      const pastedElements = pasteElements(elements, globalCutElements, selectedElement);
      return {
        elements: adjustElementPositions(
          pastedElements,
          () => state.numberOfSections,
          (state.layoutMode || 'default') as LayoutMode,
          state.width || 0,
          state.height || 0,
        ),
      };
    });
  },

  EXPAND_ELEMENT: (state) =>
    handleElementMutation(state, (elements, selectedElement) => ({
      elements: adjustElementPositions(
        setVisibilityRecursive(elements, selectedElement, true),
        () => state.numberOfSections,
        (state.layoutMode || 'default') as LayoutMode,
        state.width || 0,
        state.height || 0,
      ),
    })),

  COLLAPSE_ELEMENT: (state) =>
    handleElementMutation(state, (elements, selectedElement) => ({
      elements: adjustElementPositions(
        setVisibilityRecursive(elements, selectedElement, false),
        () => state.numberOfSections,
        (state.layoutMode || 'default') as LayoutMode,
        state.width || 0,
        state.height || 0,
      ),
    })),
};

export const reducer = (state: State, action: Action): State => {
  try {
    const handler = actionHandlers[action.type];
    if (!handler) {
      debugLog(`Unknown action type: ${action.type}`);
      return state;
    }

    const newState = handler(state, action);

    // 状態の妥当性をチェック
    if (!newState || typeof newState !== 'object') {
      debugLog(`Invalid state returned for action ${action.type}`);
      return state;
    }

    // elements が存在することを確認
    if (!newState.elements || typeof newState.elements !== 'object') {
      debugLog(`Invalid elements in state for action ${action.type}`);
      return state;
    }

    return newState;
  } catch (error) {
    debugLog(`Error handling action ${action.type}:`, error);
    return state;
  }
};
