// src/utils/elementSelector.ts
import { Element } from '../types';

export const getElementById = (elements: Record<string, Element>, id: string): Element | undefined => elements[id];
export const getSelectedElement = (elements: Record<string, Element>): Element | undefined => Object.values(elements).find(element => element.selected);

const getSiblings = (elements: Record<string, Element>, elementId: string): Element[] => {
  const element = getElementById(elements, elementId);
  return element ? Object.values(elements).filter(n => n.parentId === element.parentId) : [];
};

const getParentSiblings = (elements: Record<string, Element>, elementId: string): Element[] => {
  const element = getElementById(elements, elementId);
  const parent = element?.parentId ? getElementById(elements, element.parentId) : null;
  return parent ? Object.values(elements).filter(n => n.parentId === parent.parentId) : [];
};

const handleVerticalMove = (elements: Record<string, Element>, selected: Element, offset: number): string | undefined => {
  const siblings = getSiblings(elements, selected.id);
  const index = siblings.findIndex(n => n.id === selected.id);
  const newIndex = index + offset;

  if (newIndex >= 0 && newIndex < siblings.length) {
    return siblings[newIndex].id;
  }

  return handleParentLevelMove(elements, selected, offset);
};

const handleParentLevelMove = (elements: Record<string, Element>, selected: Element, offset: number): string | undefined => {
  const parentSiblings = getParentSiblings(elements, selected.id);

  if (!selected.parentId) {
    return undefined;
  }

  const parent = getElementById(elements, selected.parentId);
  const parentIndex = parentSiblings.findIndex(n => n.id === parent?.id);
  
  const targetParent = parentSiblings[parentIndex + offset];
  const children = getElementChildren(elements, targetParent?.id);
  return offset === -1 
    ? children[children.length - 1]?.id 
    : children[0]?.id ?? selected.id;
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
    case 'up': return handleVerticalMove(elements, selected, -1);
    case 'down': return handleVerticalMove(elements, selected, 1);
    case 'left': return selected.parentId ?? selected.id;
    case 'right': return getElementChildren(elements, selected.id)[0]?.id ?? selected.id;
    default: return selected.id;
  }
};
