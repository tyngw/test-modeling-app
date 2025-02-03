// components/Node.js
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { calculateNodeWidth } from '../utils/TextNodeHelpers';
import { getNodeById } from '../utils/NodeSelector';
import { CURVE_CONTROL_OFFSET, ARROW_OFFSET } from '../constants/Node';
import TextSection from './TextDisplayArea';

const SECTION_KEYS = ['text', 'text2', 'text3'];

const useSectionDimensions = (node, updateNodeSize) => {
    const refs = useRef(SECTION_KEYS.map(() => React.createRef()));
    const [heights, setHeights] = useState(SECTION_KEYS.map(() => 20));
  
    const updateDimensions = useCallback(() => {
      const newHeights = refs.current.map(ref => ref.current?.offsetHeight || 20);
      const newWidths = refs.current.map(ref => ref.current?.offsetWidth || 0);
      const maxWidth = Math.max(...newWidths);
      const totalHeight = newHeights.reduce((sum, h) => sum + h, 0);
      
      setHeights(newHeights);
      updateNodeSize(node.id, maxWidth, totalHeight, { sectionHeights: newHeights });
    }, [node.id, updateNodeSize]);
  
    useEffect(() => {
      updateDimensions();
    }, [node.text, node.text2, node.text3, updateDimensions]);
  
    return { refs: refs.current, heights };
  };

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
  const { refs: sectionRefs, heights: sectionHeights } = useSectionDimensions(node, updateNodeSize);
  const totalHeight = sectionHeights.reduce((sum, h) => sum + h, 0);
  const overDropTargetId = overDropTarget?.id || -1;

  const sections = SECTION_KEYS.map((key, index) => ({
    height: sectionHeights[index],
    text: node[key],
    divRef: sectionRefs[index],
  }));

  const renderConnectionPath = useCallback(() => {
    if (!parentNode) return null;
    
    const parentWidth = calculateNodeWidth(SECTION_KEYS.map(k => parentNode[k]));
    const pathCommands = [
      `M ${node.x},${node.y + totalHeight / 2}`,
      `C ${node.x - CURVE_CONTROL_OFFSET},${node.y + totalHeight / 2}`,
      `${parentNode.x + parentWidth + CURVE_CONTROL_OFFSET},${parentNode.y + parentNode.height / 2}`,
      `${parentNode.x + parentWidth + ARROW_OFFSET},${parentNode.y + parentNode.height / 2}`
    ].join(' ');

    return (
      <path
        d={pathCommands}
        stroke="black"
        strokeWidth="2"
        fill="none"
        markerEnd="url(#arrowhead)"
      />
    );
  }, [parentNode, node, totalHeight]);

  return (
    <React.Fragment key={node.id}>
      {renderConnectionPath()}

      <rect
        x={node.x}
        y={node.y}
        width={node.width}
        height={totalHeight}
        className={`node ${node.selected ? 'node-selected' : 'node-unselected'}`}
        rx="2"
        onClick={() => selectNode(node.id)}
        onDoubleClick={() => handleDoubleClick(node.id)}
        onMouseDown={(e) => handleMouseDown(e, node.id)}
        onMouseUp={handleMouseUp}
        style={{ fill: node.id === overDropTargetId ? 'lightblue' : 'white' }}
      />

      {sections.map((section, index) => (
        <React.Fragment key={index}>
          <TextSection
            x={node.x}
            y={node.y + sections.slice(0, index).reduce((sum, s) => sum + s.height, 0)}
            width={node.width}
            height={section.height}
            text={section.text}
            zoomRatio={zoomRatio}
            divRef={section.divRef}
            selectNode={() => selectNode(node.id)}
            handleDoubleClick={() => handleDoubleClick(node.id)}
            handleMouseDown={(e) => handleMouseDown(e, node.id)}
            handleMouseUp={handleMouseUp}
          />
          
          {index < sections.length - 1 && (
            <line
              x1={node.x}
              y1={node.y + sections.slice(0, index + 1).reduce((sum, s) => sum + s.height, 0)}
              x2={node.x + node.width}
              y2={node.y + sections.slice(0, index + 1).reduce((sum, s) => sum + s.height, 0)}
              stroke="black"
              strokeWidth="1"
            />
          )}
        </React.Fragment>
      ))}
    </React.Fragment>
  );
};

export default React.memo(Node);