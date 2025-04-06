import { useState, useCallback } from 'react';
import { Element as CanvasElement } from '../types/types';

interface UseTouchHandlersProps {
  handleMouseDown: (e: React.TouchEvent<HTMLElement>, element: CanvasElement) => void;
  elements: Record<string, CanvasElement>;
}

export const useTouchHandlers = ({ handleMouseDown, elements }: UseTouchHandlersProps) => {
  const [isPinching, setIsPinching] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState(0);
  const [initialScroll, setInitialScroll] = useState({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setInitialPinchDistance(distance);
      setInitialScroll({
        x: window.scrollX,
        y: window.scrollY
      });
    } else if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);

      // SVG要素からの相対位置を使って要素を特定
      if (target && (target instanceof SVGRectElement || target instanceof SVGGElement)) {
        // 要素の親要素からcanvasArea内の要素IDを探す
        let currentElement = target;
        let elementId: string | null = null;
        
        // 親要素を遡って要素のIDを探す
        while (currentElement && !elementId) {
          if (currentElement.dataset && currentElement.dataset.elementId) {
            elementId = currentElement.dataset.elementId;
            break;
          }
          currentElement = currentElement.parentElement as any;
        }
        
        if (elementId) {
          // IDが見つかった場合、その要素のhandleMouseDownを直接呼び出す
          const element = elements[elementId];
          if (element) {
            // 合成イベントを作成する代わりに直接ハンドラーを呼び出す
            const syntheticTouchEvent = {
              nativeEvent: e.nativeEvent,
              stopPropagation: () => {},
              preventDefault: () => {},
              clientX: touch.clientX,
              clientY: touch.clientY
            } as unknown as React.TouchEvent<HTMLElement>;
            
            handleMouseDown(syntheticTouchEvent, element);
          }
        }
      }
    }
  }, [elements, handleMouseDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );

      const deltaX = touch1.clientX - touch2.clientX;
      const deltaY = touch1.clientY - touch2.clientY;
      const angle = Math.atan2(deltaY, deltaX);

      const scale = currentDistance / initialPinchDistance;
      const offsetX = (touch1.clientX + touch2.clientX) / 2;
      const offsetY = (touch1.clientY + touch2.clientY) / 2;

      window.scrollTo({
        left: initialScroll.x + (offsetX * (scale - 1)) * Math.cos(angle),
        top: initialScroll.y + (offsetY * (scale - 1)) * Math.sin(angle),
        behavior: 'auto' as ScrollBehavior
      });
    } else if (e.touches.length === 1) {
      e.preventDefault();
    }
  }, [isPinching, initialPinchDistance, initialScroll]);

  const handleTouchEnd = useCallback(() => {
    setIsPinching(false);
    setInitialPinchDistance(0);
    setInitialScroll({ x: 0, y: 0 });
  }, []);

  return {
    isPinching,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};