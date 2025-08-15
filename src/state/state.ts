// src/state/state.ts
'use client';

import { UndoHierarchical, RedoHierarchical, saveHierarchicalSnapshot } from './undoredo';
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
import { createNewElement } from '../utils/element/elementHelpers';
import { calculateElementWidth, wrapText } from '../utils/textareaHelpers';
import { ElementsMap } from '../types/elementTypes';
import { adjustElementPositionsFromHierarchy } from '../utils/layoutHelpers';
import {
  getSelectedAndChildren,
  copyToClipboard,
  cutToClipboard,
  ClipboardData,
} from '../utils/clipboard/clipboardHelpers';
import { LayoutMode } from '../types/tabTypes';

// 階層構造の型とユーティリティをインポート
import {
  HierarchicalStructure,
  HierarchicalOperationResult,
  HierarchicalNode,
} from '../types/hierarchicalTypes';
import {
  convertFlatToHierarchical,
  findElementInHierarchy,
  findNodeInHierarchy,
  getSelectedElementsFromHierarchy,
  getEditingElementsFromHierarchy,
  logElementPositionsFromHierarchy,
  getChildrenFromHierarchy,
  findParentNodeInHierarchy,
  getElementCountFromHierarchy,
  updateAllElementsInHierarchy,
  createElementsMapFromHierarchy,
} from '../utils/hierarchical/hierarchicalConverter';
import { updateHierarchyWithElementChanges } from '../utils/hierarchical/hierarchicalMaintainer';
import {
  addElementToHierarchy,
  addMultipleSiblingsToHierarchy,
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
  connectionPathType?: string;
  endConnectionPathType?: string;
  [key: string]: unknown;
}

interface DropElementPayload {
  id: string;
  targetNodeId: string | null;
  targetIndex?: number;
  direction?: DirectionType;
}

interface AddElementPayload {
  text?: string;
}

interface AddElementsSilentPayload {
  texts?: string[];
  tentative?: boolean;
  targetNodeId?: string; // 追加先の要素IDを階層構造ベースで指定
  targetPosition?: 'before' | 'after' | 'child';
  onError?: (message: string) => void; // エラーハンドリングコールバック
  onSuccess?: (addedElementIds: string[]) => void; // 成功時のコールバック
}

interface AddSiblingElementsSilentPayload {
  texts?: string[];
  tentative?: boolean;
  targetNodeId: string; // 兄弟要素として追加する基準要素のID
  position?: 'before' | 'after'; // 基準要素の前か後か（デフォルト: 'after'）
  onError?: (message: string) => void; // エラーハンドリングコールバック
  onSuccess?: (addedElementIds: string[]) => void; // 成功時のコールバック
}

type AddHierarchicalElementsPayload = {
  targetNodeId?: string;
  targetPosition?: 'before' | 'after' | 'child';
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
    typeof (payload as { id: unknown }).id === 'string'
  );
};

const isMoveElementPayload = (payload: unknown): payload is MoveElementPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    'x' in payload &&
    'y' in payload &&
    typeof (payload as { id: unknown }).id === 'string' &&
    typeof (payload as { x: unknown }).x === 'number' &&
    typeof (payload as { y: unknown }).y === 'number'
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
    typeof (payload as { id: unknown }).id === 'string' &&
    typeof (payload as { width: unknown }).width === 'number' &&
    typeof (payload as { height: unknown }).height === 'number' &&
    Array.isArray((payload as { sectionHeights: unknown }).sectionHeights)
  );
};

const isUpdateMarkerPayload = (payload: unknown): payload is UpdateMarkerPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    typeof (payload as { id: unknown }).id === 'string'
  );
};

const isDropElementPayload = (payload: unknown): payload is DropElementPayload => {
  const p = payload as Record<string, unknown>;
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'id' in payload &&
    typeof p.id === 'string' &&
    // targetNodeId は省略可能 (nullも許可)
    (('targetNodeId' in payload &&
      (typeof p.targetNodeId === 'string' || p.targetNodeId === null)) ||
      !('targetNodeId' in payload)) &&
    // targetIndex は省略可能
    (('targetIndex' in payload && typeof p.targetIndex === 'number') ||
      !('targetIndex' in payload)) &&
    // direction は省略可能なので存在チェックのみ
    (('direction' in payload && typeof p.direction === 'string') || !('direction' in payload))
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
        typeof (item as Record<string, unknown>).id === 'string',
    )
  );
};

const isAddElementPayload = (payload: unknown): payload is AddElementPayload => {
  return (
    payload === null ||
    payload === undefined ||
    (typeof payload === 'object' &&
      payload !== null &&
      (!('text' in payload) || typeof (payload as Record<string, unknown>).text === 'string'))
  );
};

const isAddElementsSilentPayload = (payload: unknown): payload is AddElementsSilentPayload => {
  return (
    payload === null ||
    payload === undefined ||
    (typeof payload === 'object' &&
      payload !== null &&
      (!('texts' in payload) || Array.isArray((payload as Record<string, unknown>).texts)) &&
      (!('tentative' in payload) ||
        typeof (payload as Record<string, unknown>).tentative === 'boolean') &&
      (!('parentId' in payload) ||
        typeof (payload as Record<string, unknown>).parentId === 'string') &&
      (!('onError' in payload) ||
        typeof (payload as Record<string, unknown>).onError === 'function'))
  );
};

const isAddSiblingElementsSilentPayload = (
  payload: unknown,
): payload is AddSiblingElementsSilentPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'targetNodeId' in payload &&
    typeof (payload as Record<string, unknown>).targetNodeId === 'string' &&
    (!('texts' in payload) || Array.isArray((payload as Record<string, unknown>).texts)) &&
    (!('tentative' in payload) ||
      typeof (payload as Record<string, unknown>).tentative === 'boolean') &&
    (!('position' in payload) ||
      ['before', 'after'].includes((payload as Record<string, unknown>).position as string)) &&
    (!('onError' in payload) ||
      typeof (payload as Record<string, unknown>).onError === 'function') &&
    (!('onSuccess' in payload) ||
      typeof (payload as Record<string, unknown>).onSuccess === 'function')
  );
};

// 階層構造から親要素を検索するヘルパー関数
const findParentElementInHierarchy = (
  hierarchicalData: HierarchicalStructure,
  childId: string,
): Element | null => {
  const parentNode = findParentNodeInHierarchy(hierarchicalData, childId);
  return parentNode ? parentNode.data : null;
};

// 共通の要素作成処理
const createElementsFromTexts = (
  state: State,
  texts: string[],
  tentative: boolean,
  baseElement: Element,
  startX: number,
  startY: number,
): { elements: Element[]; elementIds: string[] } => {
  const addedElementIds: string[] = [];
  const elements: Element[] = [];

  for (let i = 0; i < texts.length; i++) {
    const textContent = texts[i];
    const elementWidth = calculateElementWidth([textContent], TEXTAREA_PADDING.HORIZONTAL);

    const lines = wrapText(textContent || '', elementWidth, state.zoomRatio || 1).length;
    const sectionHeight = Math.max(
      SIZE.SECTION_HEIGHT * (state.zoomRatio || 1),
      lines * DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO +
        TEXTAREA_PADDING.VERTICAL * (state.zoomRatio || 1),
    );

    const totalHeight = Array(state.numberOfSections)
      .fill(sectionHeight)
      .reduce((sum, h) => sum + h, 0);

    const elementId = (Date.now() + i).toString();
    addedElementIds.push(elementId);

    const newElement: Element = {
      ...createNewElement({
        numSections: state.numberOfSections,
        direction: baseElement.direction === 'none' ? 'right' : baseElement.direction,
      }),
      id: elementId,
      x: startX,
      y: startY + i * (totalHeight + OFFSET.Y),
      width: elementWidth,
      height: totalHeight,
      sectionHeights: Array(state.numberOfSections).fill(sectionHeight),
      texts: Array(state.numberOfSections)
        .fill('')
        .map((_, index) => (index === 0 ? texts[i] : '')),
      tentative,
      editing: false,
      selected: false,
    };

    elements.push(newElement);
  }

  return { elements, elementIds: addedElementIds };
};

const isAddHierarchicalElementsPayload = (
  payload: unknown,
): payload is AddHierarchicalElementsPayload => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'hierarchicalItems' in payload &&
    Array.isArray((payload as Record<string, unknown>).hierarchicalItems) &&
    ((payload as Record<string, unknown>).hierarchicalItems as unknown[]).every(
      (item: unknown) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).text === 'string' &&
        typeof (item as Record<string, unknown>).level === 'number' &&
        typeof (item as Record<string, unknown>).originalLine === 'string',
    ) &&
    (!('parentId' in payload) ||
      typeof (payload as Record<string, unknown>).parentId === 'string') &&
    (!('onError' in payload) || typeof (payload as Record<string, unknown>).onError === 'function')
  );
};

const isPasteClipboardElementsPayload = (
  payload: unknown,
): payload is { clipboardData: unknown; targetElementId: string } => {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'clipboardData' in payload &&
    'targetElementId' in payload &&
    typeof (payload as Record<string, unknown>).targetElementId === 'string' &&
    typeof (payload as Record<string, unknown>).clipboardData === 'object'
  );
};

/**
 * 階層構造ベースのアプリケーション状態を表す型
 */
export interface State {
  /** 階層構造のルート */
  hierarchicalData: HierarchicalStructure | null;
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
      direction: 'none', // ルート要素は方向なし
      selected: true, // 初期ルート要素は選択状態にする
      editing: false, // 編集状態はfalse
    }),
    id: '1',
    x: DEFAULT_POSITION.X,
    y: DEFAULT_POSITION.Y,
    editing: false,
  };

  // 変換用にparentIdを追加したLegacyElement型として扱う
  const legacyInitialElement = {
    ...initialElement,
    parentId: null as string | null,
  };

  const initialElementsMap: ElementsMap = {
    '1': legacyInitialElement,
  };

  const hierarchicalData = convertFlatToHierarchical(initialElementsMap);

  // hierarchicalDataがnullの場合のフォールバック
  if (!hierarchicalData) {
    console.error('Failed to create initial hierarchical data');
    // フォールバック：直接階層構造を作成
    const fallbackHierarchicalData = {
      root: {
        data: initialElement,
      },
      version: '1.4.43',
    };

    return {
      hierarchicalData: fallbackHierarchicalData,
      width: typeof window !== 'undefined' ? window.innerWidth : 0,
      height: typeof window !== 'undefined' ? window.innerHeight : 0,
      zoomRatio: 1,
      numberOfSections: NUMBER_OF_SECTIONS,
    };
  }

  return {
    hierarchicalData,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    zoomRatio: 1,
    numberOfSections: NUMBER_OF_SECTIONS,
  };
};

export const initialState: State = createInitialState();

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
  };
};

/**
 * 階層構造ベースで選択された要素を取得するヘルパー関数
 */
const getSelectedElementsFromState = (state: State): Element[] => {
  return getSelectedElementsFromHierarchy(state.hierarchicalData);
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
  handler: (
    elements: ElementsMap,
    hierarchicalData: HierarchicalStructure | null,
  ) => string | undefined,
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
    const elementsMap = createElementsMapFromHierarchy(state.hierarchicalData);

    const selectedId = handler(elementsMap, state.hierarchicalData);
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

    return {
      ...state,
      hierarchicalData,
    };
  }),

  SELECT_ELEMENT: createSafeHandler(
    isSelectElementPayload,
    (state: State, payload: SelectElementPayload) => {
      const { id, ctrlKey = false, shiftKey = false } = payload;

      if (!state.hierarchicalData) return state;

      const selectedElement = findElementInHierarchy(state.hierarchicalData, id);
      // Debug: SELECT_ELEMENT action details

      if (!selectedElement) {
        debugLog(`Element with id ${id} not found`);
        return state;
      }

      // 編集中の要素がある場合は、先に編集を終了する
      const editingElements = getEditingElementsFromHierarchy(state.hierarchicalData);
      let workingState = state;

      if (editingElements.length > 0) {
        debugLog(`SELECT_ELEMENT: Ending editing for ${editingElements.length} elements`);

        // 階層構造内の全要素の編集状態を直接終了
        if (!workingState.hierarchicalData) {
          return workingState;
        }

        const updatedHierarchicalData = updateAllElementsInHierarchy(
          workingState.hierarchicalData,
          () => ({ editing: false }),
        );

        // 位置調整のために一時的にフラット形式に変換（今後リファクタ対象）
        // const updatedElementsCache = createElementsMapFromHierarchy(updatedHierarchicalData);

        // 階層構造を維持したまま位置調整を行う
        if (updatedHierarchicalData) {
          const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
            updatedHierarchicalData,
            () => state.numberOfSections,
            state.layoutMode,
            state.width || 0,
            state.height || 0,
          );

          if (adjustedHierarchicalData) {
            // 調整後の階層構造から要素マップを再構築
            const adjustedElementsCache = createElementsMapFromHierarchy(adjustedHierarchicalData);

            // 位置調整後の要素データで階層構造を更新（親子関係を維持）
            const finalHierarchicalData = updateHierarchyWithElementChanges(
              updatedHierarchicalData,
              adjustedElementsCache,
            );

            if (finalHierarchicalData) {
              workingState = {
                ...workingState,
                hierarchicalData: finalHierarchicalData,
              };
            }
          }
        }
      }

      const currentSelected = getSelectedElementsFromState(workingState);
      const firstSelected = currentSelected[0];

      // 異なるparentIdの要素が含まれる場合は何もしない
      if (
        (shiftKey || ctrlKey) &&
        currentSelected.length > 0 &&
        workingState.hierarchicalData &&
        currentSelected.some((e) => {
          const eParent = findParentNodeInHierarchy(workingState.hierarchicalData!, e.id);
          const selectedParent = findParentNodeInHierarchy(
            workingState.hierarchicalData!,
            selectedElement.id,
          );
          return eParent?.data.id !== selectedParent?.data.id;
        })
      ) {
        return workingState;
      }

      let newSelectedIds: string[] = [];

      if (shiftKey && currentSelected.length > 0) {
        const parentNode = workingState.hierarchicalData
          ? findParentNodeInHierarchy(workingState.hierarchicalData, firstSelected.id)
          : null;
        const parentId = parentNode?.data.id || null;

        // 兄弟要素を階層構造から直接取得
        const siblings = parentId
          ? getChildrenFromHierarchy(workingState.hierarchicalData, parentId)
          : workingState.hierarchicalData?.root.children?.map((child) => child.data) || [];

        // IDでソート
        siblings.sort((a, b) => a.id.localeCompare(b.id));

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

      const selectedParentNode = workingState.hierarchicalData
        ? findParentNodeInHierarchy(workingState.hierarchicalData, selectedElement.id)
        : null;
      const parentId = selectedParentNode?.data.id || null;

      // 有効な選択IDをフィルタ：階層構造から直接検証
      const validSelectedIds = newSelectedIds.filter((id) => {
        const elem = findElementInHierarchy(workingState.hierarchicalData, id);
        if (!elem) return false;
        const elemParent = workingState.hierarchicalData
          ? findParentNodeInHierarchy(workingState.hierarchicalData, elem.id)
          : null;
        return (elemParent?.data.id || null) === parentId;
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
        typeof (payload as Record<string, unknown>).id === 'string' &&
        typeof (payload as Record<string, unknown>).index === 'number' &&
        typeof (payload as Record<string, unknown>).value === 'string'
      );
    },
    (state: State, payload: { id: string; index: number; value: string }) => {
      if (!state.hierarchicalData) return state;

      const element = findElementInHierarchy(state.hierarchicalData, payload.id);
      if (!element) return state;

      const updatedElement = {
        ...element,
        texts: element.texts.map((text: string, idx: number) =>
          idx === payload.index ? payload.value : text,
        ),
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
        typeof (payload as Record<string, unknown>).id === 'string' &&
        'startMarker' in payload
      );
    },
    (state: State, payload: { id: string; startMarker: MarkerType }) => {
      if (!state.hierarchicalData) return state;

      const element = findElementInHierarchy(state.hierarchicalData, payload.id);
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
        typeof (payload as Record<string, unknown>).id === 'string' &&
        'endMarker' in payload
      );
    },
    (state: State, payload: { id: string; endMarker: MarkerType }) => {
      if (!state.hierarchicalData) return state;

      const element = findElementInHierarchy(state.hierarchicalData, payload.id);
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

      const element = findElementInHierarchy(state.hierarchicalData, id);
      if (!element) return state;

      const updatedElement = {
        ...element,
        startMarker: connectionPathType as MarkerType,
        connectionPathType: connectionPathType as MarkerType,
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

      const element = findElementInHierarchy(state.hierarchicalData, id);
      if (!element) return state;

      const updatedElement = {
        ...element,
        endMarker: endConnectionPathType as MarkerType,
        endConnectionPathType: endConnectionPathType as MarkerType,
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

    debugLog(`EDIT_ELEMENT: Result hierarchy updated`, {
      editingElements: result.hierarchicalData
        ? getEditingElementsFromHierarchy(result.hierarchicalData).map((e) => e.id)
        : [],
    });

    return createStateFromHierarchicalResult(state, result);
  }),

  END_EDITING: createNoPayloadHandler((state) => {
    if (!state.hierarchicalData) return state;

    // 階層構造内の全要素の編集状態を一括で終了
    const updatedHierarchy = updateAllElementsInHierarchy(state.hierarchicalData, (element) => ({
      ...element,
      editing: false,
    }));

    // 編集終了後にサジェスト処理を実行
    // reducer内で直接実行することで確実にトリガーされる
    setTimeout(() => {
      if (
        typeof window !== 'undefined' &&
        (window as unknown as Record<string, unknown>).__handleEndEditingSuggestion
      ) {
        debugLog('[END_EDITING] サジェスト処理を実行します');
        const suggestionHandler = (window as unknown as Record<string, unknown>)
          .__handleEndEditingSuggestion as () => Promise<void>;
        suggestionHandler().catch((error: unknown) => {
          debugLog(
            `[END_EDITING] サジェスト処理でエラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
          );
        });
      } else {
        debugLog('[END_EDITING] サジェスト処理関数が見つかりません');
      }
    }, 300); // UIの更新を待つために300ms遅延

    return {
      ...state,
      hierarchicalData: updatedHierarchy,
    };
  }),

  MOVE_ELEMENT: createSafeHandler(
    isMoveElementPayload,
    (state: State, payload: MoveElementPayload) => {
      const { id, x, y } = payload;
      const selectedElements = getSelectedElementsFromState(state);

      // 要素が存在するかチェック
      const elementToMove = findElementInHierarchy(state.hierarchicalData, id);
      if (!elementToMove || !state.hierarchicalData) {
        debugLog(`Element with id ${id} not found for move operation`);
        return state;
      }

      // 複数要素移動の場合
      if (selectedElements.length > 1 && selectedElements.some((e) => e.id === id)) {
        const deltaX = x - elementToMove.x;
        const deltaY = y - elementToMove.y;

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

        return {
          ...state,
          hierarchicalData: currentHierarchy,
        };
      }

      // 単一要素移動
      const updatedElement = { ...elementToMove, x, y };
      const result = updateElementInHierarchy(state.hierarchicalData, id, updatedElement);
      return createStateFromHierarchicalResult(state, result);
    },
  ),

  UPDATE_ELEMENT_SIZE: createSafeHandler(
    isUpdateElementSizePayload,
    (state: State, payload: UpdateElementSizePayload) => {
      const { id, width, height, sectionHeights } = payload;
      const element = findElementInHierarchy(state.hierarchicalData, id);
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

      // 位置調整を行う（階層構造ベース）
      const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
        result.hierarchicalData,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      if (!adjustedHierarchicalData) {
        debugLog(`UPDATE_ELEMENT_SIZE: 位置調整に失敗しました`);
        return createStateFromHierarchicalResult(state, result);
      }

      return {
        ...state,
        hierarchicalData: adjustedHierarchicalData,
      };
    },
  ),

  ADD_ELEMENT: createSafeHandler(
    isAddElementPayload,
    (state: State, payload: AddElementPayload) => {
      debugLog(`[ADD_ELEMENT] アクション開始 - payload:`, payload);

      const selectedElement = getSelectedElementFromState(state);
      debugLog(`[ADD_ELEMENT] 選択された要素:`, selectedElement);

      if (!selectedElement) {
        debugLog(`[ADD_ELEMENT] エラー: 選択された要素がありません`);
        return state;
      }

      if (!state.hierarchicalData) {
        debugLog(`[ADD_ELEMENT] エラー: hierarchicalDataがnullです`);
        return state;
      }

      debugLog(`[ADD_ELEMENT] 現在のhierarchicalData:`, state.hierarchicalData);

      // Undoスナップショットを保存
      saveHierarchicalSnapshot(state.hierarchicalData);

      const text = payload?.text;

      // 階層構造から総要素数を直接取得（フラット変換を避ける）
      const totalElementCount = getElementCountFromHierarchy(state.hierarchicalData);
      debugLog(`[ADD_ELEMENT] 全要素数:`, totalElementCount);

      // 階層構造から選択要素の子要素を直接取得
      const siblings = getChildrenFromHierarchy(state.hierarchicalData, selectedElement.id).filter(
        (child) => child.visible,
      );

      debugLog(`[ADD_ELEMENT] 選択要素の子要素数:`, siblings.length);

      // 新しい要素の初期座標を計算
      let initialX: number;
      let initialY: number;

      if (siblings.length > 0) {
        // 子要素がある場合：最後の子要素の下に配置
        const lastChild = siblings[siblings.length - 1];
        initialX = lastChild.x; // 最後の子要素のX座標と同じ
        initialY = lastChild.y + lastChild.height + OFFSET.Y; // 最後の子要素の下端+OFFSETに配置
        debugLog(`[ADD_ELEMENT] 既存の子要素あり - 最後の子要素の下に配置`);
      } else {
        // 子要素がない場合：親要素の右隣に配置
        initialX = selectedElement.x + selectedElement.width + OFFSET.X; // 親要素の右+OFFSETに配置
        initialY = selectedElement.y; // 親要素と同じY座標
        debugLog(`[ADD_ELEMENT] 子要素なし - 親要素の右隣に配置`);
      }

      // 新しい要素を作成
      const newElement: Element = {
        ...createNewElement({
          numSections: state.numberOfSections,
          direction: selectedElement.direction === 'none' ? 'right' : selectedElement.direction, // 親のdirectionを継承
        }),
        id: Date.now().toString(), // 簡易的なID生成
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
        debugLog(`[ADD_ELEMENT] addElementToHierarchy開始 - parentId=${selectedElement.id}`);
        result = addElementToHierarchy(state.hierarchicalData, selectedElement.id, newElement);
        debugLog(`[ADD_ELEMENT] addElementToHierarchy完了:`, result);
      } catch (error) {
        debugLog(`[ADD_ELEMENT] addElementToHierarchyでエラー:`, error);
        return state; // エラー時は元の状態を返す
      }

      // 階層構造で選択状態を更新（新しい要素のみを選択）
      debugLog(`[ADD_ELEMENT] 選択状態の更新開始 - 新要素ID: ${newElement.id}`);
      const selectionResult = setSelectionInHierarchy(result.hierarchicalData, [newElement.id]);
      debugLog(`[ADD_ELEMENT] 選択状態更新完了:`, selectionResult);

      // 階層構造から総要素数を直接取得（フラット変換を避ける）
      const updatedElementCount = getElementCountFromHierarchy(selectionResult.hierarchicalData);
      debugLog(`[ADD_ELEMENT] 選択状態更新後の全要素数:`, updatedElementCount);

      // 階層構造から直接ElementsMapを作成
      const elementsForAdjustment = createElementsMapFromHierarchy(
        selectionResult.hierarchicalData,
      );

      // デバッグログ: 選択状態更新後の新要素の座標を確認
      const newElementAfterSelection = elementsForAdjustment[newElement.id];
      if (newElementAfterSelection) {
        debugLog(
          `[ADD_ELEMENT] 選択状態更新後の新要素: X=${newElementAfterSelection.x}, Y=${newElementAfterSelection.y}, selected=${newElementAfterSelection.selected}`,
        );
      } else {
        debugLog(`[ADD_ELEMENT] エラー: 選択状態更新後に新要素が見つかりません`);
      }

      // 位置調整を行う（階層構造ベース）
      debugLog(`[ADD_ELEMENT] 位置調整開始`);
      const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
        selectionResult.hierarchicalData,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      if (!adjustedHierarchicalData) {
        debugLog(`[ADD_ELEMENT] エラー: 位置調整に失敗しました`);
        return state;
      }

      // 調整後の階層構造から要素マップを再構築
      const adjustedElementsCache = createElementsMapFromHierarchy(adjustedHierarchicalData);

      // デバッグログ: 位置調整後の新要素の座標を確認
      const newElementAfterAdjustment = adjustedElementsCache[newElement.id];
      if (newElementAfterAdjustment) {
        debugLog(
          `[ADD_ELEMENT] 位置調整後の新要素: X=${newElementAfterAdjustment.x}, Y=${newElementAfterAdjustment.y}, selected=${newElementAfterAdjustment.selected}`,
        );
      } else {
        debugLog(`[ADD_ELEMENT] エラー: 位置調整後に新要素が見つかりません`);
      }

      // デバッグログ: 位置調整後の全要素の座標を確認（階層構造ベース）
      debugLog(`[ADD_ELEMENT] 位置調整後の全要素座標:`);
      if (adjustedHierarchicalData) {
        logElementPositionsFromHierarchy(adjustedHierarchicalData, '  ');
      }

      // 階層構造内の要素の位置情報を直接更新（フラット変換を避ける）
      debugLog(`[ADD_ELEMENT] 階層構造内での位置更新開始`);

      // 階層構造ベースでの位置調整は既に適用済み
      const finalHierarchicalData = adjustedHierarchicalData;

      // デバッグログ: 最終的な階層構造内の要素座標を確認
      debugLog(`[ADD_ELEMENT] 最終的な階層構造内の要素座標:`);
      logElementPositionsFromHierarchy(finalHierarchicalData, '  ');

      debugLog(`[ADD_ELEMENT] 成功: 最終的なhierarchicalData:`, finalHierarchicalData);

      return {
        ...state,
        hierarchicalData: finalHierarchicalData,
      };
    },
  ),

  ADD_ELEMENTS_SILENT: createSafeHandler(
    isAddElementsSilentPayload,
    (state: State, payload: AddElementsSilentPayload) => {
      // 親要素を決定：payloadで指定されていればそれを使用、そうでなければ現在選択中の要素
      let targetElement: Element | undefined;

      if (payload?.targetNodeId) {
        // 指定されたIDの要素を検索
        targetElement = findElementInHierarchy(state.hierarchicalData, payload.targetNodeId);
      } else {
        // 従来の動作：現在選択されている要素を使用
        targetElement = getSelectedElementFromState(state);
      }

      if (!targetElement || !state.hierarchicalData) {
        // エラーハンドリング: 対象要素が見つからない場合
        const errorMessage = !state.hierarchicalData
          ? '階層データが存在しません。'
          : payload?.targetNodeId
            ? `指定された要素（ID: ${payload.targetNodeId}）が見つかりません。要素が削除されている可能性があります。`
            : '選択された要素がありません。要素を選択してから操作を実行してください。';

        if (payload?.onError) {
          payload.onError(errorMessage);
        }
        debugLog(
          `[ADD_ELEMENTS_SILENT] ${errorMessage} (targetNodeId: ${payload?.targetNodeId || '未指定'})`,
        );
        return state;
      }

      // この時点でtargetElementは確実に存在する
      const safeTargetElement: Element = targetElement;

      // Undoスナップショットを保存
      saveHierarchicalSnapshot(state.hierarchicalData);

      const texts = payload?.texts || [];
      const tentative = payload?.tentative || false;

      // 階層構造から親要素の既存の子要素を順序通りに取得
      const siblings = getChildrenFromHierarchy(
        state.hierarchicalData,
        safeTargetElement.id,
      ).filter((el) => el.visible);

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
      const addedElementIds: string[] = []; // 追加された要素のIDを追跡

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

        const elementId = (Date.now() + i).toString();
        addedElementIds.push(elementId); // IDを追跡リストに追加

        const newElement: Element = {
          ...createNewElement({
            numSections: state.numberOfSections,
            direction:
              safeTargetElement.direction === 'none' ? 'right' : safeTargetElement.direction, // 親のdirectionを継承
          }),
          id: elementId,
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

      // 位置調整を行い、階層構造を維持（階層構造ベース）
      const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
        currentHierarchy,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      if (!adjustedHierarchicalData) {
        debugLog(`[ADD_ELEMENTS_SILENT] 位置調整に失敗しました`);
        return state;
      }

      // 成功ログ
      debugLog(
        `[ADD_ELEMENTS_SILENT] ${texts.length}個の要素を追加しました (IDs: ${addedElementIds.join(', ')})`,
      );

      // 成功時のコールバック実行
      if (payload?.onSuccess) {
        setTimeout(() => payload.onSuccess!(addedElementIds), 0);
      }

      return {
        ...state,
        hierarchicalData: adjustedHierarchicalData,
      };
    },
  ),

  ADD_SIBLING_ELEMENTS_SILENT: createSafeHandler(
    isAddSiblingElementsSilentPayload,
    (state: State, payload: AddSiblingElementsSilentPayload) => {
      if (!state.hierarchicalData) {
        const errorMessage = '階層データが存在しません。';
        if (payload?.onError) {
          payload.onError(errorMessage);
        }
        debugLog(`[ADD_SIBLING_ELEMENTS_SILENT] ${errorMessage}`);
        return state;
      }

      // 基準要素を検索
      const targetElement = findElementInHierarchy(state.hierarchicalData, payload.targetNodeId);
      if (!targetElement) {
        const errorMessage = `指定された要素（ID: ${payload.targetNodeId}）が見つかりません。`;
        if (payload?.onError) {
          payload.onError(errorMessage);
        }
        debugLog(`[ADD_SIBLING_ELEMENTS_SILENT] ${errorMessage}`);
        return state;
      }

      // 基準要素の親要素を検索
      const parentElement = findParentElementInHierarchy(
        state.hierarchicalData,
        payload.targetNodeId,
      );
      if (!parentElement) {
        const errorMessage = `基準要素（ID: ${payload.targetNodeId}）の親要素が見つかりません。`;
        if (payload?.onError) {
          payload.onError(errorMessage);
        }
        debugLog(`[ADD_SIBLING_ELEMENTS_SILENT] ${errorMessage}`);
        return state;
      }

      // Undoスナップショットを保存
      saveHierarchicalSnapshot(state.hierarchicalData);

      const texts = payload?.texts || [];
      const tentative = payload?.tentative || false;
      const position = payload?.position || 'after';

      if (texts.length === 0) {
        debugLog('[ADD_SIBLING_ELEMENTS_SILENT] 追加するテキストがありません');
        return state;
      }

      // 兄弟要素の位置を計算
      let startX: number;
      let startY: number;

      if (position === 'after') {
        // 基準要素の後に追加
        startX = targetElement.x;
        startY = targetElement.y + targetElement.height + OFFSET.Y;
      } else {
        // 基準要素の前に追加
        startX = targetElement.x;
        startY = targetElement.y - OFFSET.Y;
      }

      // 要素を作成
      const { elements, elementIds } = createElementsFromTexts(
        state,
        texts,
        tentative,
        targetElement,
        startX,
        startY,
      );

      // 階層構造に要素を一括追加（順序を保持）
      const result = addMultipleSiblingsToHierarchy(
        state.hierarchicalData,
        payload.targetNodeId,
        elements,
        position,
      );
      const currentHierarchy = result.hierarchicalData;

      // 位置調整
      const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
        currentHierarchy,
        () => state.zoomRatio || 1,
      );

      if (!adjustedHierarchicalData) {
        debugLog(`[ADD_SIBLING_ELEMENTS_SILENT] 位置調整に失敗しました`);
        return state;
      }

      // 成功ログ
      debugLog(
        `[ADD_SIBLING_ELEMENTS_SILENT] ${texts.length}個の兄弟要素を追加しました (IDs: ${elementIds.join(', ')})`,
      );

      // 成功コールバック
      if (payload?.onSuccess) {
        payload.onSuccess(elementIds);
      }

      return {
        ...state,
        hierarchicalData: adjustedHierarchicalData,
      };
    },
  ),

  ADD_SIBLING_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElement = getSelectedElementFromState(state);
    if (!selectedElement || !state.hierarchicalData) return state;

    // Undoスナップショットを保存
    saveHierarchicalSnapshot(state.hierarchicalData);

    // 同じ階層の兄弟要素を取得
    // 選択された要素の親を取得
    const parentNode = findParentNodeInHierarchy(state.hierarchicalData, selectedElement.id);
    const parent = parentNode ? parentNode.data : null;

    // 親の子要素（選択された要素の兄弟要素）を取得
    const siblings = parent
      ? getChildrenFromHierarchy(state.hierarchicalData, parent.id).filter((el) => el.visible)
      : [];

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
      result = addElementToHierarchy(state.hierarchicalData, parent?.id || null, newElement);
    } catch {
      return state; // エラー時は元の状態を返す
    }

    // 既存の要素の選択状態を解除し、新しい要素のみを選択状態にする
    const hierarchyWithUpdatedSelection = updateAllElementsInHierarchy(
      result.hierarchicalData,
      (element) => ({
        selected: element.id === newElement.id, // 新しい要素のみを選択状態に
        editing: element.id === newElement.id, // 新しい要素を編集状態に
      }),
    );

    // 位置調整を行い、階層構造を維持（階層構造ベース）
    const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
      hierarchyWithUpdatedSelection,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    if (!adjustedHierarchicalData) {
      debugLog(`[ADD_SIBLING_ELEMENT] 位置調整に失敗しました`);
      return state;
    }

    // 階層構造から直接ElementsMapを作成
    const adjustedElementsCache = createElementsMapFromHierarchy(adjustedHierarchicalData);

    return {
      ...state,
      hierarchicalData: adjustedHierarchicalData,
      elementsCache: adjustedElementsCache,
      cacheValid: true,
    };
  }),

  DELETE_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElements = getSelectedElementsFromState(state);
    if (selectedElements.length === 0 || !state.hierarchicalData) return state;

    debugLog(`DELETE_ELEMENT開始: 削除対象要素数=${selectedElements.length}`);

    // Undoスナップショットを保存
    saveHierarchicalSnapshot(state.hierarchicalData);

    // 削除後に選択する要素の候補を探す
    const firstElement = selectedElements[0];
    const firstParentNode = state.hierarchicalData
      ? findParentNodeInHierarchy(state.hierarchicalData, firstElement.id)
      : null;

    // 兄弟要素を階層構造から直接取得
    const siblings = firstParentNode
      ? getChildrenFromHierarchy(state.hierarchicalData, firstParentNode.data.id)
          .filter((sibling) => !sibling.selected) // 選択されていない兄弟のみ
          .sort((a, b) => a.id.localeCompare(b.id)) // IDでソート
      : [];

    // 兄弟要素があればそれを選択、なければ親要素を選択
    const nextSelectedId = siblings[0]?.id || firstParentNode?.data.id;

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

    // 位置調整を行い、階層構造を維持（階層構造ベース）
    const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
      currentHierarchy,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    if (!adjustedHierarchicalData) {
      debugLog(`DELETE_ELEMENT: 位置調整に失敗しました`);
      return state;
    }

    // 階層構造から直接ElementsMapを作成
    const adjustedElementsCache = createElementsMapFromHierarchy(adjustedHierarchicalData);

    return {
      ...state,
      hierarchicalData: adjustedHierarchicalData,
      elementsCache: adjustedElementsCache,
      cacheValid: true,
    };
  }),

  CONFIRM_TENTATIVE_ELEMENTS: createSafeHandler(
    (payload: unknown): payload is string => typeof payload === 'string',
    (state, parentId) => {
      if (!state.hierarchicalData) return state;

      // 階層構造を直接更新してtentativeフラグを変更
      function updateTentativeInNode(node: HierarchicalNode): HierarchicalNode {
        const updatedNode = { ...node };

        // 現在のノードの親をチェック
        const nodeParent = findParentNodeInHierarchy(state.hierarchicalData!, node.data.id);
        const nodeParentId = nodeParent?.data.id || null;

        // tentativeかつ指定されたparentIdを持つ要素のフラグを更新
        if (node.data.tentative && nodeParentId === parentId) {
          updatedNode.data = { ...node.data, tentative: false };
        }

        // 子ノードも再帰的に処理
        if (node.children && node.children.length > 0) {
          updatedNode.children = node.children.map(updateTentativeInNode);
        }

        return updatedNode;
      }

      const updatedHierarchicalData = {
        ...state.hierarchicalData,
        root: updateTentativeInNode(state.hierarchicalData.root),
      };

      // 階層構造から直接ElementsMapを作成
      const updatedElementsCache = createElementsMapFromHierarchy(updatedHierarchicalData);

      return {
        ...state,
        hierarchicalData: updatedHierarchicalData,
        elementsCache: updatedElementsCache,
        cacheValid: true,
      };
    },
  ),

  CANCEL_TENTATIVE_ELEMENTS: createSafeHandler(
    (payload: unknown): payload is string => typeof payload === 'string',
    (state: State, parentId: string) => {
      if (!state.hierarchicalData) return state;

      // 階層構造を直接更新してtentative要素を削除
      function removeTentativeFromNode(node: HierarchicalNode): HierarchicalNode | null {
        const nodeParent = findParentNodeInHierarchy(state.hierarchicalData!, node.data.id);
        const nodeParentId = nodeParent?.data.id || null;

        // tentativeかつ指定されたparentIdを持つ要素は削除
        if (node.data.tentative && nodeParentId === parentId) {
          return null; // このノードを削除
        }

        const updatedNode = { ...node };

        // 子ノードも再帰的に処理（nullでないものだけ残す）
        if (node.children && node.children.length > 0) {
          const filteredChildren = node.children
            .map(removeTentativeFromNode)
            .filter((child: HierarchicalNode | null) => child !== null) as HierarchicalNode[];

          if (filteredChildren.length > 0) {
            updatedNode.children = filteredChildren;
          } else {
            delete updatedNode.children; // 子がいなくなった場合
          }
        }

        return updatedNode;
      }

      const updatedRoot = removeTentativeFromNode(state.hierarchicalData.root);
      if (!updatedRoot) {
        // ルートが削除された場合は、状態をそのまま返す
        return state;
      }

      const updatedHierarchicalData = {
        ...state.hierarchicalData,
        root: updatedRoot,
      };

      // 位置調整を行い、階層構造を維持（階層構造ベース）
      const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
        updatedHierarchicalData,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      if (!adjustedHierarchicalData) {
        debugLog(`CANCEL_TENTATIVE_ELEMENTS: 位置調整に失敗しました`);
        return state;
      }

      // 階層構造から直接ElementsMapを作成
      const adjustedElementsCache = createElementsMapFromHierarchy(adjustedHierarchicalData);

      return {
        ...state,
        hierarchicalData: adjustedHierarchicalData,
        elementsCache: adjustedElementsCache,
        cacheValid: true,
      };
    },
  ),

  UNDO: createNoPayloadHandler((state) => {
    const undoHierarchicalData = UndoHierarchical(state.hierarchicalData);
    if (!undoHierarchicalData) return state;

    return {
      ...state,
      hierarchicalData: undoHierarchicalData,
    };
  }),

  REDO: createNoPayloadHandler((state) => {
    const redoHierarchicalData = RedoHierarchical(state.hierarchicalData);
    if (!redoHierarchicalData) return state;

    return {
      ...state,
      hierarchicalData: redoHierarchicalData,
    };
  }),

  SNAPSHOT: createNoPayloadHandler((state) => {
    if (state.hierarchicalData) {
      saveHierarchicalSnapshot(state.hierarchicalData);
    }
    return state;
  }),

  DROP_ELEMENT: createSafeHandler(
    isDropElementPayload,
    (state: State, payload: DropElementPayload) => {
      const { id, targetNodeId, targetIndex, direction } = payload;

      // 基本的な妥当性チェック
      const elementToDrop = findElementInHierarchy(state.hierarchicalData, id);
      if (!elementToDrop || !state.hierarchicalData) {
        debugLog(`Element with id ${id} not found for drop operation`);
        return state;
      }

      if (targetIndex !== undefined && targetIndex < 0) {
        debugLog(`Invalid drop values: targetIndex=${targetIndex}`);
        return state;
      }

      // 循環参照チェック（簡易版）
      if (id === targetNodeId) {
        debugLog(`Invalid drop operation: circular reference detected`);
        return state;
      }

      const result = moveElementInHierarchy(
        state.hierarchicalData,
        id,
        targetNodeId,
        targetIndex || 0,
      );

      // direction の更新を適用
      if (direction !== undefined) {
        const targetNode = findNodeInHierarchy(result.hierarchicalData, id);
        if (targetNode) {
          targetNode.data = {
            ...targetNode.data,
            direction,
          };
          debugLog(`Element ${id} direction updated to: ${direction}`);
        }
      }

      // 位置調整を行う（階層構造ベース）
      const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
        result.hierarchicalData,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      if (!adjustedHierarchicalData) {
        debugLog(`DROP_ELEMENT: 位置調整に失敗しました`);
        return createStateFromHierarchicalResult(state, result);
      }

      // 階層構造から直接ElementsMapを作成
      const adjustedElements = createElementsMapFromHierarchy(adjustedHierarchicalData);

      // 位置調整後の要素データで階層構造を更新（親子関係を維持）
      return {
        ...state,
        hierarchicalData: adjustedHierarchicalData,
        elementsCache: adjustedElements,
        cacheValid: true,
      };
    },
  ),

  CUT_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElements = getSelectedElementsFromState(state);
    if (selectedElements.length === 0 || !state.hierarchicalData) return state;

    let currentHierarchy = state.hierarchicalData;
    const clipboardDataList: ClipboardData[] = [];

    selectedElements.forEach((selectedElement) => {
      // 選択された要素とその子要素を階層構造のサブツリーとして取得
      const clipboardData = getSelectedAndChildren(state.hierarchicalData, selectedElement);

      if (clipboardData) {
        clipboardDataList.push({ ...clipboardData, type: 'cut' });
      }

      // 階層構造から削除
      const result = deleteElementFromHierarchy(currentHierarchy, selectedElement.id);
      currentHierarchy = result.hierarchicalData;
    });

    // 最初の要素をクリップボードに保存（複数選択時は最初の要素のみ）
    if (clipboardDataList.length > 0) {
      cutToClipboard(clipboardDataList[0]).catch((error) => {
        console.error('Failed to cut elements to clipboard:', error);
      });
    }

    return {
      ...state,
      hierarchicalData: currentHierarchy,
    };
  }),

  COPY_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElement = getSelectedElementFromState(state);
    if (!selectedElement) {
      return state;
    }

    // 階層構造から直接、選択された要素とその子要素をクリップボードデータとして取得
    const clipboardData = getSelectedAndChildren(state.hierarchicalData, selectedElement);

    if (clipboardData) {
      // 非同期でクリップボードに保存（エラーハンドリング付き）
      copyToClipboard(clipboardData).catch((error) => {
        console.error('Failed to copy elements to clipboard:', error);
      });
    }

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

    // 位置調整を行う（階層構造ベース）
    const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
      result.hierarchicalData,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    if (!adjustedHierarchicalData) {
      debugLog(`EXPAND_ELEMENT: 位置調整に失敗しました`);
      return createStateFromHierarchicalResult(state, result);
    }

    // 階層構造から直接ElementsMapを作成
    const adjustedElements = createElementsMapFromHierarchy(adjustedHierarchicalData);

    return {
      ...state,
      hierarchicalData: adjustedHierarchicalData,
      elementsCache: adjustedElements,
      cacheValid: true,
    };
  }),

  COLLAPSE_ELEMENT: createNoPayloadHandler((state) => {
    const selectedElement = getSelectedElementFromState(state);
    if (!selectedElement || !state.hierarchicalData) return state;

    // 可視性を設定
    const result = setVisibilityInHierarchy(state.hierarchicalData, selectedElement.id, false);

    // 位置調整を行う（階層構造ベース）
    const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
      result.hierarchicalData,
      () => state.numberOfSections,
      state.layoutMode,
      state.width || 0,
      state.height || 0,
    );

    if (!adjustedHierarchicalData) {
      debugLog(`COLLAPSE_ELEMENT: 位置調整に失敗しました`);
      return createStateFromHierarchicalResult(state, result);
    }

    // 階層構造から直接ElementsMapを作成
    const adjustedElements = createElementsMapFromHierarchy(adjustedHierarchicalData);

    return {
      ...state,
      hierarchicalData: adjustedHierarchicalData,
      elementsCache: adjustedElements,
      cacheValid: true,
    };
  }),

  // 新たに追加されたアクションハンドラー
  ADD_HIERARCHICAL_ELEMENTS: createSafeHandler(
    isAddHierarchicalElementsPayload,
    (state: State, payload: AddHierarchicalElementsPayload) => {
      if (!state.hierarchicalData) return state;

      // Undoスナップショットを保存
      saveHierarchicalSnapshot(state.hierarchicalData);

      const { targetNodeId, hierarchicalItems } = payload;

      // 親要素を決定：payloadで指定されていればそれを使用、そうでなければ現在選択中の要素
      let baseParentElement: Element | undefined;

      if (targetNodeId) {
        baseParentElement = findElementInHierarchy(state.hierarchicalData, targetNodeId);
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

      // 位置調整を行い、階層構造を維持（階層構造ベース）
      const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
        currentHierarchy,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      if (!adjustedHierarchicalData) {
        debugLog(`ADD_HIERARCHICAL_ELEMENTS: 位置調整に失敗しました`);
        return state;
      }

      // 階層構造から直接ElementsMapを作成
      const adjustedElementsCache = createElementsMapFromHierarchy(adjustedHierarchicalData);

      debugLog(`[ADD_HIERARCHICAL_ELEMENTS] ${hierarchicalItems.length}個の階層要素を追加しました`);

      return {
        ...state,
        hierarchicalData: adjustedHierarchicalData,
        elementsCache: adjustedElementsCache,
        cacheValid: true,
      };
    },
  ),

  PASTE_CLIPBOARD_ELEMENTS: createSafeHandler(isPasteClipboardElementsPayload, (state, payload) => {
    const { clipboardData, targetElementId } = payload;
    if (!state.hierarchicalData || !clipboardData) return state;

    const selectedElement = findElementInHierarchy(state.hierarchicalData, targetElementId);
    if (!selectedElement) return state;

    try {
      // 階層構造のサブツリーを新しいIDで複製
      const cloneNodeWithNewIds = (sourceNode: HierarchicalNode): HierarchicalNode => {
        const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const clonedElement = {
          ...sourceNode.data,
          id: newId,
          selected: false,
          editing: false,
          x: selectedElement.x + 20,
          y: selectedElement.y + 20,
        };

        return {
          data: clonedElement,
          children: sourceNode.children
            ? sourceNode.children.map((child: HierarchicalNode) => cloneNodeWithNewIds(child))
            : undefined,
        };
      };

      const clonedSubtree = cloneNodeWithNewIds((clipboardData as ClipboardData).subtree);

      // 階層構造に追加
      const result = addElementToHierarchy(
        state.hierarchicalData,
        targetElementId,
        clonedSubtree.data,
      );

      if (!result.hierarchicalData) {
        return state;
      }

      let currentHierarchy = result.hierarchicalData;

      // 子要素を再帰的に追加
      const addSubtreeToHierarchy = (parentId: string, node: HierarchicalNode) => {
        if (node.children) {
          node.children.forEach((childNode: HierarchicalNode) => {
            const childResult = addElementToHierarchy(currentHierarchy, parentId, childNode.data);

            if (childResult.hierarchicalData) {
              currentHierarchy = childResult.hierarchicalData;
              addSubtreeToHierarchy(childNode.data.id, childNode);
            }
          });
        }
      };

      addSubtreeToHierarchy(clonedSubtree.data.id, clonedSubtree);

      // 貼り付け後に位置を自動調整
      const adjustedHierarchicalData = adjustElementPositionsFromHierarchy(
        currentHierarchy,
        () => state.numberOfSections,
        state.layoutMode,
        state.width || 0,
        state.height || 0,
      );

      if (!adjustedHierarchicalData) {
        // 位置調整に失敗した場合は調整前の状態を返す
        return {
          ...state,
          hierarchicalData: currentHierarchy,
        };
      }

      // 階層構造から直接ElementsMapを作成
      const adjustedElementsCache = createElementsMapFromHierarchy(adjustedHierarchicalData);

      return {
        ...state,
        hierarchicalData: adjustedHierarchicalData,
        elementsCache: adjustedElementsCache,
        cacheValid: true,
      };
    } catch (error) {
      console.error('PASTE_CLIPBOARD_ELEMENTS: Error occurred:', error);
      return state;
    }
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

    // hierarchicalData が存在することを確認
    if (newState.hierarchicalData === undefined) {
      debugLog(`Invalid hierarchical structure in state for action ${action.type}`);
      return state;
    }

    return newState;
  } catch (error) {
    debugLog(`Error handling action ${action.type}:`, error);
    return state;
  }
};
