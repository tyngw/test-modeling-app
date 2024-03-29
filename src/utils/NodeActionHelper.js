export const getSelectedNodeAndChildren = (nodeList, targetNode, selectedNode) => {
    let cutNodes = [];


    if (targetNode.id === selectedNode.id) {
        cutNodes.push({ ...targetNode, parentId: null });
    } else {
        cutNodes.push(targetNode);
    }

    // 選択対象のノードIdと一致するparentIdを持つノードを再帰的に取得
    const childNodes = nodeList.filter(node => node.parentId === targetNode.id);
    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            cutNodes = [...cutNodes, ...getSelectedNodeAndChildren(nodeList, childNode, selectedNode)];
        });
    }

    return cutNodes;
};

// cutNodesに含まれるノードをnodesに追加できるように新しいノードを作成する関数
export const pasteNodes = (nodeList, cutNodes, parentNode) => {
    const rootNode = cutNodes.find(node => node.parentId === null);
    if (!rootNode) {
        return [...nodeList, ...cutNodes]
    }
    const rootNodeDepth = rootNode.depth;
    const baseDepth = parentNode.depth + 1;
    const depthDelta = baseDepth - rootNodeDepth;
    let newId = Math.max(...nodeList.map(node => node.id), 0) + 1;
    const idMap = new Map();

    const newNodes = cutNodes.map(cutNode => {
        const newNode = { ...cutNode };
        if (nodeList.find(node => node.id === cutNode.id)) {
            idMap.set(cutNode.id, newId);
            newNode.id = newId;
            newId++;
        }
        cutNode.depth = cutNode.depth + depthDelta;
        
        if (cutNode.id === rootNode.id) {
            newNode.parentId = parentNode.id;
            // parentIdのchildrenを新しいorderに設定する
            const children = nodeList.find(node => node.id === parentNode.id).children;
            newNode.order = children;
            newNode.selected = false;
        }

        return newNode;
    });

    const updatedNodes = nodeList.concat(newNodes.map(node => {
        if (idMap.has(node.parentId)) {
            node.parentId = idMap.get(node.parentId);
        }
        return node;
    }));

    return updatedNodes;
}

// 指定されたノードの子ノードのdepthを再帰的に親ノードのdepth+1に設定する関数
export const setDepthRecursive = (nodeList, parentNode) => {
    return nodeList.reduce((updatedNodes, node) => {
        let newNode = node;
        if (node.parentId === parentNode.id) {
            newNode = { ...node, depth: parentNode.depth + 1 };
            updatedNodes = setDepthRecursive(updatedNodes, newNode);
        }
        return [...updatedNodes, newNode];
    }, []);
};

// 指定されたノードの子ノードのvisibleを再帰的にtrueまたはfalseに設定する関数
// 戻り値として、visibleを更新した新しいノードのリストを返す
export const setVisibilityRecursive = (nodeList, parentNode, visible) => {
    return nodeList.reduce((updatedNodes, node) => {
        let newNode = node;
        if (node.parentId === parentNode.id) {
            newNode = { ...node, visible: visible };
            updatedNodes = setVisibilityRecursive(updatedNodes, newNode, visible);
        }
        return [...updatedNodes, newNode];
    }, []);
};

// 与えられたノードを再帰的に削除する関数
// 引数としてノードのリストと削除対象のノードを受け取る
export const deleteNodeRecursive = (nodeList, nodeToDelete) => {

    // 与えられたnodeToDeleteのparentIdがnullの場合は処理を終了
    if (nodeToDelete.parentId === null) {
        return nodeList;
    }
    // 指定されたノードを除外して新しいノードのリストを作成
    let updatedNodes = nodeList.filter(node => node.id !== nodeToDelete.id);

    // 削除対象のノードIdと一致するparentIdを持つノードも削除する
    // 再起的に自身のdeleteNode関数を呼び出して処理する
    const childNodes = updatedNodes.filter(node => node.parentId === nodeToDelete.id);
    if (childNodes.length > 0) {
        childNodes.forEach(childNode => {
            updatedNodes = deleteNodeRecursive(updatedNodes, childNode);
        });
    }

    // 指定されたノードのIdと一致するparentIdを持つノードのchildrenをデクリメント
    updatedNodes = updatedNodes.map(node => {
        if (nodeToDelete.parentId === node.id) {
            return { ...node, children: node.children - 1 };
        }
        return node;
    });

    return updatedNodes;
};