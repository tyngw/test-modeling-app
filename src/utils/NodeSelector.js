export const getNodeById = (nodes, id) => {
    return nodes.find((node) => node.id === id);
};

export const getSelectedNode = (nodes) => {
    return nodes.find((node) => node.selected);
};


export const handleArrowUp = (nodes) => {
    // ノードのidを返却するように修正する
    const selectedNode = getSelectedNode(nodes);
    if (!selectedNode) return;

    const siblingNodes = nodes.filter(node => node.parentId === selectedNode.parentId);
    const currentIndex = siblingNodes.findIndex(node => node.id === selectedNode.id);
    if (currentIndex > 0) {
        return siblingNodes[currentIndex - 1].id;
        // switchSelectedNode(siblingNodes[currentIndex - 1].id);
    } else if (selectedNode.parentId !== null) {
        // 親のノードの末尾のノードを選択

        const parentNode = nodes.find(node => node.id === selectedNode.parentId);
        const parentSiblingNodes = nodes.filter(node => node.parentId === parentNode.parentId);
        const parentIndex = parentSiblingNodes.findIndex(node => node.id === parentNode.id);
        if (parentIndex > 0) {
            const lastChildOfPreviousParent = nodes.filter(node => node.parentId === parentSiblingNodes[parentIndex - 1].id).slice(-1)[0];
            // if (lastChildOfPreviousParent) switchSelectedNode(lastChildOfPreviousParent.id);
            if (lastChildOfPreviousParent) {
                return lastChildOfPreviousParent.id;
            } else {
                return selectedNode.id;
            }
        }
    }
};

export const handleArrowDown = (nodes, switchSelectedNode,) => {
    // ノードのidを返却するように修正する
    const selectedNode = getSelectedNode(nodes);
    if (!selectedNode) return;

    const siblingNodes = nodes.filter(node => node.parentId === selectedNode.parentId);
    const currentIndex = siblingNodes.findIndex(node => node.id === selectedNode.id);
    if (currentIndex < siblingNodes.length - 1) {
        // switchSelectedNode(siblingNodes[currentIndex + 1].id);
        return siblingNodes[currentIndex + 1].id;
    } else if (selectedNode.parentId !== null) {
        // 次の親ノードの先頭のノードを選択
        const parentNode = getNodeById(nodes, selectedNode.parentId);
        const parentSiblingNodes = nodes.filter(node => node.parentId === parentNode.parentId);
        const parentIndex = parentSiblingNodes.findIndex(node => node.id === parentNode.id);
        if (parentIndex < parentSiblingNodes.length - 1) {
            const firstChildOfNextParent = nodes.filter(node => node.parentId === parentSiblingNodes[parentIndex + 1].id)[0];
            // if (firstChildOfNextParent) switchSelectedNode(firstChildOfNextParent.id);
            if (firstChildOfNextParent) {
                return firstChildOfNextParent.id;
            } else
                return selectedNode.id;
        }
    }
};

export const handleArrowRight = (nodes) => {
    const selectedNode = getSelectedNode(nodes);
    if (!selectedNode) return;

    const childNodes = nodes.filter(node => node.parentId === selectedNode.id);
    if (childNodes.length > 0) {
        return childNodes[0].id;
    } else {
        return selectedNode.id;
    }
    
}

export const handleArrowLeft = (nodes) => {
    const selectedNode = getSelectedNode(nodes);
    if (!selectedNode) return;

    if (selectedNode.parentId !== null) {
        return selectedNode.parentId;
    } else {
        return selectedNode.id;
    }
}