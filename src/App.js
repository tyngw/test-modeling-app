// App.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { calculateNodeWidth } from './utils/TextUtilities';
import { useWindowSize, calculateCanvasSize } from './utils/LayoutUtilities';
import ViewBox from './components/ViewBox';
import Node from './components/Node';
import MenuBar from './components/Menubar';
import { Marker } from './components/Marker';
import InputFields from './components/InputFields';
import { adjustNodePositions } from './utils/NodeAdjuster';
import { handleArrowUp, handleArrowDown } from './utils/NodeSelector';
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
  const [editingField, setEditingField] = useState('text');
  const inputRef = useRef(null);

  // ウィンドウサイズとviewBoxのステート
  const windowSize = useWindowSize();
  const [viewBox, setViewBox] = useState(`0 0 ${windowSize.width} ${windowSize.height}`);
  // ズーム倍率のステート
  const [zoomRatio, setZoomRatio] = useState(1);

  const [dragging, setDragging] = useState(null);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });

  // テキストフィールドの参照を作成
  const inputRefs = {
    text: useRef(null),
    text2: useRef(null),
    text3: useRef(null),
  };

  // ノードがキャンバスサイズを超えた場合に備えて、キャンバスの最小サイズを設定する
  const [canvasSize, setCanvasSize] = useState({ width: windowSize.width, height: windowSize.height });

  // 指定されたidを持つノードを取得する関数
  function getNodeById(nodes, id) {
    return nodes.find(node => node.id === id);
  }

  // 選択中のノードの一つ目を取得する関数
  function getSelectedNode(nodes) {
    return nodes.find(node => node.selected);
  }

  // ドラッグ処理
  const handleMouseDown = (e, id) => {
    const node = getNodeById(nodes, id);
    setDragging(id);
    setStartPosition({ x: e.clientX - node.x, y: e.clientY - node.y });
    setOriginalPosition({ x: node.x, y: node.y }); // 元の座標を保存
    e.stopPropagation();  // イベントのバブリングを防止。パブリングとは、イベントが発生した要素から親要素に向かってイベントが伝播すること
  };

  // キャンバスでノード以外がクリックされた場合
  const handleClickOutside = useCallback((event) => {
    if (!event.target.closest('.editable') && !event.target.classList.contains('node')) {
      setEditingId(null);
      setNodes(nodes.map(node => ({ ...node, selected: false })));
    }
  }, [nodes]);

  const ZoomInViewBox = () => {
    setZoomRatio(prevZoomRatio => Math.min(prevZoomRatio + 0.1, 2));
  }

  const ZoomOutViewBox = () => {
    setZoomRatio(prevZoomRatio => Math.max(prevZoomRatio - 0.1, 0.1));
  }

  // キャンバスサイズの変更に伴い、viewBoxを更新する
  useEffect(() => {
    setViewBox(`0 0 ${canvasSize.width * (1 / zoomRatio)} ${canvasSize.height * (1 / zoomRatio)}`);
  }, [canvasSize]);

  const findNodeAndSwitch = (conditionCallback) => {
    const selectedNode = nodes.find(node => node.selected);
    if (!selectedNode) return;

    const newSelectedNode = nodes.find(conditionCallback);
    if (newSelectedNode) {
      switchSelectNode(newSelectedNode.id);
    }
  };

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

  //     // ノードの選択処理
  //     if (nodes.some(node => node.selected)) {
  //       // 矢印キーによるノードの選択処理
  //       switch (event.key) {
  //         case 'ArrowLeft':
  //           switchSelectNode(nodes.find(n => n.selected).parentId);
  //           break;
  //         case 'ArrowRight':
  //           findNodeAndSwitch(node => node.parentId === nodes.find(n => n.selected).id);
  //           break;
  //         case 'ArrowUp':
  //           handleArrowUp(nodes, getNodeById, switchSelectNode);
  //           break;
  //         case 'ArrowDown':
  //           // 一つ下のノードを選択
  //           handleArrowDown(nodes, getNodeById, switchSelectNode);
  //           break;
  //         default:
  //           break;
  //       }
  //     }
  //   };

  //   document.addEventListener('keydown', handleKeyDown);
  //   return () => document.removeEventListener('keydown', handleKeyDown);
  // }, [nodes, editingId, editingField, addNode, deleteNode, adjustNodePositions, handleArrowUp, handleArrowDown, findNodeAndSwitch, inputRefs]);

  useEffect(() => {
    if (editingId !== null) {
      inputRef.current?.focus();
    }
  }, [editingId]);

  // useEffect(() => {
  //   const handleMouseMove = (e) => {
  //     if (dragging !== null) {
  //       const newX = e.clientX - startPosition.x;
  //       const newY = e.clientY - startPosition.y;

  //       setNodes(nodes.map(node => node.id === dragging ? { ...node, x: newX, y: newY } : node));
  //     }
  //   };

  //   if (dragging !== null) {
  //     document.addEventListener('mousemove', handleMouseMove);
  //   }

  //   return () => {
  //     if (dragging !== null) {
  //       document.removeEventListener('mousemove', handleMouseMove);
  //     }
  //   };
  // }, [dragging, startPosition, nodes]);

  // const handleMouseUp = useCallback((e) => {
  //   if (dragging !== null) {
  //     const dropX = e.clientX;
  //     const dropY = e.clientY;

  //     const droppedOverNode = nodes.find(node => {
  //       const width = calculateNodeWidth([node.text, node.text2, node.text3]);
  //       return dropX >= node.x && dropX <= node.x + width &&
  //         dropY >= node.y && dropY <= node.y + NODE_HEIGHT &&
  //         node.id !== dragging;
  //     });

  //     if (droppedOverNode) {
  //       console.log(`droppedOverNode.id: ${droppedOverNode.id}`)
  //       const draggingNode = getNodeById(nodes, dragging);
  //       const originalParentId = draggingNode.parentId;
  //       const newParentId = droppedOverNode.id;

  //       // Undoのスナップショットを追加
  //       saveSnapshot(nodes);

  //       // ノードのorderを更新する前に、移動元の兄弟ノードのorderをデクリメント
  //       let updatedNodes = nodes.map(node => ({
  //         ...node,
  //         order: node.parentId === originalParentId && node.order > draggingNode.order ? node.order - 1 : node.order,
  //       }));

  //       // 移動元の親ノードの情報を更新
  //       updatedNodes = updatedNodes.map(node => {
  //         if (node.id === originalParentId) {
  //           return { ...node, children: node.children - 1 };
  //         }
  //         return node;
  //       });

  //       // 移動先の親ノードの情報を更新
  //       updatedNodes = updatedNodes.map(node => {
  //         if (node.id === newParentId) {
  //           return { ...node, children: node.children + 1 };
  //         }
  //         return node;
  //       });

  //       // 移動先の子ノードの数に基づいて新しいorderを計算
  //       const siblings = updatedNodes.filter(node => node.parentId === newParentId);
  //       const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(node => node.order)) + 1 : 0;
  //       const newX = siblings.length > 0 ? siblings[0].x : droppedOverNode.x + X_OFFSET;
  //       const newY = siblings.length > 0 ? siblings[maxOrder - 1].y + NODE_HEIGHT + 10 : droppedOverNode.y;

  //       // 移動したノードのparentIdとorderを更新
  //       updatedNodes = updatedNodes.map(node => {
  //         if (node.id === dragging) {
  //           return { ...node, parentId: newParentId, order: maxOrder, depth: droppedOverNode.depth + 1, x: newX, y: newY };
  //         }
  //         return node;
  //       });

  //       setNodes(updatedNodes);
  //     } else {
  //       // ドロップされた位置がノードの上にない場合、元の位置に戻す
  //       setNodes(nodes.map(node => {
  //         if (node.id === dragging) {
  //           return { ...node, x: originalPosition.x, y: originalPosition.y };
  //         }
  //         return node;
  //       }));
  //     }

  //     setDragging(null);
  //   }
  // }, [nodes, setNodes, dragging, originalPosition.x, originalPosition.y]);

  // useEffect(() => {
  //   document.addEventListener('mouseup', handleMouseUp);
  //   return () => document.removeEventListener('mouseup', handleMouseUp);
  // }, [nodes, dragging, handleMouseUp]);


  // useEffect(() => {
  //   document.addEventListener('click', handleClickOutside);
  //   return () => document.removeEventListener('click', handleClickOutside);
  // }, [handleClickOutside]);

  useEffect(() => {
    setCanvasSize(calculateCanvasSize(nodes, 50, 200, zoomRatio));
  }, [nodes, windowSize, zoomRatio]);

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

  // ノードの選択処理
  const switchSelectNode = (id) => {
    const selectedNode = getNodeById(nodes, id);
    console.log(`Selected Node: id=${selectedNode.id}, x=${selectedNode.x}, y=${selectedNode.y}, parentId=${selectedNode.parentId}, order=${selectedNode.order}, children=${selectedNode.children}`);

    setNodes(nodes.map(node => ({
      ...node,
      selected: node.id === id
    })));
  };

  const editingNode = nodes.find(n => n.id === editingId);

  // メニューバーでUndoボタンが押された場合の処理
  const handleUndo = () => {
    // Undo関数を呼び出してUndo処理を行う
    let updatedNodes = Undo(nodes);
    updatedNodes = adjustNodePositions(updatedNodes);
    setNodes(updatedNodes);
  };

  // メニューバーでRedoボタンが押された場合の処理
  const handleRedo = () => {
    // Redo関数を呼び出してRedo処理を行う
    let updatedNodes = Redo(nodes);
    updatedNodes = adjustNodePositions(updatedNodes);
    setNodes(updatedNodes);
  };

  return (
    <div className="App" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <div style={{ position: 'absolute', top: '40px', left: 0 }}>
        <ViewBox
          nodes={nodes}
          setNodes={setNodes}
          viewBox={viewBox}
          setViewBox={setViewBox}
          setCanvasSize={setCanvasSize}
          setDragging={setDragging}
          setStartPosition={setStartPosition}
          setOriginalPosition={setOriginalPosition}
          // handleMouseDown={handleMouseDown}
          // handleDoubleClick={handleDoubleClick}
          switchSelectNode={switchSelectNode}
          getNodeById={getNodeById}
        />
      </div>
      <MenuBar menubarWidth={canvasSize.width} handleUndo={handleUndo} handleRedo={handleRedo} ZoomInViewBox={ZoomInViewBox} ZoomOutViewBox={ZoomOutViewBox}/>
      <InputFields node={editingNode} updateText={updateText} editingField={editingField} />
    </div>
  );
}

export default App;
