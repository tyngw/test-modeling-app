// components/Node.js
import React from 'react';
import { calculateNodeWidth } from '../utils/TextNodeHelpers';
import { getNodeById } from '../utils/NodeSelector';
import {
    NODE_HEIGHT,
    CURVE_CONTROL_OFFSET,
    ARROW_OFFSET,
} from '../constants/Node';

const Node = ({
    node,
    selectNode,
    handleMouseDown,
    handleMouseUp,
    handleDoubleClick,
    nodes,
    overDropTarget,
}) => {
    const parentNode = getNodeById(nodes, node.parentId);
    console.log(`[Node.js][Render] ${node.text} ${node.text2} ${node.text3}`)

    const sectionHeight = NODE_HEIGHT / 3;

    // 各テキストの行数を計算
    const lines = [node.text, node.text2, node.text3].map(text => text.split('\n').length);

    // 各テキストの高さを計算
    const heights = lines.map(line => sectionHeight + (line - 1) * 20);

    // ノードの高さを計算
    node.height = heights.reduce((total, height) => total + height, 0);

    // 中段と下段のテキストのY座標を計算
    const y2 = node.y + heights[0];
    const y3 = node.y + heights[0] + heights[1];

    // overDropTargetがnull or undefinedの場合、overDropTargetIdに-1を代入
    const overDropTargetId = overDropTarget ? overDropTarget.id : -1;

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
                width={node.width}
                height={node.height}
                className={`node ${node.selected ? 'node-selected' : 'node-unselected'}`}
                rx="2"
                onClick={() => selectNode(node.id)}
                onDoubleClick={() => handleDoubleClick(node.id)}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onMouseUp={(e) => handleMouseUp(e)}
                style={{ fill: node.id === overDropTargetId ? 'lightblue' : 'white' }}
            />
            {/* 上段のテキスト */}
            {node.text.split('\n').map((line, index) => (
                <text
                    key={index}
                    x={node.x + 5}
                    y={node.y + sectionHeight / 2 + 5 + index * 20} // 上段の中央に配置し、行ごとに下にずらす
                    className="node-text"
                >
                    {line}
                </text>
            ))}
            {/* 中段のテキスト */}
            {node.text2.split('\n').map((line, index) => (
                <text
                    key={index}
                    x={node.x + 5}
                    y={y2 + sectionHeight / 2 + 5 + index * 20} // 中段の中央に配置し、行ごとに下にずらす
                    className="node-text"
                >
                    {line}
                </text>
            ))}
            {/* 下段のテキスト */}
            {node.text3.split('\n').map((line, index) => (
                <text
                    key={index}
                    x={node.x + 5}
                    y={y3 + sectionHeight / 2 + 5 + index * 20} // 下段の中央に配置し、行ごとに下にずらす
                    className="node-text"
                >
                    {line}
                </text>
            ))}
            {/* 上段と中段の間の線 */}
            <line
                x1={node.x}
                y1={node.y + heights[0]} // 上段のテキストの高さを考慮
                x2={node.x + node.width}
                y2={node.y + heights[0]} // 上段のテキストの高さを考慮
                stroke="black"
                strokeWidth="1"
            />
            {/* 中段と下段の間の線 */}
            <line
                x1={node.x}
                y1={node.y + heights[0] + heights[1]} // 上段と中段のテキストの高さを考慮
                x2={node.x + node.width}
                y2={node.y + heights[0] + heights[1]} // 上段と中段のテキストの高さを考慮
                stroke="black"
                strokeWidth="1"
            />
        </React.Fragment>
    );
};

export default Node;
