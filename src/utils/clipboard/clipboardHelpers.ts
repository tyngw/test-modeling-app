// src/utils/clipboard/clipboardHelpers.ts
import { Element } from '../../types/types';
import { ElementsMap } from '../../types/elementTypes';
import {
  getCutElements,
  setCutElements,
  getCopiedElements,
  setCopiedElements,
} from '../storage/localStorageHelpers';

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
 * LocalStorageに保存し、テキスト形式でもクリップボードに格納
 *
 * @param elements コピーする要素のマップ
 */
export const copyToClipboard = (elements: ElementsMap): void => {
  // Store elements in localStorage for cross-tab usage
  setCopiedElements(JSON.stringify(elements));

  // Continue with standard text clipboard functionality
  const getElementText = (element: Element, depth = 0): string => {
    const children = Object.values(elements).filter((el) => el.parentId === element.id);
    const childTexts = children.map((child) => getElementText(child, depth + 1));
    const tabs = '\t'.repeat(depth);
    return `${tabs}${element.texts[0]}
${childTexts.join('')}`;
  };

  const selectedElement = Object.values(elements).find((el) => el.selected);
  if (!selectedElement) return;
  const textToCopy = getElementText(selectedElement);

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
  // Store elements in localStorage for cross-tab usage
  setCutElements(JSON.stringify(elements));

  // Continue with standard text clipboard functionality
  const getElementText = (element: Element, depth = 0): string => {
    const children = Object.values(elements).filter((el) => el.parentId === element.id);
    const childTexts = children.map((child) => getElementText(child, depth + 1));
    const tabs = '\t'.repeat(depth);
    return `${tabs}${element.texts[0]}
${childTexts.join('')}`;
  };

  const selectedElement = Object.values(elements).find((el) => el.selected);
  if (!selectedElement) return;
  const textToCopy = getElementText(selectedElement);

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
 * LocalStorageからクリップボードに保存されたコピー要素を取得する
 *
 * @returns 保存された要素マップ、存在しない場合はnull
 */
export const getGlobalCopiedElements = (): ElementsMap | null => {
  const stored = getCopiedElements();
  if (!stored) return null;

  try {
    return JSON.parse(stored) as ElementsMap;
  } catch (e) {
    console.error('Failed to parse copied elements:', e);
    return null;
  }
};

/**
 * LocalStorageからクリップボードに保存された要素を取得する
 *
 * @returns 保存された要素マップ、存在しない場合はnull
 */
export const getGlobalCutElements = (): ElementsMap | null => {
  const stored = getCutElements();
  if (!stored) return null;

  try {
    return JSON.parse(stored) as ElementsMap;
  } catch (e) {
    console.error('Failed to parse cut elements:', e);
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
 * LocalStorageはフォールバックとして使用
 *
 * @returns ペーストするデータ、またはnull
 */
export const getClipboardDataForPaste = async (): Promise<{
  type: 'clipboard' | 'localStorage';
  data: string[] | ElementsMap | Array<{ text: string; level: number; originalLine: string }>;
} | null> => {
  // 1. まずクリップボードから読み取りを試行
  const clipboardTexts = await readClipboardAsHierarchy();
  if (clipboardTexts && clipboardTexts.length > 0) {
    // 階層構造を解析
    const hierarchicalData = parseHierarchicalText(clipboardTexts);
    return {
      type: 'clipboard',
      data: hierarchicalData,
    };
  }

  // 2. フォールバック: LocalStorageから要素を取得
  const globalCutElements = getGlobalCutElements();
  if (globalCutElements && Object.keys(globalCutElements).length > 0) {
    return {
      type: 'localStorage',
      data: globalCutElements,
    };
  }

  const globalCopiedElements = getGlobalCopiedElements();
  if (globalCopiedElements && Object.keys(globalCopiedElements).length > 0) {
    return {
      type: 'localStorage',
      data: globalCopiedElements,
    };
  }

  return null;
};
