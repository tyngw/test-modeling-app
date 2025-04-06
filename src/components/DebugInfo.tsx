// src/components/DebugInfo.tsx
import React from 'react';
import { Element as CanvasElement, DropPosition } from '../types/types';
import { isDevelopment } from '../utils/debugLogHelpers';

interface DebugInfoProps { 
  element: CanvasElement; 
  isHovered: boolean;
  currentDropTarget: CanvasElement | null;
  dropPosition: DropPosition;
  isDraggedOrDescendant?: boolean;
  siblingInfo?: { prevElement?: CanvasElement, nextElement?: CanvasElement } | null;
}

const DebugInfo: React.FC<DebugInfoProps> = ({
  element,
  isHovered,
  currentDropTarget,
  dropPosition,
  isDraggedOrDescendant,
  siblingInfo
}) => {
  if (!isDevelopment || !isHovered) {
    return null;
  }

  // ドラッグ対象の場合は表示位置を右にずらす
  const xOffset = isDraggedOrDescendant ? element.width + 350 : element.width + 10;

  return (
    <foreignObject
      x={element.x + xOffset}
      y={element.y - 10}
      width="340"
      height="400"
      className="debug-info"
    >
      <div style={{
        fontSize: '12px',
        color: 'black',
        backgroundColor: 'white',
        border: '1px solid black',
        padding: '5px',
        borderRadius: '5px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
      }}>
        <div>id: {element.id}</div>
        <div>parentID: {element.parentId}</div>
        <div>order: {element.order}</div>
        <div>depth: {element.depth}</div>
        <div>children: {element.children}</div>
        <div>start marker: {element.startMarker}</div>
        <div>end marker: {element.endMarker}</div>
        <div>editing: {element.editing ? 'true' : 'false'}</div>
        <div>selected: {element.selected ? 'true' : 'false'}</div>
        <div>visible: {element.visible ? 'true' : 'false'}</div>
        <div>x: {element.x}</div>
        <div>y: {element.y}</div>
        <div>width: {element.width}</div>
        <div>height: {element.height}</div>
        <div>currentDropTarget: {currentDropTarget ? (currentDropTarget.texts[0] || 'empty') : 'null'}</div>
        <div>dropPosition: {dropPosition || 'null'}</div>
        <div>siblingInfo: {
          siblingInfo ? 
            `prev=${siblingInfo.prevElement ? (siblingInfo.prevElement.texts[0] || 'empty') : 'null'}, 
             next=${siblingInfo.nextElement ? (siblingInfo.nextElement.texts[0] || 'empty') : 'null'}` : 
            'null'
        }</div>
      </div>
    </foreignObject>
  );
};

export default DebugInfo;