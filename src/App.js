import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [nodes, setNodes] = useState([
    { id: 1, text: 'Node 1', selected: false, x: 50, y: 50, parentId: null },
  ]);
  const [editingId, setEditingId] = useState(null);
  const inputRef = useRef(null);

  // ウィンドウサイズとviewBoxのステート
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [viewBox, setViewBox] = useState('0 0 800 600');
  const lastDistanceRef = useRef(null); // 最後の距離を格納するためのref

  const nodeHeight = 50;
  const arrowOffset = 20; // 矢印のオフセット
  const curveControlOffset = 80; // 曲線の制御点のオフセット

  const parentXOffset = 200; // 親ノードから子ノードへのX軸オフセット

  const calculateNodeWidth = (text) => {
    const minWidth = 80;
    const maxWidth = 200;
    const textLength = calculateTextWidth(text);
    const widthBasedOnText = Math.max(minWidth, Math.min(maxWidth, textLength));
    return widthBasedOnText;
  };

  const calculateTextWidth = (text) => {
    const textLength = text.length * 10;
    return textLength;
  };

  function wrapText(text, maxWidth) {
    const lines = [];
    let currentLine = '';

    text.split('').forEach(char => {
      // 次の文字を追加した場合の仮の行を検討
      const testLine = currentLine + char;
      const testWidth = calculateTextWidth(testLine);

      if (testWidth <= maxWidth || currentLine === '') {
        // 仮の行が最大幅以下、または現在の行が空の場合は追加
        currentLine = testLine;
      } else {
        // 最大幅を超えた場合、現在の行をlinesに追加し、新しい行を開始
        lines.push(currentLine);
        currentLine = char;
      }
    });

    // 残りの部分を追加
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  const [dragging, setDragging] = useState(null);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e, id) => {
    const node = nodes.find(n => n.id === id);
    setDragging(id);
    setStartPosition({ x: e.clientX - node.x, y: e.clientY - node.y });
    setOriginalPosition({ x: node.x, y: node.y }); // 元の座標を保存
    e.stopPropagation();
  };

  useEffect(() => {
    // 新しいノード追加時の処理
    const handleKeyDown = (e) => {
      // キー操作による新しいノードの追加処理
      if (e.key === 'Tab' && nodes.some(n => n.selected)) {
        e.preventDefault();
        const selectedNode = nodes.find(n => n.selected);
        const childrenOfSelectedNode = nodes.filter(n => n.parentId === selectedNode.id);
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
        };

        // 新しいノードと既存のノードとの間で重なりをチェックし、調整
        const adjustedNodes = checkOverlapAndAdjust(newRect, nodes);

        // 状態を更新
        setNodes(adjustedNodes);
      }

      if (e.key === 'Enter' && editingId === null && nodes.some(n => n.selected)) {
        // Enterキーが押され、選択中のノードがある場合、編集モードに入る
        const selectedNode = nodes.find(n => n.selected);
        setEditingId(selectedNode.id);
      } else if (editingId === null && nodes.some(n => n.selected)) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          const selectedNodeIds = nodes.filter(n => n.selected).map(n => n.id);
          if (selectedNodeIds.length > 0) {
            // 選択されたノードを除外して新しいノードのリストを作成
            let minY = Infinity;
            const newNodes = nodes.filter(n => {
              if (selectedNodeIds.includes(n.id)) {
                minY = Math.min(minY, n.y); // 削除されるノードの最小Y座標を更新
                return false;
              }
              return true;
            });

            // 削除されたノードの影響を受けるノードのY座標を調整
            const deletedNodeHeight = nodeHeight + 10; // 10はノード間のマージンを表します
            const adjustedNodes = adjustNodePositionsAfterDeletion(newNodes, deletedNodeHeight, minY);

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
        const width = calculateNodeWidth(n.text); // 幅を計算
        // console.log(`dropX: ${dropX}, dropY: ${dropY}, Node ID: ${n.id}, Text: "${n.text}", Width: ${width}, dragging: ${dragging}}`);
        return dropX >= n.x && dropX <= n.x + width &&
          dropY >= n.y && dropY <= n.y + nodeHeight &&
          n.id !== dragging;
      });

      if (droppedOverNode) {
        console.log(`droppedOverNode.id: ${droppedOverNode.id}`)
        let adjustedNodes = nodes.map(n => {
          if (n.id === dragging) {
            return { ...n, parentId: droppedOverNode.id };
          }
          return n;
        });

        // 位置の調整を行う関数を呼び出し
        adjustedNodes = adjustNodePositions(adjustedNodes, dragging, droppedOverNode);

        setNodes(adjustedNodes);
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

  // 全ノードとの重なりをチェックし、必要に応じて位置を調整する関数
  const checkOverlapAndAdjust = (newNode, existingNodes) => {
    let offsetY = 0;
    const adjustedNodes = existingNodes.map(node => {
      if (node.id !== newNode.id) {
        const overlap = newNode.x < node.x + calculateNodeWidth(node.text) &&
          newNode.x + calculateNodeWidth(newNode.text) > node.x &&
          newNode.y < node.y + nodeHeight && newNode.y + nodeHeight > node.y;
        if (overlap) {
          offsetY = Math.max(offsetY, node.y + nodeHeight - newNode.y + 10); // 10は追加のマージン
        }
      }
      return node;
    });

    if (offsetY > 0) {
      // 新しいノードと重なるノードがある場合、新しいノードのY座標を調整
      newNode.y += offsetY;
      // 重なったノード以降のノードもY座標を調整
      adjustedNodes.forEach(node => {
        if (node.y >= newNode.y) {
          node.y += offsetY;
        }
      });
    }

    return [newNode, ...adjustedNodes];
  };

  function adjustNodePositionsAfterDeletion(nodes, deletedNodeHeight, minY) {
    // 削除されたノードより下にあるノードのY座標を詰める
    return nodes.map(node => ({
      ...node,
      y: node.y > minY ? node.y - deletedNodeHeight : node.y,
    }));
  }

  // ノードの位置を調整する関数
  function adjustNodePositions(nodes, draggedNodeId, droppedOverNode) {
    let draggedNode = nodes.find(n => n.id === draggedNodeId);
    const nodeWidth = calculateNodeWidth(draggedNode.text);

    console.log(`draggedNode.x: ${draggedNode.x}, droppedOverNode.x: ${droppedOverNode.x}`)

    // ノードが重複しないように調整するための新しいX、Y座標を計算
    let newX = droppedOverNode.x + parentXOffset;
    let newY = droppedOverNode.y;

    // 重複を避けるために、他のノードとの間に十分なスペースがあるか確認し、必要に応じて調整
    let overlap;
    do {
      overlap = false;
      for (const node of nodes) {
        if (node.id !== draggedNodeId) {
          const nodeWidthOther = calculateNodeWidth(node.text);
          const overlapX = newX < node.x + nodeWidthOther && newX + nodeWidth > node.x;
          const overlapY = newY < node.y + nodeHeight && newY + nodeHeight > node.y;

          if (overlapX && overlapY) {
            overlap = true;
            // X座標とY座標を調整して重複を避ける
            newX += 0; // 仮の調整値
            newY += nodeHeight + 10; // 仮の調整値
            break; // 1つでも重複が見つかれば、再計算のためにループを抜ける
          }
        }
      }
    } while (overlap); // 重複がなくなるまでループ

    // 最終的な位置をドラッグされたノードに設定
    const adjustedNodes = nodes.map(n => {
      if (n.id === draggedNodeId) {
        return { ...n, x: newX, y: newY };
      }
      return n;
    });

    return adjustedNodes;
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
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ノードがキャンバスサイズを超えた場合に備えて、キャンバスの最小サイズを設定する
  const [canvasSize, setCanvasSize] = useState({ width: windowSize.width, height: windowSize.height });

  useEffect(() => {
    // ノードの位置に基づいてキャンバスのサイズを調整するロジック
    const maxNodeX = Math.max(...nodes.map(node => node.x + calculateNodeWidth(node.text))) + parentXOffset; // ノードの最大X座標
    const maxNodeY = Math.max(...nodes.map(node => node.y + nodeHeight)) + nodeHeight; // ノードの最大Y座標

    setCanvasSize({
      width: Math.max(windowSize.width, maxNodeX),
      height: Math.max(windowSize.height, maxNodeY)
    });
  }, [nodes, windowSize]);

  // 2点間の距離を計算するロジックをここに記述...
  // この距離の変化に基づいてズームレベルを更新...
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  

  const handleClickOutside = (e) => {
    if (!e.target.closest('.editable') && !e.target.classList.contains('node')) {
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
          const parentNode = nodes.find(n => n.id === node.parentId);
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
          // value={nodes.find(n => n.id === editingId)?.text || ''}
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
