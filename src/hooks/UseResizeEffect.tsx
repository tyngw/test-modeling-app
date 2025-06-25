// src/hooks/useResizeEffect.tsx
'use client';

import { useEffect, useMemo } from 'react';
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
  elements: { [key: string]: ElementWithDimensions };
  zoomRatio: number;
  isClient?: boolean;
  isDragInProgress?: boolean; // ドラッグ中フラグを追加
}

const useResizeEffect = ({
  setCanvasSize,
  setDisplayArea,
  elements,
  zoomRatio,
  isClient,
  isDragInProgress,
}: ResizeEffectProps) => {
  // elementsの変更を安定的に検出するため、要素の情報をハッシュ化
  const elementsSignature = useMemo(() => {
    const entries = Object.entries(elements);
    return entries.map(([id, el]) => `${id}:${el.x},${el.y},${el.width},${el.height}`).join('|');
  }, [elements]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isClient) return;

    // ドラッグ中はキャンバスサイズの再計算をスキップ
    if (isDragInProgress) {
      console.log('[useResizeEffect] Skipping canvas resize during drag');
      return;
    }

    const newCanvasSize = calculateCanvasSize(elements);
    const maxHeight = window.innerHeight - HEADER_HEIGHT;
    newCanvasSize.width = Math.max(newCanvasSize.width, window.innerWidth);
    newCanvasSize.height = Math.max(newCanvasSize.height, maxHeight);
    const newViewSize = {
      width: newCanvasSize.width,
      height: newCanvasSize.height,
    };
    newCanvasSize.width *= zoomRatio;
    newCanvasSize.height *= zoomRatio;

    setCanvasSize(newCanvasSize);
    setDisplayArea(`0 0 ${newViewSize.width} ${newViewSize.height}`);
  }, [
    elementsSignature,
    zoomRatio,
    setCanvasSize,
    setDisplayArea,
    isClient,
    isDragInProgress,
    elements,
  ]);
};

export default useResizeEffect;
