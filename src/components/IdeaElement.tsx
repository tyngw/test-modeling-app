import React, { useCallback } from 'react';
import { useCanvas } from '../context/CanvasContext';
import TextSection from './TextDisplayArea';
import { calculateNodeWidth } from '../utils/TextNodeHelpers';
import { CURVE_CONTROL_OFFSET, ARROW_OFFSET, DEFAULT_FONT_SIZE } from '../constants/NodeSettings';

const SECTION_KEYS = ['text', 'text2', 'text3'];

const IdeaElement = ({ element, overDropTarget, handleMouseDown, handleMouseUp }) => {
  const { state, dispatch } = useCanvas();
  const parentNode = state.elements[element.parentId];
  const overDropTargetId = overDropTarget?.id || -1;

  const sectionHeights = [
    element.section1Height,
    element.section2Height,
    element.section3Height
  ];

  const handleHeightChange = useCallback((sectionIndex, newHeight) => {
    const sectionKey = `section${sectionIndex + 1}Height`;
    const currentHeight = element[sectionKey];
    
    if (Math.abs(newHeight - currentHeight) > 1) {
      const newSectionHeights = [...sectionHeights];
      newSectionHeights[sectionIndex] = newHeight;

      // ノード幅をテキストに合わせて自動調整
      const texts = [element.text, element.text2, element.text3];
      const newWidth = calculateNodeWidth(texts);

      dispatch({
        type: 'UPDATE_NODE_SIZE',
        payload: {
          id: element.id,
          width: newWidth,
          height: element.height + (newHeight - currentHeight),
          sectionHeights: newSectionHeights
        }
      });
    }
  }, [dispatch, element, sectionHeights]);
  
  const handleSelect = (e) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_NODE', payload: element.id });
  };

  const renderConnectionPath = useCallback(() => {
    if (!parentNode) return null;
    const totalHeight = element.height;
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
  }, [parentNode, element]);

  return (
    <React.Fragment key={element.id}>
      {renderConnectionPath()}
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        className={`element ${element.selected ? 'element-selected' : 'element-unselected'}`}
        rx="2"
        onClick={handleSelect}
        onDoubleClick={() => dispatch({ type: 'EDIT_NODE' })}
        onMouseDown={(e) => handleMouseDown(e, element)}
        onMouseUp={handleMouseUp}
        style={{ 
          fill: element.id === overDropTargetId ? 'lightblue' : 'white',
          pointerEvents: 'all'
        }}
      />
      {SECTION_KEYS.map((key, index) => (
        <React.Fragment key={`${element.id}-section-${index}`}>
          <TextSection
            x={element.x}
            y={element.y + sectionHeights.slice(0, index).reduce((sum, h) => sum + h, 0)}
            width={element.width}
            height={sectionHeights[index]}
            text={element[key]}
            fontSize={DEFAULT_FONT_SIZE}
            zoomRatio={state.zoomRatio}
            onHeightChange={(newHeight) => handleHeightChange(index, newHeight)}
          />
          
          {/* セクション間の区切り線を追加 */}
          {index < SECTION_KEYS.length - 1 && (
            <line
              x1={element.x}
              y1={element.y + sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)}
              x2={element.x + element.width}
              y2={element.y + sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)}
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