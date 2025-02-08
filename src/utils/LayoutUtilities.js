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

export const calculateCanvasSize = (nodes) => {
  const nodeList = Object.values(nodes);
  const maxNodeX = Math.max(...nodeList.map(node => node.x + node.width));
  const maxNodeY = Math.max(...nodeList.map(node => node.y + node.height));

  return {
    width: maxNodeX + X_OFFSET,
    height: maxNodeY + NODE_HEIGHT,
  };
};