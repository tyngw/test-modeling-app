// src/utils/fileHelpers.ts
import { SIZE } from "../constants/elementSettings";
import { createNewElement } from "../state/state";
import { Element } from "../types";

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

    const elements = svgElement.querySelectorAll('*');
    const clonedElements = svgElementClone.querySelectorAll('*');

    // 各要素に対してループを行います
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i] as HTMLElement;
        const clonedElement = clonedElements[i] as HTMLElement;

        // 元の要素の計算されたスタイルを取得します
        const computedStyle = window.getComputedStyle(element);

        // 計算されたスタイルを複製した要素のstyle属性に設定します
        for (let j = 0; j < computedStyle.length; j++) {
            const styleName = computedStyle[j];
            const styleValue = computedStyle.getPropertyValue(styleName);
            clonedElement.style[styleName as any] = styleValue;
        }
    }

    // SVG要素を文字列に変換します
    const svgData = svgElementClone.outerHTML;
    const preface = '<?xml version="1.0" standalone="no"?>\r\n';
    const svgBlob = new Blob([preface, svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = name;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
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