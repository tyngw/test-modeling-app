// components/Node.js
import React, { useEffect, useRef, useState } from 'react';
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
    zoomRatio,
}) => {
    const parentNode = getNodeById(nodes, node.parentId);
    // console.log(`[Node.js][Render] ${node.text} ${node.text2} ${node.text3}`)

    // overDropTargetがnull or undefinedの場合、overDropTargetIdに-1を代入
    const overDropTargetId = overDropTarget ? overDropTarget.id : -1;

    // div要素へのrefを作成
    const div1Ref = useRef(null);
    const div2Ref = useRef(null);
    const div3Ref = useRef(null);

    // div要素の高さをstateとして保持
    const [div1Height, setDiv1Height] = useState(20);
    const [div2Height, setDiv2Height] = useState(20);
    const [div3Height, setDiv3Height] = useState(20);

    useEffect(() => {
        // div要素の高さを取得し、stateを更新
        setDiv1Height(Math.max(div1Ref.current.offsetHeight, 20));
        setDiv2Height(Math.max(div2Ref.current.offsetHeight, 20));
        setDiv3Height(Math.max(div3Ref.current.offsetHeight, 20));
    }, [div1Ref.current, div2Ref.current, div3Ref.current]);

    useEffect(() => {
        node.height = div1Height + div2Height + div3Height;
    }, [div1Height, div2Height, div3Height]);

    return (
        <React.Fragment key={node.id}>
            {parentNode && (
                <path
                    d={`M ${node.x},${node.y + NODE_HEIGHT / 2}
            C ${node.x - CURVE_CONTROL_OFFSET},${node.y + NODE_HEIGHT / 2} 
            ${parentNode.x + calculateNodeWidth([parentNode.text, parentNode.text2, parentNode.text3]) + CURVE_CONTROL_OFFSET},${parentNode.y + parentNode.height / 2} 
            ${parentNode.x + calculateNodeWidth([parentNode.text, parentNode.text2, parentNode.text3]) + ARROW_OFFSET},${parentNode.y + parentNode.height / 2}`}
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
                style={{
                    fill: node.id === overDropTargetId ? 'lightblue' : 'white',
                }}
            />
            {/* 上段のテキスト */}
            <foreignObject
                x={node.x}
                y={node.y}
                width={node.width}
                height={div1Height}
            // style={{ border: '1px solid red' }}
            >
                <div
                    ref={div1Ref}
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                        fontSize: `${zoomRatio * 14}px`,
                        minWidth: `${node.width}px`,
                        maxWidth: `${node.width}px`,
                        minHeight: `${div1Height}px`,
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        pointerEvents: 'none',
                        verticalAlign: 'middle',
                        display: 'flex',
                        pointerEvents: 'all',
                    }}
                    // クリックイベントを処理(selectNodeの呼び出し)
                    onClick={() => selectNode(node.id)}
                    onDoubleClick={() => handleDoubleClick(node.id)}
                >
                    {node.text}
                </div>
            </foreignObject>

            {/* 中段のテキスト */}
            <foreignObject
                x={node.x}
                y={node.y + div1Height}
                width={node.width}
                height={div2Height}
            >
                <div
                    ref={div2Ref}
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                        fontSize: `${zoomRatio * 14}px`,
                        minWidth: `${node.width}px`,
                        maxWidth: `${node.width}px`,
                        minHeight: `${div2Height}px`,
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        pointerEvents: 'none',
                        verticalAlign: 'middle',
                        display: 'flex',
                        pointerEvents: 'all',
                    }}
                    onClick={() => selectNode(node.id)}
                    onDoubleClick={() => handleDoubleClick(node.id)}
                >
                    {node.text2}
                </div>
            </foreignObject>
            {/* 下段のテキスト */}
            <foreignObject
                x={node.x}
                y={node.y + div1Height + div2Height}
                width={node.width}
                height={div3Height}
            >
                <div
                    ref={div3Ref}
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{
                        fontSize: `${zoomRatio * 14}px`,
                        minWidth: `${node.width}px`,
                        maxWidth: `${node.width}px`,
                        minHeight: `${div3Height}px`,
                        overflow: 'hidden',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word',
                        pointerEvents: 'none',
                        verticalAlign: 'middle',
                        display: 'flex',
                        pointerEvents: 'all',
                    }}
                    onClick={() => selectNode(node.id)}
                    onDoubleClick={() => handleDoubleClick(node.id)}
                >
                    {node.text3}
                </div>
            </foreignObject>
            {/* 上段と中段の間の線 */}
            <line
                x1={node.x}
                y1={node.y + div1Height}
                x2={node.x + node.width}
                y2={node.y + div1Height}
                stroke="black"
                strokeWidth="1"
            />
            {/* 中段と下段の間の線 */}
            <line
                x1={node.x}
                y1={node.y + div1Height + div2Height}
                x2={node.x + node.width}
                y2={node.y + div1Height + div2Height}
                stroke="black"
                strokeWidth="1"
            />
        </React.Fragment>
    );
};

export default Node;
