// hooks/useResizeEffect.js
import { useEffect } from 'react';
import { calculateCanvasSize } from '../utils/LayoutUtilities';

const useResizeEffect = ({ setCanvasSize, setViewBox, state }) => {
    useEffect(() => {
        const newCanvasSize = calculateCanvasSize(state.nodes);
        newCanvasSize.width = Math.max(newCanvasSize.width, window.innerWidth);
        newCanvasSize.height = Math.max(newCanvasSize.height, window.innerHeight);
        const newViewSize = {
            width: newCanvasSize.width,
            height: newCanvasSize.height,
        }
        newCanvasSize.width = newCanvasSize.width * state.zoomRatio;
        newCanvasSize.height = newCanvasSize.height * state.zoomRatio;
        
        setCanvasSize(newCanvasSize);
        setViewBox(`0 0 ${newViewSize.width} ${newViewSize.height}`);
    }, [state.nodes, state.zoomRatio]);
};

export default useResizeEffect;
