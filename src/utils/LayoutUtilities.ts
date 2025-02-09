// src/utils/LayoutUtilities.js
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

export const calculateCanvasSize = (elements) => {
  const elementList = Object.values(elements);
  const maxNodeX = Math.max(...elementList.map(element => element.x + element.width));
  const maxNodeY = Math.max(...elementList.map(element => element.y + element.height));

  return {
    width: maxNodeX + X_OFFSET,
    height: maxNodeY + NODE_HEIGHT,
  };
};