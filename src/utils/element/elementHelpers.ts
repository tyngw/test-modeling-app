// src/utils/element/elementHelpers.ts
import { Element, MarkerType } from '../../types/types';
import { v4 as uuidv4 } from 'uuid';
import { getMarkerType } from '../storage/localStorageHelpers';
import { SIZE, NUMBER_OF_SECTIONS } from '../../config/elementSettings';
import { NewElementOptions, ElementsMap } from '../../types/elementTypes';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';
import { getChildrenFromHierarchy as getChildrenFromHierarchyOriginal } from '../hierarchical/hierarchicalConverter';

/**
 * 新しい要素を作成する
 *
 * ⚠️ 重要: numSectionsパラメータについて
 * - 新しいタブ作成時は、必ず設定で指定されたnumberOfSectionsを渡すこと
 * - デフォルト値のNUMBER_OF_SECTIONSは固定値(3)なので、設定値を無視してしまう
 * - このリグレッションが過去に何度か発生しているため、呼び出し元で設定値を明示的に渡すことを徹底する
 *
 * @param options 要素作成オプション（階層構造ベース）
 * @returns 新しく作成された要素
 */
export const createNewElement = ({
  numSections = NUMBER_OF_SECTIONS, // ⚠️ この固定値に依存せず、呼び出し元で設定値を明示的に渡すこと
  direction = 'right',
  selected = true,
  editing = true,
}: NewElementOptions = {}): Element => {
  const markerType = getMarkerType();

  return {
    id: uuidv4(),
    texts: Array(numSections).fill(''),
    x: 0,
    y: 0,
    width: SIZE.WIDTH.MIN,
    height: SIZE.SECTION_HEIGHT * numSections,
    sectionHeights: Array(numSections).fill(SIZE.SECTION_HEIGHT),
    editing,
    selected,
    visible: true,
    tentative: false,
    startMarker: markerType as MarkerType,
    endMarker: 'none' as MarkerType,
    direction, // 必須プロパティとして追加
  };
};

/**
 * 要素が他の要素の子孫かどうかを判定する
 * @param _elements 要素マップ（未使用、後方互換性のため）
 * @param childId 子要素のID
 * @param ancestorId 祖先要素のID
 * @returns 子孫関係にある場合はtrue
 */
export const isDescendant = (
  _elements: ElementsMap,
  childId: string,
  ancestorId: string,
): boolean => {
  // 自分自身の場合はfalse
  if (childId === ancestorId) return false;

  // このヘルパーは従来のelements mapベースで動作する
  // 実際の階層関係は階層構造データから取得すべきだが、
  // 後方互換性のため空の配列を返す
  return false;
};

/**
 * 指定した要素の子要素を取得する（従来版）
 * @param _parentId 親要素のID（未使用、後方互換性のため）
 * @param _elements 要素マップ（未使用、後方互換性のため）
 * @returns 子要素の配列
 */
export const getChildren = (_parentId: string | null, _elements: ElementsMap): Element[] => {
  // 階層構造に移行しているため、空の配列を返す
  // 実際の使用時は getChildrenFromHierarchy を使用すべき
  return [];
};

/**
 * 階層構造から子要素を取得する（階層構造版）
 * @param hierarchicalData 階層構造データ
 * @param parentId 親要素のID
 * @returns 子要素の配列
 */
export const getChildrenFromHierarchy = (
  hierarchicalData: HierarchicalStructure | null,
  parentId: string,
): Element[] => {
  return getChildrenFromHierarchyOriginal(hierarchicalData, parentId);
};

/**
 * 要素をプロンプト用のテキスト形式に変換する
 * @param elements 要素マップ
 * @param targetElementId 対象要素のID
 * @returns プロンプト用のテキスト
 */
export const formatElementsForPrompt = (
  elements: ElementsMap,
  targetElementId?: string,
): string => {
  // 選択された要素を基準にした構造テキストを生成
  const targetElement = targetElementId ? elements[targetElementId] : null;

  if (!targetElement) {
    return '要素が見つかりません';
  }

  // 要素のテキストを結合してプロンプト用の文字列を作成
  const elementText = targetElement.texts.filter((text) => text && text.trim()).join('\n');

  if (!elementText) {
    return '選択された要素にテキストがありません';
  }

  return `選択された要素: ${elementText}`;
};
