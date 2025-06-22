// src/types/actionTypes.ts
import { Element, MarkerType, ConnectionPathType } from './types';

/**
 * アプリケーションの状態を変更するためのアクション型定義
 * すべてのアクションタイプとそのペイロードを厳密に型付け
 */

/** 要素の選択関連のアクション */
export type SelectElementAction = {
  type: 'SELECT_ELEMENT';
  payload: string | { id: string; ctrlKey?: boolean; shiftKey?: boolean };
};

/** 要素の選択解除アクション */
export type DeselectAllAction = {
  type: 'DESELECT_ALL';
};

/** テキスト更新アクション */
export type UpdateTextAction = {
  type: 'UPDATE_TEXT';
  payload: { id: string; index: number; value: string };
};

/** マーカー更新アクション */
export type UpdateMarkerAction =
  | { type: 'UPDATE_START_MARKER'; payload: { id: string; startMarker: MarkerType } }
  | { type: 'UPDATE_END_MARKER'; payload: { id: string; endMarker: MarkerType } }
  // 後方互換性のために残すアクション
  | {
      type: 'UPDATE_CONNECTION_PATH_TYPE';
      payload: { id: string; connectionPathType: ConnectionPathType };
    }
  | {
      type: 'UPDATE_END_CONNECTION_PATH_TYPE';
      payload: { id: string; endConnectionPathType: ConnectionPathType };
    };

/** 編集状態のアクション */
export type EditingAction = { type: 'EDIT_ELEMENT' } | { type: 'END_EDITING' };

/** 要素のサイズ更新アクション */
export type SizeUpdateAction = {
  type: 'UPDATE_ELEMENT_SIZE';
  payload: { id: string; width: number; height: number; sectionHeights: number[] };
};

/** 要素の移動アクション */
export type MoveElementAction = {
  type: 'MOVE_ELEMENT';
  payload: { id: string; x: number; y: number };
};

/** 要素の追加アクション */
export type AddElementAction =
  | { type: 'ADD_ELEMENT'; payload?: { text?: string } }
  | { type: 'ADD_SIBLING_ELEMENT' }
  | {
      type: 'ADD_ELEMENTS_SILENT';
      payload: {
        parentId?: string;
        texts: string[];
        tentative: boolean;
        onError?: (message: string) => void;
      };
    };

/** 要素の削除アクション */
export type DeleteElementAction = { type: 'DELETE_ELEMENT' };

/** 仮置き要素の確認・キャンセルアクション */
export type TentativeElementsAction =
  | { type: 'CONFIRM_TENTATIVE_ELEMENTS'; payload: string } // parentId
  | { type: 'CANCEL_TENTATIVE_ELEMENTS'; payload: string }; // parentId

/** 要素の折りたたみアクション */
export type CollapseExpandAction = { type: 'COLLAPSE_ELEMENT' } | { type: 'EXPAND_ELEMENT' };

/** クリップボード関連アクション */
export type ClipboardAction =
  | { type: 'CUT_ELEMENT' }
  | { type: 'COPY_ELEMENT' }
  | { type: 'PASTE_ELEMENT' };

/** 要素のドロップアクション */
export type DropElementAction = {
  type: 'DROP_ELEMENT';
  payload: {
    id: string;
    newParentId: string | null;
    newOrder: number;
    direction?: 'left' | 'right' | 'none';
  };
};

/** 矢印キー操作アクション */
export type ArrowAction =
  | { type: 'ARROW_UP' }
  | { type: 'ARROW_DOWN' }
  | { type: 'ARROW_LEFT' }
  | { type: 'ARROW_RIGHT' };

/** ズームアクション */
export type ZoomAction = { type: 'ZOOM_IN' } | { type: 'ZOOM_OUT' };

/** 履歴操作アクション */
export type HistoryAction = { type: 'UNDO' } | { type: 'REDO' } | { type: 'SNAPSHOT' };

/** 要素の読み込みアクション */
export type LoadElementsAction = {
  type: 'LOAD_ELEMENTS';
  payload: Record<string, Element> | Element[];
};

/**
 * アプリケーション全体のアクション型
 * 上記で定義した個別のアクション型を統合
 */
export type Action =
  | SelectElementAction
  | DeselectAllAction
  | UpdateTextAction
  | UpdateMarkerAction
  | EditingAction
  | SizeUpdateAction
  | MoveElementAction
  | AddElementAction
  | DeleteElementAction
  | TentativeElementsAction
  | CollapseExpandAction
  | ClipboardAction
  | DropElementAction
  | ArrowAction
  | ZoomAction
  | HistoryAction
  | LoadElementsAction;
