// src/utils/fileHelpers.ts
import { SIZE } from "../constants/elementSettings";
import { createNewElement } from "../state/state";
import { Element } from "../types";
import { 
    DEFAULT_FONT_FAMILY,
    DEFAULT_FONT_SIZE,
    ELEM_STYLE,
    CONNECTION_PATH_STYLE,
    DEFAULT_CANVAS_BACKGROUND_COLOR,
    DEFAULT_TEXT_COLOR
} from "../constants/elementSettings";
import { getNumberOfSections } from "../utils/localStorageHelpers";

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
    return {
      ...element,
      texts: element.texts,
      sectionHeights: element.sectionHeights,
    } as Element
  }

  // 古い形式の変換処理
  return {
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
    text: undefined,
    text2: undefined,
    text3: undefined,
    section1Height: undefined,
    section2Height: undefined,
    section3Height: undefined
  } as unknown as Element
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
        let elements: Element[]

        // データ形式の判定
        if (Array.isArray(parsedData)) {
          // 配列形式（新形式）
          elements = parsedData.map(convertLegacyElement)
        } else if (typeof parsedData === 'object' && parsedData !== null) {
          // オブジェクト形式（旧形式または状態全体）
          const rawElements = 'elements' in parsedData 
            ? parsedData.elements  // 状態全体が保存されていた場合
            : parsedData           // 要素だけが保存されていた場合
            
          elements = Object.values(rawElements).map(convertLegacyElement)
        } else {
          throw new Error('Invalid data format')
        }

        // 要素をIDをキーとしたオブジェクトに変換
        const elementsMap = elements.reduce((acc, element) => {
          acc[element.id] = element
          return acc
        }, {} as Record<string, Element>)

        resolve({ elements: elementsMap, fileName: file.name })
      } catch (error) {
        reject(new Error('Error: ファイルの読み込みに失敗しました'))
      }
    }

    reader.onerror = () => reject(new Error('Error: ファイルの読み込みに失敗しました'))
    reader.readAsText(file)
    input.value = ''
  })
}

export const saveSvg = (svgElement: SVGSVGElement, name: string) => {
    const svgElementClone = svgElement.cloneNode(true) as SVGSVGElement;
    svgElementClone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // SVGの背景色を設定
    svgElementClone.style.backgroundColor = DEFAULT_CANVAS_BACKGROUND_COLOR;

    // テキスト要素の処理
    const textElements = svgElementClone.getElementsByTagName('text');
    for (let i = 0; i < textElements.length; i++) {
        const textElement = textElements[i];
        textElement.style.fontFamily = DEFAULT_FONT_FAMILY;
        textElement.style.fontSize = `${DEFAULT_FONT_SIZE}px`;
        textElement.style.fill = DEFAULT_TEXT_COLOR;
    }

    // rect要素（四角形）のスタイルを設定
    // まず各要素のセクション数をカウント
    const rectElements = svgElementClone.getElementsByTagName('rect');
    const numberOfSections = getNumberOfSections();
    
    for (let i = 0; i < rectElements.length; i++) {
        const rectElement = rectElements[i];
        if (numberOfSections === 1) {
            // セクション数が1の場合は枠線を透明に
            rectElement.style.fill = ELEM_STYLE.NORMAL.COLOR;
            rectElement.style.stroke = 'transparent';
        } else {
            // セクション数が2以上の場合は通常の枠線を表示
            rectElement.style.fill = ELEM_STYLE.NORMAL.COLOR;
            rectElement.style.stroke = ELEM_STYLE.NORMAL.STROKE_COLOR;
            rectElement.style.strokeWidth = `${ELEM_STYLE.STROKE_WIDTH}`;
        }
    }

    // line要素（下線）のスタイルを設定
    const lineElements = svgElementClone.getElementsByTagName('line');
    for (let i = 0; i < lineElements.length; i++) {
        const lineElement = lineElements[i];
        lineElement.style.stroke = ELEM_STYLE.NORMAL.STROKE_COLOR;
        lineElement.style.strokeWidth = `${ELEM_STYLE.STROKE_WIDTH}`;
    }

    // path要素（接続線）のスタイルを設定
    const pathElements = svgElementClone.getElementsByTagName('path');
    for (let i = 0; i < pathElements.length; i++) {
        const pathElement = pathElements[i];
        pathElement.style.stroke = CONNECTION_PATH_STYLE.COLOR;
        pathElement.style.strokeWidth = `${CONNECTION_PATH_STYLE.STROKE}`;
        pathElement.style.fill = 'none';
    }

    // marker要素のスタイルを設定
    const markerElements = svgElementClone.getElementsByTagName('marker');
    for (let i = 0; i < markerElements.length; i++) {
        const markerElement = markerElements[i];
        markerElement.style.fill = 'none';
        markerElement.style.stroke = CONNECTION_PATH_STYLE.COLOR;
    }

    // polygon要素（マーカーの矢印など）のスタイルを設定
    const polygonElements = svgElementClone.getElementsByTagName('polygon');
    for (let i = 0; i < polygonElements.length; i++) {
        const polygonElement = polygonElements[i];
        polygonElement.style.fill = 'none';
        polygonElement.style.stroke = CONNECTION_PATH_STYLE.COLOR;
    }

    // circle要素のスタイルを設定
    const circleElements = svgElementClone.getElementsByTagName('circle');
    for (let i = 0; i < circleElements.length; i++) {
        const circleElement = circleElements[i];
        circleElement.style.fill = ELEM_STYLE.NORMAL.COLOR;
        circleElement.style.stroke = ELEM_STYLE.NORMAL.STROKE_COLOR;
    }

    // SVGをデータURLに変換して保存
    const svgData = new XMLSerializer().serializeToString(svgElementClone);
    const preface = '<?xml version="1.0" standalone="no"?>\r\n';
    const svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = name;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
}

export const saveElements = (elements: any[], fileName: string) => {
    const name = fileName || 'Untitled';

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
