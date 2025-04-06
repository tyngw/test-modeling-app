// src/types.ts
export type MarkerType = 'arrow' | 'filled_arrow' | 'circle' | 'filled_circle' | 'square' | 'filled_square' | 'diamond' | 'filled_diamond' | 'none';

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

export interface Element {
  id: string;
  texts: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  sectionHeights: number[];
  parentId: string | null;
  order: number;
  depth: number;
  children: number;
  editing: boolean;
  selected: boolean;
  visible: boolean;
  tentative: boolean;
  startMarker: MarkerType;
  endMarker: MarkerType;
  connectionPathType?: ConnectionPathType; // 後方互換性のために追加
  endConnectionPathType?: ConnectionPathType; // 後方互換性のために追加
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
  | { type: 'UPDATE_NODE_SIZE'; payload: { 
      id: string; 
      width: number; 
      height: number; 
      sectionHeights: number[] 
    }}
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'UPDATE_START_MARKER'; payload: { id: string; startMarker: MarkerType } }
  | { type: 'UPDATE_END_MARKER'; payload: { id: string; endMarker: MarkerType } }