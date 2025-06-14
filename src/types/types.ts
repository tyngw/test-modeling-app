// src/types.ts
export type MarkerType =
  | 'arrow'
  | 'filled_arrow'
  | 'circle'
  | 'filled_circle'
  | 'square'
  | 'filled_square'
  | 'diamond'
  | 'filled_diamond'
  | 'none';

export type ConnectionPathType = MarkerType;

export type DropPosition = 'child' | 'sibling' | 'between' | null;

export type MarkerConfig = {
  id: string;
  width: number;
  height: number;
  isFilled: boolean;
  shape: 'polygon' | 'circle' | 'rect';
  pointsOrAttributes: string | Record<string, number | string>;
};

export type MarkerConfigMap = Record<string, MarkerConfig>;

/**
 * 要素の方向タイプ
 */
export type DirectionType = 'right' | 'left' | 'none';

/**
 * モデリング要素のインターフェース
 */
export interface Element {
  /** 要素の一意識別子 */
  id: string;
  /** 各セクションのテキスト内容 */
  texts: string[];
  /** X座標位置 */
  x: number;
  /** Y座標位置 */
  y: number;
  /** 要素の幅 */
  width: number;
  /** 要素の高さ */
  height: number;
  /** 各セクションの高さ */
  sectionHeights: number[];
  /** 親要素のID (ルート要素の場合はnull) */
  parentId: string | null;
  /** 同階層内での表示順序 */
  order: number;
  /** 階層の深さ (ルートは1) */
  depth: number;
  /** 子要素の数 */
  children: number;
  /** 編集モード中かどうか */
  editing: boolean;
  /** 選択されているかどうか */
  selected: boolean;
  /** 表示されているかどうか (折りたたみ状態で非表示の場合はfalse) */
  visible: boolean;
  /** 仮置き状態かどうか (AI提案などの未確定要素) */
  tentative: boolean;
  /** 開始位置のマーカータイプ */
  startMarker: MarkerType;
  /** 終了位置のマーカータイプ */
  endMarker: MarkerType;
  /** 接続パスタイプ (後方互換性のために追加) */
  connectionPathType?: ConnectionPathType;
  /** 終端接続パスタイプ (後方互換性のために追加) */
  endConnectionPathType?: ConnectionPathType;
  /** 要素の方向 (右、左、なし) */
  direction: DirectionType;
}

export interface CanvasState {
  elements: Record<string, Element>;
  width: number;
  height: number;
  zoomRatio: number;
  cutNodes?: Record<string, Element>;
}

export type CanvasAction =
  | { type: 'LOAD_NODES'; payload: Record<string, Element> }
  | { type: 'SELECT_NODE'; payload: string }
  | {
      type: 'UPDATE_NODE_SIZE';
      payload: {
        id: string;
        width: number;
        height: number;
        sectionHeights: number[];
      };
    }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'UPDATE_START_MARKER'; payload: { id: string; startMarker: MarkerType } }
  | { type: 'UPDATE_END_MARKER'; payload: { id: string; endMarker: MarkerType } };
