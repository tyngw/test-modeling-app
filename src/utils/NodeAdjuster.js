import { NODE_HEIGHT,
    X_OFFSET,
    Y_OFFSET,
 } from "../constants/Node";

export const adjustNodeAndChildrenPosition = (allNodes, node, currentY) => {
    node.x = 50 + (node.depth - 1) * (X_OFFSET + 60);
    node.y = currentY;

    // console.log(`「${node.text}」の位置を設定: x=${node.x}, y=${node.y}`);
    const childNodes = allNodes.filter(n => n.parentId === node.id);

    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            currentY = adjustNodeAndChildrenPosition(allNodes, childNode, currentY);
        });
    } else {
        currentY += node.height + Y_OFFSET; // 子ノードがない場合、Y座標を更新
    }
    return currentY;
}

export const adjustNodePositions = (allNodes) => {
    const rootNodes = allNodes.filter(n => n.parentId === null);

    // depthが小さい順にノードをソートし、同じdepth内ではparentId, その後orderでソート
    let sortedNodes = [...allNodes].sort((a, b) => b.depth - a.depth || a.parentId - b.parentId || a.order - b.order);
    let currentY = 50; // Y座標の初期値
    let lastChildY;
    const adjust = true;

    rootNodes.forEach(rootNode => {
        currentY = adjustNodeAndChildrenPosition(allNodes, rootNode, currentY);
    });

    // 親ノードのY座標を子ノードに基づいて更新
    if (adjust) {
        sortedNodes.forEach(parentNode => {
            const children = sortedNodes.filter(n => n.parentId === parentNode.id);
            if (children.length > 0) {
                const minY = Math.min(...children.map(n => n.y));
                const maxY = Math.max(...children.map(n => n.y + NODE_HEIGHT));
                parentNode.y = minY + (maxY - minY) / 2 - NODE_HEIGHT / 2;
            } else {
                lastChildY += lastChildY ? NODE_HEIGHT + 10 : lastChildY;
                parentNode.y = lastChildY ? lastChildY : parentNode.y;
            }
        });
    }
    return sortedNodes; // 更新されたノードの配列を返却
};