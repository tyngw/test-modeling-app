// src/components/Marker.tsx
import React from 'react';
import { ARROW } from '../constants/ElementSettings';

export function Marker() {
    return (
        <marker id="arrowhead" markerWidth="10" markerHeight={ARROW.HEIGHT} refX={ARROW.WIDTH} refY={ARROW.HEIGHT / 2} orient="auto" fill="none" stroke="black">
            <polygon 
                points={`${ARROW.WIDTH} 0, ${ARROW.WIDTH} ${ARROW.HEIGHT}, 0 ${ARROW.HEIGHT / 2}`} 
                fill="none" 
                stroke="black" 
            />
        </marker>
    );
}
