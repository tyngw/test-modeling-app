export const calculateNodeWidth = (texts) => {
    const minWidth = 80;
    const maxWidth = 200;
    // 配列内のテキストから最も長いテキストの幅を計算
    const maxTextLength = texts.reduce((max, text) => {
        const textLength = calculateTextWidth(text); // この関数はテキストの幅を計算します
        return Math.max(max, textLength);
    }, 0);
    const widthBasedOnText = Math.max(minWidth, Math.min(maxWidth, maxTextLength));
    return widthBasedOnText;
};

export const calculateTextWidth = (text) => {
    // マルチバイト文字を見つけるための正規表現
    const regexMultibyte = /[^\x00-\xff]/g;
    const multibyteChars = text.match(regexMultibyte) || [];
    const multibyteLength = multibyteChars.length * 20; // マルチバイト文字は1文字20で計算

    // 単バイト文字の数 = 全体の文字数 - マルチバイト文字の数
    const singleByteLength = (text.length - multibyteChars.length) * 10; // それ以外は1文字10で計算

    return multibyteLength + singleByteLength;
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