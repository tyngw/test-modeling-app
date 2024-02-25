
export const handleArrowUp = (nodes, getNodeById, switchSelectedNode) => {
    const selectedNode = nodes.find(node => node.selected);
    if (!selectedNode) return;

    const siblingNodes = nodes.filter(node => node.parentId === selectedNode.parentId);
    const currentIndex = siblingNodes.findIndex(node => node.id === selectedNode.id);
    if (currentIndex > 0) {
        switchSelectedNode(siblingNodes[currentIndex - 1].id);
    } else if (selectedNode.parentId !== null) {
        // 親のノードの末尾のノードを選択
        const parentNode = getNodeById(nodes, selectedNode.parentId);
        const parentSiblingNodes = nodes.filter(node => node.parentId === parentNode.parentId);
        const parentIndex = parentSiblingNodes.findIndex(node => node.id === parentNode.id);
        if (parentIndex > 0) {
            const lastChildOfPreviousParent = nodes.filter(node => node.parentId === parentSiblingNodes[parentIndex - 1].id).slice(-1)[0];
            if (lastChildOfPreviousParent) switchSelectedNode(lastChildOfPreviousParent.id);
        }
    }
};

export const handleArrowDown = (nodes, getNodeById, switchSelectedNode, ) => {
    const selectedNode = nodes.find(node => node.selected);
    if (!selectedNode) return;

    const siblingNodes = nodes.filter(node => node.parentId === selectedNode.parentId);
    const currentIndex = siblingNodes.findIndex(node => node.id === selectedNode.id);
    if (currentIndex < siblingNodes.length - 1) {
        switchSelectedNode(siblingNodes[currentIndex + 1].id);
    } else if (selectedNode.parentId !== null) {
        // 次の親ノードの先頭のノードを選択
        const parentNode = getNodeById(nodes, selectedNode.parentId);
        const parentSiblingNodes = nodes.filter(node => node.parentId === parentNode.parentId);
        const parentIndex = parentSiblingNodes.findIndex(node => node.id === parentNode.id);
        if (parentIndex < parentSiblingNodes.length - 1) {
            const firstChildOfNextParent = nodes.filter(node => node.parentId === parentSiblingNodes[parentIndex + 1].id)[0];
            if (firstChildOfNextParent) switchSelectedNode(firstChildOfNextParent.id);
        }
    }
};