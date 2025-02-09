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
Object.defineProperty(exports, "__esModule", { value: true });
// src/components/TextDisplayArea.js
const react_1 = __importStar(require("react"));
const NodeSettings_1 = require("../constants/NodeSettings");
const TextNodeHelpers_1 = require("../utils/TextNodeHelpers");
const TextDisplayArea = (0, react_1.memo)(({ x, y, width, height, text, zoomRatio, onHeightChange }) => {
    const [currentHeight, setCurrentHeight] = (0, react_1.useState)(height);
    const textRef = (0, react_1.useRef)(null);
    const prevText = (0, react_1.useRef)(text);
    const prevWidth = (0, react_1.useRef)(width);
    (0, react_1.useEffect)(() => {
        let animationFrame;
        const updateHeight = () => {
            if (!textRef.current)
                return;
            // ズーム率を渡すように修正
            const wrappedLines = (0, TextNodeHelpers_1.wrapText)(text || '', width, zoomRatio);
            const lineHeightValue = NodeSettings_1.DEFAULT_FONT_SIZE * zoomRatio * NodeSettings_1.LINE_HEIGHT_RATIO;
            // 最小高さにズーム率を反映
            const newHeight = Math.max(wrappedLines.length * lineHeightValue, NodeSettings_1.DEFAULT_SECTION_HEIGHT * zoomRatio);
            if (Math.abs(newHeight - currentHeight) > 1) {
                setCurrentHeight(newHeight);
                onHeightChange(newHeight / zoomRatio);
            }
        };
        // リサイズ時の処理を最適化
        if (text !== prevText.current || width !== prevWidth.current) {
            animationFrame = requestAnimationFrame(updateHeight);
            prevText.current = text;
            prevWidth.current = width;
        }
        return () => cancelAnimationFrame(animationFrame);
    }, [text, width, zoomRatio, currentHeight, onHeightChange]);
    return (react_1.default.createElement("foreignObject", { x: x, y: y, width: width, height: currentHeight, pointerEvents: "none" },
        react_1.default.createElement("div", { ref: textRef, style: {
                fontSize: `${NodeSettings_1.DEFAULT_FONT_SIZE}px`,
                lineHeight: `${NodeSettings_1.LINE_HEIGHT_RATIO}em`,
                fontFamily: `
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            "Helvetica Neue",
            Arial,
            sans-serif
          `,
                width: `${width}px`,
                minHeight: `${NodeSettings_1.DEFAULT_SECTION_HEIGHT}px`,
                padding: '2px 3px',
                overflow: 'hidden',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
            } }, text)));
});
exports.default = TextDisplayArea;
