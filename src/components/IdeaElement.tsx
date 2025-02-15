// src/components/IdeaElement.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { useCanvas } from '../context/CanvasContext';
import TextSection from './TextDisplayArea';
import { calculateElementWidth } from '../utils/TextareaHelpers';
import {
  CURVE_CONTROL_OFFSET,
  ARROW_OFFSET,
  DEFAULT_FONT_SIZE,
  Y_OFFSET,
  X_OFFSET
} from '../constants/ElementSettings';
import { Element as CanvasElement } from '../types';

const SECTION_KEYS = ['text', 'text2', 'text3'] as const;

interface IdeaElementProps {
  element: CanvasElement;
  currentDropTarget: CanvasElement | null;
  dropPosition: 'before' | 'after' | 'child' | null;
  draggingElement: CanvasElement | null;
  handleMouseDown: (e: React.MouseEvent<SVGElement>, element: CanvasElement) => void;
  handleMouseUp: () => void;
}

const IdeaElement: React.FC<IdeaElementProps> = ({
  element,
  currentDropTarget,
  dropPosition,
  draggingElement,
  handleMouseDown,
  handleMouseUp
}) => {
  const { state, dispatch } = useCanvas();
  const parentElement = state.elements[element.parentId!];
  const currentDropTargetId = currentDropTarget?.id || -1;
  const [isHovered, setIsHovered] = useState(false);

  const sectionHeights = [
    element.section1Height,
    element.section2Height,
    element.section3Height
  ];

  const handleHeightChange = useCallback((sectionIndex: number, newHeight: number) => {
    const sectionKey = `section${sectionIndex + 1}Height`;
    const currentHeight = element[sectionKey as keyof CanvasElement] as number;

    if (currentHeight !== null && Math.abs(newHeight - currentHeight) > 1) {
      const newSectionHeights = [...sectionHeights];
      newSectionHeights[sectionIndex] = newHeight;

      const texts = [element.text, element.text2, element.text3];
      const newWidth = calculateElementWidth(texts);

      dispatch({
        type: 'UPDATE_NODE_SIZE',
        payload: {
          id: element.id,
          width: newWidth,
          height: element.height + (newHeight - currentHeight),
          sectionHeights: newSectionHeights
        }
      });
    }
  }, [dispatch, element, sectionHeights]);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_NODE', payload: element.id });
  };

  const renderConnectionPath = useCallback(() => {
    if (!parentElement) return null;
    const totalHeight = element.height;
    const pathCommands = [
      `M ${element.x},${element.y + totalHeight / 2}`,
      `C ${element.x - CURVE_CONTROL_OFFSET},${element.y + totalHeight / 2}`,
      `${parentElement.x + parentElement.width + CURVE_CONTROL_OFFSET},${parentElement.y + parentElement.height / 2}`,
      `${parentElement.x + parentElement.width + ARROW_OFFSET},${parentElement.y + parentElement.height / 2}`
    ].join(' ');
    return (
      <path
        d={pathCommands}
        stroke="black"
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
      />
    );
  }, [parentElement, element]);

  const isDebugMode = localStorage.getItem('__debugMode__') === 'true';

  return (
    <React.Fragment key={element.id}>
      {renderConnectionPath()}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        className={`element ${element.selected ? 'element-selected' : 'element-unselected'}`}
        rx="2"
        onClick={handleSelect}
        onDoubleClick={() => dispatch({ type: 'EDIT_NODE' })}
        onMouseDown={(e) => handleMouseDown(e, element)}
        onMouseUp={handleMouseUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          fill: (element.id === currentDropTargetId && dropPosition === 'child')
            ? "rgba(100, 100, 255, 0.3)"
            : 'white',
          pointerEvents: 'all',
          cursor: isHovered ? 'pointer' : 'default'
        }}
      />
      {currentDropTarget?.id === element.id && draggingElement && (
        <rect
          className='drop-preview'
          x={parentElement
            ? parentElement.x + parentElement.width + X_OFFSET
            : element.x + element.width}
          y={dropPosition === 'before'
            ? element.y - draggingElement.height - Y_OFFSET
            : element.y + element.height + Y_OFFSET}
          width={draggingElement.width}
          height={draggingElement.height}
          fill="rgba(100, 100, 255, 0.3)"
          rx="2"
          stroke="rgba(0, 0, 255, 0.5)"
          strokeWidth="1"
        />
      )}
      {SECTION_KEYS.map((key, index) => (
        <React.Fragment key={`${element.id}-section-${index}`}>
          <TextSection
            x={element.x}
            y={element.y + sectionHeights.slice(0, index).reduce((sum, h) => sum + h, 0)}
            width={element.width}
            height={sectionHeights[index]}
            text={element[key]}
            fontSize={DEFAULT_FONT_SIZE}
            zoomRatio={state.zoomRatio}
            onHeightChange={(newHeight) => handleHeightChange(index, newHeight)}
          />

          {index < SECTION_KEYS.length - 1 && (
            <line
              x1={element.x}
              y1={element.y + sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)}
              x2={element.x + element.width}
              y2={element.y + sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)}
              stroke="black"
              strokeWidth="1"
            />
          )}
        </React.Fragment>
      ))}
      {isDebugMode && isHovered && (
        <foreignObject
          x={element.x + element.width + 10}
          y={element.y - 10}
          width="340"
          height="130"
          style={{ backgroundColor: 'white', border: '1px solid black', padding: '5px', zIndex: 1000, borderRadius: '5px' }}
        >
          <div style={{ fontSize: '12px', color: 'black' }}>
            <div>id: {element.id}</div>
            <div>parentID: {element.parentId}</div>
            <div>order: {element.order}</div>
            <div>depth: {element.depth}</div>
            <div>children: {element.children}</div>
            <div>editing: {element.editing ? 'true' : 'false'}</div>
            <div>selected: {element.selected ? 'true' : 'false'}</div>
            <div>visible: {element.visible ? 'true' : 'false'}</div>
          </div>
        </foreignObject>
      )}
    </React.Fragment>
  );
};

export default React.memo(IdeaElement);