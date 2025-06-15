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
import { getTextColor } from '../utils/storage/localStorageHelpers';
import { sanitizeText } from '../utils/security/sanitization';
import { detectUrls, openUrlInNewTab, isMobileDevice } from '../utils/url/urlHelpers';
import UrlPopup from './UrlPopup';

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
  onUrlClick?: (url: string, event: React.MouseEvent) => void;
  onElementClick?: (event: React.MouseEvent) => void;
  onMouseDown?: (event: React.MouseEvent) => void; // マウスダウンイベント用
  onTouchStart?: (event: React.TouchEvent) => void; // タッチスタートイベント用
  isSelected?: boolean; // 要素が選択状態かどうか
}

const TextDisplayArea = memo<TextDisplayAreaProps>(function TextDisplayArea({
  x,
  y,
  width: initialWidth,
  height: initialHeight,
  text,
  zoomRatio,
  fontFamily,
  onHeightChange,
  onUrlClick,
  onElementClick,
  onMouseDown,
  onTouchStart,
  isSelected = false,
}) {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isMounted, setIsMounted] = useState(false);
  const [textColor, setTextColor] = useState(DEFAULT_TEXT_COLOR);
  const [urlPopup, setUrlPopup] = useState<{
    isVisible: boolean;
    url: string;
    position: { x: number; y: number };
  }>({
    isVisible: false,
    url: '',
    position: { x: 0, y: 0 },
  });

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
  const urls = detectUrls(safeText);

  /**
   * テキスト内のクリック位置を取得してURL判定を行う（URL以外の部分用）
   */
  const handleTextClick = (event: React.MouseEvent<HTMLDivElement>) => {
    // URL要素からのイベント伝播の場合、target要素をチェック
    const target = event.target as HTMLElement;

    // URL要素（span[data-url]）がクリックされた場合
    if (target.tagName === 'SPAN' && target.hasAttribute('data-url')) {
      // URL要素の処理はspan要素のhandleUrlClickで既に処理済み
      // PC端末でCtrlキーが押されていない場合は要素選択を実行
      const isCtrlPressed = event.ctrlKey || event.metaKey;
      const isMobile = isMobileDevice();

      if (!isCtrlPressed && !isMobile) {
        // 要素選択を行う
        if (onElementClick) {
          onElementClick(event);
        }
      }
      return;
    }

    // URL以外の部分がクリックされた場合は通常の要素選択
    if (onElementClick) {
      onElementClick(event);
    }
  };

  /**
   * タッチイベント用のハンドラー（URL以外の部分用）
   */
  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    // URL要素からのイベント伝播の場合、target要素をチェック
    const target = event.target as HTMLElement;

    // URL要素（span[data-url]）がタッチされた場合は、
    // span要素のhandleUrlTouchで既に処理済みなので何もしない
    if (target.tagName === 'SPAN' && target.hasAttribute('data-url')) {
      return;
    }

    // URL以外の部分がタッチされた場合は通常の要素選択
    const touch = event.changedTouches[0];
    if (!touch) return;

    // 基本的なマウスイベントオブジェクトを作成
    const syntheticEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      ctrlKey: false,
      metaKey: false,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation(),
    } as React.MouseEvent<HTMLDivElement>;

    // 要素選択を行う
    if (onElementClick) {
      onElementClick(syntheticEvent);
    }
  };

  /**
   * URLアクションを実行する
   */
  const handleUrlAction = (url: string, event: React.MouseEvent) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isMobile = isMobileDevice();

    if (isCtrlPressed && !isMobile) {
      // PC端末でCtrl+クリック: 直接新しいタブで開く
      openUrlInNewTab(url);
    } else if (isMobile) {
      // モバイル端末: ポップアップを表示
      setUrlPopup({
        isVisible: true,
        url: url,
        position: { x: event.clientX, y: event.clientY },
      });
    }

    // onUrlClick プロパティが提供されている場合は呼び出し
    if (onUrlClick) {
      onUrlClick(url, event);
    }
  };

  /**
   * 個別のURL要素のクリック/タッチ処理
   */
  const handleUrlClick = (url: string, event: React.MouseEvent<HTMLSpanElement>) => {
    const isCtrlPressed = event.ctrlKey || event.metaKey;
    const isMobile = isMobileDevice();

    // PC端末でCtrl+クリックの場合はURL処理
    if (isCtrlPressed && !isMobile) {
      event.preventDefault();
      event.stopPropagation();
      openUrlInNewTab(url);
      return;
    }

    // モバイル端末で要素が既に選択状態の場合はURL処理
    if (isMobile && isSelected) {
      event.preventDefault();
      event.stopPropagation();
      handleUrlAction(url, event as any);
      return;
    }

    // それ以外の場合は要素選択
    if (onElementClick) {
      onElementClick(event as any);
    }
  };

  /**
   * 個別のURL要素のタッチ処理
   */
  const handleUrlTouch = (url: string, event: React.TouchEvent<HTMLSpanElement>) => {
    const isMobile = isMobileDevice();
    const touch = event.changedTouches[0];

    if (!touch) return;

    console.log(`[DEBUG] URL touched on mobile. isSelected: ${isSelected}, url: ${url}`);

    // モバイル端末で要素が既に選択状態の場合はURL処理
    if (isMobile && isSelected) {
      event.preventDefault();
      event.stopPropagation();

      console.log(`[DEBUG] Opening URL on mobile: ${url}`);

      // 直接URLを開く（モバイルでは新しいタブで開く）
      openUrlInNewTab(url);
      return;
    }

    // モバイル端末で選択状態でない場合、またはPC端末の場合は要素選択
    const syntheticEvent = {
      clientX: touch.clientX,
      clientY: touch.clientY,
      ctrlKey: false,
      clientY: touch.clientY,
      ctrlKey: false,
      metaKey: false,
      preventDefault: () => event.preventDefault(),
      stopPropagation: () => event.stopPropagation(),
    } as React.MouseEvent<HTMLDivElement>;

    if (onElementClick) {
      onElementClick(syntheticEvent);
    }
  };

  /**
   * URLを含むテキストをレンダリングする関数
   */
  const renderTextWithUrls = (textContent: string) => {
    if (urls.length === 0) {
      return textContent;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    urls.forEach((url, index) => {
      const urlIndex = textContent.indexOf(url, lastIndex);
      if (urlIndex === -1) return;

      // URL前のテキスト
      if (urlIndex > lastIndex) {
        parts.push(textContent.substring(lastIndex, urlIndex));
      }

      // URLをスタイル付きでレンダリング（直接イベントハンドラを追加）
      parts.push(
        <span
          key={`url-${index}`}
          data-url={url}
          style={{
            color: '#1a73e8',
            textDecoration: 'underline',
            cursor: 'pointer',
            touchAction: 'manipulation', // タッチ最適化
          }}
          onClick={(e) => handleUrlClick(url, e)}
          onTouchEnd={(e) => handleUrlTouch(url, e)}
        >
          {url}
        </span>,
      );

      lastIndex = urlIndex + url.length;
    });

    // 最後のURL以降のテキスト
    if (lastIndex < textContent.length) {
      parts.push(textContent.substring(lastIndex));
    }

    return parts;
  };

  return (
    <>
      <foreignObject
        x={x}
        y={y}
        width={dimensions.width}
        height={Math.round(dimensions.height / zoomRatio)}
        pointerEvents="all"
        style={{ touchAction: 'manipulation' }}
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
            pointerEvents: 'all',
            touchAction: 'manipulation',
          }}
          onClick={handleTextClick}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {renderTextWithUrls(safeText)}
        </div>
      </foreignObject>

      <UrlPopup
        url={urlPopup.url}
        isVisible={urlPopup.isVisible}
        onClose={() => setUrlPopup((prev) => ({ ...prev, isVisible: false }))}
        position={urlPopup.position}
      />
    </>
  );
});

export default TextDisplayArea;
