// src/utils/clipboard/clipboardHelpers.ts
import { Element } from '../../types/types';
import { ElementsMap } from '../../types/elementTypes';
import { HierarchicalStructure, HierarchicalNode } from '../../types/hierarchicalTypes';
import { findNodeInHierarchy } from '../hierarchical/hierarchicalConverter';
import { getIndentSpacesPerLevel } from '../storage/localStorageHelpers';
import { debugLog } from '../debugLogHelpers';

// クリップボード用のデータ構造（階層構造ベース）
export interface ClipboardData {
  type: 'copy' | 'cut';
  rootElement: Element;
  subtree: HierarchicalNode;
}

// クリップボードでの要素データ識別用マーカー
const CLIPBOARD_MARKER_COPY = '<!-- MODELING_APP_COPY_DATA:';
const CLIPBOARD_MARKER_CUT = '<!-- MODELING_APP_CUT_DATA:';
const CLIPBOARD_MARKER_MULTIPLE_COPY = '<!-- MODELING_APP_MULTIPLE_COPY_DATA:';
const CLIPBOARD_MARKER_MULTIPLE_CUT = '<!-- MODELING_APP_MULTIPLE_CUT_DATA:';
const CLIPBOARD_MARKER_END = ' -->';

/**
 * クリップボードに保存された要素データを解析する（階層構造ベース）
 * @param clipboardText クリップボードのテキスト
 * @returns 解析された階層データとタイプ、またはnull。複数要素の場合はClipboardData[]を返す
 */
const parseClipboardElementData = (
  clipboardText: string,
): ClipboardData | ClipboardData[] | null => {
  try {
    // 複数要素形式をチェック
    const isMultipleCopy = clipboardText.includes(CLIPBOARD_MARKER_MULTIPLE_COPY);
    const isMultipleCut = clipboardText.includes(CLIPBOARD_MARKER_MULTIPLE_CUT);

    if (isMultipleCopy || isMultipleCut) {
      const marker = isMultipleCopy
        ? CLIPBOARD_MARKER_MULTIPLE_COPY
        : CLIPBOARD_MARKER_MULTIPLE_CUT;
      const startIndex = clipboardText.indexOf(marker);
      const endIndex = clipboardText.indexOf(CLIPBOARD_MARKER_END, startIndex);

      if (startIndex === -1 || endIndex === -1) {
        return null;
      }

      const dataStart = startIndex + marker.length;
      const jsonData = clipboardText.substring(dataStart, endIndex);

      try {
        const parsedArray = JSON.parse(jsonData);
        if (Array.isArray(parsedArray)) {
          return parsedArray.map((item) => ({
            type: isMultipleCopy ? ('copy' as const) : ('cut' as const),
            rootElement: item.rootElement,
            subtree: item.subtree,
          }));
        }
      } catch (e) {
        debugLog('Failed to parse multiple JSON data:', e);
        return null;
      }
    }

    // 単一要素形式
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
      debugLog('Failed to parse JSON data:', e);
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
    debugLog('Failed to parse clipboard element data:', e);
    return null;
  }
};

/**
 * Elementからレイアウト情報（x, y, width, height, sectionHeights）を除外したバージョンを作成
 * クリップボード保存時は復元可能な情報のみを保持する
 * @param element 要素
 * @returns レイアウト情報を除外した要素
 */
const stripLayoutInfo = (
  element: Element,
): Omit<Element, 'x' | 'y' | 'width' | 'height' | 'sectionHeights'> & {
  x?: never;
  y?: never;
  width?: never;
  height?: never;
  sectionHeights?: never;
} => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { x, y, width, height, sectionHeights, ...rest } = element;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rest as any;
};

/**
 * 階層構造ノードからレイアウト情報を除外したバージョンを作成
 * @param node 階層ノード
 * @returns レイアウト情報を除外した階層ノード
 */
const stripLayoutInfoFromNode = (node: HierarchicalNode): HierarchicalNode => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: stripLayoutInfo(node.data) as any,
    children: node.children ? node.children.map(stripLayoutInfoFromNode) : undefined,
  };
};

/**
 * 階層構造データをクリップボード用のテキストに変換する
 * @param clipboardData クリップボードデータ（単一または複数）
 * @returns クリップボード用のテキスト
 */
const createClipboardText = (clipboardData: ClipboardData | ClipboardData[]): string => {
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

  // 複数要素の場合
  if (Array.isArray(clipboardData)) {
    const textRepresentations: string[] = [];
    clipboardData.forEach((data) => {
      const text = getElementText(data.subtree);
      if (text && text.trim() !== '') {
        textRepresentations.push(text);
      }
    });

    const textRepresentation = textRepresentations.join('\n');
    if (!textRepresentation || textRepresentation.trim() === '') {
      debugLog('createClipboardText: Generated text representation is empty');
      return '';
    }

    const marker =
      clipboardData[0]?.type === 'copy'
        ? CLIPBOARD_MARKER_MULTIPLE_COPY
        : CLIPBOARD_MARKER_MULTIPLE_CUT;
    // レイアウト情報を削除したバージョンをクリップボードに保存
    const elementData = JSON.stringify(
      clipboardData.map((data) => ({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rootElement: stripLayoutInfo(data.rootElement) as any,
        subtree: stripLayoutInfoFromNode(data.subtree),
      })),
    );

    return `${textRepresentation}\n\n${marker}${elementData}${CLIPBOARD_MARKER_END}`;
  }

  // 単一要素の場合
  const textRepresentation = getElementText(clipboardData.subtree);
  if (!textRepresentation || textRepresentation.trim() === '') {
    debugLog('createClipboardText: Generated text representation is empty');
    return '';
  }

  const marker = clipboardData.type === 'copy' ? CLIPBOARD_MARKER_COPY : CLIPBOARD_MARKER_CUT;
  // レイアウト情報を削除したバージョンをクリップボードに保存
  const elementData = JSON.stringify({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rootElement: stripLayoutInfo(clipboardData.rootElement) as any,
    subtree: stripLayoutInfoFromNode(clipboardData.subtree),
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
 * @param clipboardData コピーするクリップボードデータ（単一または複数）
 * @returns Promise<boolean> コピーが成功したかどうか
 */
export const copyToClipboard = async (
  clipboardData: ClipboardData | ClipboardData[],
): Promise<boolean> => {
  const textToCopy = createClipboardText(clipboardData);

  // 空のテキストの場合は失敗として扱う
  if (!textToCopy || textToCopy.trim() === '') {
    debugLog('No text to copy - clipboard data may be empty or invalid');
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
    debugLog('Failed to copy to clipboard:', err);
    return false;
  }
};

/**
 * 要素を切り取ってクリップボードに保存する（階層構造ベース）
 *
 * @param clipboardData 切り取るクリップボードデータ（単一または複数）
 * @returns Promise<boolean> 切り取りが成功したかどうか
 */
export const cutToClipboard = async (
  clipboardData: ClipboardData | ClipboardData[],
): Promise<boolean> => {
  // 切り取り用にタイプを変更
  const cutData: ClipboardData | ClipboardData[] = Array.isArray(clipboardData)
    ? clipboardData.map((data) => ({
        ...data,
        type: 'cut' as const,
      }))
    : {
        ...clipboardData,
        type: 'cut',
      };

  const textToCopy = createClipboardText(cutData);

  // 空のテキストの場合は失敗として扱う
  if (!textToCopy || textToCopy.trim() === '') {
    debugLog('No text to cut - clipboard data may be empty or invalid');
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
    debugLog('Failed to cut to clipboard:', err);
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
      debugLog('Fallback copy failed:', err);
      document.body.removeChild(textArea);
      resolve(false);
    }
  });
};

/**
 * クリップボードから保存されたコピー要素を取得する（階層構造ベース）
 *
 * @returns 保存されたクリップボードデータ（単一または複数）、存在しない場合はnull
 */
export const getGlobalCopiedElements = async (): Promise<
  ClipboardData | ClipboardData[] | null
> => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    const parsed = parseClipboardElementData(clipboardText);

    if (!parsed) return null;

    if (Array.isArray(parsed)) {
      // 複数要素形式で、すべてcopyタイプかチェック
      if (parsed.every((item) => item.type === 'copy')) {
        return parsed;
      }
    } else {
      // 単一要素形式
      if (parsed.type === 'copy') {
        return parsed;
      }
    }

    return null;
  } catch (e) {
    debugLog('Failed to read clipboard for copied elements:', e);
    return null;
  }
};

/**
 * クリップボードから保存された切り取り要素を取得する（階層構造ベース）
 *
 * @returns 保存されたクリップボードデータ（単一または複数）、存在しない場合はnull
 */
export const getGlobalCutElements = async (): Promise<ClipboardData | ClipboardData[] | null> => {
  try {
    const clipboardText = await navigator.clipboard.readText();
    const parsed = parseClipboardElementData(clipboardText);

    if (!parsed) return null;

    if (Array.isArray(parsed)) {
      // 複数要素形式で、すべてcutタイプかチェック
      if (parsed.every((item) => item.type === 'cut')) {
        return parsed;
      }
    } else {
      // 単一要素形式
      if (parsed.type === 'cut') {
        return parsed;
      }
    }

    return null;
  } catch (e) {
    debugLog('Failed to read clipboard for cut elements:', e);
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
    debugLog('クリップボード読み取りエラー:', error);
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
  const spacesPerLevel = getIndentSpacesPerLevel();

  const result = lines.map((line) => {
    // タブまたは連続するスペースをインデントとして認識
    let whitespaceLength = 0;
    let tabCount = 0;
    while (whitespaceLength < line.length) {
      const codePoint = line.charCodeAt(whitespaceLength);
      if (codePoint === 9) {
        tabCount += 1;
        whitespaceLength += 1;
        continue;
      }
      if (codePoint === 32) {
        whitespaceLength += 1;
        continue;
      }
      break;
    }
    const spaceCount = whitespaceLength - tabCount;

    let level = 0;
    if (tabCount > 0) {
      level = tabCount; // タブの数
    } else if (spaceCount > 0) {
      level = Math.floor(spaceCount / spacesPerLevel); // 設定されたスペース数を1レベルとして計算
    }

    const text = line.slice(whitespaceLength).trim(); // インデントを除去

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
  data:
    | string[]
    | ClipboardData
    | ClipboardData[]
    | Array<{ text: string; level: number; originalLine: string }>;
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
    debugLog('Failed to read clipboard for paste:', e);
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
