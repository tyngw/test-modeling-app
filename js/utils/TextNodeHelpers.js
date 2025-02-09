"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapText = exports.calculateNodeWidth = exports.calculateTextWidth = void 0;
// src/utils/TextNodeHelpers.ts
const NodeSettings_1 = require("../constants/NodeSettings");
const calculateTextWidth = (text, zoomRatio = NodeSettings_1.DEFAULT_ZOOM_RATIO) => {
    const effectiveFontSize = NodeSettings_1.DEFAULT_FONT_SIZE * zoomRatio;
    return Math.ceil(text.split('\n').reduce((maxWidth, line) => {
        const multibyteCount = (line.match(/[\u{3000}-\u{FFFF}]/gu) || []).length;
        const singlebyteCount = line.length - multibyteCount;
        const lineWidth = multibyteCount * effectiveFontSize * NodeSettings_1.MULTIBYTE_CHAR_COEFFICIENT + singlebyteCount * effectiveFontSize * NodeSettings_1.SINGLEBYTE_CHAR_COEFFICIENT;
        return Math.max(maxWidth, lineWidth);
    }, 0));
};
exports.calculateTextWidth = calculateTextWidth;
const calculateNodeWidth = (texts, zoomRatio = NodeSettings_1.DEFAULT_ZOOM_RATIO) => {
    const maxTextWidth = texts.reduce((max, text) => {
        return Math.max(max, (0, exports.calculateTextWidth)(text || '', zoomRatio));
    }, 0);
    return Math.min(NodeSettings_1.MAX_WIDTH, Math.max(NodeSettings_1.MIN_WIDTH, maxTextWidth));
};
exports.calculateNodeWidth = calculateNodeWidth;
const wrapText = (text, maxWidth, zoomRatio = NodeSettings_1.DEFAULT_ZOOM_RATIO) => {
    const paragraphs = text.split('\n');
    const wrappedLines = [];
    paragraphs.forEach((paragraph) => {
        if (paragraph === '') {
            wrappedLines.push('');
            return;
        }
        let currentLine = [];
        let currentWidth = 0;
        paragraph.split('').forEach((char) => {
            const charWidth = (0, exports.calculateTextWidth)(char, zoomRatio);
            if (currentWidth + charWidth > maxWidth) {
                wrappedLines.push(currentLine.join(''));
                currentLine = [];
                currentWidth = 0;
            }
            currentLine.push(char);
            currentWidth += charWidth;
        });
        if (currentLine.length > 0) {
            wrappedLines.push(currentLine.join(''));
        }
    });
    return wrappedLines;
};
exports.wrapText = wrapText;
