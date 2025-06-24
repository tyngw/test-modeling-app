// src/state/state.ts
'use client';

import { Undo, Redo, saveSnapshot } from './undoredo';
import {
  handleArrowUp,
  handleArrowDown,
  handleArrowRight,
  handleArrowLeft,
} from '../utils/elementSelector';
import { Element, MarkerType, DirectionType } from '../types/types';
import {
  DEFAULT_POSITION,
  NUMBER_OF_SECTIONS,
  OFFSET,
  SIZE,
  DEFAULT_FONT_SIZE,
  LINE_HEIGHT_RATIO,
  TEXTAREA_PADDING,
} from '../config/elementSettings';
import { Action } from '../types/actionTypes';
import { debugLog } from '../utils/debugLogHelpers';
import { createNewElement, getChildrenFromHierarchy } from '../utils/element/elementHelpers';
import { calculateElementWidth, wrapText } from '../utils/textareaHelpers';
import { ElementsMap } from '../types/elementTypes';
import { adjustElementPositions } from '../utils/layoutHelpers';
import {
  getSelectedAndChildren,
  copyToClipboard,
  cutToClipboard,
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
  direction?: DirectionType;
}

interface AddElementPayload {
  text?: string;
}

interface AddElementsSilentPayload {
  texts?: string[];
  tentative?: boolean;
  parentId?: string; // 親要素のIDを指定可能にする
  onError?: (message: string) => void; // エラーハンドリングコールバック
}

type AddHierarchicalElementsPayload = {
  parentId?: string;
  hierarchicalItems: Array<{
    text: string;
    level: number;
    originalLine: string;
  }>;
  onError?: (message: string) => void;
};

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
    typeof (payload as any).id === 'string' &&
    typeof (payload as any).newOrder === 'number' &&
    // direction は省略可能なので存在チェックのみ
    (('direction' in payload && typeof (payload as any).direction === 'string') ||
      !('direction' in payload))
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
      (!('tentative' in payload) || typeof (payload as any).tentative === 'boolean') &&
      (!('parentId' in payload) || typeof (payload as any).parentId === 'string') &&
      (!('onError' in payload) || typeof (payload as any).onError === 'function'))
  );
};

const isAddHierarchicalElementsPayload = (
  payload: unknown,
): payload is AddHierarchicalElementsPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'hierarchicalItems' in payload &&
    Array.isArray((payload as any).hierarchicalItems) &&
    (payload as any).hierarchicalItems.every(
      (item: any) =>
        typeof item === 'object' &&
        item !== null &&
        typeof item.text === 'string' &&
        typeof item.level === 'number' &&
        typeof item.originalLine === 'string',
    ) &&
    (!('parentId' in payload) || typeof (payload as any).parentId === 'string') &&
    (!('onError' in payload) || typeof (payload as any).onError === 'function')
  );
};

const isPasteClipboardElementsPayload = (
  payload: unknown,
): payload is { elements: ElementsMap; targetElementId: string } => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'elements' in payload &&
    'targetElementId' in payload &&
    typeof (payload as any).targetElementId === 'string' &&
    typeof (payload as any).elements === 'object'
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

      // 編集中の要素がある場合は、先に編集を終了する
      const editingElements = Object.values(state.elementsCache).filter((e) => e.editing);
      let workingState = state;

      if (editingElements.length > 0) {
        debugLog(`SELECT_ELEMENT: Ending editing for ${editingElements.length} elements`);

        // すべての要素の編集状態を終了
        const updatedElementsCache = Object.values(workingState.elementsCache).reduce<ElementsMap>(
          (acc, element) => {
            acc[element.id] = { ...element, editing: false };
            return acc;
          },
          {},
        );

        // 階層構造に反映し、位置調整を行う
        const hierarchicalData = convertFlatToHierarchical(updatedElementsCache);
        if (hierarchicalData) {
          const adjustedElementsCache = adjustElementPositions(
            updatedElementsCache,
            () => workingState.numberOfSections,
            workingState.layoutMode,
            workingState.width || 0,
            workingState.height || 0,
            hierarchicalData,
          );

          const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
          if (finalHierarchicalData) {
            workingState = {
              ...workingState,
              hierarchicalData: finalHierarchicalData,
              elementsCache: adjustedElementsCache,
              cacheValid: true,
            };
          }
        }
      }

      const currentSelected = getSelectedElementsFromState(workingState);
      const firstSelected = currentSelected[0];

      // 異なるparentIdの要素が含まれる場合は何もしない
      if (
        (shiftKey || ctrlKey) &&
        currentSelected.length > 0 &&
        currentSelected.some((e) => e.parentId !== selectedElement.parentId)
      ) {
        return workingState;
      }

      let newSelectedIds: string[] = [];

      if (shiftKey && currentSelected.length > 0) {
        const parentId = firstSelected.parentId;
        const siblings = Object.values(workingState.elementsCache)
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
        const elem = workingState.elementsCache[id];
        return elem && elem.parentId === parentId;
      });

      if (!workingState.hierarchicalData) return workingState;

      const result = setSelectionInHierarchy(workingState.hierarchicalData, validSelectedIds);

      // Debug: SELECT_ELEMENT completed

      return createStateFromHierarchicalResult(workingState, result);
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
    (payload: unknown): payload is { id: string; startMarker: MarkerType } => {
      return (
        typeof payload === 'object' &&
        payload !== null &&
        'id' in payload &&
        typeof (payload as any).id === 'string' &&
        'startMarker' in payload
      );
    },
    (state: State, payload: { id: string; startMarker: MarkerType }) => {
      if (!state.hierarchicalData) return state;

      const element = state.elementsCache[payload.id];
      if (!element) return state;

      const updatedElement = {
        ...element,
        startMarker: payload.startMarker,
      };

      const result = updateElementInHierarchy(state.hierarchicalData, payload.id, updatedElement);
      return createStateFromHierarchicalResult(state, result);
    },
  ),

  UPDATE_END_MARKER: createSafeHandler(
    (payload: unknown): payload is { id: string; endMarker: MarkerType } => {
      return (
        typeof payload === 'object' &&
        payload !== null &&
        'id' in payload &&
        typeof (payload as any).id === 'string' &&
        'endMarker' in payload
      );
    },
    (state: State, payload: { id: string; endMarker: MarkerType }) => {
      if (!state.hierarchicalData) return state;

      const element = state.elementsCache[payload.id];
      if (!element) return state;

      const updatedElement = {
        ...element,
        endMarker: payload.endMarker,
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

      // 階層構造から親要素の既存の子要素を順序通りに取得
      const siblings = state.hierarchicalData
        ? getChildrenFromHierarchy(selectedElement.id, state.hierarchicalData, state.elementsCache)
        : Object.values(state.elementsCache).filter(
            (el) => el.parentId === selectedElement.id && el.visible,
          );

      // 新しい要素の初期座標を計算
      let initialX: number;
      let initialY: number;

      if (siblings.length > 0) {
        // 子要素がある場合：最後の子要素の下に配置
        const lastChild = siblings[siblings.length - 1];
        initialX = lastChild.x; // 最後の子要素のX座標と同じ
        initialY = lastChild.y + lastChild.height + OFFSET.Y; // 最後の子要素の下端+OFFSETに配置
      } else {
        // 子要素がない場合：親要素の右隣に配置
        initialX = selectedElement.x + selectedElement.width + OFFSET.X; // 親要素の右+OFFSETに配置
        initialY = selectedElement.y; // 親要素と同じY座標
      }

      // 新しい要素を作成
      const newElement: Element = {
        ...createNewElement({
          numSections: state.numberOfSections,
          direction: selectedElement.direction === 'none' ? 'right' : selectedElement.direction, // 親のdirectionを継承
        }),
        id: Date.now().toString(), // 簡易的なID生成
        parentId: selectedElement.id,
        depth: selectedElement.depth + 1,
        x: initialX, // 計算された初期X座標を設定
        y: initialY, // 計算された初期Y座標を設定
        texts: text
          ? [text, ...Array(Math.max(0, state.numberOfSections - 1)).fill('')]
          : Array(state.numberOfSections).fill(''),
        selected: true, // 新要素を選択状態に
      };

      // デバッグログ: 作成された要素の座標を確認
      debugLog(
        `[ADD_ELEMENT] 新要素作成: ID=${newElement.id}, X=${newElement.x}, Y=${newElement.y}`,
      );

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

      // デバッグログ: 階層操作後の新要素の座標を確認
      const newElementAfterHierarchy = elementsWithUpdatedSelection[newElement.id];
      if (newElementAfterHierarchy) {
        debugLog(
          `[ADD_ELEMENT] 階層操作後の新要素: X=${newElementAfterHierarchy.x}, Y=${newElementAfterHierarchy.y}`,
        );
      }

      // 位置調整を行う
      const adjustedElementsCache = adjustElementPositions(
        elementsWithUpdatedSelection,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
        result.hierarchicalData,
      );

      // デバッグログ: 位置調整後の新要素の座標を確認
      const newElementAfterAdjustment = adjustedElementsCache[newElement.id];
      if (newElementAfterAdjustment) {
        debugLog(
          `[ADD_ELEMENT] 位置調整後の新要素: X=${newElementAfterAdjustment.x}, Y=${newElementAfterAdjustment.y}`,
        );
      }

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
      // 親要素を決定：payloadで指定されていればそれを使用、そうでなければ現在選択中の要素
      let targetElement: Element | undefined;

      if (payload?.parentId) {
        // 指定されたIDの要素を検索
        targetElement = state.elementsCache[payload.parentId];
      } else {
        // 従来の動作：現在選択されている要素を使用
        targetElement = getSelectedElementFromState(state);
      }

      if (!targetElement || !state.hierarchicalData) {
        // エラーハンドリング: 対象要素が見つからない場合
        if (payload?.onError) {
          payload.onError('AI生成中に対象要素が削除されたため、結果を追加できませんでした。');
        }
        debugLog(
          `[ADD_ELEMENTS_SILENT] 対象要素が見つかりません: ${payload?.parentId || '選択要素なし'}`,
        );
        return state;
      }

      // この時点でtargetElementは確実に存在する
      const safeTargetElement: Element = targetElement;

      // Undoスナップショットを保存
      saveSnapshot(state.elementsCache);

      const texts = payload?.texts || [];
      const tentative = payload?.tentative || false;

      // 階層構造から親要素の既存の子要素を順序通りに取得
      const siblings = state.hierarchicalData
        ? getChildrenFromHierarchy(
            safeTargetElement.id,
            state.hierarchicalData,
            state.elementsCache,
          )
        : Object.values(state.elementsCache).filter(
            (el) => el.parentId === safeTargetElement.id && el.visible,
          );

      // 初期座標を計算
      let currentX: number;
      let currentY: number;

      if (siblings.length > 0) {
        // 兄弟要素がある場合：末尾要素の下に配置
        const lastSibling = siblings[siblings.length - 1];
        currentX = lastSibling.x; // 末尾要素のX座標と同じ
        currentY = lastSibling.y + lastSibling.height + OFFSET.Y; // 末尾要素の下端+OFFSETに配置
      } else {
        // 兄弟要素がない場合：親要素の右隣に配置
        currentX = safeTargetElement.x + safeTargetElement.width + OFFSET.X; // 親要素の右+OFFSETに配置
        currentY = safeTargetElement.y; // 親要素と同じY座標
      }

      let currentHierarchy = state.hierarchicalData;

      // 複数の要素を順次追加
      for (let i = 0; i < texts.length; i++) {
        // テキスト内容に基づいて適切な幅を計算
        const textContent = texts[i];
        const elementWidth = calculateElementWidth([textContent], TEXTAREA_PADDING.HORIZONTAL);

        // セクション高さを計算
        const lines = wrapText(textContent || '', elementWidth, state.zoomRatio || 1).length;
        const sectionHeight = Math.max(
          SIZE.SECTION_HEIGHT * (state.zoomRatio || 1),
          lines * DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO +
            TEXTAREA_PADDING.VERTICAL * (state.zoomRatio || 1),
        );

        // 要素の総高さを計算
        const totalHeight = Array(state.numberOfSections)
          .fill(sectionHeight)
          .reduce((sum, h) => sum + h, 0);

        const newElement: Element = {
          ...createNewElement({
            numSections: state.numberOfSections,
            direction:
              safeTargetElement.direction === 'none' ? 'right' : safeTargetElement.direction, // 親のdirectionを継承
          }),
          id: (Date.now() + i).toString(),
          parentId: safeTargetElement.id,
          depth: safeTargetElement.depth + 1,
          x: currentX, // 計算された初期X座標を設定
          y: currentY + i * (totalHeight + OFFSET.Y), // 実際の高さに基づいて配置
          width: elementWidth, // 計算された幅を設定
          height: totalHeight, // 計算された高さを設定
          sectionHeights: Array(state.numberOfSections).fill(sectionHeight), // 計算されたセクション高さを設定
          texts: Array(state.numberOfSections)
            .fill('')
            .map((_, index) => (index === 0 ? texts[i] : '')),
          tentative,
          editing: false, // Silent追加では編集状態にしない
          selected: false, // Silent追加では選択状態にしない
        };

        const result = addElementToHierarchy(currentHierarchy, safeTargetElement.id, newElement);
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
        currentHierarchy,
      );

      const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
      if (!finalHierarchicalData) return state;

      // 成功ログ
      debugLog(`[ADD_ELEMENTS_SILENT] ${texts.length}個の要素を追加しました`);

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

    // 同じ階層の兄弟要素を取得
    const siblings = state.hierarchicalData
      ? getChildrenFromHierarchy(
          selectedElement.parentId,
          state.hierarchicalData,
          state.elementsCache,
        )
      : Object.values(state.elementsCache).filter(
          (el) => el.parentId === selectedElement.parentId && el.visible,
        );

    // 新しい要素の初期座標を計算
    let initialX: number;
    let initialY: number;

    if (siblings.length > 0) {
      // 同じ階層の最後の要素の下に配置
      const lastSibling = siblings[siblings.length - 1];
      initialX = lastSibling.x; // 最後の兄弟要素のX座標と同じ
      initialY = lastSibling.y + lastSibling.height + OFFSET.Y; // 最後の兄弟要素の下端+OFFSETに配置
    } else {
      // 兄弟要素がない場合：選択された要素と同じ位置に配置
      initialX = selectedElement.x;
      initialY = selectedElement.y + selectedElement.height + OFFSET.Y;
    }

    // 兄弟要素を作成
    const newElement: Element = {
      ...createNewElement({
        numSections: state.numberOfSections,
        direction: selectedElement.direction, // 選択された要素のdirectionを継承
      }),
      id: Date.now().toString(),
      parentId: selectedElement.parentId,
      depth: selectedElement.depth,
      x: initialX, // 計算された初期X座標を設定
      y: initialY, // 計算された初期Y座標を設定
      texts: Array(state.numberOfSections).fill(''),
      selected: true,
    };

    // デバッグログ: 作成された要素の座標を確認
    debugLog(
      `[ADD_SIBLING_ELEMENT] 新要素作成: ID=${newElement.id}, X=${newElement.x}, Y=${newElement.y}`,
    );

    // 階層構造に要素を追加
    let result: HierarchicalOperationResult;
    try {
      result = addElementToHierarchy(state.hierarchicalData, selectedElement.parentId, newElement);
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

    // デバッグログ: 階層操作後の新要素の座標を確認
    const newElementAfterHierarchy = elementsWithUpdatedSelection[newElement.id];
    if (newElementAfterHierarchy) {
      debugLog(
        `[ADD_SIBLING_ELEMENT] 階層操作後の新要素: X=${newElementAfterHierarchy.x}, Y=${newElementAfterHierarchy.y}`,
      );
    }

    // 位置調整を行う
    const adjustedElementsCache = adjustElementPositions(
      elementsWithUpdatedSelection,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
      result.hierarchicalData,
    );

    // デバッグログ: 位置調整後の新要素の座標を確認
    const newElementAfterAdjustment = adjustedElementsCache[newElement.id];
    if (newElementAfterAdjustment) {
      debugLog(
        `[ADD_SIBLING_ELEMENT] 位置調整後の新要素: X=${newElementAfterAdjustment.x}, Y=${newElementAfterAdjustment.y}`,
      );
    }

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

  CONFIRM_TENTATIVE_ELEMENTS: createSafeHandler(
    (payload: unknown): payload is string => typeof payload === 'string',
    (state, parentId) => {
      if (!state.hierarchicalData) return state;

      // 指定されたparentIdを持つtentative要素のみをfalseにする
      const updatedElementsCache = Object.values(state.elementsCache).reduce<ElementsMap>(
        (acc, element) => {
          if (element.tentative && element.parentId === parentId) {
            acc[element.id] = { ...element, tentative: false };
          } else {
            acc[element.id] = element;
          }
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
    },
  ),

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
      const { id, newParentId, newOrder, direction } = payload;

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

      // direction の更新を適用
      if (direction !== undefined && result.elementsCache[id]) {
        result.elementsCache[id] = {
          ...result.elementsCache[id],
          direction,
        };
        debugLog(`Element ${id} direction updated to: ${direction}`);
      }

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
    // この関数は基本的にはフォールバック用として残し、
    // 実際の貼り付け処理は新しいPASTE_CLIPBOARD_ELEMENTSアクションで行います
    return state;
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

  // 新たに追加されたアクションハンドラー
  ADD_HIERARCHICAL_ELEMENTS: createSafeHandler(
    isAddHierarchicalElementsPayload,
    (state: State, payload: AddHierarchicalElementsPayload) => {
      if (!state.hierarchicalData) return state;

      // Undoスナップショットを保存
      saveSnapshot(state.elementsCache);

      const { parentId, hierarchicalItems } = payload;

      // 親要素を決定：payloadで指定されていればそれを使用、そうでなければ現在選択中の要素
      let baseParentElement: Element | undefined;

      if (parentId) {
        baseParentElement = state.elementsCache[parentId];
      } else {
        baseParentElement = getSelectedElementFromState(state);
      }

      if (!baseParentElement) {
        if (payload?.onError) {
          payload.onError('親要素が見つかりません');
        }
        return state;
      }

      let currentHierarchy = state.hierarchicalData;

      // 階層レベルごとに親要素を追跡するスタック
      const parentStack: Array<{ element: Element; level: number }> = [
        { element: baseParentElement, level: -1 },
      ];

      // 各階層アイテムを順次処理
      for (let i = 0; i < hierarchicalItems.length; i++) {
        const item = hierarchicalItems[i];
        const { text, level } = item;

        // 適切な親要素を決定（レベルに基づいてスタックを調整）
        while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
          parentStack.pop();
        }

        const parentInfo = parentStack[parentStack.length - 1];
        if (!parentInfo) continue;

        // 新しい要素を作成
        const elementWidth = calculateElementWidth([text], TEXTAREA_PADDING.HORIZONTAL);
        const lines = wrapText(text || '', elementWidth, state.zoomRatio || 1).length;
        const sectionHeight = Math.max(
          SIZE.SECTION_HEIGHT * (state.zoomRatio || 1),
          lines * DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO +
            TEXTAREA_PADDING.VERTICAL * (state.zoomRatio || 1),
        );
        const totalHeight = Array(state.numberOfSections)
          .fill(sectionHeight)
          .reduce((sum, h) => sum + h, 0);

        const newElement: Element = {
          ...createNewElement({
            numSections: state.numberOfSections,
            direction:
              parentInfo.element.direction === 'none' ? 'right' : parentInfo.element.direction,
          }),
          id: `${Date.now()}-${i}`,
          parentId: parentInfo.element.id,
          depth: parentInfo.element.depth + 1,
          x: 0, // 自動調整される
          y: 0, // 自動調整される
          width: elementWidth,
          height: totalHeight,
          sectionHeights: Array(state.numberOfSections).fill(sectionHeight),
          texts: Array(state.numberOfSections)
            .fill('')
            .map((_, index) => (index === 0 ? text : '')),
          tentative: false,
          editing: false,
          selected: false,
        };

        // 階層構造に要素を追加
        const result = addElementToHierarchy(currentHierarchy, parentInfo.element.id, newElement);
        currentHierarchy = result.hierarchicalData;

        // 新しい要素を親スタックに追加（子要素のため）
        parentStack.push({ element: newElement, level });
      }

      // フラット構造に変換
      const elementsCache = convertHierarchicalToFlat(currentHierarchy);

      // 位置調整を行う
      const adjustedElementsCache = adjustElementPositions(
        elementsCache,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
        currentHierarchy,
      );

      const finalHierarchicalData = convertFlatToHierarchical(adjustedElementsCache);
      if (!finalHierarchicalData) return state;

      debugLog(`[ADD_HIERARCHICAL_ELEMENTS] ${hierarchicalItems.length}個の階層要素を追加しました`);

      return {
        ...state,
        hierarchicalData: finalHierarchicalData,
        elementsCache: adjustedElementsCache,
        cacheValid: true,
      };
    },
  ),

  PASTE_CLIPBOARD_ELEMENTS: createSafeHandler(isPasteClipboardElementsPayload, (state, payload) => {
    const { elements: elementsToAdd, targetElementId } = payload;
    if (!state.hierarchicalData) return state;

    const selectedElement = state.elementsCache[targetElementId];
    if (!selectedElement) return state;

    let currentHierarchy = state.hierarchicalData;

    // 要素のIDマッピングを作成（古いID -> 新しいID）
    const idMap = new Map<string, string>();
    const newElements: ElementsMap = {};

    // まず、ルート要素を特定（parentId === null の要素）
    const rootElement = Object.values(elementsToAdd).find((el) => el.parentId === null);
    if (!rootElement) return state;

    // 1. 最初にすべての要素の新しいIDを生成してマッピングを作成
    Object.values(elementsToAdd).forEach((element, index) => {
      const newId = (Date.now() + index).toString();
      idMap.set(element.id, newId);
    });

    // 2. 階層構造を維持しながら要素を変換
    Object.values(elementsToAdd).forEach((element) => {
      const newId = idMap.get(element.id)!;

      // 新しい親IDを決定
      let newParentId: string | null;
      if (element.parentId === null) {
        // ルート要素は選択された要素の子になる
        newParentId = selectedElement.id;
      } else {
        // 子要素は新しいIDマップを使用して親を参照
        newParentId = idMap.get(element.parentId) || null;
      }

      // directionを適切に設定
      let newDirection = element.direction;
      if (element.parentId === null) {
        // ルート要素の場合
        if (selectedElement.direction === 'none') {
          newDirection = element.direction === 'none' ? 'right' : element.direction;
        } else {
          newDirection = selectedElement.direction;
        }
      } else {
        // 子要素の場合は元のdirectionを維持
        newDirection = element.direction;
      }

      // 新しい深さを計算
      let newDepth: number;
      if (element.parentId === null) {
        newDepth = selectedElement.depth + 1;
      } else {
        // 相対的な深さを維持
        const rootDepth = rootElement.depth;
        const depthDifference = element.depth - rootDepth;
        newDepth = selectedElement.depth + 1 + depthDifference;
      }

      newElements[newId] = {
        ...element,
        id: newId,
        parentId: newParentId,
        depth: newDepth,
        direction: newDirection,
        selected: false,
      };
    });

    // 3. 階層構造に追加（ルート要素から開始）
    const newRootId = idMap.get(rootElement.id)!;
    const newRootElement = newElements[newRootId];

    const result = addElementToHierarchy(currentHierarchy, selectedElement.id, newRootElement);
    currentHierarchy = result.hierarchicalData;

    // 4. 子要素を再帰的に追加
    const addChildrenRecursively = (parentElementId: string, originalParentId: string) => {
      const childElements = Object.values(elementsToAdd).filter(
        (el) => el.parentId === originalParentId,
      );

      childElements.forEach((childElement) => {
        const newChildId = idMap.get(childElement.id)!;
        const newChildElement = newElements[newChildId];

        const childResult = addElementToHierarchy(
          currentHierarchy,
          parentElementId,
          newChildElement,
        );
        currentHierarchy = childResult.hierarchicalData;

        // 孫要素も再帰的に追加
        addChildrenRecursively(newChildId, childElement.id);
      });
    };

    // ルート要素の子要素を再帰的に追加
    addChildrenRecursively(newRootId, rootElement.id);

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
