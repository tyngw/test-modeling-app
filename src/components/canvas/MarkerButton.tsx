import React from 'react';
import { Element as CanvasElement } from '../../types/types';
import { MARKER } from '../../config/elementSettings';
import { useCanvas } from '../../context/CanvasContext';
import { findParentNodeInHierarchy } from '../../utils/hierarchical/hierarchicalConverter';

interface MarkerButtonProps {
  element: CanvasElement;
  absolutePosition: { x: number; y: number };
  isEndMarker?: boolean;
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onShowMenu: (id: string) => void;
  _isInGroup?: boolean;
}

export const MarkerButton: React.FC<MarkerButtonProps> = ({
  element,
  absolutePosition,
  isEndMarker = false,
  hoverId,
  onHover,
  onShowMenu,
  _isInGroup = false,
}) => {
  const { state } = useCanvas();

  // ボタン表示条件のチェック
  if (isEndMarker) {
    // 終点マーカーの場合：親要素が存在するかチェック
    const hasParent =
      state.hierarchicalData &&
      findParentNodeInHierarchy(state.hierarchicalData, element.id) !== null;
    if (!hasParent) return null;
  } else {
    // 始点マーカーの場合：子要素があるかチェック
    // 注意: この条件チェックは外部でおこなう必要があるため、
    // このコンポーネントを使用する側で条件チェックを行ってください
  }

  const totalHeight = element.height;
  const buttonId = isEndMarker ? `end-${element.id}` : element.id;

  // direction:leftの場合、マーカーの位置が逆になる
  // - startMarker: 要素の左側（direction:leftの場合）または右側（通常）
  // - endMarker: 要素の右側（direction:leftの場合）または左側（通常）
  const isLeftDirection = element.direction === 'left';

  let buttonX: number;
  if (isEndMarker) {
    // 終点マーカーの場合
    buttonX = isLeftDirection
      ? absolutePosition.x + element.width + MARKER.WIDTH / 2 // direction:leftでは右側
      : absolutePosition.x - MARKER.WIDTH / 2; // 通常は左側
  } else {
    // 始点マーカーの場合
    buttonX = isLeftDirection
      ? absolutePosition.x - MARKER.WIDTH / 2 // direction:leftでは左側
      : absolutePosition.x + element.width + MARKER.WIDTH / 2; // 通常は右側
  }

  return (
    <g
      key={`marker-button-${buttonId}`}
      data-marker-button={`${buttonId}`}
      data-exclude-from-export="true"
      pointerEvents="all"
    >
      {hoverId === buttonId && (
        <circle
          cx={buttonX}
          cy={absolutePosition.y + totalHeight / 2}
          r={MARKER.WIDTH / 2}
          fill="#bfbfbf"
          opacity={0.5}
          pointerEvents="none"
        />
      )}
      <circle
        cx={buttonX}
        cy={absolutePosition.y + totalHeight / 2}
        r={MARKER.WIDTH / 2}
        fill="transparent"
        stroke="transparent"
        strokeWidth={2}
        onMouseEnter={() => onHover(buttonId)}
        onMouseLeave={() => onHover(null)}
        onClick={() => onShowMenu(buttonId)}
        style={{ cursor: 'pointer' }}
        pointerEvents="all"
      />
    </g>
  );
};
