// utils/NodeSelector.js
export const getNodeById = (nodes, id) => nodes.find(node => node.id === id);
export const getSelectedNode = (nodes) => nodes.find(node => node.selected);

const getSiblings = (nodes, nodeId) => {
  const node = getNodeById(nodes, nodeId);
  return node ? nodes.filter(n => n.parentId === node.parentId) : [];
};

const getParentSiblings = (nodes, nodeId) => {
  const parent = getNodeById(nodes, getNodeById(nodes, nodeId)?.parentId);
  return parent ? nodes.filter(n => n.parentId === parent.parentId) : [];
};

const handleVerticalMove = (nodes, selected, offset) => {
  const siblings = getSiblings(nodes, selected.id);
  const index = siblings.findIndex(n => n.id === selected.id);
  const newIndex = index + offset;

  if (newIndex >= 0 && newIndex < siblings.length) {
    return siblings[newIndex].id;
  }

  return handleParentLevelMove(nodes, selected, offset);
};

const handleParentLevelMove = (nodes, selected, offset) => {
  const parentSiblings = getParentSiblings(nodes, selected.id);
  const parent = getNodeById(nodes, selected.parentId);
  const parentIndex = parentSiblings.findIndex(n => n.id === parent?.id);
  
  const targetParent = parentSiblings[parentIndex + offset];
  const children = getNodeChildren(nodes, targetParent?.id);
  return offset === -1 
    ? children[children.length - 1]?.id 
    : children[0]?.id ?? selected.id;
};

const getNodeChildren = (nodes, parentId) => 
  nodes.filter(node => node.parentId === parentId);

// 既存コードとの互換性を保つため、個別の関数を再エクスポート
export const handleArrowUp = (nodes) => handleArrowNavigation(nodes, 'up');
export const handleArrowDown = (nodes) => handleArrowNavigation(nodes, 'down');
export const handleArrowLeft = (nodes) => handleArrowNavigation(nodes, 'left');
export const handleArrowRight = (nodes) => handleArrowNavigation(nodes, 'right');

export const handleArrowNavigation = (nodes, direction) => {
  const selected = getSelectedNode(nodes);
  if (!selected) return selected?.id;

  switch(direction) {
    case 'up': return handleVerticalMove(nodes, selected, -1);
    case 'down': return handleVerticalMove(nodes, selected, 1);
    case 'left': return selected.parentId ?? selected.id;
    case 'right': return getNodeChildren(nodes, selected.id)[0]?.id ?? selected.id;
    default: return selected.id;
  }
};