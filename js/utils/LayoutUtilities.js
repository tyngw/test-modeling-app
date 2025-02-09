"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCanvasSize = exports.useWindowSize = void 0;
// src/utils/LayoutUtilities.js
const react_1 = require("react");
const NodeSettings_1 = require("../constants/NodeSettings");
const useWindowSize = () => {
    const [windowSize, setWindowSize] = (0, react_1.useState)({
        width: window.innerWidth,
        height: window.innerHeight
    });
    (0, react_1.useEffect)(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return windowSize;
};
exports.useWindowSize = useWindowSize;
const calculateCanvasSize = (elements) => {
    const elementList = Object.values(elements);
    const maxNodeX = Math.max(...elementList.map(element => element.x + element.width));
    const maxNodeY = Math.max(...elementList.map(element => element.y + element.height));
    return {
        width: maxNodeX + NodeSettings_1.X_OFFSET,
        height: maxNodeY + NodeSettings_1.NODE_HEIGHT,
    };
};
exports.calculateCanvasSize = calculateCanvasSize;
