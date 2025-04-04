// src/components/ideaElement.tsx
'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useCanvas } from '../context/CanvasContext';
import TextDisplayArea from './TextDisplayArea';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DoneIcon from '@mui/icons-material/Done';
import ClearIcon from '@mui/icons-material/Clear';
import { calculateElementWidth, wrapText } from '../utils/textareaHelpers';
import {
  DEFAULT_FONT_SIZE,
  OFFSET,
  TEXTAREA_PADDING,
  SHADOW_OFFSET,
  ELEM_STYLE,
  SIZE,
  LINE_HEIGHT_RATIO,
} from '../constants/elementSettings';
import {
  getElementColor,
  getStrokeColor,
  getStrokeWidth,
  getFontFamily,
  getSelectedStrokeColor
} from '../utils/localStorageHelpers';
import { Element as CanvasElement } from '../types/types';
import { isDescendant } from '../utils/elementHelpers';
import { debugLog, isDevelopment } from '../utils/debugLogHelpers';
import { useTabs } from '../context/TabsContext';
import { useIsMounted } from '../hooks/UseIsMounted';

interface IdeaElementProps {
  element: CanvasElement;
  currentDropTarget: CanvasElement | null;
  dropPosition: 'child' | 'sibling' | 'between' | null;
  draggingElement: CanvasElement | null;
  handleMouseDown: (e: React.MouseEvent<SVGElement>, element: CanvasElement) => void;
  handleMouseUp: () => void;
  onHoverChange?: (elementId: string, isHovered: boolean) => void;
  dropInsertY?: number;
  siblingInfo?: { prevElement?: CanvasElement, nextElement?: CanvasElement } | null;
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

// Export DebugInfo component so it can be used by parent components
export const DebugInfo: React.FC<{ 
  element: CanvasElement; 
  isHovered: boolean;
  currentDropTarget: CanvasElement | null;
  dropPosition: 'child' | 'sibling' | 'between' | null;
  isDraggedOrDescendant?: boolean;
  siblingInfo?: { prevElement?: CanvasElement, nextElement?: CanvasElement } | null;
}> = ({ element, isHovered, currentDropTarget, dropPosition, isDraggedOrDescendant, siblingInfo }) => {
  if (!isDevelopment || !isHovered) {
    return null;
  }

  // ドラッグ対象の場合は表示位置を右にずらす
  const xOffset = isDraggedOrDescendant ? element.width + 350 : element.width + 10;

  return (
    <foreignObject
      x={element.x + xOffset}
      y={element.y - 10}
      width="340"
      height="400"
      className="debug-info"
    >
      <div style={{
        fontSize: '12px',
        color: 'black',
        backgroundColor: 'white',
        border: '1px solid black',
        padding: '5px',
        borderRadius: '5px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
      }}>
        <div>id: {element.id}</div>
        <div>parentID: {element.parentId}</div>
        <div>order: {element.order}</div>
        <div>depth: {element.depth}</div>
        <div>children: {element.children}</div>
        <div>start marker: {element.startMarker}</div>
        <div>end marker: {element.endMarker}</div>
        <div>editing: {element.editing ? 'true' : 'false'}</div>
        <div>selected: {element.selected ? 'true' : 'false'}</div>
        <div>visible: {element.visible ? 'true' : 'false'}</div>
        <div>x: {element.x}</div>
        <div>y: {element.y}</div>
        <div>width: {element.width}</div>
        <div>height: {element.height}</div>
        <div>currentDropTarget: {currentDropTarget ? (currentDropTarget.texts[0] || 'empty') : 'null'}</div>
        <div>dropPosition: {dropPosition || 'null'}</div>
        <div>siblingInfo: {
          siblingInfo ? 
            `prev=${siblingInfo.prevElement ? (siblingInfo.prevElement.texts[0] || 'empty') : 'null'}, 
             next=${siblingInfo.nextElement ? (siblingInfo.nextElement.texts[0] || 'empty') : 'null'}` : 
            'null'
        }</div>
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
  onHoverChange,
  dropInsertY,
  siblingInfo,
}) => {
  const { state, dispatch } = useCanvas();
  const { getCurrentTabState, getCurrentTabNumberOfSections } = useTabs();
  const tabState = getCurrentTabState() || { elements: {}, zoomRatio: 1 };
  const numberOfSections = getCurrentTabNumberOfSections();
  const isMounted = useIsMounted();
  const currentDropTargetId = currentDropTarget?.id || -1;
  const [isHovered, setIsHovered] = useState(false);
  const prevHoveredRef = useRef(false);
  const [elementColor, setElementColor] = useState(ELEM_STYLE.NORMAL.COLOR);
  const [strokeColor, setStrokeColor] = useState(ELEM_STYLE.NORMAL.STROKE_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(ELEM_STYLE.STROKE_WIDTH);
  const [fontFamily, setFontFamily] = useState('');
  const [selectedStrokeColor, setSelectedStrokeColor] = useState(ELEM_STYLE.SELECTED.STROKE_COLOR);

  useEffect(() => {
    if (!isMounted) return;
    setElementColor(getElementColor());
    setStrokeColor(getStrokeColor());
    setStrokeWidth(getStrokeWidth());
    setFontFamily(getFontFamily());
    setSelectedStrokeColor(getSelectedStrokeColor());
  }, [isMounted]);

  useEffect(() => {
    if (element.editing || !isMounted) return;
    const calculateDimensions = () => {
      const newWidth = calculateElementWidth(element.texts, TEXTAREA_PADDING.HORIZONTAL);
      const sectionHeights = element.texts.map(text => {
        const lines = wrapText(text || '', newWidth, tabState.zoomRatio).length;
        return Math.max(
          SIZE.SECTION_HEIGHT * tabState.zoomRatio,
          lines * DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO + TEXTAREA_PADDING.VERTICAL * tabState.zoomRatio
        );
      });
      return { newWidth, newHeight: sectionHeights.reduce((sum, h) => sum + h, 0), sectionHeights };
    };

    const { newWidth, newHeight, sectionHeights } = calculateDimensions();

    if (!element.editing && (newWidth !== element.width || newHeight !== element.height)) {
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
  }, [element.editing, element.texts, element.width, element.height, dispatch, element.id, tabState.zoomRatio]);

  const hiddenChildren = useMemo(
    () => Object.values(tabState.elements).filter(
      (el) => el.parentId === element.id && !el.visible
    ),
    [tabState.elements, element.id]
  );

  const isDraggedOrDescendant = draggingElement
    ? draggingElement.id === element.id || isDescendant(tabState.elements, draggingElement.id, element.id)
    : false;

  const handleHeightChange = useCallback((sectionIndex: number, newHeight: number) => {
    const currentHeight = element.sectionHeights[sectionIndex];
    if (currentHeight !== null && Math.abs(newHeight - currentHeight) > 1) {
      const newSectionHeights = [...element.sectionHeights];
      newSectionHeights[sectionIndex] = newHeight;
      const newWidth = calculateElementWidth(element.texts, TEXTAREA_PADDING.HORIZONTAL);
      const totalHeight = newSectionHeights.reduce((sum, h) => sum + h, 0);

      debugLog(`[IdeaElement][handleHeightChange] resized: ${element.texts} ${element.width} x ${element.height} -> ${newWidth} x ${totalHeight}`);
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
    dispatch({
      type: 'SELECT_ELEMENT',
      payload: {
        id: element.id,
        ctrlKey: e.ctrlKey || e.metaKey,
        shiftKey: e.shiftKey
      }
    });
  };

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (onHoverChange && !prevHoveredRef.current) {
      onHoverChange(element.id, true);
      prevHoveredRef.current = true;
    }
  }, [element.id, onHoverChange]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (onHoverChange && prevHoveredRef.current) {
      onHoverChange(element.id, false);
      prevHoveredRef.current = false;
    }
  }, [element.id, onHoverChange]);

  // Clean up hover state when component unmounts
  useEffect(() => {
    return () => {
      if (onHoverChange && prevHoveredRef.current) {
        onHoverChange(element.id, false);
      }
    };
  }, [element.id, onHoverChange]);

  if (!isMounted) return null;

  return (

    <React.Fragment key={element.id}>
      {/* DebugInfoを別グループとして分離 */}
      <g>
        <DebugInfo 
          element={element} 
          isHovered={isHovered} 
          currentDropTarget={currentDropTarget}
          dropPosition={dropPosition}
          isDraggedOrDescendant={isDraggedOrDescendant}
          siblingInfo={siblingInfo}
        />
      </g>
      
      <g opacity={isDraggedOrDescendant ? 0.3 : 1}>
        {renderActionButtons(element, dispatch, Object.values(tabState.elements))}
        {hiddenChildren.length > 0 && (
          <>
            {element.texts.length > 1 ? (
              <rect
                key={`shadow-${element.id}`}
                x={element.x + SHADOW_OFFSET}
                y={element.y + SHADOW_OFFSET}
                width={element.width}
                height={element.height}
                rx={ELEM_STYLE.RX}
                fill="none"
                stroke={ELEM_STYLE.SHADDOW.COLOR}
                strokeWidth={strokeWidth}
              />
            ) : (
              <line
                key={`shadow-line-${element.id}`}
                x1={element.x + SHADOW_OFFSET}
                y1={element.y + element.height + SHADOW_OFFSET}
                x2={element.x + element.width + SHADOW_OFFSET}
                y2={element.y + element.height + SHADOW_OFFSET}
                stroke={ELEM_STYLE.SHADDOW.COLOR}
                strokeWidth={strokeWidth}
              />
            )}
            <g
              transform={`translate(${element.x + element.width * 1.1},${element.y})`}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: 'SELECT_ELEMENT', payload: { id: element.id, ctrlKey: false, shiftKey: false } });
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
          strokeWidth={strokeWidth}
          stroke={
            element.texts.length > 1
              ? element.selected
                ? selectedStrokeColor
                : element.tentative
                  ? '#9E9E9E' // tentativeかつ非選択
                  : strokeColor // 設定された線の色を使用
              : 'transparent'
          }
          strokeDasharray={element.tentative ? "4 2" : "none"}
          onClick={handleSelect}
          onDoubleClick={() => dispatch({ type: 'EDIT_ELEMENT' })}
          onMouseDown={(e) => handleMouseDown(e, element)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          data-element-id={element.id}
          style={{
            fill: (element.id === currentDropTargetId && dropPosition === 'child')
              ? ELEM_STYLE.DRAGGING.COLOR
              : elementColor, // 設定された要素の色を使用
            strokeOpacity: element.tentative ? 0.6 : 1,
            pointerEvents: 'all',
            cursor: isHovered ? 'pointer' : 'default',
            filter: element.selected && element.texts.length > 1 ? 'url(#boxShadow)' : 'none',
          }}
        />
        {element.texts.length === 1 && isMounted && (
          <>
            {/* 影用のライン（選択時のみ表示） */}
            {element.selected && (
              <line
                x1={element.x + 2}
                y1={element.y + element.height + 2}
                x2={element.x + element.width + 1}
                y2={element.y + element.height + 2}
                strokeOpacity={0.4}
                stroke={strokeColor}
                strokeWidth={element.selected && strokeWidth === 0 ? 2 : strokeWidth}
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
                  ? selectedStrokeColor
                  : element.tentative
                    ? '#9E9E9E' // tentativeかつ非選択
                    : strokeColor // 設定された線の色を使用
              }
              strokeWidth={element.selected && strokeWidth === 0 ? 2 : strokeWidth}
              strokeDasharray={element.tentative ? "4 2" : "none"}
              pointerEvents="none"
            />
          </>
        )}
        
        {/* ここではbetweenモードのプレビューを表示しない - canvasArea.tsxで一元管理する */}
{element.texts.map((text, index) => (
          <React.Fragment key={`${element.id}-section-${index}`}>
            {!element.editing && (
              <TextDisplayArea
                x={element.x}
                y={element.y + element.sectionHeights.slice(0, index).reduce((sum, h) => sum + h, 0)}
                width={element.width}
                height={element.sectionHeights[index]}
                text={text}
                fontSize={DEFAULT_FONT_SIZE}
                zoomRatio={tabState.zoomRatio}
                fontFamily={fontFamily}
                onHeightChange={(newHeight) => handleHeightChange(index, newHeight)}
              />
            )}
            {index < element.texts.length - 1 && (
              <line
                x1={element.x}
                y1={element.y + element.sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)}
                x2={element.x + element.width}
                y2={element.y + element.sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)}
                stroke={strokeColor}
                strokeWidth="1"
              />
            )}
          </React.Fragment>
        ))}
      </g>
    </React.Fragment>
  );
};

export default React.memo(IdeaElement);
