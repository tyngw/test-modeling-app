// src/components/textDisplayArea.tsx
'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import {
  SIZE,
  DEFAULT_FONT_SIZE,
  LINE_HEIGHT_RATIO,
  TEXTAREA_PADDING,
  DEFAULT_FONT_FAMILY,
  DEFAULT_TEXT_COLOR,
} from '../config/elementSettings';
import { wrapText } from '../utils/textareaHelpers';
import { debugLog } from '../utils/debugLogHelpers';
import { getTextColor } from '../utils/storage/localStorageHelpers';
import { sanitizeText } from '../utils/security/sanitization';

interface TextDisplayAreaProps {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  zoomRatio: number;
  fontSize: number;
  fontFamily?: string;
  onHeightChange: (newHeight: number) => void;
}

const TextDisplayArea: React.FC<TextDisplayAreaProps> = memo(
  ({
    x,
    y,
    width: initialWidth,
    height: initialHeight,
    text,
    zoomRatio,
    fontFamily,
    onHeightChange,
  }) => {
    const [dimensions, setDimensions] = useState({
      width: 0,
      height: 0,
    });
    const [isMounted, setIsMounted] = useState(false);
    const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
    const textRef = useRef<HTMLDivElement>(null);
    const prevDimensions = useRef({ width: 0, height: 0 });
    const prevText = useRef(text);
    const handleHeightChangeRef = useRef(onHeightChange);
    handleHeightChangeRef.current = onHeightChange;

    // テキストの色を設定
    useEffect(() => {
      if (typeof window !== 'undefined') {
        setTextColor(getTextColor());
      }
    }, []);

    useEffect(() => {
      setIsMounted(true);
      let animationFrame: number;

      const updateDimensions = () => {
        if (!textRef.current) return;

        const currentWidth = Math.min(SIZE.WIDTH.MAX, initialWidth);
        const currentHeight = initialHeight;

        debugLog(`[updateDimensions] text: ${text}  size: ${currentWidth} x ${currentHeight}`);
        const wrappedLines = wrapText(text || '', currentWidth, zoomRatio);

        const lineHeightValue = DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO * zoomRatio;
        const minHeight = Math.max(
          SIZE.SECTION_HEIGHT * zoomRatio,
          (lineHeightValue + TEXTAREA_PADDING.VERTICAL) * zoomRatio,
        );
        const contentHeight = wrappedLines.length * lineHeightValue;
        const totalHeight =
          Math.max(contentHeight, minHeight) + TEXTAREA_PADDING.VERTICAL * zoomRatio;

        const widthChanged = Math.abs(currentWidth - prevDimensions.current.width) > 1;
        const heightChanged = Math.abs(totalHeight - prevDimensions.current.height) > 1;

        if (widthChanged || heightChanged) {
          setDimensions({
            width: currentWidth,
            height: totalHeight,
          });
          prevDimensions.current = { width: currentWidth, height: totalHeight };
        }
      };

      if (
        isMounted &&
        (text !== prevText.current ||
          initialWidth !== prevDimensions.current.width ||
          initialHeight !== prevDimensions.current.height)
      ) {
        animationFrame = requestAnimationFrame(updateDimensions);
        prevText.current = text;
      }

      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }, [text, initialWidth, initialHeight, zoomRatio, isMounted]);

    if (!isMounted) return null;

    // テキストを安全にサニタイズして表示
    const safeText = sanitizeText(text || '');

    return (
      <foreignObject
        x={x}
        y={y}
        width={dimensions.width}
        height={Math.round(dimensions.height / zoomRatio)}
        pointerEvents="none"
      >
        <div
          ref={textRef}
          style={{
            fontFamily: fontFamily || DEFAULT_FONT_FAMILY,
            color: textColor,
            fontSize: `${DEFAULT_FONT_SIZE}px`,
            lineHeight: LINE_HEIGHT_RATIO,
            width: `${dimensions.width - TEXTAREA_PADDING.HORIZONTAL}px`,
            minHeight: `${SIZE.SECTION_HEIGHT}px`,
            padding: `${TEXTAREA_PADDING.VERTICAL * 0.5}px ${TEXTAREA_PADDING.HORIZONTAL * 0.5}px`,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            boxSizing: 'content-box',
          }}
        >
          {safeText}
        </div>
      </foreignObject>
    );
  },
);

export default TextDisplayArea;
