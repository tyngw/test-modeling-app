// src/hooks/useResizeEffect.tsx
'use client';

import { useEffect } from 'react';
import { calculateCanvasSize } from '../utils/layoutUtilities';
import { ICONBAR_HEIGHT } from '../config/elementSettings';

interface ElementWithDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ResizeEffectProps {
  setCanvasSize: React.Dispatch<React.SetStateAction<{
    width: number;
    height: number;
  }>>;
  setDisplayArea: React.Dispatch<React.SetStateAction<string>>;
  state: {
    elements: { [key: string]: ElementWithDimensions };
    zoomRatio: number;
  };
}

const useResizeEffect = ({ 
  setCanvasSize, 
  setDisplayArea,
  state 
}: ResizeEffectProps) => {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const newCanvasSize = calculateCanvasSize(state.elements);
        const maxHeight = window.innerHeight - ICONBAR_HEIGHT * 2;
        newCanvasSize.width = Math.max(newCanvasSize.width, window.innerWidth);
        newCanvasSize.height = Math.max(newCanvasSize.height, maxHeight);
        const newViewSize = {
            width: newCanvasSize.width,
            height: newCanvasSize.height,
        }
        newCanvasSize.width *= state.zoomRatio;
        newCanvasSize.height *= state.zoomRatio;
        
        setCanvasSize(newCanvasSize);
        setDisplayArea(`0 0 ${newViewSize.width} ${newViewSize.height}`);
    }, [state.elements, state.zoomRatio, setCanvasSize, setDisplayArea]);
};

export default useResizeEffect;