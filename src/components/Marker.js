// src/components/Marker.js
import React from 'react';

export function Marker() {
    return (
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" fill="none" stroke="black">
            <polygon points="0 0, 10 3.5, 0 7" fill="none" stroke="black" />
        </marker>
    );
}
