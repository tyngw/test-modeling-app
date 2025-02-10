// src/types.ts
export interface Node {
    id: string;
    text: string;
    text2: string;
    text3: string;
    x: number;
    y: number;
    width: number;
    height: number;
    section1Height: number;
    section2Height: number;
    section3Height: number;
    parentId: string | null;
    order: number;
    depth: number;
    children: number;
    editing: boolean;
    selected: boolean;
    visible: boolean;
  }
  
  export interface CanvasState {
    elements: Record<string, Node>;
    width: number;
    height: number;
    zoomRatio: number;
    cutNodes?: Record<string, Node>;
  }
  
  export type CanvasAction = 
    | { type: 'LOAD_NODES'; payload: Record<string, Node> }
    | { type: 'SELECT_NODE'; payload: string }
    | { type: 'UPDATE_NODE_SIZE'; payload: { 
        id: string; 
        width: number; 
        height: number; 
        sectionHeights: number[] 
      }}
    | { type: 'UNDO' }
    | { type: 'REDO' };