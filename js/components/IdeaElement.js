"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const CanvasContext_1 = require("../context/CanvasContext");
const TextDisplayArea_1 = __importDefault(require("./TextDisplayArea"));
const TextNodeHelpers_1 = require("../utils/TextNodeHelpers");
const NodeSettings_1 = require("../constants/NodeSettings");
const SECTION_KEYS = ['text', 'text2', 'text3'];
const IdeaElement = ({ element, overDropTarget, handleMouseDown, handleMouseUp }) => {
    const { state, dispatch } = (0, CanvasContext_1.useCanvas)();
    const parentNode = state.elements[element.parentId];
    const overDropTargetId = (overDropTarget === null || overDropTarget === void 0 ? void 0 : overDropTarget.id) || -1;
    const sectionHeights = [
        element.section1Height,
        element.section2Height,
        element.section3Height
    ];
    const handleHeightChange = (0, react_1.useCallback)((sectionIndex, newHeight) => {
        const sectionKey = `section${sectionIndex + 1}Height`;
        const currentHeight = element[sectionKey];
        if (Math.abs(newHeight - currentHeight) > 1) {
            const newSectionHeights = [...sectionHeights];
            newSectionHeights[sectionIndex] = newHeight;
            // ノード幅をテキストに合わせて自動調整
            const texts = [element.text, element.text2, element.text3];
            const newWidth = (0, TextNodeHelpers_1.calculateNodeWidth)(texts);
            dispatch({
                type: 'UPDATE_NODE_SIZE',
                payload: {
                    id: element.id,
                    width: newWidth,
                    height: element.height + (newHeight - currentHeight),
                    sectionHeights: newSectionHeights
                }
            });
        }
    }, [dispatch, element, sectionHeights]);
    const handleSelect = (e) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT_NODE', payload: element.id });
    };
    const renderConnectionPath = (0, react_1.useCallback)(() => {
        if (!parentNode)
            return null;
        const totalHeight = element.height;
        const pathCommands = [
            `M ${element.x},${element.y + totalHeight / 2}`,
            `C ${element.x - NodeSettings_1.CURVE_CONTROL_OFFSET},${element.y + totalHeight / 2}`,
            `${parentNode.x + parentNode.width + NodeSettings_1.CURVE_CONTROL_OFFSET},${parentNode.y + parentNode.height / 2}`,
            `${parentNode.x + parentNode.width + NodeSettings_1.ARROW_OFFSET},${parentNode.y + parentNode.height / 2}`
        ].join(' ');
        return (react_1.default.createElement("path", { d: pathCommands, stroke: "black", strokeWidth: "2", fill: "none", markerEnd: "url(#arrowhead)" }));
    }, [parentNode, element]);
    return (react_1.default.createElement(react_1.default.Fragment, { key: element.id },
        renderConnectionPath(),
        react_1.default.createElement("rect", { x: element.x, y: element.y, width: element.width, height: element.height, className: `element ${element.selected ? 'element-selected' : 'element-unselected'}`, rx: "2", onClick: handleSelect, onDoubleClick: () => dispatch({ type: 'EDIT_NODE' }), onMouseDown: (e) => handleMouseDown(e, element), onMouseUp: handleMouseUp, style: {
                fill: element.id === overDropTargetId ? 'lightblue' : 'white',
                pointerEvents: 'all'
            } }),
        SECTION_KEYS.map((key, index) => (react_1.default.createElement(react_1.default.Fragment, { key: `${element.id}-section-${index}` },
            react_1.default.createElement(TextDisplayArea_1.default, { x: element.x, y: element.y + sectionHeights.slice(0, index).reduce((sum, h) => sum + h, 0), width: element.width, height: sectionHeights[index], text: element[key], fontSize: NodeSettings_1.DEFAULT_FONT_SIZE, zoomRatio: state.zoomRatio, onHeightChange: (newHeight) => handleHeightChange(index, newHeight) }),
            index < SECTION_KEYS.length - 1 && (react_1.default.createElement("line", { x1: element.x, y1: element.y + sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0), x2: element.x + element.width, y2: element.y + sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0), stroke: "black", strokeWidth: "1" })))))));
};
exports.default = react_1.default.memo(IdeaElement);
