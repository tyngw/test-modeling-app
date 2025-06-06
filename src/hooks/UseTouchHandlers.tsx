import { useState, useCallback } from 'react';
import { Element as CanvasElement } from '../types/types';
import { isSVGRectElement, isSVGGElement, hasDataset } from '../types/svgTypes';

/**
 * UseTouchHandlers フックのプロパティ定義
 */
interface UseTouchHandlersProps {
  handleMouseDown: (
    e: React.TouchEvent<HTMLElement | SVGElement> | React.MouseEvent<HTMLElement | SVGElement>,
    element: CanvasElement,
  ) => void;
  elements: Record<string, CanvasElement>;
}

/**
 * タッチイベントを処理するためのカスタムフック
 */
export const useTouchHandlers = ({ handleMouseDown, elements }: UseTouchHandlersProps) => {
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialScroll, setInitialScroll] = useState({ x: 0, y: 0 });

  /**
   * タッチ開始イベントの処理
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length === 2) {
        // ピンチ操作の開始処理
        setIsPinching(true);
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY,
        );
        setInitialPinchDistance(distance);
        setInitialScroll({
          x: window.scrollX,
          y: window.scrollY,
        });
      } else if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const target = document.elementFromPoint(touch.clientX, touch.clientY);

        // SVG要素からの相対位置を使って要素を特定
        if (target && (isSVGRectElement(target) || isSVGGElement(target))) {
          // 要素の親要素からcanvasArea内の要素IDを探す
          let currentElement: Element | null = target;
          let elementId: string | null = null;

          // 親要素を遡って要素のIDを探す
          while (currentElement && !elementId) {
            if (hasDataset(currentElement) && currentElement.dataset.elementId) {
              elementId = currentElement.dataset.elementId;
              break;
            }
            currentElement = currentElement.parentElement;
          }

          if (elementId) {
            // IDが見つかった場合、その要素のhandleMouseDownを直接呼び出す
            const element = elements[elementId];
            if (element) {
              // 元のタッチイベントを型キャストして使用
              // unknownを経由することで型安全性を保つ
              const touchEvent = e as unknown as React.TouchEvent<HTMLElement | SVGElement>;

              // イベントをハンドラに渡す
              handleMouseDown(touchEvent, element);
            }
          }
        }
      }
    },
    [elements, handleMouseDown],
  );

  /**
   * タッチ移動イベントの処理
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<SVGSVGElement>) => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault();

        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY,
        );

        const deltaX = touch1.clientX - touch2.clientX;
        const deltaY = touch1.clientY - touch2.clientY;
        const angle = Math.atan2(deltaY, deltaX);

        const scale = currentDistance / initialPinchDistance;
        const offsetX = (touch1.clientX + touch2.clientX) / 2;
        const offsetY = (touch1.clientY + touch2.clientY) / 2;

        // スクロール位置の計算と適用
        window.scrollTo({
          left: initialScroll.x + offsetX * (scale - 1) * Math.cos(angle),
          top: initialScroll.y + offsetY * (scale - 1) * Math.sin(angle),
          behavior: 'auto', // ScrollBehaviorの型アサーションは不要になりました
        });
      } else if (e.touches.length === 1) {
        e.preventDefault();
      }
    },
    [isPinching, initialPinchDistance, initialScroll],
  );

  /**
   * タッチ終了イベントの処理
   */
  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
    setInitialPinchDistance(0);
    setInitialScroll({ x: 0, y: 0 });
  }, []);

  return {
    isPinching,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};
