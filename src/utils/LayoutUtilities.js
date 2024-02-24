// util/LayoutUtilities.js
import { useState, useEffect } from 'react';
import { calculateNodeWidth } from './TextUtilities';

// ウィンドウサイズを管理するカスタムフック
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

// キャンバスサイズを計算する関数
export const calculateCanvasSize = (nodes, nodeHeight, parentXOffset, zoomRatio) => {
  const maxNodeX = Math.max(...nodes.map(node => node.x + calculateNodeWidth([node.text]))) + parentXOffset;
  const maxNodeY = Math.max(...nodes.map(node => node.y + nodeHeight)) + nodeHeight;

  console.log('zoomRatio', zoomRatio);
   return {
    width: maxNodeX * zoomRatio,
    height: maxNodeY * zoomRatio,
  };
};
