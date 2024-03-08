// util/TextNodeHelpers.js
import { 
    MIN_WIDTH,
    MAX_WIDTH,
 } from "../constants/Node";

export const calculateNodeWidth = (texts) => {
    // 配列内のテキストから最も長いテキストの幅を計算
    const maxTextLength = texts.reduce((max, text) => {
        if (text == undefined) return MIN_WIDTH;
        const textLength = calculateTextWidth(text); // この関数はテキストの幅を計算します
        return Math.max(max, textLength);
    }, 0);
    const widthBasedOnText = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, maxTextLength));
    return widthBasedOnText;
};

export const calculateTextWidth = (text) => {
    // 改行ごとに分割し、最も長い行の幅を計算
    const lines = text.split('\n');
    const regexMultibyte = /[^\u0000-\u00ff]/g;
    // 改行ごとに分割し、最も長い行の幅を計算
    const width = Math.max(...lines.map(line => {
        const multibyteChars = line.match(regexMultibyte) || [];
        const multibyteLength = multibyteChars.length * 14; // マルチバイト文字は1文字20で計算
        const singleByteLength = (line.length - multibyteChars.length) * 7; // それ以外は1文字10で計算
        return multibyteLength + singleByteLength;
    }));
    return width;
};


export const wrapText = (text, maxWidth) => {
    const lines = [];
    let currentLine = '';

    text.split('').forEach(char => {
        const testLine = currentLine + char;
        const testWidth = calculateTextWidth(testLine);

        if (testWidth <= maxWidth || currentLine === '') {
            currentLine = testLine;
        } else {
            lines.push(currentLine);
            currentLine = char;
        }
    });

    if (currentLine) {
        lines.push(currentLine);
    }
    return lines;
};