// src/components/DebugInfo.tsx
import React from 'react';
import { Element as CanvasElement, DropPosition } from '../types/types';
import { isDevelopment } from '../utils/debugLogHelpers';

interface DebugInfoProps {
  element: CanvasElement;
  isHovered: boolean;
  currentDropTarget?: CanvasElement | null;
  dropPosition?: DropPosition;
  isDraggedOrDescendant?: boolean;
  siblingInfo?: { prevElement?: CanvasElement; nextElement?: CanvasElement } | null;
}

const DebugInfo: React.FC<DebugInfoProps> = ({
  element,
  isHovered,
  currentDropTarget,
  dropPosition,
  isDraggedOrDescendant,
  siblingInfo,
}) => {
  if (!isDevelopment || !isHovered) {
    return null;
  }

  return (
    <foreignObject
      x={element.x + element.width + 10}
      y={element.y - 10}
      width="360"
      height="420"
      className="debug-info"
      data-exclude-from-export="true"
    >
      <div
        style={{
          fontSize: '11px',
          color: 'black',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          padding: '5px',
          borderRadius: '4px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 5px 0' }}>id: {element.id}</h3>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr>
              <td>position</td>
              <td>:</td>
              <td>
                x: {element.x}, y: {element.y}
              </td>
            </tr>
            <tr>
              <td>size</td>
              <td>:</td>
              <td>
                width: {element.width}, height: {element.height}
              </td>
            </tr>
            <tr>
              <td>texts</td>
              <td>:</td>
              <td>
                {element.texts.map((text, idx) => (
                  <div key={idx}>
                    {idx}: {text ? `"${text}"` : '(empty)'}
                  </div>
                ))}
              </td>
            </tr>
            <tr>
              <td>sectionHeights</td>
              <td>:</td>
              <td>
                {element.sectionHeights.map((height, idx) => (
                  <div key={idx}>
                    {idx}: {height}
                  </div>
                ))}
              </td>
            </tr>
            <tr>
              <td>parent</td>
              <td>:</td>
              <td>{element.parentId || 'root'}</td>
            </tr>
            <tr>
              <td>depth</td>
              <td>:</td>
              <td>{element.depth}</td>
            </tr>
            <tr>
              <td>order</td>
              <td>:</td>
              <td>{element.order}</td>
            </tr>
            <tr>
              <td>children</td>
              <td>:</td>
              <td>{element.children}</td>
            </tr>
            <tr>
              <td>direction</td>
              <td>:</td>
              <td>{element.direction || 'none'}</td>
            </tr>
            <tr>
              <td>startMarker</td>
              <td>:</td>
              <td>{element.startMarker}</td>
            </tr>
            <tr>
              <td>endMarker</td>
              <td>:</td>
              <td>{element.endMarker}</td>
            </tr>
            <tr>
              <td>selected</td>
              <td>:</td>
              <td>{element.selected ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td>visible</td>
              <td>:</td>
              <td>{element.visible ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td>editing</td>
              <td>:</td>
              <td>{element.editing ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td>tentative</td>
              <td>:</td>
              <td>{element.tentative ? 'Yes' : 'No'}</td>
            </tr>
            {currentDropTarget && currentDropTarget.id === element.id && (
              <tr>
                <td colSpan={3} style={{ color: 'blue' }}>
                  DROP TARGET ({dropPosition})
                </td>
              </tr>
            )}
            {isDraggedOrDescendant && (
              <tr>
                <td colSpan={3} style={{ color: 'red' }}>
                  BEING DRAGGED
                </td>
              </tr>
            )}
            {siblingInfo && (
              <>
                <tr>
                  <td colSpan={3} style={{ fontWeight: 'bold' }}>
                    sibling info:
                  </td>
                </tr>
                {siblingInfo.prevElement && (
                  <tr>
                    <td>prev</td>
                    <td>:</td>
                    <td>
                      {siblingInfo.prevElement.id} (order: {siblingInfo.prevElement.order})
                    </td>
                  </tr>
                )}
                {siblingInfo.nextElement && (
                  <tr>
                    <td>next</td>
                    <td>:</td>
                    <td>
                      {siblingInfo.nextElement.id} (order: {siblingInfo.nextElement.order})
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </foreignObject>
  );
};

export default DebugInfo;
