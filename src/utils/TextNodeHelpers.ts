// src/utils/TextNodeHelpers.js
import { DEFAULT_ZOOM_RATIO, DEFAULT_FONT_SIZE, MIN_WIDTH, MAX_WIDTH, MULTIBYTE_CHAR_COEFFICIENT, SINGLEBYTE_CHAR_COEFFICIENT } from '../constants/NodeSettings';

export const calculateTextWidth = (text, zoomRatio = DEFAULT_ZOOM_RATIO) => {
  // const effectiveFontSize = DEFAULT_FONT_SIZE * Math.sqrt(zoomRatio);
  const effectiveFontSize = DEFAULT_FONT_SIZE * zoomRatio;
  
  return Math.ceil(
    text.split('\n').reduce((maxWidth, line) => {
      const multibyteCount = (line.match(/[\u{3000}-\u{FFFF}]/gu) || []).length;
      const singlebyteCount = line.length - multibyteCount;
      const lineWidth = multibyteCount * effectiveFontSize * MULTIBYTE_CHAR_COEFFICIENT + singlebyteCount * effectiveFontSize * SINGLEBYTE_CHAR_COEFFICIENT;
      return Math.max(maxWidth, lineWidth);
    }, 0)
  );
};

export const calculateNodeWidth = (texts, zoomRatio = DEFAULT_ZOOM_RATIO) => {
  const maxTextWidth = texts.reduce((max, text) => {
    return Math.max(max, calculateTextWidth(text || '', zoomRatio));
  }, 0);

  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, maxTextWidth));
};

export const wrapText = (text, maxWidth, zoomRatio = DEFAULT_ZOOM_RATIO) => {
  // 既存の改行でテキストを分割
  const paragraphs = text.split('\n');
  const wrappedLines = [];
  
  paragraphs.forEach(paragraph => {
    // 空の段落の場合の処理
    if (paragraph === '') {
      wrappedLines.push('');
      return;
    }
    
    // 段落内の自動折り返し処理
    let currentLine = [];
    let currentWidth = 0;
    
    paragraph.split('').forEach(char => {
      const charWidth = calculateTextWidth(char, zoomRatio);
      
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