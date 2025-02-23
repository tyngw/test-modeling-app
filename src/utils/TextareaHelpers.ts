// src/utils/textareaHelpers.ts
import { DEFAULT_ZOOM_RATIO, DEFAULT_FONT_SIZE, SIZE, DEFAULT_FONT_FAMILY } from '../constants/elementSettings';

// 文字幅計算用キャンバスを生成する関数
const createTextMeasurementContext = (): CanvasRenderingContext2D => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  context.font = `${DEFAULT_FONT_SIZE}px ${DEFAULT_FONT_FAMILY}`;
  return context;
};

// テキストの幅を正確に計算する関数
export const calculateTextWidth = (text: string, padding: number = 0): number => {
  const context = createTextMeasurementContext();
  return Math.ceil(
    text.split('\n').reduce((maxWidth: number, line: string) => {
      const lineWidth = context.measureText(line).width;
      return Math.max(maxWidth, lineWidth + padding * 2);
    }, 0)
  );
};

// 要素の幅を計算する関数
export const calculateElementWidth = (texts: string[], padding: number = 0 ): number => {
  const maxTextWidth = texts.reduce((max: number, text: string) => {
    return Math.max(max, calculateTextWidth(text || '', padding));
  }, 0);

  return Math.min(SIZE.WIDTH.MAX, Math.max(SIZE.WIDTH.MIN, maxTextWidth));
};

// テキストを指定された幅に折り返す関数
export const wrapText = (
  text: string,
  maxWidth: number,
  zoomRatio: number = DEFAULT_ZOOM_RATIO
): string[] => {
  const context = createTextMeasurementContext();
  const paragraphs = text.split('\n');
  const wrappedLines: string[] = [];

  paragraphs.forEach(paragraph => {
    let currentLine = '';
    let currentWidth = 0;

    // 単語単位分割（英語対応）
    const words = paragraph.split(/(\s+)/).filter(w => w !== '');

    for (const word of words) {
      const wordWidth = context.measureText(word).width;

      // 単語が行に収まるかチェック
      if (currentWidth + wordWidth > maxWidth) {
        if (currentLine !== '') {
          wrappedLines.push(currentLine);
          currentLine = '';
          currentWidth = 0;
        }

        // 単語が行幅を超える場合、文字単位で分割
        if (wordWidth > maxWidth) {
          for (const char of word) {
            const charWidth = context.measureText(char).width;

            // 現在の行に文字を追加できるかチェック
            if (currentWidth + charWidth > maxWidth) {
              wrappedLines.push(currentLine);
              currentLine = '';
              currentWidth = 0;
            }

            currentLine += char;
            currentWidth += charWidth;
          }
        } else {
          // 単語が行幅を超えるが、文字単位では収まる場合
          currentLine = word;
          currentWidth = wordWidth;
        }
      } else {
        // 単語が現在の行に収まる場合
        currentLine += word;
        currentWidth += wordWidth;
      }
    }

    // 最後の行を追加
    if (currentLine !== '') {
      wrappedLines.push(currentLine);
    }
  });

  return wrappedLines;
};