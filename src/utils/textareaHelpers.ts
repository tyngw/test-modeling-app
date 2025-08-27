// src/utils/textareaHelpers.ts
import {
  DEFAULT_ZOOM_RATIO,
  DEFAULT_FONT_SIZE,
  SIZE,
  DEFAULT_FONT_FAMILY,
} from '../config/elementSettings';

const createTextMeasurementContext = (): CanvasRenderingContext2D => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to get 2D context from canvas');
  }
  context.font = `${DEFAULT_FONT_SIZE}px ${DEFAULT_FONT_FAMILY}`;
  return context;
};

export const calculateTextWidth = (text: string, padding = 0): number => {
  const context = createTextMeasurementContext();
  return Math.ceil(
    text.split('\n').reduce((maxWidth: number, line: string) => {
      const lineWidth = context.measureText(line).width;
      return Math.max(maxWidth, lineWidth + padding * 2);
    }, 0),
  );
};

export const calculateElementWidth = (texts: string[], padding = 0): number => {
  const maxTextWidth = texts.reduce((max: number, text: string) => {
    return Math.max(max, calculateTextWidth(text || '', padding));
  }, 0);

  return Math.min(SIZE.WIDTH.MAX, Math.max(SIZE.WIDTH.MIN, maxTextWidth));
};

export const wrapText = (
  text: string,
  maxWidth: number,
  _zoomRatio: number = DEFAULT_ZOOM_RATIO,
): string[] => {
  if (!text || maxWidth <= 0) {
    return text ? [text] : [''];
  }

  const context = createTextMeasurementContext();
  const paragraphs = text.split('\n');
  const wrappedLines: string[] = [];

  paragraphs.forEach((paragraph) => {
    if (paragraph.trim() === '') {
      wrappedLines.push('');
      return;
    }

    let currentLine = '';
    let currentWidth = 0;

    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(paragraph);

    if (hasJapanese) {
      for (let i = 0; i < paragraph.length; i++) {
        const char = paragraph[i];
        const charWidth = context.measureText(char).width;

        if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
          wrappedLines.push(currentLine);
          currentLine = char;
          currentWidth = charWidth;
        } else {
          currentLine += char;
          currentWidth += charWidth;
        }
      }
    } else {
      const words = paragraph.split(/(\s+)/).filter((w) => w !== '');

      for (const word of words) {
        const wordWidth = context.measureText(word).width;

        if (currentWidth + wordWidth > maxWidth) {
          if (currentLine !== '') {
            wrappedLines.push(currentLine);
            currentLine = '';
            currentWidth = 0;
          }

          if (wordWidth > maxWidth) {
            for (const char of word) {
              const charWidth = context.measureText(char).width;

              if (currentWidth + charWidth > maxWidth && currentLine.length > 0) {
                wrappedLines.push(currentLine);
                currentLine = '';
                currentWidth = 0;
              }

              currentLine += char;
              currentWidth += charWidth;
            }
          } else {
            currentLine = word;
            currentWidth = wordWidth;
          }
        } else {
          currentLine += word;
          currentWidth += wordWidth;
        }
      }
    }

    if (currentLine !== '') {
      wrappedLines.push(currentLine);
    }
  });

  return wrappedLines;
};

export const calculateTextHeight = (
  text: string,
  maxWidth: number,
  zoomRatio = DEFAULT_ZOOM_RATIO,
  fontSize = DEFAULT_FONT_SIZE,
  lineHeightRatio = 1.4,
): number => {
  if (!text || text.trim() === '') {
    return fontSize * lineHeightRatio * zoomRatio;
  }

  const wrappedLines = wrapText(text, maxWidth, zoomRatio);
  const lineHeight = fontSize * lineHeightRatio * zoomRatio;
  return wrappedLines.length * lineHeight;
};
