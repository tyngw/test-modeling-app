import React, { useState } from 'react';
import { MarkerType } from '../../types/types';

interface MarkerMenuProps {
  popupX: number;
  popupY: number;
  isEndMarkerMenu: boolean;
  elementId: string;
  onMarkerSelect: (elementId: string, markerType: MarkerType, isEndMarker: boolean) => void;
  onClose: () => void;
}

export const MarkerMenu: React.FC<MarkerMenuProps> = ({
  popupX,
  popupY,
  isEndMarkerMenu,
  elementId,
  onMarkerSelect,
  onClose
}) => {
  const [hover, setHover] = useState<string | null>(null);

  const markerOptions = [
    { id: 'arrow', label: 'Arrow' },
    { id: 'filled_arrow', label: 'Filled Arrow' },
    { id: 'circle', label: 'Circle' },
    { id: 'filled_circle', label: 'Filled Circle' },
    { id: 'square', label: 'Square' },
    { id: 'filled_square', label: 'Filled Square' },
    { id: 'diamond', label: 'Diamond' },
    { id: 'filled_diamond', label: 'Filled Diamond' },
    { id: 'none', label: 'None' },
  ];

  return (
    <foreignObject
      x={popupX}
      y={popupY}
      width={150}
      height={270}
      className="popup-menu"
    >
      <div style={{
        backgroundColor: 'white',
        border: '2px solid black',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        padding: '8px'
      }}>
        {markerOptions.map(option => (
          <div
            key={option.id}
            style={{
              padding: '4px 0',
              cursor: 'pointer',
              backgroundColor: hover === option.id ? '#e0e0e0' : 'white'
            }}
            onMouseEnter={() => setHover(option.id)}
            onMouseLeave={() => setHover(null)}
            onClick={() => {
              onMarkerSelect(elementId, option.id as MarkerType, isEndMarkerMenu);
              onClose();
            }}
          >
            {option.label}
          </div>
        ))}
      </div>
    </foreignObject>
  );
};