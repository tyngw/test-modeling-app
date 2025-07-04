// src/utils/clipboard/clipboardHelpers.ts
import { Element } from '../../types/types';
import { ElementsMap } from '../../types/elementTypes';
import { HierarchicalStructure, HierarchicalNode } from '../../types/hierarchicalTypes';
import { findNodeInHierarchy } from '../hierarchical/hierarchicalConverter';

// クリップボード用のデータ構造（階層構造ベース）
export interface ClipboardData {
  type: 'copy' | 'cut';
  rootElement: Element;
  subtree: HierarchicalNode;
}

// クリップボードでの要素データ識別用マーカー
const CLIPBOARD_MARKER_COPY = '<!-- MODELING_APP_COPY_DATA:';
const CLIPBOARD_MARKER_CUT = '<!-- MODELING_APP_CUT_DATA:';
const CLIPBOARD_MARKER_END = ' -->';

/**
 * クリップボードに保存された要素データを解析する（階層構造ベース）
 * @param clipboardText クリップボードのテキスト
 * @returns 解析された階層データとタイプ、またはnull
 */
const parseClipboardElementData = (clipboardText: string): ClipboardData | null => {
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

    // 階層構造データまたは従来のElementsMapデータの両方に対応
    let parsedData;
    try {
      parsedData = JSON.parse(jsonData);
    } catch (e) {
      console.error('Failed to parse JSON data:', e);
      return null;
    }

    // 新しい階層構造データの場合
    if (parsedData.rootElement && parsedData.subtree) {
      return {
        type,
        rootElement: parsedData.rootElement,
        subtree: parsedData.subtree,
      };
    }

    // 従来のElementsMapデータの場合（後方互換性）
    if (typeof parsedData === 'object' && !Array.isArray(parsedData)) {
      const elements = Object.values(parsedData) as Element[];
      const rootElement = elements.find((el) => el.selected);

      if (!rootElement) {
        return null;
      }

      // ElementsMapから階層構造に変換
      const subtree = convertElementsMapToSubtree(parsedData as ElementsMap, rootElement.id);
      if (!subtree) {
        return null;
      }

      return {
        type,
        rootElement,
        subtree,
      };
    }

    return null;
  } catch (e) {
    console.error('Failed to parse clipboard element data:', e);
    return null;
  }
};

/**
 * 階層構造データをクリップボード用のテキストに変換する
 * @param clipboardData クリップボードデータ
 * @returns クリップボード用のテキスト
 */
const createClipboardText = (clipboardData: ClipboardData): string => {
  const getElementText = (node: HierarchicalNode, depth = 0): string => {
    const tabs = '\t'.repeat(depth);
    let result = `${tabs}${node.data.texts[0] || ''}`;

    if (node.children && node.children.length > 0) {
      result += '\n';
      const childTexts = node.children.map((child) => getElementText(child, depth + 1));
      result += childTexts.join('\n');
    }

    return result;
  };

  const textRepresentation = getElementText(clipboardData.subtree);
  if (!textRepresentation || textRepresentation.trim() === '') {
    console.warn('createClipboardText: Generated text representation is empty');
    return '';
  }

  const marker = clipboardData.type === 'copy' ? CLIPBOARD_MARKER_COPY : CLIPBOARD_MARKER_CUT;
  const elementData = JSON.stringify({
    rootElement: clipboardData.rootElement,
    subtree: clipboardData.subtree,
  });

  return `${textRepresentation}\n\n${marker}${elementData}${CLIPBOARD_MARKER_END}`;
};

/**
 * 選択された要素とその子要素を階層構造のサブツリーとして取得
 * @param hierarchicalData 階層構造データ
 * @param targetElement 対象の要素
 * @returns クリップボードデータ
 */
export const getSelectedAndChildren = (
  hierarchicalData: HierarchicalStructure | null,
  targetElement: Element,
): ClipboardData | null => {
  if (!hierarchicalData) {
    // 階層データがない場合は単一要素のサブツリーを作成
    return {
      type: 'copy',
      rootElement: { ...targetElement, selected: true },
      subtree: {
        data: { ...targetElement, selected: true },
        children: undefined,
      },
    };
  }

  const targetNode = findNodeInHierarchy(hierarchicalData, targetElement.id);
  if (!targetNode) {
    return null;
  }

  // サブツリーをディープコピーして選択状態を設定
  const copySubtree = (node: HierarchicalNode, isRoot = false): HierarchicalNode => {
    const copiedData = { ...node.data, selected: isRoot, tempParentId: null };
    const copiedChildren = node.children?.map((child) => copySubtree(child, false));

    return {
      data: copiedData,
      children: copiedChildren && copiedChildren.length > 0 ? copiedChildren : undefined,
    };
  };

  const subtree = copySubtree(targetNode, true);

  return {
    type: 'copy',
    rootElement: subtree.data,
    subtree,
  };
};

/**
 * 要素をクリップボードにコピーする（階層構造ベース）
 * 要素データを特別なマーカーと共にクリップボードに保存
 *
 * @param clipboardData コピーするクリップボードデータ
 * @returns Promise<boolean> コピーが成功したかどうか
 */
export const copyToClipboard = async (clipboardData: ClipboardData): Promise<boolean> => {
  const textToCopy = createClipboardText(clipboardData);

  // 空のテキストの場合は失敗として扱う
  if (!textToCopy || textToCopy.trim() === '') {
    console.error('No text to copy - clipboard data may be empty or invalid');
    return false;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    } else {
      // フォールバック処理の改善
      return await fallbackCopyToClipboard(textToCopy);
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};

/**
 * 要素を切り取ってクリップボードに保存する（階層構造ベース）
 *
 * @param clipboardData 切り取るクリップボードデータ
 * @returns Promise<boolean> 切り取りが成功したかどうか
 */
export const cutToClipboard = async (clipboardData: ClipboardData): Promise<boolean> => {
  // 切り取り用にタイプを変更
  const cutData: ClipboardData = {
    ...clipboardData,
    type: 'cut',
  };

  const textToCopy = createClipboardText(cutData);

  // 空のテキストの場合は失敗として扱う
  if (!textToCopy || textToCopy.trim() === '') {
    console.error('No text to cut - clipboard data may be empty or invalid');
    return false;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(textToCopy);
      return true;
    } else {
      // フォールバック処理の改善
      return await fallbackCopyToClipboard(textToCopy);
    }
  } catch (err) {
    console.error('Failed to cut to clipboard:', err);
    return false;
  }
};

/**
 * フォールバック用のクリップボードコピー処理
 * @param text コピーするテキスト
 * @returns Promise<boolean> コピーが成功したかどうか
 */
const fallbackCopyToClipboard = (text: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);

    try {
      textArea.focus();
      textArea.select();

      // iOS Safari対応
      textArea.setSelectionRange(0, 99999);

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      resolve(successful);
    } catch (err) {
      console.error('Fallback copy failed:', err);
      document.body.removeChild(textArea);
      resolve(false);
    }
  });
};

/**
 * クリップボードから保存されたコピー要素を取得する（階層構造ベース）
 *
 * @returns 保存されたクリップボードデータ、存在しない場合はnull
 */
export const getGlobalCopiedElements = async (): Promise<ClipboardData | null> => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    const parsed = parseClipboardElementData(clipboardText);

    if (parsed && parsed.type === 'copy') {
      return parsed;
    }
    return null;
  } catch (e) {
    console.error('Failed to read clipboard for copied elements:', e);
    return null;
  }
};

/**
 * クリップボードから保存された切り取り要素を取得する（階層構造ベース）
 *
 * @returns 保存されたクリップボードデータ、存在しない場合はnull
 */
export const getGlobalCutElements = async (): Promise<ClipboardData | null> => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    const parsed = parseClipboardElementData(clipboardText);

    if (parsed && parsed.type === 'cut') {
      return parsed;
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
 * クリップボードベースのペースト処理（階層構造ベース）
 *
 * @returns ペーストするデータ、またはnull
 */
export const getClipboardDataForPaste = async (): Promise<{
  type: 'clipboard' | 'elements';
  data: string[] | ClipboardData | Array<{ text: string; level: number; originalLine: string }>;
} | null> => {
  try {
    const clipboardText = await navigator.clipboard.readText();

    // 1. 要素データが含まれているかチェック
    const parsed = parseClipboardElementData(clipboardText);
    if (parsed) {
      return {
        type: 'elements',
        data: parsed,
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

/**
 * ElementsMapから階層構造のサブツリーに変換する（後方互換性用）
 * @param elementsMap 要素マップ
 * @param rootElementId ルート要素のID
 * @returns HierarchicalNode または null
 */
const convertElementsMapToSubtree = (
  elementsMap: ElementsMap,
  rootElementId: string,
): HierarchicalNode | null => {
  const rootElement = elementsMap[rootElementId];
  if (!rootElement) {
    return null;
  }

  const buildNode = (elementId: string): HierarchicalNode => {
    const element = elementsMap[elementId];
    const children: HierarchicalNode[] = [];

    // tempParentIdを使って子要素を見つける
    Object.values(elementsMap).forEach((el) => {
      if (el.tempParentId === elementId) {
        const childNode = buildNode(el.id);
        children.push(childNode);
      }
    });

    return {
      data: element,
      children: children.length > 0 ? children : undefined,
    };
  };

  return buildNode(rootElementId);
};
