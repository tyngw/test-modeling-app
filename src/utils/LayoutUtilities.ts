// src/utils/LayoutUtilities.ts
import { useState, useEffect } from 'react';
import {
  NODE_HEIGHT,
  X_OFFSET,
} from '../constants/NodeSettings';

export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
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

export const calculateCanvasSize = (elements: { [key: string]: Element }) => {
  const elementList: Element[] = Object.values(elements);
  const maxNodeX = Math.max(...elementList.map((element: Element) => element.x + element.width));
  const maxNodeY = Math.max(...elementList.map((element: Element) => element.y + element.height));

  return {
    width: maxNodeX + X_OFFSET,
    height: maxNodeY + NODE_HEIGHT,
  };
};