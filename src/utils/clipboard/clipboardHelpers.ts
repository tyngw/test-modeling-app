// src/utils/clipboard/clipboardHelpers.ts
import { Element } from '../../types/types';
import { ElementsMap } from '../../types/elementTypes';
import { getCutElements, setCutElements } from '../storage/localStorageHelpers';

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
  const rootCopy = { ...targetElement, parentId: null };
  cutElements[rootCopy.id] = rootCopy;

  const collectChildren = (parentId: string) => {
    elementList
      .filter((e) => e.parentId === parentId)
      .forEach((child) => {
        const childCopy = { ...child };
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
  setCutElements(JSON.stringify(elements));

  // Continue with standard text clipboard functionality
  const getElementText = (element: Element, depth: number = 0): string => {
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
        console.log('Copied to clipboard:', textToCopy);
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
      console.log('Copied to clipboard:', textToCopy);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
    document.body.removeChild(textArea);
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
