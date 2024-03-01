// App.js
//import React, { useState, useCallback, useEffect, useRef } from 'react';
import React from 'react';
// import { calculateNodeWidth } from './utils/TextUtilities';
// import { useWindowSize, calculateCanvasSize } from './utils/LayoutUtilities';
import ViewBox from './components/ViewBox';
// import Node from './components/Node';

// import { adjustNodePositions } from './utils/NodeAdjuster';
// import { handleArrowUp, handleArrowDown, getNodeById } from './utils/NodeSelector';
// import { Undo, Redo, saveSnapshot } from './state/undoredo';
// import {
//   NODE_HEIGHT,
//   ARROW_OFFSET,
//   CURVE_CONTROL_OFFSET,
//   X_OFFSET,
// } from './constants/Node';
import './App.css';

function App() {
  // 初期ノードの追加処理
  // const [nodes, setNodes] = useState([
  //   { id: 1, text: 'Node 1', text2: '', text3: '', selected: false, x: 50, y: 50, parentId: null, order: 0, depth: 1, children: 0, },
  // ]);
  // const [editingId, setEditingId] = useState(null);
  // const [editingField, setEditingField] = useState('text');
  // const inputRef = useRef(null);

  // ウィンドウサイズとviewBoxのステート
  // const windowSize = useWindowSize();
  // const [viewBox, setViewBox] = useState(`0 0 ${windowSize.width} ${windowSize.height}`);
  // ズーム倍率のステート
  // const [zoomRatio, setZoomRatio] = useState(1);

  // const [dragging, setDragging] = useState(null);
  // const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  // const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });

  // // テキストフィールドの参照を作成
  // const inputRefs = {
  //   text: useRef(null),
  //   text2: useRef(null),
  //   text3: useRef(null),
  // };
  // useEffect(() => {
  //   if (editingId !== null) {
  //     inputRef.current?.focus();
  //   }
  // }, [editingId]);

  // const handleDoubleClick = (id) => {
  //   // ダブルクリックされたノードで編集モードに入る
  //   setEditingId(id);
  // };

  // const updateText = (e, field) => {
  //   const newText = e.target.value;
  //   setNodes(nodes.map(node => {
  //     if (node.id === editingId) {
  //       return { ...node, [field]: newText };
  //     }
  //     return node;
  //   }));
  // };

  // const editingNode = nodes.find(n => n.id === editingId);

  return (
    <div className="App" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      {/* <div style={{ position: 'absolute', top: '40px', left: 0 }}> */}
        <ViewBox/>
    </div>
  );
}

export default App;
