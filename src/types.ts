// src/types.ts
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
  connectionPathType: 'arrow' | 'circle' | 'square' | 'diamond' | 'none' | 'filled_arrow' | 'filled_circle' | 'filled_square' | 'filled_diamond';
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
  | { type: 'UPDATE_CONNECTION_PATH_TYPE'; payload: { id: string; connectionPathType: 'arrow' | 'circle' | 'square' | 'diamond' | 'none' | 'filled_arrow' | 'filled_circle' | 'filled_square' | 'filled_diamond' } }