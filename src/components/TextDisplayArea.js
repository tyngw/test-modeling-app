// components/TextDisplayArea.js
import React, { memo } from 'react';
import { DEFAULT_SECTION_HEIGHT, DEFAULT_FONT_SIZE } from '../constants/Node';

const TextDisplayArea = memo(({
  x,
  y,
  width,
  height,
  text,
  zoomRatio,
  divRef,
  selectNode,
  handleDoubleClick,
  handleMouseDown,
  handleMouseUp
}) => (
  <foreignObject x={x} y={y} width={width} height={height}>
    <div
      ref={divRef}
      style={{
        fontSize: `${DEFAULT_FONT_SIZE * Math.sqrt(zoomRatio)}px`,
        maxWidth: `${width}px`,
        minHeight: `${DEFAULT_SECTION_HEIGHT}px`,
        padding: '2px 3px',
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
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
));

export default TextDisplayArea;