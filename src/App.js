import React, { useState, useCallback, useEffect, useRef } from 'react';
import { calculateNodeWidth, wrapText } from './util/TextUtilities';
import { useWindowSize, calculateCanvasSize } from './util/LayoutUtilities';
import './App.css';

function App() {
  const [nodes, setNodes] = useState([
    { id: 1, text: 'Node 1', selected: false, x: 50, y: 50, parentId: null, order: 0, depth: 1, children: 0, },
  ]);
  const [editingId, setEditingId] = useState(null);
  const inputRef = useRef(null);

  // ウィンドウサイズとviewBoxのステート
  const windowSize = useWindowSize();
  const [viewBox, setViewBox] = useState(`0 0 ${windowSize.width} ${windowSize.height}`);
  const lastDistanceRef = useRef(null); // 最後の距離を格納するためのref

  const nodeHeight = 50;
  const arrowOffset = 20; // 矢印のオフセット
  const curveControlOffset = 80; // 曲線の制御点のオフセット

  const parentXOffset = 200; // 親ノードから子ノードへのX軸オフセット

  const [dragging, setDragging] = useState(null);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });

  // ノードがキャンバスサイズを超えた場合に備えて、キャンバスの最小サイズを設定する
  const [canvasSize, setCanvasSize] = useState({ width: windowSize.width, height: windowSize.height });

  const handleMouseDown = (e, id) => {
    const node = nodes.find(node => node.id === id);
    setDragging(id);
    setStartPosition({ x: e.clientX - node.x, y: e.clientY - node.y });
    setOriginalPosition({ x: node.x, y: node.y }); // 元の座標を保存
    e.stopPropagation();
  };

  function adjustNodeAndChildrenPosition(node, currentY, allNodes, depthOffset = 260, ySpacing = 10) {
    node.x = (node.depth - 1) * depthOffset;
    node.y = currentY;
  
    console.log(`「${node.text}」の位置を設定: x=${node.x}, y=${node.y}`);
    const childNodes = allNodes.filter(n => n.parentId === node.id);
  
    if (childNodes.length > 0) {
      childNodes.forEach(childNode => {
        currentY = adjustNodeAndChildrenPosition(childNode, currentY, allNodes, depthOffset, ySpacing);
      });
    } else {
      currentY += nodeHeight + ySpacing; // 子ノードがない場合、Y座標を更新
    }
    return currentY;
  }

  // ノードの位置を調整する
  const adjustNodePositions = useCallback((allNodes) => {
    // depthが小さい順にノードをソートし、同じdepth内ではparentId, その後orderでソート
    let sortedNodes = [...allNodes].sort((a, b) => a.depth - b.depth || a.parentId - b.parentId || a.order - b.order);
    const rootNodes = allNodes.filter(n => n.parentId === null);
    let currentY = 10; // Y座標の初期値
    let lastChildY;
    const adjust = true;

    rootNodes.forEach(rootNode => {
      currentY = adjustNodeAndChildrenPosition(rootNode, currentY, allNodes);
    });

    // depthが小さい順にノードをソートし、同じdepth内ではparentId, その後orderでソート
    sortedNodes = [...allNodes].sort((a, b) => b.depth - a.depth || a.parentId - b.parentId || a.order - b.order);

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
  }, [nodeHeight]);

  const handleClickOutside = useCallback((event) => {
    if (!event.target.closest('.editable') && !event.target.classList.contains('node')) {
      setEditingId(null);
      setNodes(nodes.map(node => ({ ...node, selected: false })));
    }
  }, [nodes]);

  // useEffect(() => {
  //   console.log('Nodes array has been updated:', nodes);
  // }, [nodes]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // キー操作による新しいノードの追加処理
      if (event.key === 'Tab' && nodes.some(node => node.selected)) {
        event.preventDefault();
        const selectedNode = nodes.find(node => node.selected);
        const newId = Math.max(...nodes.map(node => node.id), 0) + 1;

        // 選択したノードのchildrenプロパティを更新
        selectedNode.children = (selectedNode.children || 0) + 1;

        const newRect = {
          id: newId,
          // text: '',
          text: `Node ${newId}`,
          selected: false,
          x: selectedNode.depth * 260,
          // y: newChildY,
          y: 0,
          parentId: selectedNode.id,
          order: selectedNode.children - 1,
          depth: selectedNode.depth + 1,
          children: 0,
        };

        const newNodes = [...nodes, newRect];

        // 新しいノードと既存のノードとの間で重なりをチェックし、調整
        let adjustedNodes = adjustNodePositions(newNodes)

        // 状態を更新
        setNodes(adjustedNodes);
      }

      if (event.key === 'Enter' && editingId === null && nodes.some(node => node.selected)) {
        // Enterキーが押され、選択中のノードがある場合、編集モードに入る
        const selectedNode = nodes.find(node => node.selected);
        setEditingId(selectedNode.id);
      } else if (editingId === null && nodes.some(node => node.selected)) {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          const selectedNodeIds = nodes.filter(node => node.selected).map(node => node.id);
          if (selectedNodeIds.length > 0) {
            // 削除対象のノードIDを取得
            const deletableNodeIds = selectedNodeIds.filter(id => {
              const node = nodes.find(node => node.id === id);
              return node.parentId !== null; // parentIdがnullでないノードだけを対象とする
            });
    
            // 削除されるノードの親ノードのchildrenをデクリメント
            let updatedNodes = nodes.map(node => {
              if (deletableNodeIds.includes(node.id) && node.parentId) {
                const parentNodeIndex = nodes.findIndex(n => n.id === node.parentId);
                if (parentNodeIndex !== -1) {
                  nodes[parentNodeIndex].children = Math.max(0, nodes[parentNodeIndex].children - 1);
                }
              }
              return node;
            });
    
            // 選択されたノードを除外して新しいノードのリストを作成
            updatedNodes = updatedNodes.filter(node => !deletableNodeIds.includes(node.id));
    
            // 削除されたノードの影響を受けるノードのY座標を調整
            const adjustedNodes = adjustNodePositions(updatedNodes);
    
            setNodes(adjustedNodes);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, editingId, adjustNodePositions]);

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
        const width = calculateNodeWidth(node.text); // Calculate width
        return dropX >= node.x && dropX <= node.x + width &&
          dropY >= node.y && dropY <= node.y + nodeHeight &&
          node.id !== dragging;
      });

      if (droppedOverNode) {
        console.log(`droppedOverNode.id: ${droppedOverNode.id}`)
        const draggingNode = nodes.find(node => node.id === dragging);
        const originalParentId = draggingNode.parentId;
        const newParentId = droppedOverNode.id;

        // ノードのorderを更新する前に、移動元の兄弟ノードのorderをデクリメント
        let updatedNodes = nodes.map(node => ({
          ...node,
          order: node.parentId === originalParentId && node.order > draggingNode.order ? node.order - 1 : node.order,
        }));

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
        setNodes(nodes.map(node => {
          if (node.id === dragging) {
            return { ...node, x: originalPosition.x, y: originalPosition.y };
          }
          return node;
        }));
      }

      setDragging(null);
    }
  }, [nodes, setNodes, dragging, originalPosition.x, originalPosition.y]);

  function getNodeById(nodes, id) {
    return nodes.find(node => node.id === id);
  }

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [nodes, dragging, originalPosition, handleMouseUp]);


  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    setCanvasSize(calculateCanvasSize(nodes, calculateNodeWidth, 50, 200, windowSize));
  }, [nodes, windowSize]);

  // 2点間の距離を計算するロジックをここに記述...
  // この距離の変化に基づいてズームレベルを更新...
  useEffect(() => {
    const handleTouchMove = (event) => {
      if (event.touches.length === 2) {
        event.preventDefault();

        const touch1 = { x: event.touches[0].pageX, y: event.touches[0].pageY };
        const touch2 = { x: event.touches[1].pageX, y: event.touches[1].pageY };

        const distance = Math.sqrt(Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2));

        if (lastDistanceRef.current !== null) {
          const zoomFactor = 0.01; // ズーム感度を調整
          const zoomChange = distance - lastDistanceRef.current;

          let [x, y, width, height] = viewBox.split(' ').map(Number);

          // ズームの変更を適用
          let newWidth = width - (zoomChange * zoomFactor * width);
          let newHeight = height - (zoomChange * zoomFactor * height);

          // 新しいviewBoxの計算（ズームアウトの範囲拡大）
          let newX = x + (width - newWidth) / 2;
          let newY = y + (height - newHeight) / 2;

          // viewBoxを更新してズームイン・アウト
          setViewBox(`${newX} ${newY} ${newWidth} ${newHeight}`);
        }

        lastDistanceRef.current = distance;
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => document.removeEventListener('touchmove', handleTouchMove);
  }, [viewBox]);

  const handleDoubleClick = (id) => {
    // ダブルクリックされたノードで編集モードに入る
    setEditingId(id);
  };

  const updateText = (e) => {
    const newText = e.target.value;
    setNodes(nodes.map(node => node.id === editingId ? { ...node, text: newText } : node));
  };

  const selectNode = (id) => {
    const selectedNode = nodes.find(node => node.id === id);
    console.log(`Selected Node: id=${selectedNode.id}, x=${selectedNode.x}, y=${selectedNode.y}, parentId=${selectedNode.parentId}, order=${selectedNode.order}, children=${selectedNode.children}`);

    setNodes(nodes.map(node => ({
      ...node,
      selected: node.id === id
    })));
  };


  return (
    <div className="App" style={{ width: '200%', height: '200%', overflow: 'auto' }}>
      <svg
        width={canvasSize.width * 2}
        height={canvasSize.height * 2}
        onClick={handleClickOutside}
        style={{ touchAction: 'none' }} // ブラウザのデフォルトのピンチズームを無効化
      >
        {nodes.map((node, index) => {
          const parentNode = getNodeById(nodes, node.parentId)
          const nodeWidth = calculateNodeWidth(node.text);
          const lines = wrapText(node.text, nodeWidth);
          return (
            <React.Fragment key={node.id}>
              {parentNode && (
                <path
                  d={`M ${node.x},${node.y + nodeHeight / 2}
                  C ${node.x - curveControlOffset},${node.y + nodeHeight / 2} 
                  ${parentNode.x + calculateNodeWidth(parentNode.text) + curveControlOffset},${parentNode.y + nodeHeight / 2} 
                  ${parentNode.x + calculateNodeWidth(parentNode.text) + arrowOffset},${parentNode.y + nodeHeight / 2}`}
                  stroke="black"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                />
              )}

              <rect
                x={node.x}
                y={node.y}
                width={nodeWidth}
                height={nodeHeight}
                className={`node ${node.selected ? 'node-selected' : 'node-unselected'}`}
                rx="10"
                onClick={() => selectNode(node.id)}
                onDoubleClick={() => handleDoubleClick(node.id)}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
              />
              {lines.map((line, lineIndex) => (
                <text
                  key={`${node.id}-${lineIndex}`}
                  x={node.x + 5}
                  y={node.y + 20 + (lineIndex * 20)} // 行ごとにY座標をオフセット
                  className="node-text"
                >
                  {line}
                </text>
              ))}
            </React.Fragment>
          );
        })}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto" fill="none" stroke="black">
            <polygon points="0 0, 10 3.5, 0 7" fill="none" stroke="black" />
          </marker>
        </defs>
      </svg>
      {editingId !== null && (
        <input
          ref={inputRef}
          type="text"
          className="editable"
          value={nodes.find(node => node.id === editingId)?.text}
          onChange={updateText}
          style={{
            // position: 'absolute',
            left: `${nodes.find(node => node.id === editingId)?.x}px`,
            //top: `${nodes.find(n => n.id === editingId)?.y - 30}px`,
            top: `${nodes.find(node => node.id === editingId)?.y}px`,
            width: `${calculateNodeWidth(nodes.find(node => node.id === editingId)?.text)}px`,
            // zIndex: 100,
          }}
        />
      )}
    </div>
  );
}

export default App;
