// src/hooks/useResizeEffect.tsx
import { useEffect } from 'react';
import { calculateCanvasSize } from '../utils/LayoutUtilities';

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
        const newCanvasSize = calculateCanvasSize(state.elements);
        newCanvasSize.width = Math.max(newCanvasSize.width, window.innerWidth);
        newCanvasSize.height = Math.max(newCanvasSize.height, window.innerHeight);
        const newViewSize = {
            width: newCanvasSize.width,
            height: newCanvasSize.height,
        }
        newCanvasSize.width = newCanvasSize.width * state.zoomRatio;
        newCanvasSize.height = newCanvasSize.height * state.zoomRatio;
        
        setCanvasSize(newCanvasSize);
        setDisplayArea(`0 0 ${newViewSize.width} ${newViewSize.height}`);
    }, [state.elements, state.zoomRatio, setCanvasSize, setDisplayArea]);
};

export default useResizeEffect;