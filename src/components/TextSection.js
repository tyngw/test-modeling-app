// components/TextSection.js
import React from 'react';
import { MIN_SECTION_HEIGHT } from '../constants/Node';

const TextSection = ({
    x,
    y,
    width,
    height,
    text,
    zoomRatio,
    selectNode,
    handleDoubleClick,
    handleMouseDown,
    handleMouseUp,
    divRef
}) => (
        <foreignObject
            x={x}
            y={y}
            width={width}
            height={height}
        >
            <div
                ref={divRef}
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                    fontSize: `${Math.log2(zoomRatio + 50) * 2.4}px`,
                    maxWidth: `${width}px`,
                    minHeight: `${MIN_SECTION_HEIGHT}px`,
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    verticalAlign: 'middle',
                    display: 'flex',
                    pointerEvents: 'all',
                }}
                onClick={selectNode}
                onDoubleClick={handleDoubleClick}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            >
                {text}
            </div>
        </foreignObject>
    );
export default TextSection;