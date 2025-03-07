// src/utils/elementSelector.ts
import { Element } from '../types';

export const getElementById = (elements: Record<string, Element>, id: string): Element | undefined => elements[id];
export const getSelectedElement = (elements: Record<string, Element>): Element | undefined => Object.values(elements).find(element => element.selected);

const getElementsByDepth = (elements: Record<string, Element>, depth: number): Element[] => {
  return Object.values(elements)
    .filter(e => e.depth === depth)
    .sort((a, b) => a.y - b.y || a.x - b.x); // Y位置→X位置でソート
};

const handleVerticalMove = (elements: Record<string, Element>, selected: Element, offset: number): string => {
  // 同じ深さの全要素を取得
  const sameDepthElements = getElementsByDepth(elements, selected.depth);
  const currentIndex = sameDepthElements.findIndex(e => e.id === selected.id);
  
  // 新しいインデックスを計算
  const newIndex = currentIndex + offset;
  
  // 有効な範囲内であれば移動
  if (newIndex >= 0 && newIndex < sameDepthElements.length) {
    return sameDepthElements[newIndex].id;
  }
  
  // 範囲外の場合は現在の要素を維持
  return selected.id;
};

const getElementChildren = (elements: Record<string, Element>, parentId?: string): Element[] => 
  Object.values(elements).filter(element => element.parentId === parentId);

export const handleArrowUp = (elements: Record<string, Element>): string | undefined => handleArrowNavigation(elements, 'up');
export const handleArrowDown = (elements: Record<string, Element>): string | undefined => handleArrowNavigation(elements, 'down');
export const handleArrowLeft = (elements: Record<string, Element>): string | undefined => handleArrowNavigation(elements, 'left');
export const handleArrowRight = (elements: Record<string, Element>): string | undefined => handleArrowNavigation(elements, 'right');

export const handleArrowNavigation = (elements: Record<string, Element>, direction: 'up' | 'down' | 'left' | 'right'): string | undefined => {
  const selected = getSelectedElement(elements);
  if (!selected) return undefined;

  switch(direction) {
    case 'up':
    case 'down':
      return handleVerticalMove(elements, selected, direction === 'up' ? -1 : 1);
    case 'left':
      return selected.parentId ?? selected.id;
    case 'right':
      return getElementChildren(elements, selected.id)[0]?.id ?? selected.id;
    default:
      return selected.id;
  }
};
