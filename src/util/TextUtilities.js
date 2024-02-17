export const calculateNodeWidth = (texts) => {
    const minWidth = 80;
    const maxWidth = 300;
    // 配列内のテキストから最も長いテキストの幅を計算
    const maxTextLength = texts.reduce((max, text) => {
        const textLength = calculateTextWidth(text); // この関数はテキストの幅を計算します
        return Math.max(max, textLength);
    }, 0);
    const widthBasedOnText = Math.max(minWidth, Math.min(maxWidth, maxTextLength));
    return widthBasedOnText;
};

export const calculateTextWidth = (text) => {
    const textLength = text.length * 10;
    return textLength;
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