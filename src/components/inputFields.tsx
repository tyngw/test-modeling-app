// src/components/inputFields.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvas } from '../context/canvasContext';
import { wrapText } from '../utils/textareaHelpers';
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_FONT_FAMILY,
  TEXTAREA_PADDING,
  LINE_HEIGHT_RATIO,
  SIZE,
} from '../constants/elementSettings';
import { Element } from '../types';

interface InputFieldsProps {
  element?: Element;
  onEndEditing?: () => void;
}

const InputFields: React.FC<InputFieldsProps> = ({ element, onEndEditing }) => {
  const { dispatch, state } = useCanvas();
  const fieldRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const [localHeights, setLocalHeights] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const measureContext = useRef<CanvasRenderingContext2D | null>(null);
  const prevElementId = useRef<string | undefined>(undefined);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    measureContext.current = canvas.getContext('2d');
  }, []);

  useEffect(() => {
    if (element?.id !== prevElementId.current) {
      const initialHeights = element?.sectionHeights || [];
      setLocalHeights(initialHeights);
      setActiveIndex(0);
      prevElementId.current = element?.id;
      setTimeout(() => fieldRefs.current[0]?.focus({ preventScroll: true }), 50);
    }
  }, [element]);

  const calculateDynamicHeight = useCallback((text: string) => {
    const width = SIZE.WIDTH.MAX;
    const lines = wrapText(text, width, state.zoomRatio).length;
    const lineHeight = DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO * state.zoomRatio;
    const padding = TEXTAREA_PADDING.VERTICAL * state.zoomRatio;

    return Math.max(
      SIZE.SECTION_HEIGHT * state.zoomRatio,
      lines * lineHeight + padding
    );
  }, [state.zoomRatio]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
    const newValue = e.target.value;
    const height = calculateDynamicHeight(newValue);

    setLocalHeights(prev => {
      const newHeights = [...prev];
      newHeights[index] = height / state.zoomRatio;
      return newHeights;
    });

    dispatch({
      type: 'UPDATE_TEXT',
      payload: { id: element!.id, index, value: newValue }
    });

    const textarea = fieldRefs.current[index];
    if (textarea) {
      textarea.style.height = `${height}px`;
    }
  }, [element, state.zoomRatio, dispatch, calculateDynamicHeight]);

  const handleTabNavigation = useCallback((currentIndex: number) => {
    const nextIndex = currentIndex + 1;
    if (element && nextIndex < element.texts.length) {
      const nextField = fieldRefs.current[nextIndex];
      if (nextField) {
        const { scrollX, scrollY } = window;
        nextField.focus({ preventScroll: true });
        setActiveIndex(nextIndex);
        window.scrollTo(scrollX, scrollY);
      }
    }
  }, [element]);

  const handleFocus = useCallback((e: React.FocusEvent<HTMLTextAreaElement>, index: number) => {
    e.stopPropagation();
    const { scrollX, scrollY } = window;
    setActiveIndex(index);
    window.scrollTo(scrollX, scrollY);
  }, []);

  const handleBlur = useCallback(() => {
    if (!element) return;

    dispatch({
      type: 'UPDATE_ELEMENT_SIZE',
      payload: {
        id: element.id,
        width: SIZE.WIDTH.MAX,
        height: localHeights.reduce((sum, h) => sum + h, 0),
        sectionHeights: localHeights
      }
    });

    onEndEditing?.();
    setActiveIndex(-1);
  }, [element, localHeights, dispatch, onEndEditing]);

  if (!element) return null;

  return (
    <>
      {element.texts.map((text, index) => {
        const yPosition = localHeights
          .slice(0, index)
          .reduce((sum, h) => sum + h, 0) * state.zoomRatio;

        const width = SIZE.WIDTH.MAX * state.zoomRatio;
        const height = calculateDynamicHeight(text);

        return (
          <textarea
            key={`${element.id}-${index}`}
            ref={(el) => { 
              fieldRefs.current[index] = el;
              if (index === activeIndex) el?.focus({ preventScroll: true });
            }}
            value={text}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                handleTabNavigation(index);
              }
            }}
            onFocus={(e) => handleFocus(e, index)}
            onBlur={handleBlur}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: `${element.x * state.zoomRatio}px`,
              top: `${element.y * state.zoomRatio + yPosition}px`,
              width: `${width}px`,
              height: `${height}px`,
              minWidth: `${SIZE.WIDTH.MAX * state.zoomRatio}px`,
              maxWidth: `${SIZE.WIDTH.MAX * state.zoomRatio}px`,
              minHeight: `${SIZE.SECTION_HEIGHT * state.zoomRatio}px`,
              margin: '1px 1px',
              fontSize: `${DEFAULT_FONT_SIZE * state.zoomRatio}px`,
              lineHeight: `${LINE_HEIGHT_RATIO}em`,
              padding: `0`,
              fontFamily: DEFAULT_FONT_FAMILY,
              boxSizing: 'border-box',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              resize: 'none',
              zIndex: 10000,
              opacity: 1,
              transition: 'all 0.2s ease-in-out',
              pointerEvents: 'all',
            }}
            autoFocus={index === 0}
          />
        );
      })}
    </>
  );
};

export default React.memo(InputFields);