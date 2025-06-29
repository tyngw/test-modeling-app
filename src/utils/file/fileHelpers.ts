// src/utils/file/fileHelpers.ts
import { SIZE } from '../../config/elementSettings';
import { createNewElement } from '../element/elementHelpers';
import { Element, MarkerType, DirectionType } from '../../types/types';
import {
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  ELEM_STYLE,
  DEFAULT_CANVAS_BACKGROUND_COLOR,
  DEFAULT_TEXT_COLOR,
} from '../../config/elementSettings';
import { sanitizeObject, sanitizeFilename } from '../security/sanitization';
import { validateJsonData, validateFileContent } from '../security/validation';
import {
  isHierarchicalStructure,
  isFlatStructure,
  isLegacyArrayFormat,
  isLegacyMapFormat,
} from '../../types/hierarchicalTypes';
import {
  convertHierarchicalToFlat,
  convertArrayToHierarchical,
} from '../hierarchical/hierarchicalConverter';

/**
 * 古いバージョンの要素データ形式を表す型
 * 古いバージョンとの互換性のために使用
 */
type LegacyElement = {
  id?: string;
  text?: string;
  text2?: string;
  text3?: string;
  section1Height?: number;
  section2Height?: number;
  section3Height?: number;
  texts?: string[]; // 新しい形式との互換性のため追加
  sectionHeights?: number[]; // 新しい形式との互換性のため追加
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  parentId?: string | null;
  order?: number;
  depth?: number;
  children?: number;
  editing?: boolean;
  selected?: boolean;
  visible?: boolean;
  tentative?: boolean;
  connectionPathType?: MarkerType; // 旧マーカータイプ
  endConnectionPathType?: MarkerType; // 旧エンドマーカータイプ
  startMarker?: MarkerType;
  endMarker?: MarkerType;
  direction?: DirectionType; // 方向プロパティを追加
};

// 型ガード関数を改善
const isLegacyElement = (obj: unknown): obj is LegacyElement => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('text' in obj ||
      'text2' in obj ||
      'text3' in obj || // 旧形式
      ('texts' in obj && 'sectionHeights' in obj)) // 新形式
  );
};

// 変換関数を強化
export const convertLegacyElement = (element: unknown): Element => {
  if (!isLegacyElement(element)) {
    return createNewElement();
  }

  // 新しい形式の要素をチェック
  if (element.texts && element.sectionHeights) {
    // 基本的な新しい要素を作成
    const base = createNewElement();

    // 古いマーカープロパティ名を新しい名前に変換
    const converted: Element = {
      ...base,
      // 共通プロパティをコピー
      id: element.id || base.id,
      texts: element.texts,
      sectionHeights: element.sectionHeights,
      x: element.x !== undefined ? Number(element.x) : base.x,
      y: element.y !== undefined ? Number(element.y) : base.y,
      width: element.width !== undefined ? Number(element.width) : base.width,
      height: element.height !== undefined ? Number(element.height) : base.height,
      editing: element.editing !== undefined ? Boolean(element.editing) : base.editing,
      selected: element.selected !== undefined ? Boolean(element.selected) : base.selected,
      visible: element.visible !== undefined ? Boolean(element.visible) : base.visible,
      tentative: element.tentative !== undefined ? Boolean(element.tentative) : base.tentative,
      startMarker: base.startMarker,
      endMarker: base.endMarker,
      direction:
        element.direction !== undefined
          ? element.direction
          : element.parentId === null
            ? 'none'
            : 'right',
    };

    // connectionPathType が存在する場合、startMarker に変換
    if (element.connectionPathType) {
      converted.startMarker = element.connectionPathType;
    } else if (element.startMarker) {
      converted.startMarker = element.startMarker;
    }

    // endConnectionPathType が存在する場合、endMarker に変換
    if (element.endConnectionPathType) {
      converted.endMarker = element.endConnectionPathType;
    } else if (element.endMarker) {
      converted.endMarker = element.endMarker;
    }

    return converted;
  }

  // 古い形式の変換処理
  const base = createNewElement();
  const converted: Element = {
    ...base,
    id: element.id || base.id,
    texts: [element.text || '', element.text2 || '', element.text3 || ''],
    sectionHeights: [
      element.section1Height || SIZE.SECTION_HEIGHT,
      element.section2Height || SIZE.SECTION_HEIGHT,
      element.section3Height || SIZE.SECTION_HEIGHT,
    ],
    x: element.x !== undefined ? Number(element.x) : 0,
    y: element.y !== undefined ? Number(element.y) : 0,
    width: element.width !== undefined ? Number(element.width) : base.width,
    height: element.height !== undefined ? Number(element.height) : base.height,
    editing: element.editing !== undefined ? Boolean(element.editing) : base.editing,
    selected: element.selected !== undefined ? Boolean(element.selected) : base.selected,
    visible: element.visible !== undefined ? Boolean(element.visible) : base.visible,
    tentative: element.tentative !== undefined ? Boolean(element.tentative) : base.tentative,
    startMarker: base.startMarker,
    endMarker: base.endMarker,
    direction: element.direction !== undefined ? element.direction : base.direction || 'right', // parentIdがnullかの判定を削除し、base.directionかデフォルト値を使用
  };

  // connectionPathType が存在する場合、startMarker に変換
  if (element.connectionPathType) {
    converted.startMarker = element.connectionPathType;
  } else if (element.startMarker) {
    converted.startMarker = element.startMarker;
  }

  // endConnectionPathType が存在する場合、endMarker に変換
  if (element.endConnectionPathType) {
    converted.endMarker = element.endConnectionPathType;
  } else if (element.endMarker) {
    converted.endMarker = element.endMarker;
  }

  return converted;
};

// ファイル読み込み処理を階層構造対応に修正
export const loadElements = (
  event: Event,
): Promise<{ elements: Record<string, Element>; fileName: string }> => {
  return new Promise((resolve, reject) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      reject(new Error('Error: ファイルが選択されていません'));
      return;
    }

    // ファイル名のセキュリティチェック
    const safeFileName = sanitizeFilename(file.name);
    if (!safeFileName || safeFileName === 'untitled') {
      reject(new Error('Error: 安全でないファイル名が検出されました'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const contents = e.target?.result;
        if (typeof contents !== 'string') {
          throw new Error('Invalid file content');
        }

        // ファイル内容のセキュリティ検証
        if (!validateFileContent(contents)) {
          throw new Error('ファイル内容が安全でない可能性があります');
        }

        const parsedData = JSON.parse(contents);

        // JSONデータの検証
        if (!validateJsonData(parsedData)) {
          throw new Error('JSONデータが安全でない可能性があります');
        }

        // データをサニタイズ
        const sanitizedData = sanitizeObject(parsedData);

        let elementsMap: Record<string, Element> = {};

        // データ構造の判定と変換

        if (isHierarchicalStructure(sanitizedData)) {
          // 新しい階層構造の場合
          elementsMap = convertHierarchicalToFlat(sanitizedData);
        } else if (isFlatStructure(sanitizedData)) {
          // フラット構造（バージョン付き）の場合
          const rawElements = sanitizedData.elements;

          // IDが欠けている要素をフィルタリング
          const validRawElements = rawElements.filter((elem) => {
            if (!elem.id && !Object.prototype.hasOwnProperty.call(elem, 'id')) {
              console.warn('IDが欠けている要素を削除します');
              return false;
            }
            return true;
          });

          // 要素を変換
          const convertedElements = validRawElements.map((elem) => convertLegacyElement(elem));

          // 要素の有効性チェック（階層構造では親子関係はツリーで管理）
          const validElements = convertedElements;

          // 要素をIDをキーとしたオブジェクトに変換
          elementsMap = validElements.reduce(
            (acc, element) => {
              acc[element.id] = element;
              return acc;
            },
            {} as Record<string, Element>,
          );
        } else if (isLegacyArrayFormat(sanitizedData)) {
          // レガシー配列形式の場合
          const rawElements = sanitizedData;

          // IDが欠けている要素をフィルタリング
          const validRawElements = rawElements.filter((elem) => {
            if (!elem.id && !Object.prototype.hasOwnProperty.call(elem, 'id')) {
              console.warn('IDが欠けている要素を削除します');
              return false;
            }
            return true;
          });

          // 要素を変換
          const convertedElements = validRawElements.map((elem) => convertLegacyElement(elem));

          // 要素の有効性チェック（階層構造では親子関係はツリーで管理）
          const validElements = convertedElements;

          // 要素をIDをキーとしたオブジェクトに変換
          elementsMap = validElements.reduce(
            (acc, element) => {
              acc[element.id] = element;
              return acc;
            },
            {} as Record<string, Element>,
          );
        } else if (isLegacyMapFormat(sanitizedData)) {
          // レガシーマップ形式の場合
          const rawElements = Object.values(sanitizedData);

          // IDが欠けている要素をフィルタリング
          const validRawElements = rawElements.filter((elem) => {
            if (!elem.id && !Object.prototype.hasOwnProperty.call(elem, 'id')) {
              console.warn('IDが欠けている要素を削除します');
              return false;
            }
            return true;
          });

          // 要素を変換
          const convertedElements = validRawElements.map((elem) => convertLegacyElement(elem));

          // 要素の有効性チェック（階層構造では親子関係はツリーで管理）
          const validElements = convertedElements;

          // 要素をIDをキーとしたオブジェクトに変換
          elementsMap = validElements.reduce(
            (acc, element) => {
              acc[element.id] = element;
              return acc;
            },
            {} as Record<string, Element>,
          );
        } else {
          console.error('認識できないデータ形式です');
          throw new Error('認識できないデータ形式です');
        }

        resolve({ elements: elementsMap, fileName: file.name });
      } catch (error) {
        console.error('ファイル読み込みエラー:', error);
        reject(
          new Error(
            `Error: ファイルの読み込みに失敗しました - ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    };

    reader.onerror = () => {
      console.error('ファイル読み込みエラー');
      reject(new Error('Error: ファイルの読み込みに失敗しました'));
    };
    reader.readAsText(file);
    input.value = '';
  });
};

/**
 * SVG要素からルート要素のテキストを抽出する
 * @param svgElement SVG要素
 * @returns ルート要素のテキスト（存在する場合）
 */
export const extractRootElementTextFromSvg = (svgElement: SVGSVGElement): string | undefined => {
  if (!svgElement.querySelector('foreignObject div')) return undefined;

  const rootElement = svgElement.querySelector('g:not([data-exclude-from-export="true"])');
  if (rootElement) {
    return rootElement.querySelector('foreignObject div')?.textContent || undefined;
  }
  return undefined;
};

/**
 * 要素配列からルート要素のテキストを抽出する
 * @param elements 要素の配列
 * @returns ルート要素のテキスト（存在する場合）
 * @deprecated 階層構造では直接的なルート要素の概念は使用せず、階層ユーティリティを使用してください
 */
export const extractRootElementTextFromElements = (elements: Element[]): string | undefined => {
  if (elements.length === 0) return undefined;

  // 階層構造では最初の要素をルート要素として扱う
  const rootElement = elements[0];
  if (rootElement && rootElement.texts && rootElement.texts.length > 0) {
    const text = rootElement.texts[0];
    return text && typeof text === 'string' ? text : undefined;
  }
  return undefined;
};

/**
 * ファイル名が「無題」またはUntitledの場合に、ルート要素のテキストからファイル名を生成する
 * @param defaultName デフォルトのファイル名
 * @param rootElementText ルート要素のテキスト（存在する場合）
 * @returns 最終的なファイル名
 */
export const determineFileName = (defaultName: string, rootElementText?: string): string => {
  let name = defaultName || 'Untitled';

  if ((name === 'Untitled' || name === '無題') && rootElementText) {
    const trimmedText = rootElementText.trim();
    if (trimmedText) {
      name = trimmedText.substring(0, 30).replace(/[\\/:*?"<>|]/g, '_');
    }
  }

  return name;
};

export const saveSvg = (svgElement: SVGSVGElement, name: string) => {
  // SVG要素のクローンを作成
  const svgElementClone = svgElement.cloneNode(true) as SVGSVGElement;

  // SVGの基本属性を設定
  svgElementClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgElementClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // 表示中のビューボックスを保持
  const viewBox = svgElement.getAttribute('viewBox');
  if (viewBox) {
    svgElementClone.setAttribute('viewBox', viewBox);
  }

  // サイズ属性を設定
  const width = svgElement.getAttribute('width') || svgElement.clientWidth.toString();
  const height = svgElement.getAttribute('height') || svgElement.clientHeight.toString();
  svgElementClone.setAttribute('width', width);
  svgElementClone.setAttribute('height', height);

  // 背景色を設定する矩形を追加（最初の要素として）
  const backgroundRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  backgroundRect.setAttribute('width', '100%');
  backgroundRect.setAttribute('height', '100%');
  backgroundRect.setAttribute('fill', DEFAULT_CANVAS_BACKGROUND_COLOR);
  svgElementClone.insertBefore(backgroundRect, svgElementClone.firstChild);

  // 出力から除外する要素を削除（data-exclude-from-export属性を持つもの）
  const excludedElements = svgElementClone.querySelectorAll('[data-exclude-from-export="true"]');
  excludedElements.forEach((element) => element.parentNode?.removeChild(element));

  // 選択された要素の青い枠線を通常の枠線に変更
  const selectedRects = svgElementClone.querySelectorAll(
    'rect[stroke="' + ELEM_STYLE.SELECTED.STROKE_COLOR + '"]',
  );
  selectedRects.forEach((rect) => {
    if (rect.getAttribute('height') === rect.getAttribute('width')) return; // マーカーボタン用の正方形は無視
    rect.setAttribute('stroke', ELEM_STYLE.NORMAL.STROKE_COLOR);
    rect.removeAttribute('filter'); // boxShadow効果を削除
    rect.setAttribute('style', rect.getAttribute('style')?.replace(/filter:[^;]+;?/, '') || '');
  });

  // テキスト要素（foreignObject内）のスタイル調整
  const textDivs = svgElementClone.querySelectorAll('foreignObject div');
  textDivs.forEach((div) => {
    // インラインスタイルを設定
    const existingStyle = div.getAttribute('style') || '';
    const enhancedStyle = `
            ${existingStyle}
            font-family: ${DEFAULT_FONT_FAMILY};
            font-size: ${DEFAULT_FONT_SIZE}px;
            color: ${DEFAULT_TEXT_COLOR};
            white-space: pre-wrap;
            word-break: break-word;
            user-select: text;
        `;
    div.setAttribute('style', enhancedStyle);
  });

  // 選択状態の影響を受ける線を標準の線に変更
  const selectedLines = svgElementClone.querySelectorAll(
    'line[stroke="' + ELEM_STYLE.SELECTED.STROKE_COLOR + '"]',
  );
  selectedLines.forEach((line) => {
    line.setAttribute('stroke', ELEM_STYLE.NORMAL.STROKE_COLOR);
  });

  // ダウンロード用のCSSスタイルを追加
  const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  styleElement.textContent = `
        text { font-family: ${DEFAULT_FONT_FAMILY}; font-size: ${DEFAULT_FONT_SIZE}px; }
        foreignObject div { font-family: ${DEFAULT_FONT_FAMILY}; font-size: ${DEFAULT_FONT_SIZE}px; }
    `;
  svgElementClone.appendChild(styleElement);

  // SVG全体にテキスト選択可能な属性を設定
  svgElementClone.setAttribute('style', 'user-select: text;');
  svgElementClone.setAttribute('text-rendering', 'optimizeLegibility');

  // SVGをデータURLに変換してダウンロード
  const svgData = new XMLSerializer().serializeToString(svgElementClone);
  const preface = '<?xml version="1.0" standalone="no"?>\r\n';
  const svgBlob = new Blob([preface, svgData], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  // ルート要素からテキストを取得（存在する場合）
  const rootElementText = extractRootElementTextFromSvg(svgElement);

  // ファイル名を決定
  const fileName = determineFileName(name, rootElementText);

  const downloadLink = document.createElement('a');
  downloadLink.href = svgUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(svgUrl);
};

export const saveElements = (elements: Element[], fileName: string) => {
  // ルート要素からテキストを取得（存在する場合）
  const rootElementText = extractRootElementTextFromElements(elements);

  // ファイル名を決定
  const name = determineFileName(fileName, rootElementText);

  // Element配列を階層構造に変換
  const hierarchicalData = convertArrayToHierarchical(elements);

  if (!hierarchicalData) {
    console.error('階層構造への変換に失敗しました');
    // フォールバック: 元の配列形式で保存
    const elementsToSave = elements.map((element) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { x, y, ...elementWithoutXY } = element;
      return elementWithoutXY;
    });

    const json = JSON.stringify(elementsToSave);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${name}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    return;
  }

  // 階層構造形式で保存
  const json = JSON.stringify(hierarchicalData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  downloadLink.download = `${name}.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
};

/**
 * ElementsMapから階層構造形式で保存する関数
 * @param elementsMap 要素マップ
 * @param fileName ファイル名
 */
export const saveElementsMap = (elementsMap: Record<string, Element>, fileName: string) => {
  const elements = Object.values(elementsMap);
  saveElements(elements, fileName);
};
