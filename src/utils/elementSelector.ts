// src/utils/elementSelector.ts
import { Element } from '../types/types';
import { HierarchicalStructure } from '../types/hierarchicalTypes';
import {
  getDepthFromHierarchy,
  findParentNodeInHierarchy,
  getChildrenFromHierarchy,
  getSelectedElementsFromHierarchy,
  getElementsByDepthFromHierarchy,
} from './hierarchical/hierarchicalConverter';

export const getElementById = (
  elements: Record<string, Element>,
  id: string,
): Element | undefined => elements[id];

export const getSelectedElement = (
  elements: Record<string, Element>,
  hierarchicalData: HierarchicalStructure | null,
): Element | undefined => {
  // 階層構造から選択要素を直接取得
  const selectedElements = getSelectedElementsFromHierarchy(hierarchicalData);
  return selectedElements[0]; // 最初の選択要素を返す
};

const getElementsByDepth = (
  depth: number,
  hierarchicalData: HierarchicalStructure | null,
): Element[] => {
  return getElementsByDepthFromHierarchy(hierarchicalData, depth);
};

const handleVerticalMove = (
  selected: Element,
  offset: number,
  hierarchicalData: HierarchicalStructure | null,
): string => {
  if (!hierarchicalData) return selected.id;

  // 同じ深さの全要素を取得
  const selectedDepth = getDepthFromHierarchy(hierarchicalData, selected.id);
  const sameDepthElements = getElementsByDepth(selectedDepth, hierarchicalData);
  const currentIndex = sameDepthElements.findIndex((e) => e.id === selected.id);

  // 新しいインデックスを計算
  const newIndex = currentIndex + offset;

  // 有効な範囲内であれば移動
  if (newIndex >= 0 && newIndex < sameDepthElements.length) {
    return sameDepthElements[newIndex].id;
  }

  // 範囲外の場合は現在の要素を維持
  return selected.id;
};

const getElementChildren = (
  hierarchicalData: HierarchicalStructure | null,
  parentId?: string,
): Element[] => {
  if (!hierarchicalData || !parentId) return [];
  return getChildrenFromHierarchy(hierarchicalData, parentId);
};

export const handleArrowUp = (
  elements: Record<string, Element>,
  hierarchicalData: HierarchicalStructure | null,
): string | undefined => handleArrowNavigation(elements, 'up', hierarchicalData);

export const handleArrowDown = (
  elements: Record<string, Element>,
  hierarchicalData: HierarchicalStructure | null,
): string | undefined => handleArrowNavigation(elements, 'down', hierarchicalData);

export const handleArrowLeft = (
  elements: Record<string, Element>,
  hierarchicalData: HierarchicalStructure | null,
): string | undefined => handleArrowNavigation(elements, 'left', hierarchicalData);

export const handleArrowRight = (
  elements: Record<string, Element>,
  hierarchicalData: HierarchicalStructure | null,
): string | undefined => handleArrowNavigation(elements, 'right', hierarchicalData);

export const handleArrowNavigation = (
  elements: Record<string, Element>,
  direction: 'up' | 'down' | 'left' | 'right',
  hierarchicalData: HierarchicalStructure | null,
): string | undefined => {
  const selected = getSelectedElement(elements, hierarchicalData);
  if (!selected || !hierarchicalData) return undefined;

  switch (direction) {
    case 'up':
    case 'down':
      return handleVerticalMove(selected, direction === 'up' ? -1 : 1, hierarchicalData);
    case 'left': {
      const parentNode = findParentNodeInHierarchy(hierarchicalData, selected.id);
      return parentNode?.data.id ?? selected.id;
    }
    case 'right': {
      const children = getElementChildren(hierarchicalData, selected.id);
      return children[0]?.id ?? selected.id;
    }
    default:
      return selected.id;
  }
};
