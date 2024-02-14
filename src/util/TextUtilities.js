export const calculateNodeWidth = (text) => {
    const minWidth = 80;
    const maxWidth = 200;
    const textLength = calculateTextWidth(text);
    const widthBasedOnText = Math.max(minWidth, Math.min(maxWidth, textLength));
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