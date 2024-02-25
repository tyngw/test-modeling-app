// src/state/state.js

import { useReducer } from 'react';
import { adjustNodePositions } from '../utils/NodeAdjuster';

// ノードの初期状態を以下のように定義する
// 初期ノードの追加処理
// const [nodes, setNodes] = useState([
//   { id: 1, text: 'Node 1', text2: '', text3: '', selected: false, x: 50, y: 50, parentId: null, order: 0, depth: 1, children: 0, },
// ]);

const initialState = {
    nodes: [
        { id: 1, text: 'Node 1', text2: '', text3: '', selected: false, x: 50, y: 50, parentId: null, order: 0, depth: 1, children: 0, },
    ],
    // 現在のウィンドウサイズをデフォルトにする
    // width: window.innerWidth,
    width: 800,
    height: 600,
};

const addNode = (parentNode) => {
    console.log(`parentNode: ${parentNode}`)
    let newNodes;
    const newId = Math.max(...initialState.nodes.map(node => node.id), 0) + 1;
    const newOrder = parentNode.children;
    const newRect = {
        id: newId,
        text: `Node ${newId}`,
        text2: `order: ${newOrder}`,
        text3: `depth: ${parentNode.depth + 1}`,
        selected: false,
        x: 0,
        y: 0,
        parentId: parentNode.id,
        order: newOrder,
        depth: parentNode.depth + 1,
        children: 0,
    };
    newNodes = [...initialState.nodes, newRect];

    // 追加元ノードのchildrenプロパティをインクリメント
    newNodes = newNodes.map(node => {
        if (node.id === parentNode.id) {
            return { ...node, children: node.children + 1 };
        }
        return node;
    });

    // 新しいノードと既存のノードとの間で重なりをチェックし、調整
    let adjustedNodes = adjustNodePositions(newNodes)

    return adjustedNodes;
};


function reducer(state, action) {
    switch (action.type) {
        case 'SELECT_NODE':
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload ? { ...node, selected: true } : node) };
        case 'DESELECT_ALL':
            return { ...state, nodes: state.nodes.map(node => ({ ...node, selected: false })) };
        case 'ADD_NODE':
            let updatedNodes = addNode(action.payload);
            return { ...state, nodes: updatedNodes };
        case 'EDIT_NODE':
            // ここにノード編集のロジックを書く
            return state;
        default:
            throw new Error();
    }
}

export function useStore() {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
}