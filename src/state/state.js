// src/state/state.js

import { useReducer } from 'react';
import { adjustNodePositions } from '../utils/NodeAdjuster';
import { Undo, Redo, saveSnapshot } from './undoredo';

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
    width: Window.innerWidth,
    height: window.innerHeight,
    zoomRatio: 1,
};

const addNode = (allNodes, parentNode) => {
    console.log(`parentNode: ${parentNode}`)
    let newNodes;
    const newId = Math.max(...allNodes.map(node => node.id), 0) + 1;
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
    console.log(`newRect: ${newRect.text}`)
    newNodes = [...allNodes, newRect];
    

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

const deleteNode = (nodeList, nodeToDelete) => {
    let updatedNodes = deleteNodeRecursive(nodeList, nodeToDelete);

    updatedNodes = adjustNodePositions(updatedNodes);
    return updatedNodes;
  }

  // 与えられたノードを再帰的に削除する関数
  // 引数としてノードのリストと削除対象のノードを受け取る
  const deleteNodeRecursive = (nodeList, nodeToDelete) => {

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
        console.log(`削除対象の子ノードのtext: ${childNode.text}`);
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

function reducer(state, action) {
    let updatedNodes
    switch (action.type) {
        case 'SELECT_NODE':
            console.log(`action.payload: ${action.payload}`)
            // ノードを選択状態にする
            // 新しいノードの selected プロパティを true にし、それ以外のノードの selected プロパティを false にする
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload ? { ...node, selected: true } : { ...node, selected: false }) };
            // return { ...state, nodes: state.nodes.map(node => node.id === action.payload ? { ...node, selected: true } : node) };
        case 'DESELECT_ALL':
            return { ...state, nodes: state.nodes.map(node => ({ ...node, selected: false })) };
        case 'ADD_NODE':
            // Undo/Redoのためのスナップショットを保存
            saveSnapshot(state.nodes);
            updatedNodes = addNode(state.nodes, action.payload);
            return { ...state, nodes: updatedNodes };
        case 'DELETE_NODE':
            // ここにノード削除のロジックを書く
            // Undo/Redoのためのスナップショットを保存
            saveSnapshot(state.nodes);
            updatedNodes = deleteNode(state.nodes, action.payload);
            return { ...state, nodes: updatedNodes };
        case 'EDIT_NODE':
            // InputFieldsコンポーネントを表示する
            return { ...state, nodes: state.nodes.map(node => node.id === action.payload ? { ...node, editing: true } : node) };

        case 'UNDO':
            updatedNodes = Undo(action.payload);
            return { ...state, nodes: updatedNodes };
        default:
            throw new Error();
        case 'REDO':
            updatedNodes = Redo(action.payload);
            return { ...state, nodes: updatedNodes };
        case 'ZOOM_IN':
            return { ...state, zoomRatio: state.zoomRatio + 0.1 };
        case 'ZOOM_OUT':
            return { ...state, zoomRatio: state.zoomRatio - 0.1 };
    }
}

export function useStore() {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
}