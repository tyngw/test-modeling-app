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
  const [dimensions, setDimensions] = useState({
    width: width,
    height: height
  });
  const textRef = useRef<HTMLDivElement>(null);
  const prevDimensions = useRef({ width, height });
  const prevText = useRef(text);

  useEffect(() => {
    let animationFrame: number;
    
    const updateDimensions = () => {
      if (!textRef.current) return;

      // 最新の親要素サイズを即時反映
      const currentParentWidth = width;
      const currentParentHeight = height;

      // テキスト折り返し計算（最新の幅を使用）
      const wrappedLines = wrapText(text || '', currentParentWidth, zoomRatio);
      
      // 高さ計算
      const lineHeightValue = DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO * zoomRatio;
      const minHeight = Math.max(
        SIZE.SECTION_HEIGHT * zoomRatio,
        (lineHeightValue + TEXTAREA_PADDING.VERTICAL) * zoomRatio
      );

      const contentHeight = wrappedLines.length * lineHeightValue;
      const totalHeight = Math.max(contentHeight, minHeight) + TEXTAREA_PADDING.VERTICAL * zoomRatio;

      // 幅と高さの変更を検出
      const widthChanged = Math.abs(currentParentWidth - prevDimensions.current.width) > 1;
      const heightChanged = Math.abs(totalHeight - prevDimensions.current.height) > 1;

      if (widthChanged || heightChanged) {
        setDimensions({
          width: currentParentWidth,
          height: totalHeight
        });
        
        // 親要素に高さ変更を通知
        onHeightChange(totalHeight / zoomRatio);
        
        // 前回値を更新
        prevDimensions.current = {
          width: currentParentWidth,
          height: totalHeight
        };
      }
    };

    // 依存関係を追加（width, height, text）
    if (text !== prevText.current || width !== prevDimensions.current.width || height !== prevDimensions.current.height) {
      animationFrame = requestAnimationFrame(updateDimensions);
      prevText.current = text;
    }

    return () => cancelAnimationFrame(animationFrame);
  }, [text, width, height, zoomRatio, onHeightChange]);

  return (
    <foreignObject 
      x={x} 
      y={y} 
      width={dimensions.width}  // 動的幅を適用
      height={dimensions.height} // 動的高さを適用
      pointerEvents="none"
    >
      <div
        ref={textRef}
        style={{
          fontSize: `${DEFAULT_FONT_SIZE}px`,
          lineHeight: `${LINE_HEIGHT_RATIO}em`,
          fontFamily: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`,
          width: `${dimensions.width - TEXTAREA_PADDING.HORIZONTAL}px`, // 動的幅からパディングを差し引く
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