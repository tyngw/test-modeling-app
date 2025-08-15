// src/hooks/useResizeEffect.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { calculateCanvasSize } from '../utils/layoutUtilities';
import { HEADER_HEIGHT } from '../config/elementSettings';
import { HierarchicalStructure } from '../types/hierarchicalTypes';

interface ResizeEffectProps {
  setCanvasSize: React.Dispatch<
    React.SetStateAction<{
      width: number;
      height: number;
    }>
  >;
  setDisplayArea: React.Dispatch<React.SetStateAction<string>>;
  hierarchicalData: HierarchicalStructure | null;
  zoomRatio: number;
  isClient?: boolean;
  isDragInProgress?: boolean; // ドラッグ中フラグを追加
}

const useResizeEffect = ({
  setCanvasSize,
  setDisplayArea,
  hierarchicalData,
  zoomRatio,
  isClient = true,
  isDragInProgress = false,
}: ResizeEffectProps) => {
  // 階層構造のバージョンスタンプを計算してメモ化
  const hierarchySignature = useMemo(() => {
    if (!hierarchicalData) return 'empty';
    return JSON.stringify(hierarchicalData.version || 'unknown');
  }, [hierarchicalData]);

  useEffect(() => {
    if (typeof window === 'undefined' || !isClient) return;

    // ドラッグ中はキャンバスサイズの再計算をスキップ
    if (isDragInProgress) {
      console.log('[useResizeEffect] Skipping canvas resize during drag');
      return;
    }

    const newCanvasSize = calculateCanvasSize(hierarchicalData);
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
    hierarchySignature,
    zoomRatio,
    setCanvasSize,
    setDisplayArea,
    isClient,
    isDragInProgress,
    hierarchicalData,
  ]);
};

export default useResizeEffect;
