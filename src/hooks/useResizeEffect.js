// hooks/useResizeEffect.js
import { useEffect } from 'react';
import { calculateCanvasSize } from '../utils/LayoutUtilities';
import {
    NODE_HEIGHT,
    X_OFFSET,
    MENUBAR_HEIGHT,
} from '../constants/Node';

const useResizeEffect = ({ setCanvasSize, state }) => {
    useEffect(() => {
        const newCanvasSize = calculateCanvasSize(state.nodes, NODE_HEIGHT, X_OFFSET, state.zoomRatio);
        newCanvasSize.width = Math.max(newCanvasSize.width, window.innerWidth);
        newCanvasSize.height = Math.max(newCanvasSize.height, window.innerHeight - MENUBAR_HEIGHT);
        setCanvasSize(newCanvasSize);
    }, [state.nodes, state.zoomRatio]);
};

export default useResizeEffect;
