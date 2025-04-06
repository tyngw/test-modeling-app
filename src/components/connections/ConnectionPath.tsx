import React from 'react';
import { Element as CanvasElement } from '../../types/types';
import { 
  CONNECTION_PATH_STYLE, 
  CURVE_CONTROL_OFFSET, 
  MARKER, 
  EQUILATERAL_MARKER 
} from '../../constants/elementSettings';
import { getMarkerUrlByType } from '../../constants/markerConfigs';

interface ConnectionPathProps {
  parentElement: CanvasElement;
  element: CanvasElement;
  absolutePositions: {
    parent: { x: number; y: number };
    element: { x: number; y: number };
  };
  strokeColor?: string;
  strokeWidth?: number;
}

export const ConnectionPath: React.FC<ConnectionPathProps> = ({
  parentElement,
  element,
  absolutePositions,
  strokeColor = CONNECTION_PATH_STYLE.COLOR,
  strokeWidth = CONNECTION_PATH_STYLE.STROKE
}) => {
  let startOffset = 0;
  switch (parentElement.startMarker) {
    case 'arrow':
    case 'filled_arrow':
      startOffset = MARKER.OFFSET;
      break;
    case 'circle':
    case 'filled_circle':
    case 'square':
    case 'filled_square':
      startOffset = EQUILATERAL_MARKER.OFFSET;
      break;
    case 'diamond':
    case 'filled_diamond':
      startOffset = MARKER.OFFSET;
      break;
    default:
      startOffset = 0;
  }

  let endOffset = 0;
  switch (element.endMarker) {
    case 'arrow':
    case 'filled_arrow':
      endOffset = MARKER.OFFSET;
      break;
    case 'circle':
    case 'filled_circle':
    case 'square':
    case 'filled_square':
      endOffset = EQUILATERAL_MARKER.OFFSET;
      break;
    case 'diamond':
    case 'filled_diamond':
      endOffset = MARKER.OFFSET;
      break;
    default:
      endOffset = 0;
  }

  const parentPos = absolutePositions.parent;
  const elementPos = absolutePositions.element;
  const totalHeight = element.height;

  const pathCommands = [
    `M ${parentPos.x + parentElement.width + startOffset},${parentPos.y + parentElement.height / 2}`,
    `C ${parentPos.x + parentElement.width + CURVE_CONTROL_OFFSET},${parentPos.y + parentElement.height / 2}`,
    `${elementPos.x - CURVE_CONTROL_OFFSET},${elementPos.y + totalHeight / 2}`,
    `${elementPos.x - endOffset},${elementPos.y + totalHeight / 2}`
  ].join(' ');

  const markerStart = getMarkerUrlByType(parentElement.startMarker);
  const markerEnd = getMarkerUrlByType(element.endMarker, true);

  return (
    <path
      d={pathCommands}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      fill="none"
      markerStart={markerStart}
      markerEnd={markerEnd}
      style={{ pointerEvents: 'none' }}
    />
  );
};