// src/components/TextDisplayArea.tsx
import React, { memo, useEffect, useRef, useState } from 'react';
import { DEFAULT_SECTION_HEIGHT, DEFAULT_FONT_SIZE, LINE_HEIGHT_RATIO } from '../constants/ElementSettings';
import { wrapText } from '../utils/TextareaHelpers';

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

      // ズーム率を渡すように修正
      const wrappedLines = wrapText(text || '', width, zoomRatio);
      const lineHeightValue = DEFAULT_FONT_SIZE * zoomRatio * LINE_HEIGHT_RATIO;

      // 最小高さにズーム率を反映
      const newHeight = Math.max(
        wrappedLines.length * lineHeightValue,
        DEFAULT_SECTION_HEIGHT * zoomRatio
      );

      if (Math.abs(newHeight - currentHeight) > 1) {
        setCurrentHeight(newHeight);
        onHeightChange(newHeight / zoomRatio);
      }
    };

    // リサイズ時の処理を最適化
    if (text !== prevText.current || width !== prevWidth.current) {
      animationFrame = requestAnimationFrame(updateHeight);
      prevText.current = text;
      prevWidth.current = width;
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [text, width, zoomRatio, currentHeight, onHeightChange]);

  return (
    <foreignObject x={x} y={y} width={width} height={currentHeight} pointerEvents="none">
      <div
        ref={textRef}
        style={{
          fontSize: `${DEFAULT_FONT_SIZE}px`,
          lineHeight: `${LINE_HEIGHT_RATIO}em`,
          fontFamily: `
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            "Helvetica Neue",
            Arial,
            sans-serif
          `,
          width: `${width}px`,
          minHeight: `${DEFAULT_SECTION_HEIGHT}px`,
          padding: '2px 3px',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
      >
        {text}
      </div>
    </foreignObject>
  );
});

export default TextDisplayArea;