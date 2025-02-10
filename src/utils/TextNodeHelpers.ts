// src/utils/TextNodeHelpers.ts
import { DEFAULT_ZOOM_RATIO, DEFAULT_FONT_SIZE, MIN_WIDTH, MAX_WIDTH, MULTIBYTE_CHAR_COEFFICIENT, SINGLEBYTE_CHAR_COEFFICIENT } from '../constants/NodeSettings';

export const calculateTextWidth = (text: string, zoomRatio: number = DEFAULT_ZOOM_RATIO): number => {
  // const effectiveFontSize = DEFAULT_FONT_SIZE * Math.sqrt(zoomRatio);
  const effectiveFontSize = DEFAULT_FONT_SIZE * zoomRatio;
  
  return Math.ceil(
    text.split('\n').reduce((maxWidth: number, line: string) => {
      const multibyteCount = (line.match(/[\u{3000}-\u{FFFF}]/gu) || []).length;
      const singlebyteCount = line.length - multibyteCount;
      const lineWidth = multibyteCount * effectiveFontSize * MULTIBYTE_CHAR_COEFFICIENT + singlebyteCount * effectiveFontSize * SINGLEBYTE_CHAR_COEFFICIENT;
      return Math.max(maxWidth, lineWidth);
    }, 0)
  );
};

export const calculateNodeWidth = (texts: string[], zoomRatio: number = DEFAULT_ZOOM_RATIO): number => {
  const maxTextWidth = texts.reduce((max: number, text: string) => {
    return Math.max(max, calculateTextWidth(text || '', zoomRatio));
  }, 0);

  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, maxTextWidth));
};

export const wrapText = (text: string, maxWidth: number, zoomRatio: number = DEFAULT_ZOOM_RATIO): string[] => {
  // 既存の改行でテキストを分割
  const paragraphs = text.split('\n');
  const wrappedLines: string[] = [];
  
  paragraphs.forEach((paragraph: string) => {
    // 空の段落の場合の処理
    if (paragraph === '') {
      wrappedLines.push('');
      return;
    }
    
    // 段落内の自動折り返し処理
    let currentLine: string[] = [];
    let currentWidth = 0;
    
    paragraph.split('').forEach((char: string) => {
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