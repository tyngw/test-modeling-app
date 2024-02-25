

export const adjustNodeAndChildrenPosition = (allNodes, node, nodeHeight, currentY, depthOffset = 260, ySpacing = 10) => {
    //function adjustNodeAndChildrenPosition(node, currentY, allNodes, depthOffset = 260, ySpacing = 10) {
    node.x = 50 + (node.depth - 1) * depthOffset;
    node.y = currentY;

    console.log(`「${node.text}」の位置を設定: x=${node.x}, y=${node.y}`);
    const childNodes = allNodes.filter(n => n.parentId === node.id);

    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            currentY = adjustNodeAndChildrenPosition(allNodes, childNode, nodeHeight, currentY, depthOffset, ySpacing);
        });
    } else {
        currentY += nodeHeight + ySpacing; // 子ノードがない場合、Y座標を更新
    }
    return currentY;
}

export const adjustNodePositions = (allNodes, nodeHeight) => {
    const rootNodes = allNodes.filter(n => n.parentId === null);

    // depthが小さい順にノードをソートし、同じdepth内ではparentId, その後orderでソート
    let sortedNodes = [...allNodes].sort((a, b) => b.depth - a.depth || a.parentId - b.parentId || a.order - b.order);
    let currentY = 50; // Y座標の初期値
    let lastChildY;
    const adjust = true;

    rootNodes.forEach(rootNode => {
        currentY = adjustNodeAndChildrenPosition(allNodes, rootNode, nodeHeight, currentY);
    });

    // 親ノードのY座標を子ノードに基づいて更新
    if (adjust) {
        sortedNodes.forEach(parentNode => {
            const children = sortedNodes.filter(n => n.parentId === parentNode.id);
            if (children.length > 0) {
                const minY = Math.min(...children.map(n => n.y));
                const maxY = Math.max(...children.map(n => n.y + nodeHeight));
                parentNode.y = minY + (maxY - minY) / 2 - nodeHeight / 2;
            } else {
                lastChildY += lastChildY ? nodeHeight + 10 : lastChildY;
                parentNode.y = lastChildY ? lastChildY : parentNode.y;
            }
        });
    }
    return sortedNodes; // 更新されたノードの配列を返却
};