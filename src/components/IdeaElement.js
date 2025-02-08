// src/components/IdeaElement.js
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  CURVE_CONTROL_OFFSET,
  ARROW_OFFSET,
  DEFAULT_SECTION_HEIGHT
 } from '../constants/NodeSettings';
import TextSection from './TextDisplayArea';

const SECTION_KEYS = ['text', 'text2', 'text3'];

// ```
// useSectionDimensions
// 説明:
// useSectionDimensionsは、ノードの各セクションの高さを計算するためのカスタムフックです。
// このカスタムフックは、ノードのテキストが変更されたときに高さを更新し、
// ノードのサイズを更新するためのコールバック関数を呼び出します。
// ```
const useSectionDimensions = (element, updateNodeSize) => {
    const refs = useRef(SECTION_KEYS.map(() => React.createRef()));
    const [heights, setHeights] = useState(SECTION_KEYS.map(() => DEFAULT_SECTION_HEIGHT));
  
    const updateDimensions = useCallback(() => {
      const newHeights = refs.current.map(ref => ref.current?.offsetHeight || DEFAULT_SECTION_HEIGHT);
      const newWidths = refs.current.map(ref => ref.current?.offsetWidth || 0);
      const maxWidth = Math.max(...newWidths);
      const totalHeight = newHeights.reduce((sum, h) => sum + h, 0);
      
      setHeights(newHeights);
      updateNodeSize(element.id, maxWidth, totalHeight, { sectionHeights: newHeights });
    }, [element.id, updateNodeSize]);
  
    useEffect(() => {
      updateDimensions();
    }, [element.text, element.text2, element.text3, updateDimensions]);
  
    return { refs: refs.current, heights };
};

const IdeaElement = ({
  elements,
  element,
  zoomRatio,
  selectNode,
  handleMouseDown,
  handleMouseUp,
  handleDoubleClick,
  overDropTarget,
  updateNodeSize,
}) => {
  const parentNode = elements[element.parentId]; // 直接オブジェクトから取得
  const { refs: sectionRefs, heights: sectionHeights } = useSectionDimensions(element, updateNodeSize);
  const totalHeight = sectionHeights.reduce((sum, h) => sum + h, 0);
  const overDropTargetId = overDropTarget?.id || -1;

  const sections = SECTION_KEYS.map((key, index) => ({
    height: sectionHeights[index],
    text: element[key],
    divRef: sectionRefs[index],
  }));

  
  // ```
  // renderConnectionPath
  // 説明:
  // renderConnectionPathは、ノードとその親ノードの間に接続線を描画するための関数です。
  // ベジェ曲線を使用して、接続線を描画し、矢印を追加します。
  // ```

  const renderConnectionPath = useCallback(() => {
    if (!parentNode) return null;
    
    const pathCommands = [
      `M ${element.x},${element.y + totalHeight / 2}`,
      `C ${element.x - CURVE_CONTROL_OFFSET},${element.y + totalHeight / 2}`,
      `${parentNode.x + parentNode.width + CURVE_CONTROL_OFFSET},${parentNode.y + parentNode.height / 2}`,
      `${parentNode.x + parentNode.width + ARROW_OFFSET},${parentNode.y + parentNode.height / 2}`
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
  }, [parentNode, element, totalHeight]);

  return (
    <React.Fragment key={element.id}>
      {renderConnectionPath()}

      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={totalHeight}
        className={`element ${element.selected ? 'element-selected' : 'element-unselected'}`}
        rx="2"
        onClick={() => selectNode(element.id)}
        onDoubleClick={() => handleDoubleClick(element.id)}
        onMouseDown={(e) => handleMouseDown(e, element)}
        onMouseUp={handleMouseUp}
        style={{ fill: element.id === overDropTargetId ? 'lightblue' : 'white' }}
      />

      {sections.map((section, index) => (
        <React.Fragment key={`${element.id}-section-${index}`}>
          <TextSection
            x={element.x}
            y={element.y + sections.slice(0, index).reduce((sum, s) => sum + s.height, 0)}
            width={element.width}
            height={section.height}
            text={section.text}
            zoomRatio={zoomRatio}
            divRef={section.divRef}
            selectNode={() => selectNode(element.id)}
            handleDoubleClick={() => handleDoubleClick(element.id)}
            handleMouseDown={(e) => handleMouseDown(e, element)}
            handleMouseUp={handleMouseUp}
          />
          
          {index < sections.length - 1 && (
            <line
              x1={element.x}
              y1={element.y + sections.slice(0, index + 1).reduce((sum, s) => sum + s.height, 0)}
              x2={element.x + element.width}
              y2={element.y + sections.slice(0, index + 1).reduce((sum, s) => sum + s.height, 0)}
              stroke="black"
              strokeWidth="1"
            />
          )}
        </React.Fragment>
      ))}
    </React.Fragment>
  );
};

export default React.memo(IdeaElement);