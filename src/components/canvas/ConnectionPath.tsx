import React from 'react';
import { Element as CanvasElement } from '../../types/types';
import {
  CONNECTION_PATH_STYLE,
  CURVE_CONTROL_OFFSET,
  MARKER,
  EQUILATERAL_MARKER,
} from '../../config/elementSettings';
import { getMarkerUrlByType } from '../../config/markerConfigs';
import { useCanvas } from '../../context/CanvasContext';

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
  strokeWidth = CONNECTION_PATH_STYLE.STROKE,
}) => {
  const { state } = useCanvas();
  const isMindmapMode = state.layoutMode === 'mindmap';
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

  // 要素の方向に応じてパスを計算
  const direction = element.direction || 'right';

  // マインドマップモードでは接続線を要素の下端に接続、通常モードでは中央に接続
  const parentConnectionY = isMindmapMode
    ? parentPos.y + parentElement.height // 下端
    : parentPos.y + parentElement.height / 2; // 中央

  const elementConnectionY = isMindmapMode
    ? elementPos.y + totalHeight // 下端
    : elementPos.y + totalHeight / 2; // 中央

  let pathCommands = '';

  // マインドマップモードでルート要素（direction: none）の場合の特別処理
  if (parentElement.direction === 'none') {
    // 子要素の方向に応じて接続パスを計算
    if (direction === 'left') {
      pathCommands = [
        `M ${parentPos.x - startOffset},${parentConnectionY}`,
        `C ${parentPos.x - CURVE_CONTROL_OFFSET},${parentConnectionY}`,
        `${elementPos.x + element.width + CURVE_CONTROL_OFFSET},${elementConnectionY}`,
        `${elementPos.x + element.width + endOffset},${elementConnectionY}`,
      ].join(' ');
    } else {
      pathCommands = [
        `M ${parentPos.x + parentElement.width + startOffset},${parentConnectionY}`,
        `C ${parentPos.x + parentElement.width + CURVE_CONTROL_OFFSET},${parentConnectionY}`,
        `${elementPos.x - CURVE_CONTROL_OFFSET},${elementConnectionY}`,
        `${elementPos.x - endOffset},${elementConnectionY}`,
      ].join(' ');
    }
  } else if (direction === 'left') {
    // 左方向の場合
    // direction:leftの場合、親要素のstartMarkerは左端に配置されるため、
    // startOffsetを引く（右向きマーカーなので）
    pathCommands = [
      `M ${parentPos.x - startOffset},${parentConnectionY}`,
      `C ${parentPos.x - CURVE_CONTROL_OFFSET},${parentConnectionY}`,
      `${elementPos.x + element.width + CURVE_CONTROL_OFFSET},${elementConnectionY}`,
      `${elementPos.x + element.width + endOffset},${elementConnectionY}`,
    ].join(' ');
  } else {
    // 右方向の場合（デフォルト）
    pathCommands = [
      `M ${parentPos.x + parentElement.width + startOffset},${parentConnectionY}`,
      `C ${parentPos.x + parentElement.width + CURVE_CONTROL_OFFSET},${parentConnectionY}`,
      `${elementPos.x - CURVE_CONTROL_OFFSET},${elementConnectionY}`,
      `${elementPos.x - endOffset},${elementConnectionY}`,
    ].join(' ');
  }

  // SVGマーカーのorient="auto"により、パスの方向に応じて自動的に回転する
  // startMarkerは常に親要素から出ていく方向（-end付き不要）
  // endMarkerは常に子要素に入っていく方向（-end付き使用）
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
