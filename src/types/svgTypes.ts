
/**
 * SVG要素に関する型定義
 */

/**
 * データ属性を持つDOM要素の型
 */
export interface ElementWithDataset extends Element {
  dataset: DOMStringMap;
}

/**
 * SVG要素の型ガード関数
 * @param element 検証する要素
 * @returns elementがSVGRectElementかどうか
 */
export function isSVGRectElement(element: Element | null): element is SVGRectElement {
  return element !== null && element instanceof SVGRectElement;
}

/**
 * SVG要素の型ガード関数
 * @param element 検証する要素
 * @returns elementがSVGGElementかどうか
 */
export function isSVGGElement(element: Element | null): element is SVGGElement {
  return element !== null && element instanceof SVGGElement;
}

/**
 * データ属性を持つ要素の型ガード関数
 * @param element 検証する要素
 * @returns elementがデータ属性を持つかどうか
 */
export function hasDataset(element: Element | null): element is ElementWithDataset {
  return element !== null && 'dataset' in element;
}
