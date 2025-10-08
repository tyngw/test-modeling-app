// src/utils/layoutUtilities.ts
import { useState, useEffect } from 'react';
import { SIZE, OFFSET, NUMBER_OF_SECTIONS } from '../config/elementSettings';
import { HierarchicalStructure } from '../types/hierarchicalTypes';
import { getVisibleElementsFromHierarchy } from './hierarchical/hierarchicalConverter';

export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

interface Element {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * キャンバスサイズとオフセットを計算
 *
 * マインドマップモードで左側に要素がある場合も考慮して、
 * キャンバスの開始位置（minX, minY）と全体サイズ（width, height）を計算します。
 *
 * @param hierarchicalData - 階層構造データ
 * @returns キャンバスの境界情報（minX, minY, width, height）
 */
export const calculateCanvasSize = (hierarchicalData: HierarchicalStructure | null) => {
  // デフォルト値（要素が存在しない場合）
  const defaultReturn = {
    minX: 0,
    minY: 0,
    width: OFFSET.X,
    height: SIZE.SECTION_HEIGHT * NUMBER_OF_SECTIONS,
  };

  if (!hierarchicalData) {
    return defaultReturn;
  }

  const elementList = getVisibleElementsFromHierarchy(hierarchicalData);

  if (elementList.length === 0) {
    return defaultReturn;
  }

  // 全要素の境界を計算
  const minElementX = Math.min(...elementList.map((element: Element) => element.x));
  const maxElementX = Math.max(...elementList.map((element: Element) => element.x + element.width));
  const minElementY = Math.min(...elementList.map((element: Element) => element.y));
  const maxElementY = Math.max(
    ...elementList.map((element: Element) => element.y + element.height),
  );

  // 左側の要素がある場合は、開始位置を調整
  // OFFSET.Xの余白を両側に確保
  const minX = Math.min(0, minElementX - OFFSET.X);
  const minY = Math.min(0, minElementY - OFFSET.Y);

  // キャンバス全体のサイズを計算
  const width = maxElementX - minX + OFFSET.X;
  const height = maxElementY - minY + SIZE.SECTION_HEIGHT * NUMBER_OF_SECTIONS;

  return {
    minX,
    minY,
    width,
    height,
  };
};
