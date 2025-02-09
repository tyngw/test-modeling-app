"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useClickOutside = void 0;
const react_1 = require("react");
const CanvasContext_1 = require("../context/CanvasContext");
const useClickOutside = (svgRef, editingNode) => {
    const { dispatch } = (0, CanvasContext_1.useCanvas)();
    (0, react_1.useEffect)(() => {
        const svg = svgRef.current;
        const handleMouseDown = (e) => {
            if (e.target.tagName === 'svg') {
                dispatch({ type: 'DESELECT_ALL' });
                if (editingNode)
                    dispatch({ type: 'END_EDITING' });
            }
        };
        svg.addEventListener('mousedown', handleMouseDown);
        return () => {
            svg.removeEventListener('mousedown', handleMouseDown);
        };
    }, [svgRef, editingNode, dispatch]);
};
exports.useClickOutside = useClickOutside;
