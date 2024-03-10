// TextSection.js
import React from 'react';

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
                fontSize: `${zoomRatio * 12}px`,
                maxWidth: `${width}px`,
                minHeight: `20px`,
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                pointerEvents: 'none',
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