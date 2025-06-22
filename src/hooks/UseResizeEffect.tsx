// src/hooks/useResizeEffect.tsx
'use client';

import { useEffect } from 'react';
import { calculateCanvasSize } from '../utils/layoutUtilities';
import { HEADER_HEIGHT } from '../config/elementSettings';

interface ElementWithDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResizeEffectProps {
  setCanvasSize: React.Dispatch<
    React.SetStateAction<{
      width: number;
      height: number;
    }>
  >;
  setDisplayArea: React.Dispatch<React.SetStateAction<string>>;
  state: {
    elements: { [key: string]: ElementWithDimensions };
    zoomRatio: number;
  };
  isClient?: boolean;
  isDragInProgress?: boolean; // ドラッグ中フラグを追加
}

const useResizeEffect = ({
  setCanvasSize,
  setDisplayArea,
  state,
  isClient,
  isDragInProgress,
}: ResizeEffectProps) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !isClient) return;

    // ドラッグ中はキャンバスサイズの再計算をスキップ
    if (isDragInProgress) {
      console.log('[useResizeEffect] Skipping canvas resize during drag');
      return;
    }

    const newCanvasSize = calculateCanvasSize(state.elements);
    const maxHeight = window.innerHeight - HEADER_HEIGHT;
    newCanvasSize.width = Math.max(newCanvasSize.width, window.innerWidth);
    newCanvasSize.height = Math.max(newCanvasSize.height, maxHeight);
    const newViewSize = {
      width: newCanvasSize.width,
      height: newCanvasSize.height,
    };
    newCanvasSize.width *= state.zoomRatio;
    newCanvasSize.height *= state.zoomRatio;

    setCanvasSize(newCanvasSize);
    setDisplayArea(`0 0 ${newViewSize.width} ${newViewSize.height}`);
  }, [state.elements, state.zoomRatio, setCanvasSize, setDisplayArea, isClient, isDragInProgress]);
};

export default useResizeEffect;
