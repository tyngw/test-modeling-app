// components/Node.js
import React from 'react';

const Node = ({
    node,
    onNodeSelect,
    onNodeMove,
    getNodeById,
    calculateNodeWidth,
    nodeHeight = 60, // デフォルト値を設定するか、App.js から受け取る
    curveControlOffset = 80, // デフォルト値を設定するか、App.js から受け取る
    arrowOffset = 20, // デフォルト値を設定するか、App.js から受け取る
    selectNode,
    handleDoubleClick,
    handleMouseDown,
    nodes,
}) => {
    const parentNode = getNodeById(nodes, node.parentId);
    const nodeWidth = calculateNodeWidth([node.text, node.text2, node.text3]);
    const sectionHeight = nodeHeight / 3;
    return (
        <React.Fragment key={node.id}>
            {parentNode && (
                <path
                    d={`M ${node.x},${node.y + nodeHeight / 2}
            C ${node.x - curveControlOffset},${node.y + nodeHeight / 2} 
            ${parentNode.x + calculateNodeWidth([parentNode.text, parentNode.text2, parentNode.text3]) + curveControlOffset},${parentNode.y + nodeHeight / 2} 
            ${parentNode.x + calculateNodeWidth([parentNode.text, parentNode.text2, parentNode.text3]) + arrowOffset},${parentNode.y + nodeHeight / 2}`}
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
                rx="2"
                onClick={() => selectNode(node.id)}
                onDoubleClick={() => handleDoubleClick(node.id)}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
            />
            <text
                x={node.x + 5}
                y={node.y + sectionHeight / 2 + 5} // 上段の中央に配置
                className="node-text"
            >
                {node.text}
            </text>
            {/* 中段のテキスト */}
            <text
                x={node.x + 5}
                y={node.y + sectionHeight + sectionHeight / 2 + 5} // 中段の中央に配置
                className="node-text"
            >
                {node.text2}
            </text>
            {/* 下段のテキスト */}
            <text
                x={node.x + 5}
                y={node.y + 2 * sectionHeight + sectionHeight / 2 + 5} // 下段の中央に配置
                className="node-text"
            >
                {node.text3}
            </text>
            {/* 上段と中段の間の線 */}
            <line
                x1={node.x}
                y1={node.y + sectionHeight}
                x2={node.x + nodeWidth}
                y2={node.y + sectionHeight}
                stroke="black"
                strokeWidth="1"
            />
            {/* 中段と下段の間の線 */}
            <line
                x1={node.x}
                y1={node.y + 2 * sectionHeight}
                x2={node.x + nodeWidth}
                y2={node.y + 2 * sectionHeight}
                stroke="black"
                strokeWidth="1"
            />
        </React.Fragment>
    );
};

export default Node;
