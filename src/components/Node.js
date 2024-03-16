// components/Node.js
import React, { useEffect, useRef, useState } from 'react';
import { calculateNodeWidth } from '../utils/TextNodeHelpers';
import { getNodeById } from '../utils/NodeSelector';
import {
    NODE_HEIGHT,
    CURVE_CONTROL_OFFSET,
    ARROW_OFFSET,
} from '../constants/Node';
import TextSection from './TextSection';

const Node = ({
    node,
    selectNode,
    handleMouseDown,
    handleMouseUp,
    handleDoubleClick,
    nodes,
    overDropTarget,
    updateNodeSize,
    zoomRatio,
}) => {
    const parentNode = getNodeById(nodes, node.parentId);

    // overDropTargetがnull or undefinedの場合、overDropTargetIdに-1を代入
    const overDropTargetId = overDropTarget ? overDropTarget.id : -1;

    // div要素へのrefを作成
    const div1Ref = useRef(null);
    const div2Ref = useRef(null);
    const div3Ref = useRef(null);

    // div要素の高さをstateとして保持
    const [section1Height, setSection1Height] = useState(20);
    const [section2Height, setSection2Height] = useState(20);
    const [section3Height, setSection3Height] = useState(20);

    useEffect(() => {
        // div要素の高さを取得し、stateを更新
        setSection1Height(div1Ref.current.offsetHeight);
        setSection2Height(div2Ref.current.offsetHeight);
        setSection3Height(div3Ref.current.offsetHeight);
    }, [node.text, node.text2, node.text3]);

    useEffect(() => {
        node.section1Height = section1Height;
        node.section2Height = section2Height;
        node.section3Height = section3Height;
        node.height = section1Height + section2Height + section3Height;

        const div1Width = div1Ref.current.offsetWidth;
        const div2Width = div2Ref.current.offsetWidth;
        const div3Width = div3Ref.current.offsetWidth;
        const maxWidth = Math.max(div1Width, div2Width, div3Width)

        // ノードの幅と高さを更新する関数を呼び出し
        updateNodeSize(node.id, maxWidth, section1Height + section2Height + section3Height);
    }, [section1Height, section2Height, section3Height]);

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
                height={section1Height + section2Height + section3Height}
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
            <TextSection
                x={node.x}
                y={node.y}
                width={node.width}
                height={section1Height}
                text={node.text}
                zoomRatio={zoomRatio}
                selectNode={() => selectNode(node.id)}
                handleDoubleClick={() => handleDoubleClick(node.id)}
                handleMouseDown={(e) => handleMouseDown(e, node)}
                handleMouseUp={(e) => handleMouseUp(e)}
                divRef={div1Ref}
            />

            {/* 中段のテキスト */}
            <TextSection
                x={node.x}
                y={node.y + section1Height}
                width={node.width}
                height={section2Height}
                text={node.text2}
                zoomRatio={zoomRatio}
                selectNode={() => selectNode(node.id)}
                handleDoubleClick={() => handleDoubleClick(node.id)}
                handleMouseDown={(e) => handleMouseDown(e, node)}
                handleMouseUp={(e) => handleMouseUp(e)}
                divRef={div2Ref}
            />

            {/* 下段のテキスト */}
            <TextSection
                x={node.x}
                y={node.y + section1Height + section2Height}
                width={node.width}
                height={section3Height}
                text={node.text3}
                zoomRatio={zoomRatio}
                selectNode={() => selectNode(node.id)}
                handleDoubleClick={() => handleDoubleClick(node.id)}
                handleMouseDown={(e) => handleMouseDown(e, node)}
                handleMouseUp={(e) => handleMouseUp(e)}
                divRef={div3Ref}
            />
            {/* 上段と中段の間の線 */}
            <line
                x1={node.x}
                y1={node.y + section1Height}
                x2={node.x + node.width}
                y2={node.y + section1Height}
                stroke="black"
                strokeWidth="1"
            />
            {/* 中段と下段の間の線 */}
            <line
                x1={node.x}
                y1={node.y + section1Height + section2Height}
                x2={node.x + node.width}
                y2={node.y + section1Height + section2Height}
                stroke="black"
                strokeWidth="1"
            />
        </React.Fragment>
    );
};

export default Node;
