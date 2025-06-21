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
import { DEFAULT_POSITION, NUMBER_OF_SECTIONS } from '../config/elementSettings';
import { Action } from '../types/actionTypes';
import { debugLog } from '../utils/debugLogHelpers';
import { createNewElement } from '../utils/element/elementHelpers';
import { ElementsMap } from '../types/elementTypes';
import { adjustElementPositions } from '../utils/layoutHelpers';
import {
  getSelectedAndChildren,
  copyToClipboard,
  cutToClipboard,
  getGlobalCutElements,
  getGlobalCopiedElements,
} from '../utils/clipboard/clipboardHelpers';
import { LayoutMode } from '../types/tabTypes';

// 階層構造の型とユーティリティをインポート
import { HierarchicalStructure, HierarchicalOperationResult } from '../types/hierarchicalTypes';
import {
  convertFlatToHierarchical,
  convertHierarchicalToFlat,
} from '../utils/hierarchical/hierarchicalConverter';
import {
  addElementToHierarchy,
  deleteElementFromHierarchy,
  moveElementInHierarchy,
  updateElementInHierarchy,
  setVisibilityInHierarchy,
  setSelectionInHierarchy,
} from '../utils/hierarchical/hierarchicalOperations';

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
  newParentId: string | null;
  newOrder: number;
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
 * 階層構造ベースのアプリケーション状態を表す型
 */
export interface State {
  /** 階層構造のルート */
  hierarchicalData: HierarchicalStructure | null;
  /** フラット構造のキャッシュ（互換性用） */
  elementsCache: ElementsMap;
  /** キャッシュが最新かどうか */
  cacheValid: boolean;
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

/**
 * 初期状態の作成（階層構造ベース）
 */
const createInitialState = (): State => {
  const initialElement: Element = {
    ...createNewElement({
      depth: 0, // ルート要素のdepthは0
    }),
    id: '1',
    x: DEFAULT_POSITION.X,
    y: DEFAULT_POSITION.Y,
    editing: false,
  };

  const initialElementsMap: ElementsMap = {
    '1': initialElement,
  };

  const hierarchicalData = convertFlatToHierarchical(initialElementsMap);

  return {
    hierarchicalData,
    elementsCache: initialElementsMap,
    cacheValid: true,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    zoomRatio: 1,
    numberOfSections: NUMBER_OF_SECTIONS,
  };
};

export const initialState: State = createInitialState();

/**
 * 階層構造からキャッシュを更新するヘルパー関数
 */
const updateCacheFromHierarchy = (state: State): State => {
  if (!state.hierarchicalData) {
    return {
      ...state,
      elementsCache: {},
      cacheValid: true,
    };
  }

  const elementsCache = convertHierarchicalToFlat(state.hierarchicalData);
  return {
    ...state,
    elementsCache,
    cacheValid: true,
  };
};

/**
 * 階層構造操作結果から新しい状態を作成するヘルパー関数
 */
const createStateFromHierarchicalResult = (
  state: State,
  result: HierarchicalOperationResult,
): State => {
  return {
    ...state,
    hierarchicalData: result.hierarchicalData,
    elementsCache: result.elementsCache,
    cacheValid: true,
  };
};

/**
 * 階層構造ベースで選択された要素を取得するヘルパー関数
 */
const getSelectedElementsFromState = (state: State): Element[] => {
  if (!state.cacheValid) {
    const updatedState = updateCacheFromHierarchy(state);
    return Object.values(updatedState.elementsCache).filter((e) => e.selected);
  }
  return Object.values(state.elementsCache).filter((e) => e.selected);
};

/**
 * 階層構造ベースで単一の選択された要素を取得するヘルパー関数
 */
const getSelectedElementFromState = (state: State): Element | undefined => {
  const selectedElements = getSelectedElementsFromState(state);
  return selectedElements.length === 1 ? selectedElements[0] : undefined;
};

const handleZoomIn = (state: State): State => ({
  ...state,
  zoomRatio: state.zoomRatio + 0.1,
});

const handleZoomOut = (state: State): State => ({
  ...state,
  zoomRatio: Math.max(state.zoomRatio - 0.1, 0.1),
});

/**
 * 階層構造ベースでの矢印キー操作
 */
function handleArrowAction(
  handler: (elements: ElementsMap) => string | undefined,
): (state: State) => State {
  return (state) => {
    const selectedElements = getSelectedElementsFromState(state);
    if (selectedElements.length > 1) {
      // 複数選択時は最初の要素のみ選択状態に
      const firstId = selectedElements[0].id;
      if (!state.hierarchicalData) return state;

      const result = setSelectionInHierarchy(state.hierarchicalData, [firstId]);
      return createStateFromHierarchicalResult(state, result);
    }

    // 単一選択時の矢印操作
    const selectedId = handler(state.elementsCache);
    if (!selectedId || !state.hierarchicalData) return state;

    const result = setSelectionInHierarchy(state.hierarchicalData, [selectedId]);
    return createStateFromHierarchicalResult(state, result);
  };
}

/**
 * 階層構造ベースでの要素変更操作
 */
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
 * すべてのアクションハンドラーのマップ（階層構造ベース）
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

    // フラット構造から階層構造に変換
    const hierarchicalData = convertFlatToHierarchical(payload);
    if (!hierarchicalData) {
      debugLog('Failed to convert flat structure to hierarchical');
      return state;
    }

    const elementsCache = Object.values(payload).reduce<ElementsMap>((acc, element) => {
      if (!element.id) {
        debugLog('Skipping invalid element without id:', element);
        return acc;
      }
      acc[element.id] = element.parentId === null ? { ...element, visible: true } : element;
      return acc;
    }, {});

    return {
      ...state,
      hierarchicalData,
      elementsCache,
      cacheValid: true,
    };
  }),

  SELECT_ELEMENT: createSafeHandler(
    isSelectElementPayload,
    (state: State, payload: SelectElementPayload) => {
      const { id, ctrlKey = false, shiftKey = false } = payload;

      if (!state.hierarchicalData) return state;

      const selectedElement = state.elementsCache[id];
      // Debug: SELECT_ELEMENT action details

      if (!selectedElement) {
        debugLog(`Element with id ${id} not found`);
        return state;
      }

      const currentSelected = getSelectedElementsFromState(state);
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
        const siblings = Object.values(state.elementsCache)
          .filter((e) => e.parentId === parentId)
          .sort((a, b) => a.id.localeCompare(b.id)); // IDでソート

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
        const elem = state.elementsCache[id];
        return elem && elem.parentId === parentId;
      });

      const result = setSelectionInHierarchy(state.hierarchicalData, validSelectedIds);

      // Debug: SELECT_ELEMENT completed

      return createStateFromHierarchicalResult(state, result);
    },
  ),

  DESELECT_ALL: createNoPayloadHandler((state) => {
    if (!state.hierarchicalData) return state;
    const result = setSelectionInHierarchy(state.hierarchicalData, []);
    return createStateFromHierarchicalResult(state, result);
  }),

  UPDATE_TEXT: createSafeHandler(
    (payload: unknown): payload is { id: string; index: number; value: string } => {
      return (
        typeof payload === 'object' &&
        payload !== null &&
        'id' in payload &&
        'index' in payload &&
        'value' in payload &&
        typeof (payload as any).id === 'string' &&
        typeof (payload as any).index === 'number' &&
        typeof (payload as any).value === 'string'
      );
    },
    (state: State, payload: { id: string; index: number; value: string }) => {
      if (!state.hierarchicalData) return state;

      const element = state.elementsCache[payload.id];
      if (!element) return state;

      const updatedElement = {
        ...element,
        texts: element.texts.map((text, idx) => (idx === payload.index ? payload.value : text)),
      };

      const result = updateElementInHierarchy(state.hierarchicalData, payload.id, updatedElement);
      return createStateFromHierarchicalResult(state, result);
    },
  ),

  UPDATE_START_MARKER: createSafeHandler(
    (payload: unknown): payload is { id: string; value: any } => {
      return (
        typeof payload === 'object' &&
        payload !== null &&
        'id' in payload &&
        typeof (payload as any).id === 'string'
      );
    },
    (state: State, payload: { id: string; value: any }) => {
      if (!state.hierarchicalData) return state;

      const element = state.elementsCache[payload.id];
      if (!element) return state;

      const updatedElement = {
        ...element,
        startMarker: payload.value,
      };

      const result = updateElementInHierarchy(state.hierarchicalData, payload.id, updatedElement);
      return createStateFromHierarchicalResult(state, result);
    },
  ),

  UPDATE_END_MARKER: createSafeHandler(
    (payload: unknown): payload is { id: string; value: any } => {
      return (
        typeof payload === 'object' &&
        payload !== null &&
        'id' in payload &&
        typeof (payload as any).id === 'string'
      );
    },
    (state: State, payload: { id: string; value: any }) => {
      if (!state.hierarchicalData) return state;

      const element = state.elementsCache[payload.id];
      if (!element) return state;

      const updatedElement = {
        ...element,
        endMarker: payload.value,
      };

      const result = updateElementInHierarchy(state.hierarchicalData, payload.id, updatedElement);
      return createStateFromHierarchicalResult(state, result);
    },
  ),

  // 後方互換性のために残す
  UPDATE_CONNECTION_PATH_TYPE: createSafeHandler(
    isUpdateMarkerPayload,
    (state: State, payload: UpdateMarkerPayload) => {
      const { id, connectionPathType } = payload;
      if (!connectionPathType || !state.hierarchicalData) {
        debugLog('connectionPathType is missing in payload');
        return state;
      }

      const element = state.elementsCache[id];
      if (!element) return state;

      const updatedElement = {
        ...element,
        startMarker: connectionPathType as any,
        connectionPathType: connectionPathType as any,
      };

      const result = updateElementInHierarchy(state.hierarchicalData, id, updatedElement);
      return createStateFromHierarchicalResult(state, result);
    },
  ),

  // 後方互換性のために残す
  UPDATE_END_CONNECTION_PATH_TYPE: createSafeHandler(
    isUpdateMarkerPayload,
    (state: State, payload: UpdateMarkerPayload) => {
      const { id, endConnectionPathType } = payload;
      if (!endConnectionPathType || !state.hierarchicalData) {
        debugLog('endConnectionPathType is missing in payload');
        return state;
      }

      const element = state.elementsCache[id];
      if (!element) return state;

      const updatedElement = {
        ...element,
        endMarker: endConnectionPathType as any,
        endConnectionPathType: endConnectionPathType as any,
      };

      const result = updateElementInHierarchy(state.hierarchicalData, id, updatedElement);
      return createStateFromHierarchicalResult(state, result);
    },
  ),

  EDIT_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElement = getSelectedElementFromState(state);
    if (!selectedElement || !state.hierarchicalData) {
      debugLog('EDIT_ELEMENT: No selected element or hierarchical data');
      return state;
    }

    debugLog(`EDIT_ELEMENT: Editing element ${selectedElement.id}`, {
      currentEditing: selectedElement.editing,
      willSetEditing: true,
    });

    const updatedElement = { ...selectedElement, editing: true };
    const result = updateElementInHierarchy(
      state.hierarchicalData,
      selectedElement.id,
      updatedElement,
    );

    debugLog(`EDIT_ELEMENT: Result elements cache`, {
      editingElements: Object.values(result.elementsCache)
        .filter((e) => e.editing)
        .map((e) => e.id),
    });

    return createStateFromHierarchicalResult(state, result);
  }),

  END_EDITING: createNoPayloadHandler((state) => {
    if (!state.hierarchicalData) return state;

    // すべての要素の編集状態を終了
    const updatedElementsCache = Object.values(state.elementsCache).reduce<ElementsMap>(
      (acc, element) => {
        acc[element.id] = { ...element, editing: false };
        return acc;
      },
      {},
    );

    // 階層構造に反映し、位置調整を行う
    const hierarchicalData = convertFlatToHierarchical(updatedElementsCache);
    if (!hierarchicalData) return state;

    const adjustedElementsCache = adjustElementPositions(
      updatedElementsCache,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
    if (!finalHierarchicalData) return state;

    return {
      ...state,
      hierarchicalData: finalHierarchicalData,
      elementsCache: adjustedElementsCache,
      cacheValid: true,
    };
  }),

  MOVE_ELEMENT: createSafeHandler(
    isMoveElementPayload,
    (state: State, payload: MoveElementPayload) => {
      const { id, x, y } = payload;
      const selectedElements = getSelectedElementsFromState(state);

      // 要素が存在するかチェック
      if (!state.elementsCache[id] || !state.hierarchicalData) {
        debugLog(`Element with id ${id} not found for move operation`);
        return state;
      }

      // 複数要素移動の場合
      if (selectedElements.length > 1 && selectedElements.some((e) => e.id === id)) {
        const deltaX = x - state.elementsCache[id].x;
        const deltaY = y - state.elementsCache[id].y;

        // 各選択要素を移動
        let currentHierarchy = state.hierarchicalData;
        for (const element of selectedElements) {
          const updatedElement = {
            ...element,
            x: element.x + deltaX,
            y: element.y + deltaY,
          };
          const result = updateElementInHierarchy(currentHierarchy, element.id, updatedElement);
          currentHierarchy = result.hierarchicalData;
        }

        const elementsCache = convertHierarchicalToFlat(currentHierarchy);
        return {
          ...state,
          hierarchicalData: currentHierarchy,
          elementsCache,
          cacheValid: true,
        };
      }

      // 単一要素移動
      const element = state.elementsCache[id];
      const updatedElement = { ...element, x, y };
      const result = updateElementInHierarchy(state.hierarchicalData, id, updatedElement);
      return createStateFromHierarchicalResult(state, result);
    },
  ),

  UPDATE_ELEMENT_SIZE: createSafeHandler(
    isUpdateElementSizePayload,
    (state: State, payload: UpdateElementSizePayload) => {
      const { id, width, height, sectionHeights } = payload;
      const element = state.elementsCache[id];
      if (!element || !state.hierarchicalData) {
        debugLog(`Element with id ${id} not found for size update`);
        return state;
      }

      // 値の妥当性チェック
      if (width <= 0 || height <= 0) {
        debugLog(`Invalid size values: width=${width}, height=${height}`);
        return state;
      }

      const updatedElement = {
        ...element,
        width,
        height,
        sectionHeights,
      };

      const result = updateElementInHierarchy(state.hierarchicalData, id, updatedElement);

      // 位置調整を行う
      const adjustedElementsCache = adjustElementPositions(
        result.elementsCache,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
      if (!finalHierarchicalData) return state;

      return {
        ...state,
        hierarchicalData: finalHierarchicalData,
        elementsCache: adjustedElementsCache,
        cacheValid: true,
      };
    },
  ),

  ADD_ELEMENT: createSafeHandler(
    isAddElementPayload,
    (state: State, payload: AddElementPayload) => {
      const selectedElement = getSelectedElementFromState(state);
      if (!selectedElement || !state.hierarchicalData) return state;

      // Undoスナップショットを保存
      saveSnapshot(state.elementsCache);

      const text = payload?.text;

      // 新しい要素を作成
      const newElement: Element = {
        ...createNewElement({
          numSections: state.numberOfSections,
        }),
        id: Date.now().toString(), // 簡易的なID生成
        parentId: selectedElement.id,
        depth: selectedElement.depth + 1,
        texts: text
          ? [text, ...Array(Math.max(0, state.numberOfSections - 1)).fill('')]
          : Array(state.numberOfSections).fill(''),
        selected: true, // 新要素を選択状態に
      };

      // 階層構造に要素を追加
      let result: HierarchicalOperationResult;
      try {
        result = addElementToHierarchy(state.hierarchicalData, selectedElement.id, newElement);
      } catch (error) {
        return state; // エラー時は元の状態を返す
      }

      // 既存の要素の選択状態を解除し、新しい要素のみを選択状態にする
      const elementsWithUpdatedSelection: { [id: string]: Element } = {};
      Object.entries(result.elementsCache).forEach(([id, element]) => {
        elementsWithUpdatedSelection[id] = {
          ...element,
          selected: id === newElement.id, // 新しい要素のみを選択状態に
          editing: id === newElement.id, // 新しい要素を編集状態に
        };
      });

      // 位置調整を行う
      const adjustedElementsCache = adjustElementPositions(
        elementsWithUpdatedSelection,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
      if (!finalHierarchicalData) return state;

      return {
        ...state,
        hierarchicalData: finalHierarchicalData,
        elementsCache: adjustedElementsCache,
        cacheValid: true,
      };
    },
  ),

  ADD_ELEMENTS_SILENT: createSafeHandler(
    isAddElementsSilentPayload,
    (state: State, payload: AddElementsSilentPayload) => {
      const selectedElement = getSelectedElementFromState(state);
      if (!selectedElement || !state.hierarchicalData) return state;

      // Undoスナップショットを保存
      saveSnapshot(state.elementsCache);

      const texts = payload?.texts || [];
      const tentative = payload?.tentative || false;

      let currentHierarchy = state.hierarchicalData;

      // 複数の要素を順次追加
      for (let i = 0; i < texts.length; i++) {
        const newElement: Element = {
          ...createNewElement({
            numSections: state.numberOfSections,
          }),
          id: (Date.now() + i).toString(),
          parentId: selectedElement.id,
          depth: selectedElement.depth + 1,
          texts: Array(state.numberOfSections)
            .fill('')
            .map((_, index) => (index === 0 ? texts[i] : '')),
          tentative,
          editing: false, // Silent追加では編集状態にしない
          selected: false, // Silent追加では選択状態にしない
        };

        const result = addElementToHierarchy(currentHierarchy, selectedElement.id, newElement);
        currentHierarchy = result.hierarchicalData;
      }

      const elementsCache = convertHierarchicalToFlat(currentHierarchy);

      // 位置調整を行う
      const adjustedElementsCache = adjustElementPositions(
        elementsCache,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
      if (!finalHierarchicalData) return state;

      return {
        ...state,
        hierarchicalData: finalHierarchicalData,
        elementsCache: adjustedElementsCache,
        cacheValid: true,
      };
    },
  ),

  ADD_SIBLING_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElement = getSelectedElementFromState(state);
    if (!selectedElement || !state.hierarchicalData) return state;

    // Undoスナップショットを保存
    saveSnapshot(state.elementsCache);

    // 兄弟要素を作成
    const newElement: Element = {
      ...createNewElement({
        numSections: state.numberOfSections,
      }),
      id: Date.now().toString(),
      parentId: selectedElement.parentId,
      depth: selectedElement.depth,
      texts: Array(state.numberOfSections).fill(''),
      selected: true,
    };

    // 階層構造に要素を追加
    const result = addElementToHierarchy(
      state.hierarchicalData,
      selectedElement.parentId,
      newElement,
    );

    // 位置調整を行う
    const adjustedElementsCache = adjustElementPositions(
      result.elementsCache,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
    if (!finalHierarchicalData) return state;

    return {
      ...state,
      hierarchicalData: finalHierarchicalData,
      elementsCache: adjustedElementsCache,
      cacheValid: true,
    };
  }),

  DELETE_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElements = getSelectedElementsFromState(state);
    if (selectedElements.length === 0 || !state.hierarchicalData) return state;

    debugLog(`DELETE_ELEMENT開始: 削除対象要素数=${selectedElements.length}`);

    // Undoスナップショットを保存
    saveSnapshot(state.elementsCache);

    // 削除後に選択する要素の候補を探す
    const firstElement = selectedElements[0];
    const siblings = Object.values(state.elementsCache)
      .filter((e) => e.parentId === firstElement.parentId && !e.selected)
      .sort((a, b) => a.id.localeCompare(b.id)); // IDでソート

    // 兄弟要素があればそれを選択、なければ親要素を選択
    const nextSelectedId = siblings[0]?.id || firstElement.parentId;

    let currentHierarchy = state.hierarchicalData;

    // 各選択要素を削除
    for (const element of selectedElements) {
      const result = deleteElementFromHierarchy(currentHierarchy, element.id);
      currentHierarchy = result.hierarchicalData;
    }

    // 次に選択する要素があれば、その要素のみを選択状態に
    if (nextSelectedId) {
      const result = setSelectionInHierarchy(currentHierarchy, [nextSelectedId]);
      currentHierarchy = result.hierarchicalData;
    }

    const elementsCache = convertHierarchicalToFlat(currentHierarchy);

    // 位置調整を行う
    const adjustedElementsCache = adjustElementPositions(
      elementsCache,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
    if (!finalHierarchicalData) return state;

    return {
      ...state,
      hierarchicalData: finalHierarchicalData,
      elementsCache: adjustedElementsCache,
      cacheValid: true,
    };
  }),

  CONFIRM_TENTATIVE_ELEMENTS: createNoPayloadHandler((state) => {
    if (!state.hierarchicalData) return state;

    // tentativeフラグをfalseにする
    const updatedElementsCache = Object.values(state.elementsCache).reduce<ElementsMap>(
      (acc, element) => {
        acc[element.id] = element.tentative ? { ...element, tentative: false } : element;
        return acc;
      },
      {},
    );

    const hierarchicalData = convertFlatToHierarchical(updatedElementsCache);
    if (!hierarchicalData) return state;

    return {
      ...state,
      hierarchicalData,
      elementsCache: updatedElementsCache,
      cacheValid: true,
    };
  }),

  CANCEL_TENTATIVE_ELEMENTS: createSafeHandler(
    (payload: unknown): payload is string => typeof payload === 'string',
    (state: State, parentId: string) => {
      if (!state.hierarchicalData) return state;

      // tentativeな要素を削除
      const filteredElementsCache = Object.values(state.elementsCache).reduce<ElementsMap>(
        (acc, element) => {
          if (!(element.tentative && element.parentId === parentId)) {
            acc[element.id] = element;
          }
          return acc;
        },
        {},
      );

      const hierarchicalData = convertFlatToHierarchical(filteredElementsCache);
      if (!hierarchicalData) return state;

      // 位置調整を行う
      const adjustedElementsCache = adjustElementPositions(
        filteredElementsCache,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
      if (!finalHierarchicalData) return state;

      return {
        ...state,
        hierarchicalData: finalHierarchicalData,
        elementsCache: adjustedElementsCache,
        cacheValid: true,
      };
    },
  ),

  UNDO: createNoPayloadHandler((state) => {
    const undoElements = Undo(state.elementsCache);
    if (!undoElements) return state;

    const hierarchicalData = convertFlatToHierarchical(undoElements);
    if (!hierarchicalData) return state;

    // 位置調整を行う
    const adjustedElementsCache = adjustElementPositions(
      undoElements,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
    if (!finalHierarchicalData) return state;

    return {
      ...state,
      hierarchicalData: finalHierarchicalData,
      elementsCache: adjustedElementsCache,
      cacheValid: true,
    };
  }),

  REDO: createNoPayloadHandler((state) => {
    const redoElements = Redo(state.elementsCache);
    if (!redoElements) return state;

    const hierarchicalData = convertFlatToHierarchical(redoElements);
    if (!hierarchicalData) return state;

    // 位置調整を行う
    const adjustedElementsCache = adjustElementPositions(
      redoElements,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
    if (!finalHierarchicalData) return state;

    return {
      ...state,
      hierarchicalData: finalHierarchicalData,
      elementsCache: adjustedElementsCache,
      cacheValid: true,
    };
  }),

  SNAPSHOT: createNoPayloadHandler((state) => {
    saveSnapshot(state.elementsCache);
    return state;
  }),

  DROP_ELEMENT: createSafeHandler(
    isDropElementPayload,
    (state: State, payload: DropElementPayload) => {
      const { id, newParentId, newOrder } = payload;

      // 基本的な妥当性チェック
      if (!state.elementsCache[id] || !state.hierarchicalData) {
        debugLog(`Element with id ${id} not found for drop operation`);
        return state;
      }

      if (newOrder < 0) {
        debugLog(`Invalid drop values: newOrder=${newOrder}`);
        return state;
      }

      // 循環参照チェック（簡易版）
      if (id === newParentId) {
        debugLog(`Invalid drop operation: circular reference detected`);
        return state;
      }

      const result = moveElementInHierarchy(state.hierarchicalData, id, newParentId, newOrder);

      // 位置調整を行う
      const adjustedElementsCache = adjustElementPositions(
        result.elementsCache,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
      if (!finalHierarchicalData) return state;

      return {
        ...state,
        hierarchicalData: finalHierarchicalData,
        elementsCache: adjustedElementsCache,
        cacheValid: true,
      };
    },
  ),

  CUT_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElements = getSelectedElementsFromState(state);
    if (selectedElements.length === 0 || !state.hierarchicalData) return state;

    let cutElementsMap: ElementsMap = {};
    let currentHierarchy = state.hierarchicalData;

    selectedElements.forEach((selectedElement) => {
      // 選択された要素とその子要素を取得
      const elementsToCut = getSelectedAndChildren(state.elementsCache, selectedElement);

      // 選択状態をリセット
      Object.keys(elementsToCut).forEach((id) => {
        if (elementsToCut[id]) {
          elementsToCut[id] = { ...elementsToCut[id], selected: false };
        }
      });

      cutElementsMap = { ...cutElementsMap, ...elementsToCut };

      // 階層構造から削除
      const result = deleteElementFromHierarchy(currentHierarchy, selectedElement.id);
      currentHierarchy = result.hierarchicalData;
    });

    cutToClipboard(cutElementsMap);

    const elementsCache = convertHierarchicalToFlat(currentHierarchy);

    return {
      ...state,
      hierarchicalData: currentHierarchy,
      elementsCache,
      cacheValid: true,
    };
  }),

  COPY_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElement = getSelectedElementFromState(state);
    if (!selectedElement) {
      return state;
    }

    const elementsToCopy = getSelectedAndChildren(state.elementsCache, selectedElement);

    // getSelectedAndChildrenが既に適切なparentId=nullとselected=trueを設定している
    copyToClipboard(elementsToCopy);
    return state;
  }),

  PASTE_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElements = getSelectedElementsFromState(state);
    if (selectedElements.length !== 1 || !state.hierarchicalData) return state;

    // 切り取った要素とコピーした要素の両方を確認
    const globalCutElements = getGlobalCutElements();
    const globalCopiedElements = getGlobalCopiedElements();
    const elementsToAdd = globalCutElements || globalCopiedElements;

    if (!elementsToAdd) return state;

    // TODO: pasteElements関数を階層構造対応版に変更する必要があります
    // 今は簡単な実装として、選択要素の子として要素を追加
    const selectedElement = selectedElements[0];
    let currentHierarchy = state.hierarchicalData;

    Object.values(elementsToAdd).forEach((element, index) => {
      const newElement: Element = {
        ...element,
        id: (Date.now() + index).toString(),
        parentId: selectedElement.id,
        depth: selectedElement.depth + 1,
        selected: false,
      };

      const result = addElementToHierarchy(currentHierarchy, selectedElement.id, newElement);
      currentHierarchy = result.hierarchicalData;
    });

    // 位置調整を行う
    const elementsCache = convertHierarchicalToFlat(currentHierarchy);
    const adjustedElementsCache = adjustElementPositions(
      elementsCache,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
    if (!finalHierarchicalData) return state;

    return {
      ...state,
      hierarchicalData: finalHierarchicalData,
      elementsCache: adjustedElementsCache,
      cacheValid: true,
    };
  }),

  EXPAND_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElement = getSelectedElementFromState(state);
    if (!selectedElement || !state.hierarchicalData) return state;

    // 可視性を設定
    const result = setVisibilityInHierarchy(state.hierarchicalData, selectedElement.id, true);

    // 位置調整を行う
    const adjustedElementsCache = adjustElementPositions(
      result.elementsCache,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
    if (!finalHierarchicalData) return state;

    return {
      ...state,
      hierarchicalData: finalHierarchicalData,
      elementsCache: adjustedElementsCache,
      cacheValid: true,
    };
  }),

  COLLAPSE_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElement = getSelectedElementFromState(state);
    if (!selectedElement || !state.hierarchicalData) return state;

    // 可視性を設定
    const result = setVisibilityInHierarchy(state.hierarchicalData, selectedElement.id, false);

    // 位置調整を行う
    const adjustedElementsCache = adjustElementPositions(
      result.elementsCache,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
    if (!finalHierarchicalData) return state;

    return {
      ...state,
      hierarchicalData: finalHierarchicalData,
      elementsCache: adjustedElementsCache,
      cacheValid: true,
    };
  }),
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

    // hierarchicalDataとelementsCache が存在することを確認
    if (
      newState.hierarchicalData === undefined ||
      !newState.elementsCache ||
      typeof newState.elementsCache !== 'object'
    ) {
      debugLog(`Invalid hierarchical structure or cache in state for action ${action.type}`);
      return state;
    }

    return newState;
  } catch (error) {
    debugLog(`Error handling action ${action.type}:`, error);
    return state;
  }
};
