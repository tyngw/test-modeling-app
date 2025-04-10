// src/utils/file/fileHelpers.ts
import { SIZE } from "../../config/elementSettings";
import { createNewElement } from "../element/elementHelpers";
import { Element } from "../../types/types";
import { 
    DEFAULT_FONT_FAMILY,
    DEFAULT_FONT_SIZE,
    ELEM_STYLE,
    CONNECTION_PATH_STYLE,
    DEFAULT_CANVAS_BACKGROUND_COLOR,
    DEFAULT_TEXT_COLOR
} from "../../config/elementSettings";

// 既存のLegacyElement型を拡張
type LegacyElement = {
  text?: string
  text2?: string
  text3?: string
  section1Height?: number
  section2Height?: number
  section3Height?: number
  texts?: string[]  // 新しい形式との互換性のため追加
  sectionHeights?: number[]  // 新しい形式との互換性のため追加
  [key: string]: any
}

// 型ガード関数を改善
const isLegacyElement = (obj: unknown): obj is LegacyElement => {
  return typeof obj === 'object' && obj !== null && (
    ('text' in obj || 'text2' in obj || 'text3' in obj) ||  // 旧形式
    ('texts' in obj && 'sectionHeights' in obj)  // 新形式
  )
}

// 変換関数を強化
export const convertLegacyElement = (element: unknown): Element => {
  if (!isLegacyElement(element)) {
    return createNewElement()
  }

  // 新しい形式の要素をチェック
  if (element.texts && element.sectionHeights) {
    // 古いマーカープロパティ名を新しい名前に変換
    const converted = {
      ...element,
      texts: element.texts,
      sectionHeights: element.sectionHeights,
      x: element.hasOwnProperty('x') ? element.x : 0,
      y: element.hasOwnProperty('y') ? element.y : 0,
      tentative: element.hasOwnProperty('tentative') ? element.tentative : false
    } as any;

    // connectionPathType が存在する場合、startMarker に変換
    if (element.hasOwnProperty('connectionPathType')) {
      converted.startMarker = element.connectionPathType;
      delete converted.connectionPathType;
    } else if (!converted.hasOwnProperty('startMarker')) {
      converted.startMarker = 'none';
    }

    // endConnectionPathType が存在する場合、endMarker に変換
    if (element.hasOwnProperty('endConnectionPathType')) {
      converted.endMarker = element.endConnectionPathType;
      delete converted.endConnectionPathType;
    } else if (!converted.hasOwnProperty('endMarker')) {
      converted.endMarker = 'none';
    }

    return converted as Element;
  }

  // 古い形式の変換処理
  const converted = {
    ...element,
    texts: [
      element.text || '',
      element.text2 || '',
      element.text3 || ''
    ],
    sectionHeights: [
      element.section1Height || SIZE.SECTION_HEIGHT,
      element.section2Height || SIZE.SECTION_HEIGHT,
      element.section3Height || SIZE.SECTION_HEIGHT
    ],
    x: element.hasOwnProperty('x') ? element.x : 0,
    y: element.hasOwnProperty('y') ? element.y : 0,
    text: undefined,
    text2: undefined,
    text3: undefined,
    section1Height: undefined,
    section2Height: undefined,
    section3Height: undefined,
    tentative: element.hasOwnProperty('tentative') ? element.tentative : false,
  } as any;

  // connectionPathType が存在する場合、startMarker に変換
  if (element.hasOwnProperty('connectionPathType')) {
    converted.startMarker = element.connectionPathType;
  } else {
    converted.startMarker = 'none';
  }

  // endConnectionPathType が存在する場合、endMarker に変換
  if (element.hasOwnProperty('endConnectionPathType')) {
    converted.endMarker = element.endConnectionPathType;
  } else {
    converted.endMarker = 'none';
  }

  return converted as Element;
}

// ファイル読み込み処理を修正
export const loadElements = (event: Event): Promise<{ elements: Record<string, Element>, fileName: string }> => {
  return new Promise((resolve, reject) => {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]

    if (!file) {
      reject(new Error('Error: ファイルが選択されていません'))
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const contents = e.target?.result
        if (typeof contents !== 'string') {
          throw new Error('Invalid file content')
        }

        const parsedData = JSON.parse(contents)
        let rawElements: any[] = []

        // データ形式の判定
        if (Array.isArray(parsedData)) {
          // 配列形式（新形式）
          rawElements = parsedData
        } else if (typeof parsedData === 'object' && parsedData !== null) {
          // オブジェクト形式（旧形式または状態全体）
          rawElements = 'elements' in parsedData 
            ? Object.values(parsedData.elements)  // 状態全体が保存されていた場合
            : Object.values(parsedData)           // 要素だけが保存されていた場合
        } else {
          throw new Error('Invalid data format')
        }

        // IDが欠けている要素をフィルタリング
        const validRawElements = rawElements.filter(elem => {
          if (!elem.id && !elem.hasOwnProperty('id')) {
            console.warn('IDが欠けている要素を削除します');
            return false;
          }
          return true;
        });

        // 要素を変換
        const convertedElements = validRawElements.map(elem => convertLegacyElement(elem));
        
        // 有効なIDのセットを作成
        const validIds = new Set(convertedElements.map(elem => elem.id));
        
        // 存在しないparentIdを参照している要素をフィルタリング
        const validElements = convertedElements.filter(elem => {
          if (elem.parentId && !validIds.has(elem.parentId)) {
            console.warn(`存在しないparentId "${elem.parentId}" を参照している要素 "${elem.id}" を削除します`);
            return false;
          }
          return true;
        });

        // 要素をIDをキーとしたオブジェクトに変換
        const elementsMap = validElements.reduce((acc, element) => {
          acc[element.id] = element;
          return acc;
        }, {} as Record<string, Element>);

        resolve({ elements: elementsMap, fileName: file.name })
      } catch (error) {
        console.error('ファイル読み込みエラー:', error);
        reject(new Error(`Error: ファイルの読み込みに失敗しました - ${error instanceof Error ? error.message : String(error)}`))
      }
    }

    reader.onerror = () => {
      console.error('ファイル読み込みエラー');
      reject(new Error('Error: ファイルの読み込みに失敗しました'))
    }
    reader.readAsText(file)
    input.value = ''
  })
}

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
 */
export const extractRootElementTextFromElements = (elements: any[]): string | undefined => {
  if (elements.length === 0) return undefined;
  
  // ルート要素を探す（parentIdがない最初の要素）
  const rootElement = elements.find(elem => !elem.parentId);
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
const determineFileName = (defaultName: string, rootElementText?: string): string => {
    let name = defaultName || 'Untitled';
    
    if ((name === 'Untitled' || name === '無題') && rootElementText) {
        const trimmedText = rootElementText.trim();
        if (trimmedText) {
            // テキストの先頭部分（最大30文字）をファイル名として使用
            // ファイル名に使用できない文字を置換
            name = trimmedText.substring(0, 30).replace(/[\\/:*?"<>|]/g, '_');
        }
    }
    
    return name;
}

export const saveSvg = (svgElement: SVGSVGElement, name: string) => {
    // SVG要素のクローンを作成
    const svgElementClone = svgElement.cloneNode(true) as SVGSVGElement;
    
    // SVGの基本属性を設定
    svgElementClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svgElementClone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    
    // 表示中のビューボックスを保持
    const viewBox = svgElement.getAttribute("viewBox");
    if (viewBox) {
        svgElementClone.setAttribute("viewBox", viewBox);
    }
    
    // サイズ属性を設定
    const width = svgElement.getAttribute("width") || svgElement.clientWidth.toString();
    const height = svgElement.getAttribute("height") || svgElement.clientHeight.toString();
    svgElementClone.setAttribute("width", width);
    svgElementClone.setAttribute("height", height);
    
    // 背景色を設定する矩形を追加（最初の要素として）
    const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    backgroundRect.setAttribute("width", "100%");
    backgroundRect.setAttribute("height", "100%");
    backgroundRect.setAttribute("fill", DEFAULT_CANVAS_BACKGROUND_COLOR);
    svgElementClone.insertBefore(backgroundRect, svgElementClone.firstChild);
    
    // 出力から除外する要素を削除（data-exclude-from-export属性を持つもの）
    const excludedElements = svgElementClone.querySelectorAll('[data-exclude-from-export="true"]');
    excludedElements.forEach(element => element.parentNode?.removeChild(element));
    
    // 選択された要素の青い枠線を通常の枠線に変更
    const selectedRects = svgElementClone.querySelectorAll('rect[stroke="' + ELEM_STYLE.SELECTED.STROKE_COLOR + '"]');
    selectedRects.forEach(rect => {
        if (rect.getAttribute('height') === rect.getAttribute('width')) return; // マーカーボタン用の正方形は無視
        rect.setAttribute('stroke', ELEM_STYLE.NORMAL.STROKE_COLOR);
        rect.removeAttribute('filter'); // boxShadow効果を削除
        rect.setAttribute('style', rect.getAttribute('style')?.replace(/filter:[^;]+;?/, '') || '');
    });

    // テキスト要素（foreignObject内）のスタイル調整
    const textDivs = svgElementClone.querySelectorAll('foreignObject div');
    textDivs.forEach(div => {
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
    const selectedLines = svgElementClone.querySelectorAll('line[stroke="' + ELEM_STYLE.SELECTED.STROKE_COLOR + '"]');
    selectedLines.forEach(line => {
        line.setAttribute('stroke', ELEM_STYLE.NORMAL.STROKE_COLOR);
    });

    // ダウンロード用のCSSスタイルを追加
    const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleElement.textContent = `
        text { font-family: ${DEFAULT_FONT_FAMILY}; font-size: ${DEFAULT_FONT_SIZE}px; }
        foreignObject div { font-family: ${DEFAULT_FONT_FAMILY}; font-size: ${DEFAULT_FONT_SIZE}px; }
    `;
    svgElementClone.appendChild(styleElement);
    
    // SVG全体にテキスト選択可能な属性を設定
    svgElementClone.setAttribute("style", "user-select: text;");
    svgElementClone.setAttribute("text-rendering", "optimizeLegibility");
    
    // SVGをデータURLに変換してダウンロード
    const svgData = new XMLSerializer().serializeToString(svgElementClone);
    const preface = '<?xml version="1.0" standalone="no"?>\r\n';
    const svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    // ルート要素からテキストを取得（存在する場合）
    const rootElementText = extractRootElementTextFromSvg(svgElement);
    
    // ファイル名を決定
    const fileName = determineFileName(name, rootElementText);
    
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
}

export const saveElements = (elements: any[], fileName: string) => {
    // ルート要素からテキストを取得（存在する場合）
    const rootElementText = extractRootElementTextFromElements(elements);
    
    // ファイル名を決定
    const name = determineFileName(fileName, rootElementText);

    const elementsToSave = elements.map(element => {
        const { x, y, ...elementWithoutXY } = element;
        return elementWithoutXY;
    });

    const json = JSON.stringify(elementsToSave);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${name}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}