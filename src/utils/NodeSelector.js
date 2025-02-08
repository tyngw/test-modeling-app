// src/utils/NodeSelector.js
export const getNodeById = (elements, id) => elements[id];
export const getSelectedNode = (elements) => Object.values(elements).find(element => element.selected);

const getSiblings = (elements, elementId) => {
  const element = getNodeById(elements, elementId);
  return element ? Object.values(elements).filter(n => n.parentId === element.parentId) : [];
};

const getParentSiblings = (elements, elementId) => {
  const element = getNodeById(elements, elementId);
  const parent = element ? getNodeById(elements, element.parentId) : null;
  return parent ? Object.values(elements).filter(n => n.parentId === parent.parentId) : [];
};

const handleVerticalMove = (elements, selected, offset) => {
  const siblings = getSiblings(elements, selected.id);
  const index = siblings.findIndex(n => n.id === selected.id);
  const newIndex = index + offset;

  if (newIndex >= 0 && newIndex < siblings.length) {
    return siblings[newIndex].id;
  }

  return handleParentLevelMove(elements, selected, offset);
};

const handleParentLevelMove = (elements, selected, offset) => {
  const parentSiblings = getParentSiblings(elements, selected.id);
  const parent = getNodeById(elements, selected.parentId);
  const parentIndex = parentSiblings.findIndex(n => n.id === parent?.id);
  
  const targetParent = parentSiblings[parentIndex + offset];
  const children = getNodeChildren(elements, targetParent?.id);
  return offset === -1 
    ? children[children.length - 1]?.id 
    : children[0]?.id ?? selected.id;
};

const getNodeChildren = (elements, parentId) => 
  Object.values(elements).filter(element => element.parentId === parentId);

export const handleArrowUp = (elements) => handleArrowNavigation(elements, 'up');
export const handleArrowDown = (elements) => handleArrowNavigation(elements, 'down');
export const handleArrowLeft = (elements) => handleArrowNavigation(elements, 'left');
export const handleArrowRight = (elements) => handleArrowNavigation(elements, 'right');

export const handleArrowNavigation = (elements, direction) => {
  const selected = getSelectedNode(elements);
  if (!selected) return selected?.id;

  switch(direction) {
    case 'up': return handleVerticalMove(elements, selected, -1);
    case 'down': return handleVerticalMove(elements, selected, 1);
    case 'left': return selected.parentId ?? selected.id;
    case 'right': return getNodeChildren(elements, selected.id)[0]?.id ?? selected.id;
    default: return selected.id;
  }
};