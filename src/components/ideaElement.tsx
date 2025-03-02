// src/components/ideaElement.tsx
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useCanvas } from '../context/canvasContext';
import TextSection from './textDisplayArea';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DoneIcon from '@mui/icons-material/Done';
import ClearIcon from '@mui/icons-material/Clear';
import { calculateElementWidth, wrapText } from '../utils/textareaHelpers';
import {
  CURVE_CONTROL_OFFSET,
  DEFAULT_FONT_SIZE,
  OFFSET,
  TEXTAREA_PADDING,
  SHADOW_OFFSET,
  ELEM_STYLE,
  SIZE,
  ARROW,
  LINE_HEIGHT_RATIO,
  CONNECTION_PATH_STYLE,
} from '../constants/elementSettings';
import { Element as CanvasElement } from '../types';
import { isDescendant } from '../state/state';

interface IdeaElementProps {
  element: CanvasElement;
  currentDropTarget: CanvasElement | null;
  dropPosition: 'before' | 'after' | 'child' | null;
  draggingElement: CanvasElement | null;
  handleMouseDown: (e: React.MouseEvent<SVGElement>, element: CanvasElement) => void;
  handleMouseUp: () => void;
}

const renderActionButtons = (element: CanvasElement, dispatch: React.Dispatch<any>, elements: CanvasElement[]) => {
  const shouldShowButtons = (element: CanvasElement, elements: CanvasElement[]) => {
    if (!element.tentative) return false;

    // 同じparentIdを持つtentative要素をすべて取得
    const tentativeSiblings = elements.filter(el =>
      el.parentId === element.parentId && el.tentative
    );

    // 自身も含めて最小orderを計算
    const minOrder = Math.min(...tentativeSiblings.map(el => el.order));
    return element.order === minOrder;
  };

  if (!shouldShowButtons(element, elements)) return null;
  return (
    <g
      transform={`translate(${element.x + element.width * 1.1},${element.y})`}
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: 'pointer', pointerEvents: 'all' }}
    >
      {/* Doneボタン */}
      <g>
        <rect
          x="0"
          y="0"
          width="24"
          height="24"
          rx="4"
          fill="white"
          stroke="#e0e0e0"
          strokeWidth="1"
        />
        <foreignObject x="4" y="4" width="16" height="16">
          <DoneIcon
            sx={{
              color: '#4CAF50',
              '&:hover': { color: '#388E3C' },
              transition: 'color 0.2s ease-in-out'
            }}
            style={{ width: '100%', height: '100%' }}
            onClick={() => dispatch({ type: 'CONFIRM_TENTATIVE_ELEMENTS', payload: element.parentId })}
          />
        </foreignObject>
      </g>

      {/* Clearボタン */}
      <g transform="translate(30, 0)">
        <rect
          x="0"
          y="0"
          width="24"
          height="24"
          rx="4"
          fill="white"
          stroke="#e0e0e0"
          strokeWidth="1"
        />
        <foreignObject x="4" y="4" width="16" height="16">
          <ClearIcon
            sx={{
              color: '#F44336',
              '&:hover': { color: '#D32F2F' },
              transition: 'color 0.2s ease-in-out'
            }}
            style={{ width: '100%', height: '100%' }}
            onClick={() => dispatch({ type: 'CANCEL_TENTATIVE_ELEMENTS', payload: element.parentId })}
          />
        </foreignObject>
      </g>
    </g>
  );
};

const DebugInfo: React.FC<{ element: CanvasElement; isHovered: boolean }> = ({ element, isHovered }) => {
  if (localStorage.getItem('__debugMode__') !== 'true' || !isHovered) {
    return null;
  }

  return (
    <foreignObject
      x={element.x + element.width + 10}
      y={element.y - 10}
      width="340"
      height="150"
      style={{ backgroundColor: 'white', border: '1px solid black', padding: '5px', zIndex: 1000, borderRadius: '5px' }}
    >
      <div style={{ fontSize: '12px', color: 'black' }}>
        <div>id: {element.id}</div>
        <div>parentID: {element.parentId}</div>
        <div>order: {element.order}</div>
        <div>depth: {element.depth}</div>
        <div>children: {element.children}</div>
        <div>editing: {element.editing ? 'true' : 'false'}</div>
        <div>selected: {element.selected ? 'true' : 'false'}</div>
        <div>visible: {element.visible ? 'true' : 'false'}</div>
        <div>width: {element.width}</div>
        <div>height: {element.width}</div>
      </div>
    </foreignObject>
  );
};

const IdeaElement: React.FC<IdeaElementProps> = ({
  element,
  currentDropTarget,
  dropPosition,
  draggingElement,
  handleMouseDown,
}) => {
  const { state, dispatch } = useCanvas();
  const parentElement = state.elements[element.parentId!];
  const currentDropTargetId = currentDropTarget?.id || -1;
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (element.editing) return;
    const calculateDimensions = () => {
      const newWidth = calculateElementWidth(element.texts, TEXTAREA_PADDING.HORIZONTAL);
      const sectionHeights = element.texts.map(text => {
        const lines = wrapText(text || '', newWidth, state.zoomRatio).length;
        return Math.max(
          SIZE.SECTION_HEIGHT * state.zoomRatio,
          lines * DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO + TEXTAREA_PADDING.VERTICAL * state.zoomRatio
        );
      });
      return { newWidth, newHeight: sectionHeights.reduce((sum, h) => sum + h, 0), sectionHeights };
    };

    const { newWidth, newHeight, sectionHeights } = calculateDimensions();

    if (newWidth !== element.width || newHeight !== element.height) {
      dispatch({
        type: 'UPDATE_ELEMENT_SIZE',
        payload: {
          id: element.id,
          width: newWidth,
          height: newHeight,
          sectionHeights
        }
      });
    }
  }, [element.editing, element.texts, element.width, element.height, dispatch, element.id, state.zoomRatio]);

  const hiddenChildren = useMemo(
    () => Object.values(state.elements).filter(
      (el) => el.parentId === element.id && !el.visible
    ),
    [state.elements, element.id]
  );

  const isDraggedOrDescendant = draggingElement
    ? draggingElement.id === element.id || isDescendant(state.elements, draggingElement.id, element.id)
    : false;

  const handleHeightChange = useCallback((sectionIndex: number, newHeight: number) => {
    const currentHeight = element.sectionHeights[sectionIndex];
    if (currentHeight !== null && Math.abs(newHeight - currentHeight) > 1) {
      const newSectionHeights = [...element.sectionHeights];
      newSectionHeights[sectionIndex] = newHeight;
      const newWidth = calculateElementWidth(element.texts, TEXTAREA_PADDING.HORIZONTAL);
      const totalHeight = newSectionHeights.reduce((sum, h) => sum + h, 0);

      dispatch({
        type: 'UPDATE_ELEMENT_SIZE',
        payload: {
          id: element.id,
          width: newWidth,
          height: totalHeight,
          sectionHeights: newSectionHeights
        }
      });
    }
  }, [dispatch, element]);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'SELECT_ELEMENT', payload: element.id });
  };

  return (
    <React.Fragment key={element.id}>
      <g opacity={isDraggedOrDescendant ? 0.3 : 1}>
        {renderActionButtons(element, dispatch, Object.values(state.elements))}
        {hiddenChildren.length > 0 && (
          <>
            <rect
              key={`shadow-${element.id}`}
              x={element.x + SHADOW_OFFSET}
              y={element.y + SHADOW_OFFSET}
              width={element.width}
              height={element.height}
              rx={ELEM_STYLE.RX}
              fill="none"
              stroke={ELEM_STYLE.SHADDOW.COLOR}
              strokeWidth={ELEM_STYLE.STROKE}
            />
            <g
              transform={`translate(${element.x + element.width * 1.1},${element.y})`}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'SELECT_ELEMENT', payload: element.id });
                dispatch({ type: 'EXPAND_ELEMENT' });
              }}
              style={{ cursor: 'pointer' }}
            >
              <rect
                x="0"
                y="0"
                width="24"
                height="24"
                rx="4"
                fill="white"
                stroke="#e0e0e0"
                strokeWidth="1"
              />
              <svg
                x="4"
                y="4"
                width="16"
                height="16"
                viewBox="0 0 24 24"
              >
                <OpenInFullIcon
                  sx={{ color: '#666666' }}
                  style={{ width: '100%', height: '100%' }}
                />
              </svg>
            </g>
          </>
        )}
        <defs>
          <filter id="boxShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="gray" />
          </filter>
        </defs>
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={ELEM_STYLE.RX}
          strokeWidth={ELEM_STYLE.STROKE}
          stroke={
            element.texts.length > 1
              ? element.selected
                ? ELEM_STYLE.SELECTED.STROKE_COLOR
                : element.tentative
                  ? '#9E9E9E' // tentativeかつ非選択
                  : ELEM_STYLE.NORMAL.STROKE_COLOR // 通常状態
              : 'transparent'
          }
          strokeDasharray={element.tentative ? "4 2" : "none"}
          onClick={handleSelect}
          onDoubleClick={() => dispatch({ type: 'EDIT_ELEMENT' })}
          onMouseDown={(e) => handleMouseDown(e, element)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            fill: (element.id === currentDropTargetId && dropPosition === 'child')
              ? ELEM_STYLE.DRAGGING.COLOR
              : ELEM_STYLE.NORMAL.COLOR,
            strokeOpacity: element.tentative ? 0.6 : 1,
            pointerEvents: 'all',
            cursor: isHovered ? 'pointer' : 'default',
            filter: element.selected && element.texts.length > 1 ? 'url(#boxShadow)' : 'none',
          }}
        />
        {element.texts.length === 1 && (
          <>
            {/* 影用のライン（選択時のみ表示） */}
            {element.selected && (
              <line
                x1={element.x + 2}
                y1={element.y + element.height + 2}
                x2={element.x + element.width + 1}
                y2={element.y + element.height + 2}
                stroke="rgba(0,0,255,0.2)"
                strokeWidth={ELEM_STYLE.STROKE}
                strokeLinecap="round"
                pointerEvents="none"
              />
            )}
            {/* メインのライン */}
            <line
              x1={element.x}
              y1={element.y + element.height}
              x2={element.x + element.width}
              y2={element.y + element.height}
              stroke={
                element.selected
                  ? ELEM_STYLE.SELECTED.STROKE_COLOR
                  : element.tentative
                    ? '#9E9E9E' // tentativeかつ非選択
                    : ELEM_STYLE.NORMAL.STROKE_COLOR // 通常状態
              }
              strokeWidth={ELEM_STYLE.STROKE}
              strokeDasharray={element.tentative ? "4 2" : "none"}
              pointerEvents="none"
            />
          </>
        )}
        {currentDropTarget?.id === element.id && draggingElement && dropPosition !== 'child' && (
          <rect
            className='drop-preview'
            x={parentElement
              ? parentElement.x + parentElement.width + OFFSET.X
              : element.x + element.width}
            y={dropPosition === 'before'
              ? element.y - draggingElement.height - OFFSET.Y
              : element.y + element.height + OFFSET.Y}
            width={draggingElement.width}
            height={draggingElement.height}
            fill={ELEM_STYLE.DRAGGING.COLOR}
            rx={ELEM_STYLE.RX}
            stroke={ELEM_STYLE.DRAGGING.COLOR}
            strokeWidth={ELEM_STYLE.STROKE}
          />
        )}
        {element.texts.map((text, index) => (
          <React.Fragment key={`${element.id}-section-${index}`}>
            <TextSection
              x={element.x}
              y={element.y + element.sectionHeights.slice(0, index).reduce((sum, h) => sum + h, 0)}
              width={element.width}
              height={element.sectionHeights[index]}
              text={text}
              fontSize={DEFAULT_FONT_SIZE}
              zoomRatio={state.zoomRatio}
              onHeightChange={(newHeight) => handleHeightChange(index, newHeight)}
            />
            {index < element.texts.length - 1 && (
              <line
                x1={element.x}
                y1={element.y + element.sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)}
                x2={element.x + element.width}
                y2={element.y + element.sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)}
                stroke={ELEM_STYLE.NORMAL.STROKE_COLOR}
                strokeWidth="1"
              />
            )}
          </React.Fragment>
        ))}
        <DebugInfo element={element} isHovered={isHovered} />
      </g>
    </React.Fragment>
  );
};

export default React.memo(IdeaElement);