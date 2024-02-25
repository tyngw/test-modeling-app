// components/Node.js
import React from 'react';
import { calculateNodeWidth } from '../utils/TextUtilities';
// constantsのインポート
import { 
    NODE_HEIGHT,
    CURVE_CONTROL_OFFSET,
    ARROW_OFFSET,
 } from '../constants/Node';

const Node = ({
    node,
    getNodeById,
    selectNode,
    handleDoubleClick,
    handleMouseDown,
    nodes,
}) => {
    const parentNode = getNodeById(nodes, node.parentId);
    const nodeWidth = calculateNodeWidth([node.text, node.text2, node.text3]);
    const sectionHeight = NODE_HEIGHT / 3;
    return (
        <React.Fragment key={node.id}>
            {parentNode && (
                <path
                    d={`M ${node.x},${node.y + NODE_HEIGHT / 2}
            C ${node.x - CURVE_CONTROL_OFFSET},${node.y + NODE_HEIGHT / 2} 
            ${parentNode.x + calculateNodeWidth([parentNode.text, parentNode.text2, parentNode.text3]) + CURVE_CONTROL_OFFSET},${parentNode.y + NODE_HEIGHT / 2} 
            ${parentNode.x + calculateNodeWidth([parentNode.text, parentNode.text2, parentNode.text3]) + ARROW_OFFSET},${parentNode.y + NODE_HEIGHT / 2}`}
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
                height={NODE_HEIGHT}
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
