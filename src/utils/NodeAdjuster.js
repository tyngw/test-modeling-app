import {
    X_OFFSET,
    Y_OFFSET,
    PRESET_Y
} from "../constants/Node";

export const adjustNodeAndChildrenPosition = (allNodes, node, currentY, maxHeight) => {
    const childNodes = allNodes.filter(n => n.parentId === node.id);
    const parentNode = allNodes.find(n => n.id === node.parentId);

    if (!parentNode) {
        node.x = 50;
    } else {
        // node.xに親ノードのx座標を設定 + X_OFFSET + 親ノードのwidthをセットする
        node.x = parentNode.x + parentNode.width + X_OFFSET;
    }

    node.y = currentY;
    maxHeight = Math.max(maxHeight, node.height);

    // console.log(`[adjustNodeAndChildrenPosition] ${node.id} 「${node.text}」 ${node.x}x${node.y}`);

    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            currentY = adjustNodeAndChildrenPosition(allNodes, childNode, currentY, maxHeight);
        });
    } else {
        if (node.visible || node.order === 0) {
            currentY += maxHeight + Y_OFFSET;
        }
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
        currentY = adjustNodeAndChildrenPosition(allNodes, rootNode, PRESET_Y, rootNode.height);
    });

    // 親ノードのY座標を子ノードに基づいて更新
    if (adjust) {
        sortedNodes.forEach(parentNode => {
            const children = sortedNodes.filter(n => n.parentId === parentNode.id);
            const visibleChildren = children.filter(n => n.visible);
            if (visibleChildren.length > 0) {
                const minY = Math.min(...children.map(n => n.y));
                const maxY = Math.max(...children.map(n => n.y + n.height));
                const newHeight = minY + (maxY - minY) / 2 - parentNode.height / 2;
                if (parentNode.y < newHeight) {
                    parentNode.y = newHeight;
                }
            }
        });
    }
    return sortedNodes; // 更新されたノードの配列を返却
};