// src/components/Marker.tsx
import React from 'react';
import { POLYGON_HEIGHT } from '../constants/MarkerSetting';

export function Marker() {
    return (
        <marker id="arrowhead" markerWidth="10" markerHeight={POLYGON_HEIGHT} refX="0" refY={POLYGON_HEIGHT / 2} orient="auto" fill="none" stroke="black">
            <polygon 
                points={`0 0, 10 ${POLYGON_HEIGHT / 2}, 0 ${POLYGON_HEIGHT}`} 
                fill="none" 
                stroke="black" 
            />
        </marker>
    );
}
