// src/utils/NodeSelector.ts
import { Node } from '../types';

export const getNodeById = (elements: Record<string, Node>, id: string): Node | undefined => elements[id];
export const getSelectedNode = (elements: Record<string, Node>): Node | undefined => Object.values(elements).find(element => element.selected);

const getSiblings = (elements: Record<string, Node>, elementId: string): Node[] => {
  const element = getNodeById(elements, elementId);
  return element ? Object.values(elements).filter(n => n.parentId === element.parentId) : [];
};

const getParentSiblings = (elements: Record<string, Node>, elementId: string): Node[] => {
  const element = getNodeById(elements, elementId);
  const parent = element?.parentId ? getNodeById(elements, element.parentId) : null;
  return parent ? Object.values(elements).filter(n => n.parentId === parent.parentId) : [];
};

const handleVerticalMove = (elements: Record<string, Node>, selected: Node, offset: number): string | undefined => {
  const siblings = getSiblings(elements, selected.id);
  const index = siblings.findIndex(n => n.id === selected.id);
  const newIndex = index + offset;

  if (newIndex >= 0 && newIndex < siblings.length) {
    return siblings[newIndex].id;
  }

  return handleParentLevelMove(elements, selected, offset);
};

const handleParentLevelMove = (elements: Record<string, Node>, selected: Node, offset: number): string | undefined => {
  const parentSiblings = getParentSiblings(elements, selected.id);

  if (!selected.parentId) {
    return undefined;
  }

  const parent = getNodeById(elements, selected.parentId);
  const parentIndex = parentSiblings.findIndex(n => n.id === parent?.id);
  
  const targetParent = parentSiblings[parentIndex + offset];
  const children = getNodeChildren(elements, targetParent?.id);
  return offset === -1 
    ? children[children.length - 1]?.id 
    : children[0]?.id ?? selected.id;
};

const getNodeChildren = (elements: Record<string, Node>, parentId?: string): Node[] => 
  Object.values(elements).filter(element => element.parentId === parentId);

export const handleArrowUp = (elements: Record<string, Node>): string | undefined => handleArrowNavigation(elements, 'up');
export const handleArrowDown = (elements: Record<string, Node>): string | undefined => handleArrowNavigation(elements, 'down');
export const handleArrowLeft = (elements: Record<string, Node>): string | undefined => handleArrowNavigation(elements, 'left');
export const handleArrowRight = (elements: Record<string, Node>): string | undefined => handleArrowNavigation(elements, 'right');

export const handleArrowNavigation = (elements: Record<string, Node>, direction: 'up' | 'down' | 'left' | 'right'): string | undefined => {
  const selected = getSelectedNode(elements);
  if (!selected) return undefined;

  switch(direction) {
    case 'up': return handleVerticalMove(elements, selected, -1);
    case 'down': return handleVerticalMove(elements, selected, 1);
    case 'left': return selected.parentId ?? selected.id;
    case 'right': return getNodeChildren(elements, selected.id)[0]?.id ?? selected.id;
    default: return selected.id;
  }
};