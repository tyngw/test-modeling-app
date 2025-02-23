// src/components/textDisplayArea.tsx
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
  width,
  height,
  text,
  zoomRatio,
  onHeightChange
}) => {
  const [currentHeight, setCurrentHeight] = useState(height);
  const textRef = useRef<HTMLDivElement>(null);
  const prevText = useRef(text);
  const prevWidth = useRef(width);

  useEffect(() => {
    let animationFrame: number;
    const updateHeight = () => {
      if (!textRef.current) return;
      
      // 改行計算
      const wrappedLines = wrapText(text || '', width, zoomRatio);
      console.log('wrappedLines: ', wrappedLines)
      
      // ライン高計算
      const lineHeightValue = DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO * zoomRatio;
      
      const minHeight = Math.max(
        SIZE.SECTION_HEIGHT * zoomRatio,
        (lineHeightValue + TEXTAREA_PADDING.VERTICAL) * zoomRatio
      );

      const contentHeight = wrappedLines.length * lineHeightValue;
      const totalHeight = Math.max(contentHeight, minHeight) + TEXTAREA_PADDING.VERTICAL * zoomRatio;

      if (Math.abs(totalHeight - currentHeight) > 1) {
        setCurrentHeight(totalHeight);
        onHeightChange(totalHeight / zoomRatio);
      }
    };

    if (text !== prevText.current || width !== prevWidth.current) {
      animationFrame = requestAnimationFrame(updateHeight);
      prevText.current = text;
      prevWidth.current = width;
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [text, width, zoomRatio, currentHeight, onHeightChange]);

  return (
    <foreignObject 
      x={x} 
      y={y} 
      width={width} 
      height={currentHeight} 
      pointerEvents="none"
    >
      <div
        ref={textRef}
        style={{
          fontSize: `${DEFAULT_FONT_SIZE}px`,
          lineHeight: `${LINE_HEIGHT_RATIO}em`,
          fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
          width: `${width - TEXTAREA_PADDING.HORIZONTAL}px`,
          minHeight: `${SIZE.SECTION_HEIGHT}px`,
          padding: `${TEXTAREA_PADDING.VERTICAL / 2}px ${TEXTAREA_PADDING.HORIZONTAL / 2}px`,
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
