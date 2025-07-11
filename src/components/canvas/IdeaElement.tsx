// src/components/elements/IdeaElement.tsx
'use client';

import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import {
  findParentNodeInHierarchy,
  getChildrenFromHierarchy,
  createElementsMapFromHierarchy,
} from '../../utils/hierarchical/hierarchicalConverter';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';
import { useCanvas } from '../../context/CanvasContext';
import { Action } from '../../types/actionTypes';
import TextDisplayArea from '../canvas/TextDisplayArea';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import DoneIcon from '@mui/icons-material/Done';
import ClearIcon from '@mui/icons-material/Clear';
import { calculateElementWidth, wrapText } from '../../utils/textareaHelpers';
import {
  DEFAULT_FONT_SIZE,
  TEXTAREA_PADDING,
  SHADOW_OFFSET,
  ELEM_STYLE,
  SIZE,
  LINE_HEIGHT_RATIO,
} from '../../config/elementSettings';
import {
  getElementColor,
  getStrokeColor,
  getStrokeWidth,
  getFontFamily,
  getSelectedStrokeColor,
} from '../../utils/storage/localStorageHelpers';
import { Element as CanvasElement, DropPosition } from '../../types/types';
import { isDescendant } from '../../utils/element/elementHelpers';
import { useTabs } from '../../context/TabsContext';
import { useIsMounted } from '../../hooks/UseIsMounted';

interface IdeaElementProps {
  element: CanvasElement;
  currentDropTarget: CanvasElement | null;
  dropPosition: DropPosition;
  draggingElement: CanvasElement | null;
  handleMouseDown: (e: React.MouseEvent<SVGElement>, element: CanvasElement) => void;
  handleMouseUp: () => void;
  onHoverChange?: (elementId: string, isHovered: boolean) => void;
  _dropInsertY?: number;
  _siblingInfo?: { prevElement?: CanvasElement; nextElement?: CanvasElement } | null;
}

const renderActionButtons = (
  element: CanvasElement,
  dispatch: React.Dispatch<Action>,
  hierarchicalData: HierarchicalStructure | null,
) => {
  const shouldShowButtons = (element: CanvasElement) => {
    if (!element.tentative) return false;

    // 階層データから親要素を取得して同じ親を持つtentative要素をすべて取得
    const parentNode = hierarchicalData
      ? findParentNodeInHierarchy(hierarchicalData, element.id)
      : null;
    const parentId = parentNode ? parentNode.data.id : null;

    // 兄弟要素を直接取得してtentativeなもののみフィルタリング
    const siblings =
      hierarchicalData && parentId
        ? getChildrenFromHierarchy(hierarchicalData, parentId)
        : hierarchicalData && parentId === null && hierarchicalData.root
          ? [hierarchicalData.root.data]
          : [];
    const tentativeSiblings = siblings.filter((el) => el.tentative);

    // 自身も含めて最初の要素かどうかをIDで判定（作成順）
    const minId = Math.min(...tentativeSiblings.map((el) => parseInt(el.id)));
    return parseInt(element.id) === minId;
  };

  if (!shouldShowButtons(element)) return null;
  return (
    <g
      transform={`translate(${element.x + element.width * 1.1},${element.y})`}
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: 'pointer', pointerEvents: 'all' }}
      data-exclude-from-export="true"
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
              transition: 'color 0.2s ease-in-out',
            }}
            style={{ width: '100%', height: '100%' }}
            onClick={() => {
              const parentNode = hierarchicalData
                ? findParentNodeInHierarchy(hierarchicalData, element.id)
                : null;
              const parentId = parentNode ? parentNode.data.id : 'root';
              dispatch({ type: 'CONFIRM_TENTATIVE_ELEMENTS', payload: parentId });
            }}
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
              transition: 'color 0.2s ease-in-out',
            }}
            style={{ width: '100%', height: '100%' }}
            onClick={() => {
              const parentNode = hierarchicalData
                ? findParentNodeInHierarchy(hierarchicalData, element.id)
                : null;
              const parentId = parentNode ? parentNode.data.id : 'root';
              dispatch({ type: 'CANCEL_TENTATIVE_ELEMENTS', payload: parentId });
            }}
          />
        </foreignObject>
      </g>
    </g>
  );
};

const IdeaElement: React.FC<IdeaElementProps> = ({
  element,
  currentDropTarget,
  dropPosition,
  draggingElement,
  handleMouseDown,
  onHoverChange,
  _dropInsertY,
  _siblingInfo,
}) => {
  const { dispatch } = useCanvas();
  const { getCurrentTabState } = useTabs();
  const tabState = useMemo(
    () => getCurrentTabState() || { elements: {}, zoomRatio: 1 },
    [getCurrentTabState],
  );
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
      const sectionHeights = element.texts.map((text) => {
        const lines = wrapText(text || '', newWidth, tabState.zoomRatio).length;
        return Math.max(
          SIZE.SECTION_HEIGHT * tabState.zoomRatio,
          lines * DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO +
            TEXTAREA_PADDING.VERTICAL * tabState.zoomRatio,
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
          sectionHeights,
        },
      });
    }
  }, [
    element.editing,
    element.texts,
    element.width,
    element.height,
    dispatch,
    element.id,
    tabState.zoomRatio,
    isMounted,
  ]);

  const hiddenChildren = useMemo(() => {
    // hierarchicalDataから要素を取得
    if ('hierarchicalData' in tabState && tabState.hierarchicalData) {
      const children = getChildrenFromHierarchy(tabState.hierarchicalData, element.id);
      return children.filter((child) => !child.visible);
    }
    return [];
  }, [tabState, element.id]);

  const isDraggedOrDescendant = useMemo(() => {
    if (!draggingElement) return false;

    if (draggingElement.id === element.id) return true;

    // hierarchicalDataから要素マップを取得してisDescendantを実行（階層構造ベース）
    if ('hierarchicalData' in tabState && tabState.hierarchicalData) {
      const elementsMap = createElementsMapFromHierarchy(tabState.hierarchicalData);
      return isDescendant(elementsMap, draggingElement.id, element.id);
    }

    return false;
  }, [draggingElement, element.id, tabState]);

  const handleHeightChange = useCallback(
    (sectionIndex: number, newHeight: number) => {
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
            sectionHeights: newSectionHeights,
          },
        });
      }
    },
    [dispatch, element],
  );

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log(`[DEBUG] Element ${element.id} clicked - current selected: ${element.selected}`);
    dispatch({
      type: 'SELECT_ELEMENT',
      payload: {
        id: element.id,
        ctrlKey: e.ctrlKey || e.metaKey,
        shiftKey: e.shiftKey,
      },
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
      <g
        opacity={isDraggedOrDescendant ? 0.3 : 1}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {renderActionButtons(
          element,
          dispatch,
          'hierarchicalData' in tabState ? tabState.hierarchicalData : null,
        )}
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
                dispatch({
                  type: 'SELECT_ELEMENT',
                  payload: { id: element.id, ctrlKey: false, shiftKey: false },
                });
                dispatch({ type: 'EXPAND_ELEMENT' });
              }}
              style={{ cursor: 'pointer' }}
              data-exclude-from-export="true"
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
              <svg x="4" y="4" width="16" height="16" viewBox="0 0 24 24">
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
          strokeDasharray={element.tentative ? '4 2' : 'none'}
          onClick={handleSelect}
          onDoubleClick={(e) => {
            console.log(`[DEBUG] onDoubleClick triggered for element ${element.id}`, {
              editing: element.editing,
              selected: element.selected,
            });
            e.stopPropagation(); // ダブルクリックを優先
            dispatch({ type: 'EDIT_ELEMENT' });
          }}
          onMouseDown={(e) => {
            console.log(`[DEBUG] onMouseDown triggered for element ${element.id}`, {
              button: e.button,
              selected: element.selected,
            });
            handleMouseDown(e, element);
          }}
          onTouchStart={(e) => {
            console.log(`[DEBUG] onTouchStart triggered for element ${element.id}`, {
              selected: element.selected,
            });
            // TouchEventをMouseEventに変換
            const touch = e.touches[0];
            const syntheticMouseEvent = {
              clientX: touch.clientX,
              clientY: touch.clientY,
              button: 0,
              buttons: 1,
              ctrlKey: false,
              metaKey: false,
              shiftKey: false,
              altKey: false,
              detail: 1,
              currentTarget: e.currentTarget as SVGRectElement,
              target: e.target as SVGElement,
              preventDefault: () => e.preventDefault(),
              stopPropagation: () => e.stopPropagation(),
              nativeEvent: e.nativeEvent, // nativeEventを追加
            } as unknown as React.MouseEvent<SVGElement>;
            handleMouseDown(syntheticMouseEvent, element);
          }}
          data-element-id={element.id}
          style={{
            fill:
              element.id === currentDropTargetId && dropPosition === 'child'
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
                data-exclude-from-export="true"
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
              strokeDasharray={element.tentative ? '4 2' : 'none'}
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
                y={
                  element.y + element.sectionHeights.slice(0, index).reduce((sum, h) => sum + h, 0)
                }
                width={element.width}
                height={element.sectionHeights[index]}
                text={text}
                fontSize={DEFAULT_FONT_SIZE}
                zoomRatio={tabState.zoomRatio}
                fontFamily={fontFamily}
                onHeightChange={(newHeight) => handleHeightChange(index, newHeight)}
                onUrlClick={undefined}
                onElementClick={handleSelect}
                onDoubleClick={(e) => {
                  console.log(`[DEBUG] TextDisplayArea onDoubleClick for element ${element.id}`);
                  e.stopPropagation();
                  dispatch({ type: 'EDIT_ELEMENT' });
                }}
                onMouseDown={(e) => {
                  console.log(`[DEBUG] TextDisplayArea onMouseDown for element ${element.id}`);
                  // MouseEvent<Element>をMouseEvent<SVGElement>に適切にキャスト
                  const syntheticEvent = {
                    ...e,
                    currentTarget: e.currentTarget as HTMLElement,
                    target: e.target as Element,
                    nativeEvent: e.nativeEvent, // nativeEventを保持
                  } as unknown as React.MouseEvent<SVGElement>;
                  handleMouseDown(syntheticEvent, element);
                }}
                onTouchStart={(e) => {
                  console.log(`[DEBUG] TextDisplayArea onTouchStart for element ${element.id}`);
                  // TouchEventをMouseEventに変換
                  const touch = e.touches[0];
                  const syntheticMouseEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    button: 0,
                    buttons: 1,
                    ctrlKey: false,
                    metaKey: false,
                    shiftKey: false,
                    altKey: false,
                    detail: 1,
                    currentTarget: e.currentTarget as HTMLElement,
                    target: e.target as Element,
                    preventDefault: () => e.preventDefault(),
                    stopPropagation: () => e.stopPropagation(),
                    nativeEvent: e.nativeEvent, // nativeEventを追加
                  } as unknown as React.MouseEvent<SVGElement>;
                  handleMouseDown(syntheticMouseEvent, element);
                }}
                isSelected={element.selected}
              />
            )}
            {index < element.texts.length - 1 && (
              <line
                x1={element.x}
                y1={
                  element.y +
                  element.sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)
                }
                x2={element.x + element.width}
                y2={
                  element.y +
                  element.sectionHeights.slice(0, index + 1).reduce((sum, h) => sum + h, 0)
                }
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
