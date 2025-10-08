import React from 'react';
import { MARKER_CONFIGS } from '../../config/markerConfigs';

interface MarkerElementsProps {
  connectionPathColor: string;
  connectionPathStroke: number;
}

export const MarkerElements: React.FC<MarkerElementsProps> = ({
  connectionPathColor,
  connectionPathStroke,
}) => {
  return (
    <>
      {Object.values(MARKER_CONFIGS).map((config) => {
        const { id, width, height, isFilled, shape, pointsOrAttributes } = config;
        const fillColor = isFilled ? connectionPathColor : 'none';

        // direction:leftの場合、orient="auto-start-reverse"を使用する必要があるが、
        // SVGマーカーは個別のパスに対してorientを設定できないため、
        // マーカー定義レベルでは常に"auto"を使用し、
        // パス側でマーカーの選択を制御する
        const markerProps = {
          id,
          markerWidth: width,
          markerHeight: height,
          refX: id.endsWith('-end') ? 0 : width,
          refY: height / 2,
          orient: 'auto',
          markerUnits: 'userSpaceOnUse',
          viewBox: `0 0 ${width} ${height}`,
          strokeWidth: connectionPathStroke,
          fill: fillColor,
          stroke: connectionPathColor,
        };

        let shapeElement;
        if (shape === 'polygon') {
          shapeElement = (
            <polygon
              points={pointsOrAttributes as string}
              fill={fillColor}
              stroke={connectionPathColor}
            />
          );
        } else if (shape === 'circle') {
          const attrs = pointsOrAttributes as Record<string, number>;
          shapeElement = (
            <circle
              cx={attrs.cx}
              cy={attrs.cy}
              r={attrs.r}
              fill={fillColor}
              stroke={connectionPathColor}
            />
          );
        } else if (shape === 'rect') {
          const attrs = pointsOrAttributes as Record<string, number>;
          shapeElement = (
            <rect
              x={attrs.x}
              y={attrs.y}
              width={attrs.width}
              height={attrs.height}
              fill={fillColor}
              stroke={connectionPathColor}
            />
          );
        }

        return (
          <marker key={id} {...markerProps}>
            {shapeElement}
          </marker>
        );
      })}
    </>
  );
};
