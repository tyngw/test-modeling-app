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
    nodes,
    node,
    zoomRatio,
    selectNode,
    handleMouseDown,
    handleMouseUp,
    handleDoubleClick,
    overDropTarget,
    updateNodeSize,
}) => {
    const parentNode = getNodeById(nodes, node.parentId);
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
        const div1Width = div1Ref.current.offsetWidth;
        const div2Width = div2Ref.current.offsetWidth;
        const div3Width = div3Ref.current.offsetWidth;
        const maxWidth = Math.max(div1Width, div2Width, div3Width)
        const totalHeight = section1Height + section2Height + section3Height;

        // ノードの幅と高さを更新する関数を呼び出し
        updateNodeSize(node.id, maxWidth, totalHeight);

        node.section1Height = section1Height;
        node.section2Height = section2Height;
        node.section3Height = section3Height;
        node.height = totalHeight;
    }, [section1Height, section2Height, section3Height]);

    const sections = [
        { height: section1Height, text: node.text, divRef: div1Ref },
        { height: section2Height, text: node.text2, divRef: div2Ref },
        { height: section3Height, text: node.text3, divRef: div3Ref },
    ];

    return (
        <React.Fragment key={node.id}>
            {parentNode && (
                <path
                    d={`M ${node.x},${node.y + node.height / 2}
            C ${node.x - CURVE_CONTROL_OFFSET},${node.y + node.height / 2} 
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
            {sections.map((section, index) => (
                <React.Fragment key={index}>
                    <TextSection
                        x={node.x}
                        y={node.y + sections.slice(0, index).reduce((total, section) => total + section.height, 0)}
                        width={node.width}
                        height={section.height}
                        text={section.text}
                        zoomRatio={zoomRatio}
                        selectNode={() => selectNode(node.id)}
                        handleDoubleClick={() => handleDoubleClick(node.id)}
                        handleMouseDown={(e) => handleMouseDown(e, node)}
                        handleMouseUp={(e) => handleMouseUp(e)}
                        divRef={section.divRef}
                    />
                    {index < sections.length - 1 && (
                        <line
                            x1={node.x}
                            y1={node.y + sections.slice(0, index + 1).reduce((total, section) => total + section.height, 0)}
                            x2={node.x + node.width}
                            y2={node.y + sections.slice(0, index + 1).reduce((total, section) => total + section.height, 0)}
                            stroke="black"
                            strokeWidth="1"
                        />
                    )}
                </React.Fragment>
            ))}
        </React.Fragment>
    );
};

export default Node;
