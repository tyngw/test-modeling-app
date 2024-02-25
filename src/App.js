// App.js
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { calculateNodeWidth } from './utils/TextUtilities';
import { useWindowSize, calculateCanvasSize } from './utils/LayoutUtilities';
import Node from './components/Node';
import MenuBar from './components/Menubar';
import InputFields from './components/InputFields';
import { adjustNodePositions } from './utils/NodeAdjuster';
import { handleArrowUp, handleArrowDown } from './utils/NodeSelector';
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

  const nodeHeight = 60;
  const arrowOffset = 20; // 矢印のオフセット
  const curveControlOffset = 80; // 曲線の制御点のオフセット

  const parentXOffset = 200; // 親ノードから子ノードへのX軸オフセット

  const [dragging, setDragging] = useState(null);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });

  // Undo/Redoのためのノードのスナップショットを保存
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotIndex, setSnapshotIndex] = useState(0);

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
  
  // Undo処理を行う関数
  const undo = () => {
    if (snapshotIndex > 0) {
      console.log(`Undo snapshotIndex: ${snapshotIndex}`);
      setSnapshotIndex(snapshotIndex - 1);
      setNodes(snapshots[snapshotIndex - 1]);
    }
  };

  // Redo処理を行う関数
  const redo = () => {
    if (snapshotIndex < snapshots.length - 1) {
      console.log(`Redo snapshotIndex: ${snapshotIndex}`);
      setSnapshotIndex(snapshotIndex + 1);
      setNodes(snapshots[snapshotIndex + 1]);
    }
  };

  // ドラッグ処理
  const handleMouseDown = (e, id) => {
    const node = getNodeById(nodes, id);
    setDragging(id);
    setStartPosition({ x: e.clientX - node.x, y: e.clientY - node.y });
    setOriginalPosition({ x: node.x, y: node.y }); // 元の座標を保存
    e.stopPropagation();
  };

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

  // 新しいノードの追加処理を行う関数
  // 引数として追加元ノードの要素を受け取り、その追加元ノードの子ノードとして新しいノードを追加する
  const addNode = (parentNode) => {
    let newNodes;
    const newId = Math.max(...nodes.map(node => node.id), 0) + 1;
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
    newNodes = [...nodes, newRect];

    // 追加元ノードのchildrenプロパティをインクリメント
    newNodes = newNodes.map(node => {
      if (node.id === parentNode.id) {
        return { ...node, children: node.children + 1 };
      }
      return node;
    });

    // 新しいノードと既存のノードとの間で重なりをチェックし、調整
    let adjustedNodes = adjustNodePositions(newNodes, nodeHeight)

    return adjustedNodes;
  };

  // deleteNodeRecursive関数を呼び出す関数
  // 引数としてノードのリストと削除対象のノードを受け取る
  const deleteNode = (nodeList, nodeToDelete) => {
    const updatedNodes = deleteNodeRecursive(nodeList, nodeToDelete);
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

    updatedNodes = adjustNodePositions(updatedNodes, nodeHeight);
    return updatedNodes;
  };

  const findNodeAndSwitch = (conditionCallback) => {
    const selectedNode = nodes.find(node => node.selected);
    if (!selectedNode) return;

    const newSelectedNode = nodes.find(conditionCallback);
    if (newSelectedNode) {
      // selectNodeを利用するように処理を変更
      switchSelectNode(newSelectedNode.id);
      //switchSelectedNode(newSelectedNode.id);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      // キー操作による新しいノードの追加処理(タブキーが押された場合, 選択中のノードがある場合, 編集モードでない場合)
      if (event.key === 'Tab' && nodes.some(node => node.selected) && editingId === null) {
        event.preventDefault(); // ブラウザデフォルトの挙動を防止
        const selectedNode = getSelectedNode(nodes);

        // Undoのスナップショットを追加
        setSnapshots([...snapshots.slice(0, snapshotIndex + 1), nodes]);
        setSnapshotIndex(snapshotIndex + 1);
        console.log(`snapshotIndex: ${snapshotIndex}`);


        // 新しいノードを追加する処理
        let updatedNodes = addNode(selectedNode);
        setNodes(updatedNodes);
      }

      if (editingId !== null && event.key === 'Tab') {
        event.preventDefault(); // ブラウザデフォルトの挙動を防止
        const fields = ['text', 'text2', 'text3'];
        const currentIndex = fields.indexOf(editingField);
        const nextIndex = (currentIndex + 1) % fields.length;
        setEditingField(fields[nextIndex]);

        // `text3`からTabを押した場合、編集モードを終了
        if (editingField === 'text3') {
          setEditingId(null);
        } else {
          // 次のフィールドにフォーカスを移動
          const nextFieldRef = inputRefs[fields[nextIndex]];
          if (nextFieldRef.current) {
            nextFieldRef.current.focus();
          }
        }
      }

      // Ctrl + ZでUndo処理
      // Macの場合は、Command + ZでUndo処理
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        event.preventDefault();
        //undo関数を呼び出してUndo処理を行う
        undo();
      }

      // Shift + Ctrl + ZでRedo処理
      // Macの場合は、Shift + Command + ZでRedo処理
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z') {
        event.preventDefault();
        redo();
      }

      if (event.key === 'Enter' && editingId === null && nodes.some(node => node.selected)) {
        // Enterキーが押され、選択中のノードがある場合、編集モードに入る
        const selectedNode = nodes.find(node => node.selected);
        setEditingId(selectedNode.id);
      } else if (editingId === null && nodes.some(node => node.selected)) {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          const selectedNodeIds = nodes.filter(node => node.selected).map(node => node.id);
          // Undoのスナップショットを追加
          setSnapshots([...snapshots.slice(0, snapshotIndex + 1), nodes]);
          setSnapshotIndex(snapshotIndex + 1);

          // 選択されたノードを削除する処理
          let updatedNodes = nodes;
          selectedNodeIds.forEach(id => {
            updatedNodes = deleteNode(nodes, getNodeById(updatedNodes, id));
          });
          setNodes(updatedNodes);
        }
      }

      // ノードの選択処理
      if (nodes.some(node => node.selected)) {
        // 矢印キーによるノードの選択処理
        switch (event.key) {
          case 'ArrowLeft':
            switchSelectNode(nodes.find(n => n.selected).parentId);
            break;
          case 'ArrowRight':
            findNodeAndSwitch(node => node.parentId === nodes.find(n => n.selected).id);
            break;
          case 'ArrowUp':
            handleArrowUp(nodes, getNodeById, switchSelectNode);
            break;
          case 'ArrowDown':
            // 一つ下のノードを選択
            handleArrowDown(nodes, getNodeById, switchSelectNode);
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, editingId, editingField, snapshots, snapshotIndex, undo, redo, addNode, deleteNode, adjustNodePositions, handleArrowUp, handleArrowDown, findNodeAndSwitch, inputRefs]);

  useEffect(() => {
    if (editingId !== null) {
      inputRef.current?.focus();
    }
  }, [editingId]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragging !== null) {
        const newX = e.clientX - startPosition.x;
        const newY = e.clientY - startPosition.y;

        setNodes(nodes.map(node => node.id === dragging ? { ...node, x: newX, y: newY } : node));
      }
    };

    if (dragging !== null) {
      document.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (dragging !== null) {
        document.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [dragging, startPosition, nodes]);

  const handleMouseUp = useCallback((e) => {
    if (dragging !== null) {
      const dropX = e.clientX;
      const dropY = e.clientY;

      const droppedOverNode = nodes.find(node => {
        const width = calculateNodeWidth([node.text, node.text2, node.text3]);
        return dropX >= node.x && dropX <= node.x + width &&
          dropY >= node.y && dropY <= node.y + nodeHeight &&
          node.id !== dragging;
      });

      if (droppedOverNode) {
        console.log(`droppedOverNode.id: ${droppedOverNode.id}`)
        const draggingNode = getNodeById(nodes, dragging);
        const originalParentId = draggingNode.parentId;
        const newParentId = droppedOverNode.id;

        setSnapshots([...snapshots.slice(0, snapshotIndex + 1), nodes]);
        setSnapshotIndex(snapshotIndex + 1);

        // ノードのorderを更新する前に、移動元の兄弟ノードのorderをデクリメント
        let updatedNodes = nodes.map(node => ({
          ...node,
          order: node.parentId === originalParentId && node.order > draggingNode.order ? node.order - 1 : node.order,
        }));

        // 移動元の親ノードの情報を更新
        updatedNodes = updatedNodes.map(node => {
          if (node.id === originalParentId) {
            return { ...node, children: node.children - 1 };
          }
          return node;
        });

        // 移動先の親ノードの情報を更新
        updatedNodes = updatedNodes.map(node => {
          if (node.id === newParentId) {
            return { ...node, children: node.children + 1 };
          }
          return node;
        });

        // 移動先の子ノードの数に基づいて新しいorderを計算
        const siblings = updatedNodes.filter(node => node.parentId === newParentId);
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(node => node.order)) + 1 : 0;
        const newX = siblings.length > 0 ? siblings[0].x : droppedOverNode.x + parentXOffset;
        const newY = siblings.length > 0 ? siblings[maxOrder - 1].y + nodeHeight + 10 : droppedOverNode.y;

        // 移動したノードのparentIdとorderを更新
        updatedNodes = updatedNodes.map(node => {
          if (node.id === dragging) {
            return { ...node, parentId: newParentId, order: maxOrder, depth: droppedOverNode.depth + 1, x: newX, y: newY };
          }
          return node;
        });

        setNodes(updatedNodes);
      } else {
        // ドロップされた位置がノードの上にない場合、元の位置に戻す
        setNodes(nodes.map(node => {
          if (node.id === dragging) {
            return { ...node, x: originalPosition.x, y: originalPosition.y };
          }
          return node;
        }));
      }

      setDragging(null);
    }
  }, [nodes, setNodes, dragging, originalPosition.x, originalPosition.y, snapshots, snapshotIndex]);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [nodes, dragging, handleMouseUp]);


  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    setCanvasSize(calculateCanvasSize(nodes, 50, 200, zoomRatio));
  }, [nodes, windowSize, zoomRatio]);

  const handleDoubleClick = (id) => {
    // ダブルクリックされたノードで編集モードに入る
    setEditingId(id);
  };

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

  return (
    <div className="App" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      <div style={{ position: 'absolute', top: 0, left: 0 }}>
        <svg
          viewBox={viewBox}
          width={canvasSize.width}
          height={canvasSize.height}
          onClick={handleClickOutside}
        // onWheel={handleWheel}
        >
          {nodes.map((node) => (
            <Node
              key={node.id}
              node={node}
              getNodeById={getNodeById}
              calculateNodeWidth={calculateNodeWidth}
              nodeHeight={nodeHeight}
              curveControlOffset={curveControlOffset}
              arrowOffset={arrowOffset}
              selectNode={switchSelectNode}
              handleDoubleClick={handleDoubleClick}
              handleMouseDown={handleMouseDown}
              nodes={nodes}
            />
          ))}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" fill="none" stroke="black">
              <polygon points="0 0, 10 3.5, 0 7" fill="none" stroke="black" />
            </marker>
          </defs>
        </svg>
      </div>
      <MenuBar menubarWidth={canvasSize.width} undo={undo} redo={redo} ZoomInViewBox={ZoomInViewBox} ZoomOutViewBox={ZoomOutViewBox}/>
      <InputFields node={editingNode} updateText={updateText} editingField={editingField} />
    </div>
  );
}

export default App;
