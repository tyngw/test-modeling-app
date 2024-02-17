import { useState, useEffect } from 'react';

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
export const calculateCanvasSize = (nodes, nodeWidthCalculator, nodeHeight, parentXOffset) => {
  const maxNodeX = Math.max(...nodes.map(node => node.x + nodeWidthCalculator([node.text]))) + parentXOffset;
  const maxNodeY = Math.max(...nodes.map(node => node.y + nodeHeight)) + nodeHeight;

  return {
    width: maxNodeX,
    height: maxNodeY
  };
};
