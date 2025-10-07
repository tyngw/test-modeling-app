// src/hooks/useResizeEffect.tsx
'use client';

import { useEffect, useMemo } from 'react';
import { calculateCanvasSize } from '../utils/layoutUtilities';
import { HEADER_HEIGHT } from '../config/elementSettings';
import { HierarchicalStructure } from '../types/hierarchicalTypes';
import { debugLog } from '../utils/debugLogHelpers';

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
      debugLog('[useResizeEffect] Skipping canvas resize during drag');
      return;
    }

    const canvasBounds = calculateCanvasSize(hierarchicalData);
    const maxHeight = window.innerHeight - HEADER_HEIGHT;

    // viewBoxの開始位置と全体サイズを計算
    const viewBoxMinX = canvasBounds.minX;
    const viewBoxMinY = canvasBounds.minY;
    const viewBoxWidth = Math.max(canvasBounds.width, window.innerWidth);
    const viewBoxHeight = Math.max(canvasBounds.height, maxHeight);

    // ズーム調整後のキャンバスサイズを設定
    const zoomedCanvasSize = {
      width: viewBoxWidth * zoomRatio,
      height: viewBoxHeight * zoomRatio,
    };

    setCanvasSize(zoomedCanvasSize);
    setDisplayArea(`${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`);

    debugLog(
      `[useResizeEffect] ViewBox updated: ${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`,
    );
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
