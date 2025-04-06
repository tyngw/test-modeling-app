import React from 'react';
import { Element as CanvasElement } from '../../types/types';
import { MARKER } from '../../constants/elementSettings';

interface MarkerButtonProps {
  element: CanvasElement;
  absolutePosition: { x: number; y: number };
  isEndMarker?: boolean;
  hoverId: string | null;
  onHover: (id: string | null) => void;
  onShowMenu: (id: string) => void;
  isInGroup?: boolean;
}

export const MarkerButton: React.FC<MarkerButtonProps> = ({
  element,
  absolutePosition,
  isEndMarker = false,
  hoverId,
  onHover,
  onShowMenu,
  isInGroup = false
}) => {
  // ボタン表示条件のチェック
  if (isEndMarker) {
    // 終点マーカーの場合：親要素が存在するかチェック
    if (!element.parentId) return null;
  } else {
    // 始点マーカーの場合：子要素があるかチェック
    // 注意: この条件チェックは外部でおこなう必要があるため、
    // このコンポーネントを使用する側で条件チェックを行ってください
  }
  
  const totalHeight = element.height;
  const buttonId = isEndMarker ? `end-${element.id}` : element.id;
  
  // ボタン位置の計算（終点マーカーは左側、始点マーカーは右側）
  const buttonX = isEndMarker 
    ? absolutePosition.x - MARKER.WIDTH / 2
    : absolutePosition.x + element.width + MARKER.WIDTH / 2;
  
  return (
    <g 
      key={`marker-button-${buttonId}`}
      data-marker-button={`${buttonId}`}
      pointerEvents="all"
    >
      {(hoverId === buttonId) && (
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