import { Element as CanvasElement, DropPosition } from '../types/types';
import { OFFSET } from '../config/elementSettings';

interface DropCoordinates {
  x: number;
  y: number;
}

interface CalculateDropCoordinatesParams {
  elements: Record<string, CanvasElement>;
  currentDropTarget: CanvasElement;
  draggingElement: CanvasElement;
  dropPosition: DropPosition;
  dropInsertY: number | undefined | null;
  siblingInfo: {
    prevElement?: CanvasElement;
    nextElement?: CanvasElement;
  } | null;
}

/**
 * ドロップ位置の座標を計算するユーティリティ関数
 */
export const calculateDropCoordinates = ({
  elements,
  currentDropTarget,
  draggingElement,
  dropPosition,
  dropInsertY,
  siblingInfo
}: CalculateDropCoordinatesParams): DropCoordinates | null => {
  let x, y;
  
  if (dropPosition === 'child') {
    // 子要素として追加する場合
    x = currentDropTarget.x + currentDropTarget.width + OFFSET.X;
    
    // Y座標の計算
    y = dropInsertY 
      ? dropInsertY - draggingElement.height / 2 
      : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
  } else if (dropPosition === 'between' || dropPosition === 'sibling') {
    // 兄弟要素として追加する場合（between/sibling）
    const parentElement = currentDropTarget.parentId ? elements[currentDropTarget.parentId] : null;
    
    if (parentElement) {
      // 親要素がある場合は、親要素の右側に配置
      x = parentElement.x + parentElement.width + OFFSET.X;
      
      // siblingInfo情報に基づいてY座標を決定
      if (siblingInfo) {
        const { prevElement, nextElement } = siblingInfo;
        
        if (nextElement && !prevElement) {
          // 先頭要素の前にドロップする場合
          y = nextElement.y - draggingElement.height;
        } else if (prevElement && !nextElement) {
          // 末尾要素の後にドロップする場合
          y = prevElement.y + prevElement.height;
        } else if (prevElement && nextElement) {
          // 要素間にドロップする場合
          y = dropInsertY 
            ? dropInsertY - draggingElement.height / 2 
            : (prevElement.y + prevElement.height + nextElement.y) / 2 - draggingElement.height / 2;
        } else {
          // siblingInfoはあるが、prevもnextも無い場合（通常は発生しない）
          y = dropInsertY 
            ? dropInsertY - draggingElement.height / 2 
            : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
        }
      } else {
        // siblingInfo情報がない場合は既存の計算方法を使用
        y = dropInsertY 
          ? dropInsertY - draggingElement.height / 2 
          : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
      }
    } else {
      // 親要素がない場合（ルート要素として配置）
      x = OFFSET.X;
      y = dropInsertY 
        ? dropInsertY - draggingElement.height / 2 
        : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
    }
  } else {
    return null;
  }

  return { x, y };
};