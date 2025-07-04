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

export const calculateCanvasSize = (hierarchicalData: HierarchicalStructure | null) => {
  if (!hierarchicalData) {
    return {
      width: OFFSET.X,
      height: SIZE.SECTION_HEIGHT * NUMBER_OF_SECTIONS,
    };
  }

  const elementList = getVisibleElementsFromHierarchy(hierarchicalData);

  if (elementList.length === 0) {
    return {
      width: OFFSET.X,
      height: SIZE.SECTION_HEIGHT * NUMBER_OF_SECTIONS,
    };
  }

  const maxElementX = Math.max(...elementList.map((element: Element) => element.x + element.width));
  const maxElementY = Math.max(
    ...elementList.map((element: Element) => element.y + element.height),
  );

  return {
    width: maxElementX + OFFSET.X,
    height: maxElementY + SIZE.SECTION_HEIGHT * NUMBER_OF_SECTIONS,
  };
};
