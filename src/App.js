// App.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { calculateNodeWidth } from './utils/TextUtilities';
import { useWindowSize, calculateCanvasSize } from './utils/LayoutUtilities';
import ViewBox from './components/ViewBox';
import Node from './components/Node';

import { adjustNodePositions } from './utils/NodeAdjuster';
import { handleArrowUp, handleArrowDown, getNodeById } from './utils/NodeSelector';
import { Undo, Redo, saveSnapshot } from './state/undoredo';
import {
  NODE_HEIGHT,
  ARROW_OFFSET,
  CURVE_CONTROL_OFFSET,
  X_OFFSET,
} from './constants/Node';
import './App.css';

function App() {
  // 初期ノードの追加処理
  const [nodes, setNodes] = useState([
    { id: 1, text: 'Node 1', text2: '', text3: '', selected: false, x: 50, y: 50, parentId: null, order: 0, depth: 1, children: 0, },
  ]);
  const [editingId, setEditingId] = useState(null);
  // const [editingField, setEditingField] = useState('text');
  const inputRef = useRef(null);

  // ウィンドウサイズとviewBoxのステート
  // const windowSize = useWindowSize();
  // const [viewBox, setViewBox] = useState(`0 0 ${windowSize.width} ${windowSize.height}`);
  // ズーム倍率のステート
  // const [zoomRatio, setZoomRatio] = useState(1);

  // const [dragging, setDragging] = useState(null);
  // const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  // const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });

  // テキストフィールドの参照を作成
  const inputRefs = {
    text: useRef(null),
    text2: useRef(null),
    text3: useRef(null),
  };

  // ノードがキャンバスサイズを超えた場合に備えて、キャンバスの最小サイズを設定する
  // const [canvasSize, setCanvasSize] = useState({ width: windowSize.width, height: windowSize.height });

  // キャンバスでノード以外がクリックされた場合
  // const handleClickOutside = useCallback((event) => {
  //   if (!event.target.closest('.editable') && !event.target.classList.contains('node')) {
  //     setEditingId(null);
  //     setNodes(nodes.map(node => ({ ...node, selected: false })));
  //   }
  // }, [nodes]);

  // // キャンバスサイズの変更に伴い、viewBoxを更新する
  // useEffect(() => {
  //   setViewBox(`0 0 ${canvasSize.width * (1 / zoomRatio)} ${canvasSize.height * (1 / zoomRatio)}`);
  // }, [canvasSize]);

  // const findNodeAndSwitch = (conditionCallback) => {
  //   const selectedNode = nodes.find(node => node.selected);
  //   if (!selectedNode) return;

  //   const newSelectedNode = nodes.find(conditionCallback);
  //   if (newSelectedNode) {
  //     switchSelectNode(newSelectedNode.id);
  //   }
  // };

  // useEffect(() => {
  //   const handleKeyDown = (event) => {
  //     // キー操作による新しいノードの追加処理(タブキーが押された場合, 選択中のノードがある場合, 編集モードでない場合)
  //     if (event.key === 'Tab' && nodes.some(node => node.selected) && editingId === null) {
  //       event.preventDefault(); // ブラウザデフォルトの挙動を防止
  //       const selectedNode = getSelectedNode(nodes);

  //       // Undoのスナップショットを追加
  //       saveSnapshot(nodes);

  //       // 新しいノードを追加する処理
  //       let updatedNodes = addNode(selectedNode);
  //       setNodes(updatedNodes);
  //     }

  //     if (editingId !== null && event.key === 'Tab') {
  //       event.preventDefault(); // ブラウザデフォルトの挙動を防止
  //       const fields = ['text', 'text2', 'text3'];
  //       const currentIndex = fields.indexOf(editingField);
  //       const nextIndex = (currentIndex + 1) % fields.length;
  //       setEditingField(fields[nextIndex]);

  //       // `text3`からTabを押した場合、編集モードを終了
  //       if (editingField === 'text3') {
  //         setEditingId(null);
  //       } else {
  //         // 次のフィールドにフォーカスを移動
  //         const nextFieldRef = inputRefs[fields[nextIndex]];
  //         if (nextFieldRef.current) {
  //           nextFieldRef.current.focus();
  //         }
  //       }
  //     }

  //     // Ctrl + ZでUndo処理
  //     if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
  //       event.preventDefault();
  //       handleUndo();
  //     }

  //     // Shift + Ctrl + ZでRedo処理
  //     if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') {
  //       event.preventDefault();
  //       console.log('Ctrl + Shift + Z');
  //       handleRedo();
  //     }

  //     if (event.key === 'Enter' && editingId === null && nodes.some(node => node.selected)) {
  //       // Enterキーが押され、選択中のノードがある場合、編集モードに入る
  //       const selectedNode = nodes.find(node => node.selected);
  //       setEditingId(selectedNode.id);
  //     } else if (editingId === null && nodes.some(node => node.selected)) {
  //       if (event.key === 'Delete' || event.key === 'Backspace') {
  //         const selectedNodeIds = nodes.filter(node => node.selected).map(node => node.id);
  //         // Undoのスナップショットを追加
  //         saveSnapshot(nodes);

  //         // 選択されたノードを削除する処理
  //         let updatedNodes = nodes;
  //         selectedNodeIds.forEach(id => {
  //           saveSnapshot(updatedNodes);
  //           updatedNodes = deleteNode(nodes, getNodeById(updatedNodes, id));
  //         });
  //         setNodes(updatedNodes);
  //       }
  //     }

  //   document.addEventListener('keydown', handleKeyDown);
  //   return () => document.removeEventListener('keydown', handleKeyDown);
  // }, [nodes, editingId, editingField, addNode, deleteNode, adjustNodePositions, handleArrowUp, handleArrowDown, findNodeAndSwitch, inputRefs]);

  useEffect(() => {
    if (editingId !== null) {
      inputRef.current?.focus();
    }
  }, [editingId]);

  // useEffect(() => {
  //   document.addEventListener('click', handleClickOutside);
  //   return () => document.removeEventListener('click', handleClickOutside);
  // }, [handleClickOutside]);

  // useEffect(() => {
  //   setCanvasSize(calculateCanvasSize(nodes, 50, 200, zoomRatio));
  // }, [nodes, windowSize, zoomRatio]);

  // const handleDoubleClick = (id) => {
  //   // ダブルクリックされたノードで編集モードに入る
  //   setEditingId(id);
  // };

  const updateText = (e, field) => {
    const newText = e.target.value;
    setNodes(nodes.map(node => {
      if (node.id === editingId) {
        return { ...node, [field]: newText };
      }
      return node;
    }));
  };

  const editingNode = nodes.find(n => n.id === editingId);

  return (
    <div className="App" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      {/* <div style={{ position: 'absolute', top: '40px', left: 0 }}> */}
        <ViewBox/>
    </div>
  );
}

export default App;
