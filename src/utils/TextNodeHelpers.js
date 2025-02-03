// utils/TextNodeHelpers.js
import { MIN_WIDTH, MAX_WIDTH, MULTIBYTE_CHAR_WIDTH, SINGLEBYTE_CHAR_WIDTH } from '../constants/Node';

export const calculateTextWidth = (text) => {
  const lines = text?.split('\n') || [];
  const regexMultibyte = /[\u{3000}-\u{FFFF}]/gu;
  
  return Math.max(...lines.map(line => {
    const multibyteCount = (line.match(regexMultibyte) || []).length;
    return multibyteCount * MULTIBYTE_CHAR_WIDTH + 
      (line.length - multibyteCount) * SINGLEBYTE_CHAR_WIDTH;
  }));
};

export const calculateNodeWidth = (texts) => {
  const maxWidth = texts.reduce((max, text) => {
    const width = calculateTextWidth(text || '');
    return Math.max(max, width);
  }, 0);
  
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, maxWidth));
};

export const wrapText = (text, maxWidth) => {
  const lines = [];
  let currentLine = '';

  const pushLine = () => {
    lines.push(currentLine);
    currentLine = '';
  };

  for (const char of text) {
    const testLine = currentLine + char;
    if (calculateTextWidth(testLine) > maxWidth) pushLine();
    currentLine += char;
  }

  if (currentLine) pushLine();
  return lines;
};