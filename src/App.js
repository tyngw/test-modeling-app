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
    const handleKeyDown = (event) => {
      // キー操作による新しいノードの追加処理
      if (event.key === 'Tab' && nodes.some(n => n.selected)) {
        event.preventDefault();
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

        const newNodes = [...nodes, newRect];

        // 新しいノードと既存のノードとの間で重なりをチェックし、調整
        let adjustedNodes = adjustNodePositions(newNodes)

        // 状態を更新
        setNodes(adjustedNodes);
      }

      if (event.key === 'Enter' && editingId === null && nodes.some(n => n.selected)) {
        // Enterキーが押され、選択中のノードがある場合、編集モードに入る
        const selectedNode = nodes.find(n => n.selected);
        setEditingId(selectedNode.id);
      } else if (editingId === null && nodes.some(n => n.selected)) {
        if (event.key === 'Delete' || event.key === 'Backspace') {
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
        let adjustedNodes = nodes.map(n => {
          if (n.id === dragging) {
            return { ...n, parentId: droppedOverNode.id };
          }
          return n;
        });
  
        // Call the new adjustNodePositions function
        adjustedNodes = adjustNodePositions([...adjustedNodes]);
  
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

  function getNodeOfId(nodes, id){
    return nodes.find(node => node.id === id);
  }

  // ノードの位置を調整する
  function adjustNodePositions(nodes) {
    const nodeWidth = (node) => calculateNodeWidth(node.text);
    const sortedNodes = [...nodes].sort((a, b) => a.id - b.id);
    let maxY = 0;
  
    sortedNodes.forEach((node, index) => {
      if (node.parentId !== null) {
        const parentNode = sortedNodes.find(n => n.id === node.parentId);
        if (parentNode) {
          let newX = parentNode.x + parentXOffset;
          let newY = parentNode.y;
          let siblings = sortedNodes.filter(n => n.parentId === node.parentId);
  
          if (siblings.length > 1) {
            siblings.sort((a, b) => a.y - b.y); // Sort siblings by their Y position
            const lastSibling = siblings[siblings.indexOf(node) - 1];
            if (lastSibling) {
              newY = lastSibling.y + nodeHeight + 10; // Place below the last sibling
            }
          }
  
          // Check for overlap with other nodes and adjust
          let overlap;
          do {
            overlap = sortedNodes.some(n => {
              if (n.id !== node.id && n.parentId !== node.parentId) {
                const nRight = n.x + nodeWidth(n);
                const nodeRight = newX + nodeWidth(node);
                const verticalOverlap = newY < n.y + nodeHeight && newY + nodeHeight > n.y;
                return n.x < nodeRight && nRight > newX && verticalOverlap;
              }
              return false;
            });
  
            if (overlap) {
              newY += nodeHeight + 10; // Adjust Y to avoid overlap
            }
          } while (overlap);
  
          node.x = newX;
          node.y = newY;
        }
      }
      maxY = Math.max(maxY, node.y);
    });
  
    // Adjust parent nodes based on children
    sortedNodes.filter(n => n.parentId === null).forEach(parentNode => {
      const children = sortedNodes.filter(n => n.parentId === parentNode.id);
      if (children.length > 0) {
        const minY = Math.min(...children.map(n => n.y));
        const maxY = Math.max(...children.map(n => n.y + nodeHeight));
        parentNode.y = minY + ((maxY - minY) / 2) - (nodeHeight / 2);
      }
    });
  
    return sortedNodes;
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
