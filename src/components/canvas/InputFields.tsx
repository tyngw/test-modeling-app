'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvas } from '../../context/CanvasContext';
import { calculateTextHeight } from '../../utils/textareaHelpers';
import { useIsMounted } from '../../hooks/UseIsMounted';
import {
  DEFAULT_FONT_SIZE,
  TEXTAREA_PADDING,
  LINE_HEIGHT_RATIO,
  SIZE,
} from '../../config/elementSettings';
import { debugLog } from '../../utils/debugLogHelpers';
import {
  getFontFamily,
  getElementColor,
  getTextColor,
} from '../../utils/storage/localStorageHelpers';
import { Element } from '../../types/types';
import { inputFieldKeyActionMap } from '../../config/keyActionMap';
import { validateTextInput } from '../../utils/security/validation';

interface InputFieldsProps {
  element?: Element;
  onEndEditing?: () => void;
  viewBoxMinX: number;
  viewBoxMinY: number;
}

const InputFields: React.FC<InputFieldsProps> = ({
  element,
  onEndEditing,
  viewBoxMinX,
  viewBoxMinY,
}) => {
  const { dispatch, state } = useCanvas();
  const isMounted = useIsMounted();
  const fieldRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const [localHeights, setLocalHeights] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const measureContext = useRef<CanvasRenderingContext2D | null>(null);
  const prevElementId = useRef<string | undefined>(undefined);
  const [fontFamily, setFontFamily] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [textColor, setTextColor] = useState('');

  useEffect(() => {
    if (!isMounted) return;
    const canvas = document.createElement('canvas');
    measureContext.current = canvas.getContext('2d');

    setFontFamily(getFontFamily());
    setBackgroundColor(getElementColor());
    setTextColor(getTextColor());
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted) return;

    if (element?.id !== prevElementId.current) {
      const initialHeights = element?.sectionHeights || [];
      setLocalHeights(initialHeights);
      setActiveIndex(0);
      prevElementId.current = element?.id;

      // テキストエリアにフォーカスし、カーソルを文字列の末尾に配置する
      setTimeout(() => {
        const textarea = fieldRefs.current[0];
        if (textarea) {
          textarea.focus({ preventScroll: true });
          // カーソルを文字列の末尾に配置
          const textLength = element?.texts[0]?.length || 0;
          textarea.setSelectionRange(textLength, textLength);
        }
      }, 50);
    }
  }, [element, isMounted]);

  const calculateDynamicHeight = useCallback((text: string) => {
    // テキストが空の場合の処理
    if (!text || text.trim() === '') {
      return SIZE.SECTION_HEIGHT;
    }

    // TextDisplayAreaと同じ幅でテキスト折り返しを計算
    const width = SIZE.WIDTH.MAX;

    // 論理座標での高さを計算（zoomRatio=1として計算）
    const contentHeight = calculateTextHeight(
      text,
      width, // TextDisplayAreaと同じ幅を使用
      1, // zoomRatioを1として論理座標で計算
      DEFAULT_FONT_SIZE,
      LINE_HEIGHT_RATIO,
    );
    const padding = TEXTAREA_PADDING.VERTICAL;
    const calculatedHeight = Math.max(SIZE.SECTION_HEIGHT, contentHeight + padding);

    return calculatedHeight;
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>, index: number) => {
      const rawValue = e.target.value;

      // 入力値のセキュリティ検証とサニタイゼーション
      if (!validateTextInput(rawValue)) {
        debugLog(
          '無効なテキスト入力が検出されました。安全でない内容が含まれている可能性があります。',
        );
        return; // 危険な入力は拒否
      }

      // 基本的なサニタイゼーション（過度に制限しないように調整）
      const newValue = rawValue
        // HTMLタグのうち、危険なもののみを除去
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/on\w+\s*=/gi, '');

      const height = calculateDynamicHeight(newValue);

      setLocalHeights((prev) => {
        const newHeights = [...prev];
        newHeights[index] = height;
        return newHeights;
      });

      dispatch({
        type: 'UPDATE_TEXT',
        payload: { id: element!.id, index, value: newValue },
      });

      const textarea = fieldRefs.current[index];
      if (textarea) {
        textarea.style.height = `${height}px`; // 論理座標での高さ
      }
    },
    [element, dispatch, calculateDynamicHeight],
  );

  const handleTabNavigation = useCallback(
    (currentIndex: number) => {
      const nextIndex = currentIndex + 1;
      if (element && nextIndex < element.texts.length) {
        const nextField = fieldRefs.current[nextIndex];
        if (nextField) {
          const { scrollX, scrollY } = window;
          nextField.focus({ preventScroll: true });

          // タブ移動時もカーソルを文字列の末尾に配置
          const textLength = element.texts[nextIndex]?.length || 0;
          nextField.setSelectionRange(textLength, textLength);

          setActiveIndex(nextIndex);
          window.scrollTo(scrollX, scrollY);
        }
      } else {
        onEndEditing?.();
        dispatch({ type: 'END_EDITING' });
      }
    },
    [element, onEndEditing, dispatch],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    const keyCombo = [
      e.ctrlKey && 'Ctrl',
      e.altKey && 'Alt',
      e.metaKey && 'Meta',
      e.shiftKey && 'Shift',
      e.key,
    ]
      .filter(Boolean)
      .join('+');

    const action = inputFieldKeyActionMap[keyCombo];

    if (action) {
      e.preventDefault();
      switch (action) {
        case 'NEXT_FIELD':
          handleTabNavigation(index);
          break;
        case 'END_EDITING':
          onEndEditing?.();
          dispatch({ type: 'END_EDITING' });
          break;
      }
    }
  };

  if (!element || !isMounted) return null;

  return (
    <>
      {element.texts.map((text, index) => {
        // 論理座標でのY位置（CSS transformでスケーリングされる）
        const yPosition = localHeights.slice(0, index).reduce((sum, h) => sum + h, 0);
        const height = calculateDynamicHeight(text);

        // TextDisplayAreaと同じ幅とパディングを使用
        const contentWidth = SIZE.WIDTH.MAX - TEXTAREA_PADDING.HORIZONTAL;

        return (
          <textarea
            key={`${element.id}-${index}`}
            ref={(el) => {
              fieldRefs.current[index] = el;
              if (index === activeIndex && isMounted) el?.focus({ preventScroll: true });
            }}
            value={text}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              // 論理座標で配置し、CSS transformでスケーリング
              left: `${(element.x - viewBoxMinX) * state.zoomRatio}px`,
              top: `${(element.y - viewBoxMinY + yPosition) * state.zoomRatio}px`,
              width: `${contentWidth}px`,
              height: `${height}px`,
              minWidth: `${contentWidth}px`,
              maxWidth: `${contentWidth}px`,
              minHeight: `${SIZE.SECTION_HEIGHT}px`,
              margin: 0,
              fontSize: `${DEFAULT_FONT_SIZE}px`,
              lineHeight: LINE_HEIGHT_RATIO,
              // TextDisplayAreaと同じパディング
              padding: `${TEXTAREA_PADDING.VERTICAL * 0.5}px ${TEXTAREA_PADDING.HORIZONTAL * 0.5}px`,
              fontFamily,
              backgroundColor,
              color: textColor,
              // TextDisplayAreaと同じbox-sizing
              boxSizing: 'content-box',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              overflow: 'hidden',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              resize: 'none',
              zIndex: 10000,
              opacity: 1,
              transition: 'all 0.2s ease-in-out',
              pointerEvents: 'all',
              // CSS transformでSVGと同じ方法でスケーリング
              transform: `scale(${state.zoomRatio})`,
              transformOrigin: 'top left',
            }}
          />
        );
      })}
    </>
  );
};

export default React.memo(InputFields);
