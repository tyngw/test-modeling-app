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
    | { type: 'REDO' };