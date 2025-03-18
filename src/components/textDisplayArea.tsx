// src/components/textDisplayArea.tsx
'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { SIZE, DEFAULT_FONT_SIZE, LINE_HEIGHT_RATIO, TEXTAREA_PADDING } from '../constants/elementSettings';
import { wrapText } from '../utils/textareaHelpers';

interface TextDisplayAreaProps {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  zoomRatio: number;
  fontSize: number;
  onHeightChange: (newHeight: number) => void;
}

const TextDisplayArea: React.FC<TextDisplayAreaProps> = memo(({
  x,
  y,
  width: initialWidth,
  height: initialHeight,
  text,
  zoomRatio,
  onHeightChange
}) => {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0
  });
  const [isMounted, setIsMounted] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const prevDimensions = useRef({ width: 0, height: 0 });
  const prevText = useRef(text);

  useEffect(() => {
    setIsMounted(true);
    let animationFrame: number;

    const updateDimensions = () => {
      if (!textRef.current) return;

      const currentWidth = initialWidth;
      const currentHeight = initialHeight;

      const wrappedLines = wrapText(text || '', currentWidth, zoomRatio);

      const lineHeightValue = DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO * zoomRatio;
      const minHeight = Math.max(
        SIZE.SECTION_HEIGHT * zoomRatio,
        (lineHeightValue + TEXTAREA_PADDING.VERTICAL) * zoomRatio
      );
      const contentHeight = wrappedLines.length * lineHeightValue;
      const totalHeight = Math.max(contentHeight, minHeight) + TEXTAREA_PADDING.VERTICAL * zoomRatio;

      const widthChanged = Math.abs(currentWidth - prevDimensions.current.width) > 1;
      const heightChanged = Math.abs(totalHeight - prevDimensions.current.height) > 1;

      if (widthChanged || heightChanged) {
        setDimensions({
          width: currentWidth,
          height: totalHeight
        });

        onHeightChange(totalHeight / zoomRatio);

        prevDimensions.current = {
          width: currentWidth,
          height: totalHeight
        };
      }
    };

    if (isMounted && (text !== prevText.current || initialWidth !== prevDimensions.current.width || initialHeight !== prevDimensions.current.height)) {
      animationFrame = requestAnimationFrame(updateDimensions);
      prevText.current = text;
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [text, initialWidth, initialHeight, zoomRatio, onHeightChange, isMounted]);

  if (!isMounted) return null;

  return (
    <foreignObject
      x={x}
      y={y}
      width={dimensions.width}
      height={dimensions.height / zoomRatio}
      pointerEvents="none"
    >
      <div
        ref={textRef}
        className='text-display-area'
        style={{
          fontSize: `${DEFAULT_FONT_SIZE}px`,
          lineHeight: LINE_HEIGHT_RATIO,
          fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
          width: `${dimensions.width - TEXTAREA_PADDING.HORIZONTAL}px`,
          minHeight: `${SIZE.SECTION_HEIGHT}px`,
          padding: `${TEXTAREA_PADDING.VERTICAL * 0.5}px ${TEXTAREA_PADDING.HORIZONTAL * 0.5}px`,
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          boxSizing: 'content-box',
        }}
      >
        {text}
      </div>
    </foreignObject>
  );
});

export default TextDisplayArea;