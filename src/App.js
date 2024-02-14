import React, { useState, useEffect, useRef } from 'react';
import { calculateNodeWidth, calculateTextWidth, wrapText } from './util/TextUtilities';
import { useWindowSize, calculateCanvasSize } from './util/LayoutUtilities';
import './App.css';

function App() {
  const [nodes, setNodes] = useState([
    { id: 1, text: 'Node 1', selected: false, x: 50, y: 50, parentId: null, order: 0 },
  ]);
  const [editingId, setEditingId] = useState(null);
  const inputRef = useRef(null);

  // ウィンドウサイズとviewBoxのステート
  const windowSize = useWindowSize();
  const [viewBox, setViewBox] = useState('0 0 800 600');
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
    const node = nodes.find(n => n.id === id);
    setDragging(id);
    setStartPosition({ x: e.clientX - node.x, y: e.clientY - node.y });
    setOriginalPosition({ x: node.x, y: node.y }); // 元の座標を保存
    e.stopPropagation();
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      // キー操作による新しいノードの追加処理
      if (event.key === 'Tab' && nodes.some(n => n.selected)) {
        event.preventDefault();
        const selectedNode = nodes.find(n => n.selected);
        const childrenOfSelectedNode = nodes.filter(n => n.parentId === selectedNode.id);
        const newOrder = childrenOfSelectedNode.length;
        // 新しいノードの初期Y座標を設定
        let newChildY;
        if (childrenOfSelectedNode.length > 0) {
          const maxYChild = childrenOfSelectedNode.reduce((prev, current) => (prev.y > current.y) ? prev : current);
          newChildY = maxYChild.y + nodeHeight + 10; // 10はノード間のマージン
        } else {
          // 親ノードに子ノードがない場合は、親ノードの直下に配置
          newChildY = selectedNode.y; // 10はノード間のマージン
        }

        const newRect = {
          id: nodes.length + 1,
          // text: '',
          text: `Node ${nodes.length + 1}`,
          selected: false,
          x: selectedNode.x + parentXOffset,
          y: newChildY,
          parentId: selectedNode.id,
          order: newOrder,
        };

        const newNodes = [...nodes, newRect];

        // 新しいノードと既存のノードとの間で重なりをチェックし、調整
        let adjustedNodes = adjustNodePositions(newNodes)

        // 状態を更新
        setNodes(adjustedNodes);
        // setNodes([...adjustedNodes]);
      }

      if (event.key === 'Enter' && editingId === null && nodes.some(n => n.selected)) {
        // Enterキーが押され、選択中のノードがある場合、編集モードに入る
        const selectedNode = nodes.find(n => n.selected);
        setEditingId(selectedNode.id);
      } else if (editingId === null && nodes.some(n => n.selected)) {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          const selectedNodeIds = nodes.filter(n => n.selected).map(n => n.id);
          if (selectedNodeIds.length > 0) {
            const deletableNodeIds = selectedNodeIds.filter(id => {
              const node = nodes.find(n => n.id === id);
              return node.parentId !== null; // parentIdがnullでないノードだけを対象とする
            });
            // 選択されたノードを除外して新しいノードのリストを作成
            let minY = Infinity;
            const newNodes = nodes.filter(n => {
              if (deletableNodeIds.includes(n.id)) {
                minY = Math.min(minY, n.y); // 削除されるノードの最小Y座標を更新
                return false;
              }
              return true;
            });

            // 削除されたノードの親ノードIDを取得
            const parentIdOfDeletedNode = nodes.find(n => selectedNodeIds.includes(n.id))?.parentId;

            if (parentIdOfDeletedNode !== undefined) {
              // 削除されたノードの後ろにあるノードのorderを更新
              newNodes.forEach(node => {
                if (node.parentId === parentIdOfDeletedNode && node.order > nodes.find(n => n.id === selectedNodeIds[0])?.order) {
                  node.order -= 1;
                }
              });
            }

            // 削除されたノードの影響を受けるノードのY座標を調整
            const adjustedNodes = adjustNodePositions(newNodes)

            setNodes(adjustedNodes);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nodes, editingId]);

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

        setNodes(nodes.map(n => n.id === dragging ? { ...n, x: newX, y: newY } : n));
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

  const handleMouseUp = (e) => {
    if (dragging !== null) {
      const dropX = e.clientX;
      const dropY = e.clientY;

      const droppedOverNode = nodes.find(n => {
        const width = calculateNodeWidth(n.text); // Calculate width
        return dropX >= n.x && dropX <= n.x + width &&
          dropY >= n.y && dropY <= n.y + nodeHeight &&
          n.id !== dragging;
      });

      if (droppedOverNode) {
        console.log(`droppedOverNode.id: ${droppedOverNode.id}`)
        const draggingNode = nodes.find(n => n.id === dragging);
        const originalParentId = draggingNode.parentId;
        const newParentId = droppedOverNode.id;

        // ノードのorderを更新する前に、移動元の兄弟ノードのorderをデクリメント
        let updatedNodes = nodes.map(n => ({
          ...n,
          order: n.parentId === originalParentId && n.order > draggingNode.order ? n.order - 1 : n.order,
        }));

        // 移動先の子ノードの数に基づいて新しいorderを計算
        const siblings = updatedNodes.filter(n => n.parentId === newParentId);
        const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(n => n.order)) + 1 : 0;

        // 移動したノードのparentIdとorderを更新
        updatedNodes = updatedNodes.map(n => {
          if (n.id === dragging) {
            return { ...n, parentId: newParentId, order: maxOrder };
          }
          return n;
        });

        setNodes(updatedNodes);
      } else {
        setNodes(nodes.map(n => {
          if (n.id === dragging) {
            return { ...n, x: originalPosition.x, y: originalPosition.y };
          }
          return n;
        }));
      }

      setDragging(null);
    }
  };

  function getNodeOfId(nodes, id) {
    return nodes.find(node => node.id === id);
  }

  function isPositionForOverlap(currentNodeId, x, y, nodes) {

    // 指定された座標に重複があるノードが存在するかどうかをチェック
    return nodes.some(node => {
      // 自分自身のノードは除外
      if (node.id === currentNodeId) {
        return false;
      }

      const nodeRight = node.x + calculateNodeWidth(node.text); // ノードの右端
      const nodeBottom = node.y + nodeHeight; // ノードの下端

      // console.log(`[debug] isPositionForOverlap - node.text:${node.text} ${x} ${node.x}, ${y} ${node.y} ${(x < nodeRight && x + calculateNodeWidth(nodes.find(n => n.id === currentNodeId).text) > node.x && y < nodeBottom && y + nodeHeight > node.y)}`)

      // 指定された座標がノードの範囲内にあるかどうかをチェック
      return (x < nodeRight && x + calculateNodeWidth(nodes.find(n => n.id === currentNodeId).text) > node.x &&
        y < nodeBottom && y + nodeHeight > node.y);
    });
  }


  // ノードの位置を調整する
  function adjustNodePositions(nodes) {
    let queue = []; // 待ち行列を初期化
    let startY = 10; // 初期Y座標
    let loop = 0;

    // 最初に全てのルートノード（parentIdがnullのノード）を待ち行列に追加
    nodes.filter(node => node.parentId === null).forEach(rootNode => {
      queue.push({ node: rootNode, startX: 50, startY: startY });
      startY += nodeHeight + 10; // ルートノード間の間隔
    });

    while (queue.length > 0) {
      let { node, startX, startY } = queue.shift(); // 待ち行列からノードを取り出す
      let currentY = startY; // ここで各ノードごとにcurrentYをリセット
      let childStartYs = [];

      node.x = startX;
      node.y = currentY;
      loop += 1;

      // 現在のノードに属する子ノードを処理
      let children = nodes.filter(child => child.parentId === node.id).sort((a, b) => a.order - b.order);
      children.forEach((child, index) => {
        while (isPositionForOverlap(child.id, child.x, currentY, nodes)) {
          const overlappingNode = nodes.find(n =>
            n.x < child.x + calculateNodeWidth(child.text) &&
            n.x + calculateNodeWidth(n.text) > child.x &&
            n.y < currentY + nodeHeight &&
            n.y + nodeHeight > currentY &&
            n.id !== child.id);

          if (overlappingNode && shouldSkipOverlapAdjustment(child, overlappingNode, nodes)) {
            break;
          }
          currentY += nodeHeight + 10;
        }

        function shouldSkipOverlapAdjustment(currentNode, overlappingNode, nodes) {
          // currentNodeとoverlappingNodeの親ノードのorderを比較
          const currentParent = nodes.find(n => n.id === currentNode.parentId);
          const overlappingParent = nodes.find(n => n.id === overlappingNode.parentId);

          if (currentParent && overlappingParent && currentParent.order < overlappingParent.order) {
            return true; // スキップ
          }
          return false; // 加算
        }
        console.log(`[debug] shouldSkipOverlapAdjustment - ${child.text} index= ${index} Height: ${currentY} loop=${loop}`);
        child.x = node.x + 200; // X座標のオフセットを設定
        child.y = currentY;
        childStartYs.push(currentY);

        // 子ノードがさらに子ノードを持つ場合、待ち行列に追加
        //queue.push({ node: child, startX: child.x, startY: currentY + nodeHeight + 10 }); // 子ノードごとにstartYを更新
        queue.push({ node: child, startX: child.x, startY: currentY }); // 子ノードごとにstartYを更新
      });

      // 子ノードが存在する場合、親ノードのY座標を更新
      if (children.length > 0) {
        const minY = Math.min(...childStartYs);
        const maxY = Math.max(...childStartYs.map(y => y + nodeHeight));
        node.y = minY + ((maxY - minY) / 2) - (nodeHeight / 2); // 子ノード群の中央に親ノードを配置
        console.log(`[debug] 親ノードのY座標更新 - ${node.y}`)
        if (isPositionForOverlap(node.id, node.x, node.y, nodes)) {
          console.log(`親衝突検知 ${node.text} ${node.x} ${node.y}`)
          // 重複が検出された場合、このノードより下にある全てのノードのY座標を調整
          // 親ノードより下にある全ノードのY座標を調整
          const shiftY = nodeHeight + 100; // 調整するY座標の量
          nodes = nodes.map(n => {
            console.log(`[debug] node.id: ${node.id},  n.parentId: ${n.parentId}`)
            if (n.y > node.y && node.id !== n.parentId) { // 現在の親ノードより下にあるノードのみ対象
              return { ...n, y: n.y + shiftY };
            }
            return n;
          });
        }
      }
    }
    return nodes; // 更新されたノードの配列を返却
  }

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [nodes, dragging, originalPosition, handleMouseUp]);


  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [nodes]);
  
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


  const handleClickOutside = (event) => {
    if (!event.target.closest('.editable') && !event.target.classList.contains('node')) {
      setEditingId(null);
      setNodes(nodes.map(node => ({ ...node, selected: false })));
    }
  };

  const handleDoubleClick = (id) => {
    // ダブルクリックされたノードで編集モードに入る
    setEditingId(id);
  };

  const updateText = (e) => {
    const newText = e.target.value;
    setNodes(nodes.map(n => n.id === editingId ? { ...n, text: newText } : n));
  };

  const selectNode = (id) => {
    const selectedNode = nodes.find(n => n.id === id);
    console.log(`Selected Node: id=${selectedNode.id}, x=${selectedNode.x}, y=${selectedNode.y}, parentId=${selectedNode.parentId}, order=${selectedNode.order}`);

    setNodes(nodes.map(n => ({
      ...n,
      selected: n.id === id
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
          const parentNode = getNodeOfId(nodes, node.parentId)
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
          value={nodes.find(n => n.id === editingId)?.text}
          onChange={updateText}
          style={{
            // position: 'absolute',
            left: `${nodes.find(n => n.id === editingId)?.x}px`,
            //top: `${nodes.find(n => n.id === editingId)?.y - 30}px`,
            top: `${nodes.find(n => n.id === editingId)?.y}px`,
            width: `${calculateNodeWidth(nodes.find(n => n.id === editingId)?.text)}px`,
            // zIndex: 100,
          }}
        />
      )}
    </div>
  );
}

export default App;
