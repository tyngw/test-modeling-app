// src/utils/clipboard/clipboardHelpers.ts
import { Element } from '../../types/types';
import { ElementsMap } from '../../types/elementTypes';

// クリップボードでの要素データ識別用マーカー
const CLIPBOARD_MARKER_COPY = '<!-- MODELING_APP_COPY_DATA:';
const CLIPBOARD_MARKER_CUT = '<!-- MODELING_APP_CUT_DATA:';
const CLIPBOARD_MARKER_END = ' -->';

/**
 * クリップボードに保存された要素データを解析する
 * @param clipboardText クリップボードのテキスト
 * @returns 解析された要素データとタイプ、またはnull
 */
const parseClipboardElementData = (
  clipboardText: string,
): {
  type: 'copy' | 'cut';
  elements: ElementsMap;
} | null => {
  try {
    let markerStart = '';
    let type: 'copy' | 'cut' = 'copy';

    if (clipboardText.includes(CLIPBOARD_MARKER_COPY)) {
      markerStart = CLIPBOARD_MARKER_COPY;
      type = 'copy';
    } else if (clipboardText.includes(CLIPBOARD_MARKER_CUT)) {
      markerStart = CLIPBOARD_MARKER_CUT;
      type = 'cut';
    } else {
      return null;
    }

    const startIndex = clipboardText.indexOf(markerStart);
    const endIndex = clipboardText.indexOf(CLIPBOARD_MARKER_END, startIndex);

    if (startIndex === -1 || endIndex === -1) {
      return null;
    }

    const dataStart = startIndex + markerStart.length;
    const jsonData = clipboardText.substring(dataStart, endIndex);
    const elements = JSON.parse(jsonData) as ElementsMap;

    return { type, elements };
  } catch (e) {
    console.error('Failed to parse clipboard element data:', e);
    return null;
  }
};

/**
 * 要素データをクリップボード用のテキストに変換する
 * @param elements 要素マップ
 * @param type 'copy' または 'cut'
 * @returns クリップボード用のテキスト
 */
const createClipboardText = (elements: ElementsMap, type: 'copy' | 'cut'): string => {
  const getElementText = (element: Element, depth = 0): string => {
    const children = Object.values(elements).filter((el) => el.parentId === element.id);
    const tabs = '\t'.repeat(depth);
    let result = `${tabs}${element.texts[0]}`;

    if (children.length > 0) {
      result += '\n';
      const childTexts = children.map((child) => getElementText(child, depth + 1));
      result += childTexts.join('\n');
    }

    return result;
  };

  const selectedElement = Object.values(elements).find((el) => el.selected);
  if (!selectedElement) return '';

  const textRepresentation = getElementText(selectedElement);
  const marker = type === 'copy' ? CLIPBOARD_MARKER_COPY : CLIPBOARD_MARKER_CUT;
  const elementData = JSON.stringify(elements);

  return `${textRepresentation}\n\n${marker}${elementData}${CLIPBOARD_MARKER_END}`;
};

/**
 * 指定された要素とその子要素をすべて含む新しい要素マップを作成する
 *
 * @param elements 元の要素マップ
 * @param targetElement 選択された要素
 * @returns 選択された要素とその子要素を含むマップ
 */
export const getSelectedAndChildren = (
  elements: ElementsMap,
  targetElement: Element,
): ElementsMap => {
  const cutElements: ElementsMap = {};
  const elementList = Object.values(elements);
  const rootCopy = { ...targetElement, parentId: null, selected: true };
  cutElements[rootCopy.id] = rootCopy;

  const collectChildren = (parentId: string) => {
    elementList
      .filter((e) => e.parentId === parentId)
      .forEach((child) => {
        const childCopy = { ...child, selected: false };
        cutElements[childCopy.id] = childCopy;
        collectChildren(child.id);
      });
  };

  collectChildren(targetElement.id);
  return cutElements;
};

/**
 * 要素をクリップボードにコピーする
 * 要素データを特別なマーカーと共にクリップボードに保存
 *
 * @param elements コピーする要素のマップ
 */
export const copyToClipboard = (elements: ElementsMap): void => {
  const textToCopy = createClipboardText(elements, 'copy');

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        // Success: text copied to clipboard
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
      });
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      // Success: text copied to clipboard
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
    document.body.removeChild(textArea);
  }
};

/**
 * 要素を切り取ってクリップボードに保存する
 *
 * @param elements 切り取る要素のマップ
 */
export const cutToClipboard = (elements: ElementsMap): void => {
  const textToCopy = createClipboardText(elements, 'cut');

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        // Text copied to clipboard successfully
      })
      .catch((err) => {
        console.error('Failed to copy text to clipboard:', err);
      });
  } else {
    // Fallback for older browsers or non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = textToCopy;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      // Text copied to clipboard using fallback method
    } catch (err) {
      console.error('Failed to copy text to clipboard:', err);
    }
    document.body.removeChild(textArea);
  }
};

/**
 * クリップボードから保存されたコピー要素を取得する
 *
 * @returns 保存された要素マップ、存在しない場合はnull
 */
export const getGlobalCopiedElements = async (): Promise<ElementsMap | null> => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    const parsed = parseClipboardElementData(clipboardText);

    if (parsed && parsed.type === 'copy') {
      return parsed.elements;
    }
    return null;
  } catch (e) {
    console.error('Failed to read clipboard for copied elements:', e);
    return null;
  }
};

/**
 * クリップボードから保存された切り取り要素を取得する
 *
 * @returns 保存された要素マップ、存在しない場合はnull
 */
export const getGlobalCutElements = async (): Promise<ElementsMap | null> => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    const parsed = parseClipboardElementData(clipboardText);

    if (parsed && parsed.type === 'cut') {
      return parsed.elements;
    }
    return null;
  } catch (e) {
    console.error('Failed to read clipboard for cut elements:', e);
    return null;
  }
};

/**
 * クリップボードからテキストを読み取り、階層構造を解析する
 *
 * @returns 解析されたテキスト配列、またはnull
 */
export const readClipboardAsHierarchy = async (): Promise<string[] | null> => {
  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) {
      return null;
    }

    // 単純な改行区切りのテキストとして返す（階層は後で解析）
    const lines = text.split('\n').filter((line) => line.trim() !== '');

    if (lines.length === 0) {
      return null;
    }

    return lines;
  } catch (error) {
    console.error('クリップボード読み取りエラー:', error);
    return null;
  }
};

/**
 * 階層構造テキストを解析して、インデントレベルと内容を分離する
 *
 * @param lines テキスト行の配列
 * @returns 階層情報を含むオブジェクトの配列
 */
export const parseHierarchicalText = (
  lines: string[],
): Array<{
  text: string;
  level: number;
  originalLine: string;
}> => {
  const result = lines.map((line) => {
    // タブまたは連続するスペース（4つ）をインデントとして認識
    const tabMatch = line.match(/^(\t*)/);
    const spaceMatch = line.match(/^( {0,})/);

    let level = 0;
    if (tabMatch && tabMatch[1]) {
      level = tabMatch[1].length; // タブの数
    } else if (spaceMatch && spaceMatch[1]) {
      level = Math.floor(spaceMatch[1].length / 4); // 4スペースを1レベルとして計算
    }

    const text = line.replace(/^[\t ]*/, '').trim(); // インデントを除去

    return {
      text,
      level,
      originalLine: line,
    };
  });

  return result;
};

/**
 * クリップボードベースのペースト処理
 *
 * @returns ペーストするデータ、またはnull
 */
export const getClipboardDataForPaste = async (): Promise<{
  type: 'clipboard' | 'elements';
  data: string[] | ElementsMap | Array<{ text: string; level: number; originalLine: string }>;
} | null> => {
  try {
    const clipboardText = await navigator.clipboard.readText();

    // 1. 要素データが含まれているかチェック
    const parsed = parseClipboardElementData(clipboardText);
    if (parsed) {
      return {
        type: 'elements',
        data: parsed.elements,
      };
    }

    // 2. 通常のテキストとして階層構造を解析
    if (clipboardText && clipboardText.trim()) {
      const lines = clipboardText.split('\n').filter((line) => line.trim() !== '');
      if (lines.length > 0) {
        const hierarchicalData = parseHierarchicalText(lines);
        return {
          type: 'clipboard',
          data: hierarchicalData,
        };
      }
    }

    return null;
  } catch (e) {
    console.error('Failed to read clipboard for paste:', e);
    return null;
  }
};
