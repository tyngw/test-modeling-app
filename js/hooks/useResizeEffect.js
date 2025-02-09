"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/hooks/useResizeEffect.js
const react_1 = require("react");
const LayoutUtilities_1 = require("../utils/LayoutUtilities");
const useResizeEffect = ({ setCanvasSize, setDisplayArea, state }) => {
    (0, react_1.useEffect)(() => {
        const newCanvasSize = (0, LayoutUtilities_1.calculateCanvasSize)(state.elements);
        newCanvasSize.width = Math.max(newCanvasSize.width, window.innerWidth);
        newCanvasSize.height = Math.max(newCanvasSize.height, window.innerHeight);
        const newViewSize = {
            width: newCanvasSize.width,
            height: newCanvasSize.height,
        };
        newCanvasSize.width = newCanvasSize.width * state.zoomRatio;
        newCanvasSize.height = newCanvasSize.height * state.zoomRatio;
        setCanvasSize(newCanvasSize);
        setDisplayArea(`0 0 ${newViewSize.width} ${newViewSize.height}`);
    }, [state.elements, state.zoomRatio, setCanvasSize, setDisplayArea]);
};
exports.default = useResizeEffect;
