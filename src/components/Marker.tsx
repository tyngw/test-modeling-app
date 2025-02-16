// src/components/Marker.tsx
import React from 'react';
import { 
    ARROW_HEIGHT,
    ARROW_WIDTH
 } from '../constants/MarkerSetting';

export function Marker() {
    return (
        <marker id="arrowhead" markerWidth="10" markerHeight={ARROW_HEIGHT} refX={ARROW_WIDTH} refY={ARROW_HEIGHT / 2} orient="auto" fill="none" stroke="black">
            <polygon 
                points={`${ARROW_WIDTH} 0, ${ARROW_WIDTH} ${ARROW_HEIGHT}, 0 ${ARROW_HEIGHT / 2}`} 
                fill="none" 
                stroke="black" 
            />
        </marker>
    );
}
