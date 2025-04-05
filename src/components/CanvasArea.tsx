// src/components/canvasArea.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import IdeaElement from './IdeaElement';
import DebugInfo from './DebugInfo';
import InputFields from './InputFields';
import useResizeEffect from '../hooks/UseResizeEffect';
import { useCanvas } from '../context/CanvasContext';
import { keyActionMap } from '../constants/keyActionMap';
import { useClickOutside } from '../hooks/UseClickOutside';
import { useElementDragEffect } from '../hooks/UseElementDragEffect';
import {
    ICONBAR_HEIGHT,
    HEADER_HEIGHT,
    CONNECTION_PATH_STYLE,
    CURVE_CONTROL_OFFSET,
    MARKER,
    MARKER_TYPES,
    DEFAULT_CANVAS_BACKGROUND_COLOR,
    DEFAULT_CONNECTION_PATH_COLOR,
    DEFAULT_CONNECTION_PATH_STROKE,
    EQUILATERAL_MARKER,
    OFFSET,
} from '../constants/elementSettings';
import { Element as CanvasElement, MarkerType } from '../types/types';
import { isDescendant } from '../utils/elementHelpers';
import { useToast } from '../context/ToastContext';
import { ToastMessages } from '../constants/toastMessages';
import { getConnectionPathColor, getConnectionPathStroke, getCanvasBackgroundColor } from '../utils/localStorageHelpers';
import { getGlobalCutElements } from '../utils/clipboardHelpers';
import { MARKER_CONFIGS, getMarkerUrlByType } from '../constants/markerConfigs';

interface CanvasAreaProps {
    isHelpOpen: boolean;
    toggleHelp: () => void;
}

// マーカー生成用のヘルパー関数
const createMarkerElements = (
  connectionPathColor: string,
  connectionPathStroke: number
) => {
  // SVGマーカー要素を生成する
  return Object.values(MARKER_CONFIGS).map(config => {
    const { id, width, height, isFilled, shape, pointsOrAttributes } = config;
    const fillColor = isFilled ? connectionPathColor : 'none';

    // マーカー要素の共通属性
    const markerProps = {
      id,
      markerWidth: width,
      markerHeight: height,
      refX: id.endsWith('-end') ? 0 : width,
      refY: height / 2,
      orient: 'auto',
      markerUnits: 'userSpaceOnUse',
      viewBox: `0 0 ${width} ${height}`,
      strokeWidth: connectionPathStroke,
      fill: fillColor,
      stroke: connectionPathColor
    };

    let shapeElement;
    // シェイプ要素の生成
    if (shape === 'polygon') {
      shapeElement = (
        <polygon
          points={pointsOrAttributes as string}
          fill={fillColor}
          stroke={connectionPathColor}
        />
      );
    } else if (shape === 'circle') {
      const attrs = pointsOrAttributes as Record<string, number>;
      shapeElement = (
        <circle
          cx={attrs.cx}
          cy={attrs.cy}
          r={attrs.r}
          fill={fillColor}
          stroke={connectionPathColor}
        />
      );
    } else if (shape === 'rect') {
      const attrs = pointsOrAttributes as Record<string, number>;
      shapeElement = (
        <rect
          x={attrs.x}
          y={attrs.y}
          width={attrs.width}
          height={attrs.height}
          fill={fillColor}
          stroke={connectionPathColor}
        />
      );
    }

    return (
      <marker key={id} {...markerProps}>
        {shapeElement}
      </marker>
    );
  });
};

const CanvasArea: React.FC<CanvasAreaProps> = ({ isHelpOpen, toggleHelp }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [isClient, setIsClient] = useState(false);
    const { state, dispatch } = useCanvas();
    const { elements, zoomRatio } = state;
    const [connectionPathColor, setConnectionPathColor] = useState(DEFAULT_CONNECTION_PATH_COLOR);
    const [connectionPathStroke, setConnectionPathStroke] = useState(DEFAULT_CONNECTION_PATH_STROKE);
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState(DEFAULT_CANVAS_BACKGROUND_COLOR);
    const { addToast } = useToast();
    const [displayScopeSize, setCanvasSize] = useState({
        width: 0,
        height: 0
    });
    const [displayArea, setDisplayArea] = useState('0 0 0 0');
    const [isPinching, setIsPinching] = useState(false);
    const [initialPinchDistance, setInitialPinchDistance] = useState(0);
    const [initialScroll, setInitialScroll] = useState({ x: 0, y: 0 });
    const editingNode = Object.values(elements).find((element) => (element as CanvasElement).editing) as CanvasElement | undefined;
    const [hover, setHover] = useState<string | null>(null);
    const [showMenuForElement, setShowMenuForElement] = useState<string | null>(null);
    const [hoveredElements, setHoveredElements] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        if (!editingNode) {
            requestAnimationFrame(() => {
                const { scrollX, scrollY } = window;
                svgRef.current?.focus({ preventScroll: true });
                window.scrollTo(scrollX, scrollY);
            });
        }
    }, [editingNode]);

    useEffect(() => {
        setIsClient(true);
        if (typeof window !== 'undefined') {
            setCanvasSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
            setDisplayArea(`0 0 ${window.innerWidth} ${window.innerHeight - ICONBAR_HEIGHT}`);

            setConnectionPathColor(getConnectionPathColor() || DEFAULT_CONNECTION_PATH_COLOR);
            setConnectionPathStroke(getConnectionPathStroke() || DEFAULT_CONNECTION_PATH_STROKE);
            setCanvasBackgroundColor(getCanvasBackgroundColor() || DEFAULT_CANVAS_BACKGROUND_COLOR);
        }
    }, []);

    useResizeEffect({ setCanvasSize, setDisplayArea, state });
    useClickOutside(svgRef, !!editingNode);

    const {
        handleMouseDown,
        handleMouseUp,
        currentDropTarget,
        dropPosition,
        draggingElement,
        dropInsertY,
        siblingInfo
    } = useElementDragEffect();

    const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
        e.preventDefault();
        const keyCombo = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
        const actionType = keyActionMap[keyCombo];
        if (actionType === 'PASTE_ELEMENT') {
            const globalCutElements = getGlobalCutElements();
            if (globalCutElements && Object.keys(globalCutElements).length > 0) {
                dispatch({ type: actionType });
            } else {
                try {
                    const text = await navigator.clipboard.readText();
                    const selectedElement = Object.values(state.elements).find(el => el.selected);
                    if (!selectedElement) {
                        addToast(ToastMessages.noSelect);
                        return;
                    }
                    if (text) {
                        const texts = text.split('\n').filter(t => t.trim() !== '');
                        if (texts.length === 0) {
                            addToast(ToastMessages.clipboardEmpty);
                            return;
                        }
                        dispatch({
                            type: 'ADD_ELEMENTS_SILENT',
                            payload: {
                                parentId: selectedElement.id,
                                texts: texts
                            }
                        });
                    } else {
                        addToast(ToastMessages.clipboardEmpty);
                    }
                } catch (error) {
                    console.error('クリップボード読み取りエラー:', error);
                    addToast(ToastMessages.clipboardReadError);
                }
            }
        } else if (actionType) {
            dispatch({ type: actionType });
        }
    }, [dispatch, state.elements, addToast]);

    const handleTouchStart = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
        if (e.touches.length === 2) {
            setIsPinching(true);
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            setInitialPinchDistance(distance);
            setInitialScroll({
                x: window.scrollX,
                y: window.scrollY
            });
        } else if (e.touches.length === 1) {
            e.preventDefault();
            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);

            // SVG要素からの相対位置を使って要素を特定
            if (target && (target instanceof SVGRectElement || target instanceof SVGGElement)) {
                // 要素の親要素からcanvasArea内の要素IDを探す
                let currentElement = target;
                let elementId: string | null = null;
                
                // 親要素を遡って要素のIDを探す
                while (currentElement && !elementId) {
                    if (currentElement.dataset && currentElement.dataset.elementId) {
                        elementId = currentElement.dataset.elementId;
                        break;
                    }
                    currentElement = currentElement.parentElement as any;
                }
                
                if (elementId) {
                    // IDが見つかった場合、その要素のhandleMouseDownを直接呼び出す
                    const element = state.elements[elementId];
                    if (element) {
                        // 合成イベントを作成する代わりに直接ハンドラーを呼び出す
                        const syntheticTouchEvent = {
                            nativeEvent: e.nativeEvent,
                            stopPropagation: () => {},
                            preventDefault: () => {},
                            clientX: touch.clientX,
                            clientY: touch.clientY
                        } as unknown as React.TouchEvent<HTMLElement>;
                        
                        handleMouseDown(syntheticTouchEvent, element);
                    }
                }
            }
        }
    }, [state.elements, handleMouseDown]);

    const handleTouchMove = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
        if (isPinching && e.touches.length === 2) {
            e.preventDefault();

            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            const deltaX = touch1.clientX - touch2.clientX;
            const deltaY = touch1.clientY - touch2.clientY;
            const angle = Math.atan2(deltaY, deltaX);

            const scale = currentDistance / initialPinchDistance;
            const offsetX = (touch1.clientX + touch2.clientX) / 2;
            const offsetY = (touch1.clientY + touch2.clientY) / 2;

            window.scrollTo({
                left: initialScroll.x + (offsetX * (scale - 1)) * Math.cos(angle),
                top: initialScroll.y + (offsetY * (scale - 1)) * Math.sin(angle),
                behavior: 'auto' as ScrollBehavior
            });
        } else if (e.touches.length === 1) {
            e.preventDefault();
        }
    }, [isPinching, initialPinchDistance, initialScroll]);

    const handleTouchEnd = useCallback(() => {
        setIsPinching(false);
        setInitialPinchDistance(0);
        setInitialScroll({ x: 0, y: 0 });
    }, []);

    // マーカー設定ボタンを描画する共通関数
    const renderMarkerButton = useCallback((
        element: CanvasElement,
        absolutePosition: { x: number, y: number },
        isEndMarker: boolean = false
    ) => {
        // ボタン表示条件のチェック
        if (isEndMarker) {
            // 終点マーカーの場合：親要素が存在するかチェック
            if (!element.parentId) return null;
        } else {
            // 始点マーカーの場合：子要素があるかチェック
            const hasChildren = Object.values(elements).some(el => el.parentId === element.id && el.visible);
            if (!hasChildren) return null;
        }
        
        const totalHeight = element.height;
        const buttonId = isEndMarker ? `end-${element.id}` : element.id;
        
        // ボタン位置の計算（終点マーカーは左側、始点マーカーは右側）
        const buttonX = isEndMarker 
            ? absolutePosition.x - MARKER.WIDTH /2
            : absolutePosition.x + element.width + MARKER.WIDTH / 2;
        
        return (
            <g key={`marker-button-${buttonId}`}>
                {(hover === buttonId || showMenuForElement === buttonId) && (
                    <circle
                        cx={buttonX}
                        cy={absolutePosition.y + totalHeight / 2}
                        r={MARKER.WIDTH / 2}
                        fill="#bfbfbf"
                        opacity={0.5}
                    />
                )}
                <circle
                    cx={buttonX}
                    cy={absolutePosition.y + totalHeight / 2}
                    r={MARKER.WIDTH / 2}
                    fill="transparent"
                    onMouseEnter={() => setHover(buttonId)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setShowMenuForElement(buttonId)}
                />
            </g>
        );
    }, [hover, showMenuForElement, elements]);

    const renderConnectionPath = (
        parentElement: CanvasElement | undefined,
        element: CanvasElement,
        absolutePositions: { 
            parent: { x: number, y: number }, 
            element: { x: number, y: number } 
        },
        strokeColor: string = CONNECTION_PATH_STYLE.COLOR,
        strokeWidth: number = CONNECTION_PATH_STYLE.STROKE,
    ) => {
        if (!parentElement) return null;
        
        let startOffset = 0;
        switch (parentElement.startMarker) {
            case MARKER_TYPES.ARROW:
            case MARKER_TYPES.FILLED_ARROW:
                startOffset = MARKER.OFFSET;
                break;
            case MARKER_TYPES.CIRCLE:
            case MARKER_TYPES.FILLED_CIRCLE:
                startOffset = EQUILATERAL_MARKER.OFFSET;
                break;
            case MARKER_TYPES.SQUARE:
            case MARKER_TYPES.FILLED_SQUARE:
                startOffset = EQUILATERAL_MARKER.OFFSET;
                break;
            case MARKER_TYPES.DIAMOND:
            case MARKER_TYPES.FILLED_DIAMOND:
                startOffset = MARKER.OFFSET;
                break;
            default:
                startOffset = 0;
        }
        
        let endOffset = 0;
        switch (element.endMarker) {
            case MARKER_TYPES.ARROW:
            case MARKER_TYPES.FILLED_ARROW:
                endOffset = MARKER.OFFSET;
                break;
            case MARKER_TYPES.CIRCLE:
            case MARKER_TYPES.FILLED_CIRCLE:
                endOffset = EQUILATERAL_MARKER.OFFSET;
                break;
            case MARKER_TYPES.SQUARE:
            case MARKER_TYPES.FILLED_SQUARE:
                endOffset = EQUILATERAL_MARKER.OFFSET;
                break;
            case MARKER_TYPES.DIAMOND:
            case MARKER_TYPES.FILLED_DIAMOND:
                endOffset = MARKER.OFFSET;
                break;
            default:
                endOffset = 0;
        }
        
        const parentPos = absolutePositions.parent;
        const elementPos = absolutePositions.element;
        const totalHeight = element.height;
        
        const pathCommands = [
            `M ${parentPos.x + parentElement.width + startOffset},${parentPos.y + parentElement.height / 2}`,
            `C ${parentPos.x + parentElement.width + CURVE_CONTROL_OFFSET},${parentPos.y + parentElement.height / 2}`,
            `${elementPos.x - CURVE_CONTROL_OFFSET},${elementPos.y + totalHeight / 2}`,
            `${elementPos.x - endOffset},${elementPos.y + totalHeight / 2}`
        ].join(' ');

        const markerStart = getMarkerUrlByType(parentElement.startMarker);
        const markerEnd = getMarkerUrlByType(element.endMarker, true);

        return (
            <g key={`connection-${element.id}-${element.parentId}`}>
                <path
                    d={pathCommands}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    markerStart={markerStart}
                    markerEnd={markerEnd}
                    style={{ pointerEvents: 'none' }}
                />
            </g>
        );
    };

    const renderPopupMenus = () => {
        if (!showMenuForElement) return null;
        
        // 通常のマーカー設定か、終点マーカー設定かを判断
        const isEndMarkerMenu = showMenuForElement.startsWith('end-');
        let elementId = showMenuForElement;
        
        // 終点マーカーの場合はプレフィックスを削除
        if (isEndMarkerMenu) {
            elementId = showMenuForElement.substring(4);
        }
        
        const element = elements[elementId];
        if (!element) return null;
        
        const totalHeight = element.height;
        
        // ポップアップメニューの表示位置を計算
        let popupX, popupY;
        
        if (isEndMarkerMenu) {
            // 終点マーカーの場合は要素の左側に表示
            popupX = element.x - 170; // メニューの幅(150px) + マージン(20px)
            popupY = element.y + totalHeight / 2 - 25;
        } else {
            // 始点マーカーの場合は要素の右側に表示
            popupY = element.y + totalHeight / 2 - 25;
        }

        const markerOptions = [
            { id: 'arrow', label: 'Arrow' },
            { id: 'filled_arrow', label: 'Filled Arrow' },
            { id: 'circle', label: 'Circle' },
            { id: 'filled_circle', label: 'Filled Circle' },
            { id: 'square', label: 'Square' },
            { id: 'filled_square', label: 'Filled Square' },
            { id: 'diamond', label: 'Diamond' },
            { id: 'filled_diamond', label: 'Filled Diamond' },
            { id: 'none', label: 'None' },
        ];

        return (
            <foreignObject
                x={popupX}
                y={popupY}
                width={150}
                height={270}
                className="popup-menu"
            >
                <div style={{
                    backgroundColor: 'white',
                    border: '2px solid black',
                    borderRadius: '4px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
                    padding: '8px'
                }}>
                    {markerOptions.map(option => (
                        <div
                            key={option.id}
                            style={{
                                padding: '4px 0',
                                cursor: 'pointer',
                                backgroundColor: hover === option.id ? '#e0e0e0' : 'white'
                            }}
                            onMouseEnter={() => setHover(option.id)}
                            onMouseLeave={() => setHover(null)}
                            onClick={() => {
                                if (isEndMarkerMenu) {
                                    dispatch({
                                        type: 'UPDATE_END_MARKER',
                                        payload: {
                                            id: element.id,
                                            endMarker: option.id as MarkerType
                                        }
                                    });
                                } else {
                                    dispatch({
                                        type: 'UPDATE_START_MARKER',
                                        payload: {
                                            id: element.id,
                                            startMarker: option.id as MarkerType
                                        }
                                    });
                                }
                                setShowMenuForElement(null);
                            }}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            </foreignObject>
        );
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showMenuForElement && !(event.target as HTMLElement).closest('.popup-menu')) {
                setShowMenuForElement(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenuForElement]);

    const handleElementHover = useCallback((elementId: string, isHovered: boolean) => {
        setHoveredElements(prev => {
            if (prev[elementId] === isHovered) {
                return prev;
            }

            const newState = { ...prev };

            if (isHovered) {
                newState[elementId] = true;
            } else {
                if (Object.prototype.hasOwnProperty.call(newState, elementId)) {
                    delete newState[elementId];
                }
            }

            return newState;
        });
    }, []);

    const renderElements = () => {
        // グループ化用のオブジェクト（キー: parentId_depth）
        const elementGroups: { [key: string]: CanvasElement[] } = {};

        // 要素を可視状態でフィルタリングしつつグループ化
        Object.values(elements)
            .filter((element): element is CanvasElement => element.visible)
            .forEach(element => {
                // グループキーの生成（ルート要素は特別扱い）
                const groupKey = element.parentId
                    ? `${element.parentId}_${element.depth}`
                    : 'root';

                // グループが存在しない場合は初期化
                if (!elementGroups[groupKey]) {
                    elementGroups[groupKey] = [];
                }
                elementGroups[groupKey].push(element);
            });

        // グループごとのレンダリング処理
        return Object.entries(elementGroups).flatMap(([groupKey, groupElements]) => {
            // ルート要素グループの処理
            if (groupKey === 'root') {
                return groupElements.map(element => (
                    <React.Fragment key={element.id}>
                        <IdeaElement
                            element={element}
                            currentDropTarget={currentDropTarget as CanvasElement | null}
                            dropPosition={dropPosition}
                            draggingElement={draggingElement}
                            handleMouseDown={handleMouseDown as unknown as (e: React.MouseEvent<SVGElement>, element: CanvasElement) => void}
                            handleMouseUp={handleMouseUp}
                            onHoverChange={handleElementHover}
                            dropInsertY={dropInsertY}
                            siblingInfo={siblingInfo}
                        />
                        {renderMarkerButton(element, { x: element.x, y: element.y })}
                    </React.Fragment>
                ));
            }

            // グループキーから親要素IDを取得
            const [parentId] = groupKey.split('_');
            const parentElement = elements[parentId] as CanvasElement | undefined;

            // 親要素が存在しない場合はスキップ（論理エラー防止）
            if (!parentElement) return [];

            // グループの基準位置計算（親要素の右端 + OFFSET）
            const groupX = parentElement.x + parentElement.width + OFFSET.X;
            const groupY = parentElement.y;

            // グループ全体をSVGグループ要素でラップ
            return [
                <g
                    key={groupKey}
                    transform={`translate(${groupX}, ${groupY})`}
                    className="element-group"
                    data-parent-id={parentId}
                    data-depth={groupElements[0].depth}
                >
                    {groupElements.map(element => {
                        // グループ内相対座標に変換
                        const relativeX = element.x - groupX;
                        const relativeY = element.y - groupY;

                        return (
                            <IdeaElement
                                key={element.id}
                                element={{
                                    ...element,
                                    x: relativeX,
                                    y: relativeY,
                                }}
                                currentDropTarget={currentDropTarget as CanvasElement | null}
                                dropPosition={dropPosition}
                                draggingElement={draggingElement}
                                handleMouseDown={(e) => {
                                    handleMouseDown(e as unknown as React.MouseEvent<HTMLElement>, element);
                                }}
                                handleMouseUp={handleMouseUp}
                                onHoverChange={handleElementHover}
                                dropInsertY={dropInsertY}
                                siblingInfo={siblingInfo}
                            />
                        );
                    })}
                </g>
            ];
        });
    };

    const renderDebugInfo = () => {
        return Object.keys(hoveredElements)
            .map(elementId => {
                const element = elements[elementId];
                if (!element || !element.visible) return null;

                return (
                    <DebugInfo
                        key={`debug-${elementId}`}
                        element={element}
                        isHovered={true}
                        currentDropTarget={currentDropTarget}
                        dropPosition={dropPosition}
                    />
                );
            })
            .filter(Boolean);
    };

    // ドラッグドロップの視覚的なプレビューを描画
    const renderDropPreview = () => {
      if (!draggingElement || !currentDropTarget) return null;

      // ドロップポジションに基づいて座標を計算
      let x, y;
      
      if (dropPosition === 'child') {
        // 子要素として追加する場合
        // ドロップ後の親要素となる要素(currentDropTarget)の右端 + オフセット
        x = currentDropTarget.x + currentDropTarget.width + OFFSET.X;
        
        // Y座標の計算（parentElementは使用しない）
        y = dropInsertY 
          ? dropInsertY - draggingElement.height / 2 
          : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
      } else if (dropPosition === 'between') {
        // 兄弟要素として追加する場合（between）
        // 親要素を取得
        const parentElement = currentDropTarget.parentId ? elements[currentDropTarget.parentId] : null;
        
        if (parentElement) {
          // 親要素がある場合は、親要素の右側に配置
          x = parentElement.x + parentElement.width + OFFSET.X;
          
          // siblingInfo情報に基づいてY座標を決定
          if (siblingInfo) {
            const { prevElement, nextElement } = siblingInfo;
            
            if (nextElement && !prevElement) {
              // 先頭要素の前にドロップする場合
              // 先頭要素のY座標からドラッグ要素の高さを引いた位置に表示
              y = nextElement.y - draggingElement.height;
            } else if (prevElement && !nextElement) {
              // 末尾要素の後にドロップする場合
              // 末尾要素のY座標 + 高さの位置に表示
              y = prevElement.y + prevElement.height;
            } else if (prevElement && nextElement) {
              // 要素間にドロップする場合
              // 間の中央に配置（既存の計算ロジックを使用）
              y = dropInsertY ? dropInsertY - draggingElement.height / 2 : (prevElement.y + prevElement.height + nextElement.y) / 2 - draggingElement.height / 2;
            } else {
              // siblingInfoはあるが、prevもnextも無い場合（通常は発生しない）
              y = dropInsertY ? dropInsertY - draggingElement.height / 2 : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
            }
          } else {
            // siblingInfo情報がない場合は既存の計算方法を使用
            y = dropInsertY ? dropInsertY - draggingElement.height / 2 : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
          }
        } else {
          // 親要素がない場合（ルート要素として配置）
          x = OFFSET.X;
          y = dropInsertY ? dropInsertY - draggingElement.height / 2 : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
        }
      } else {
        return null;
      }

      // 背景色の設定
      let bgColor = dropPosition === 'child' ? 
        'rgba(103, 208, 113, 0.3)' :  // childモードの場合: 緑色
        'rgba(157, 172, 244, 0.3)';   // betweenモードの場合: 青色
      
      return (
        <rect
          x={x}
          y={y}
          width={draggingElement.width}
          height={draggingElement.height}
          fill={bgColor}
          stroke="#555"
          strokeDasharray="2,2"
          strokeWidth={1}
          rx={4}
          ry={4}
          className="drop-preview"
        />
      );
    };

    return (
        <>
            <div style={{
                position: 'absolute',
                top: HEADER_HEIGHT,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: canvasBackgroundColor,
                overflow: 'hidden',
                zIndex: -1
            }} />
            <div style={{
                position: 'absolute',
                top: HEADER_HEIGHT,
                left: 0,
                overflow: 'auto',
                touchAction: isPinching ? 'none' : 'manipulation',
                backgroundColor: canvasBackgroundColor
            }}>
                {isClient && (
                    <svg
                        data-testid="view-area"
                        ref={svgRef}
                        width={displayScopeSize.width}
                        height={displayScopeSize.height}
                        viewBox={displayArea}
                        tabIndex={0}
                        onKeyDown={handleKeyDown}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        style={{
                            outline: 'none',
                            touchAction: isPinching ? 'none' : 'manipulation',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            backgroundColor: canvasBackgroundColor
                        }}
                        className="svg-element"
                    >
                        <defs>
                            {createMarkerElements(connectionPathColor, connectionPathStroke)}
                        </defs>

                        {renderElements()}

                        {/* 子要素の接続線を描画 */}
                        {Object.values(elements)
                            .filter((element): element is CanvasElement => element.visible && !!element.parentId)
                            .map(element => {
                                const parent = state.elements[element.parentId!];
                                if (draggingElement && (element.id === draggingElement.id || isDescendant(state.elements, draggingElement.id, element.id))) {
                                    return null;
                                }
                                
                                // 接続線を描画
                                return (
                                    <React.Fragment key={`connection-group-${element.id}`}>
                                        {renderConnectionPath(
                                            parent,
                                            element,
                                            {
                                                parent: { x: parent.x, y: parent.y },
                                                element: { x: element.x, y: element.y }
                                            },
                                            connectionPathColor,
                                            connectionPathStroke
                                        )}
                                        {/* 始点マーカー設定ボタンを描画 */}
                                        {renderMarkerButton(parent, { x: parent.x, y: parent.y })}
                                        {/* 終点マーカー設定ボタンを描画 */}
                                        {renderMarkerButton(element, { x: element.x, y: element.y }, true)}
                                    </React.Fragment>
                                );
                            })}

                        {currentDropTarget && draggingElement && (
                            (() => {
                                const newParent = dropPosition === 'child'
                                    ? currentDropTarget
                                    : currentDropTarget.parentId
                                        ? state.elements[currentDropTarget.parentId]
                                        : null;

                                // Calculate preview position instead of using the dragging element's current position
                                let previewX, previewY;
                                if (dropPosition === 'child') {
                                    // Child mode preview position
                                    previewX = currentDropTarget.x + currentDropTarget.width + OFFSET.X;
                                    previewY = dropInsertY 
                                        ? dropInsertY - draggingElement.height / 2 
                                        : currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
                                } else if (dropPosition === 'between') {
                                    // Between mode preview position
                                    const parentElement = currentDropTarget.parentId ? elements[currentDropTarget.parentId] : null;
                                    
                                    if (parentElement) {
                                        previewX = parentElement.x + parentElement.width + OFFSET.X;
                                        
                                        if (siblingInfo) {
                                            const { prevElement, nextElement } = siblingInfo;
                                            
                                            if (nextElement && !prevElement) {
                                                // Before first element
                                                previewY = nextElement.y - draggingElement.height;
                                            } else if (prevElement && !nextElement) {
                                                // After last element
                                                previewY = prevElement.y + prevElement.height;
                                            } else if (prevElement && nextElement) {
                                                // Between two elements
                                                previewY = dropInsertY ? dropInsertY - draggingElement.height / 2 : 
                                                    (prevElement.y + prevElement.height + nextElement.y) / 2 - draggingElement.height / 2;
                                            } else {
                                                // Fallback
                                                previewY = dropInsertY ? dropInsertY - draggingElement.height / 2 : 
                                                    currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
                                            }
                                        } else {
                                            // Fallback when no sibling info
                                            previewY = dropInsertY ? dropInsertY - draggingElement.height / 2 : 
                                                currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
                                        }
                                    } else {
                                        // Root level
                                        previewX = OFFSET.X;
                                        previewY = dropInsertY ? dropInsertY - draggingElement.height / 2 : 
                                            currentDropTarget.y + currentDropTarget.height / 2 - draggingElement.height / 2;
                                    }
                                } else {
                                    // Fallback to dragging element's current position
                                    const draggingPos = state.elements[draggingElement.id];
                                    previewX = draggingPos.x;
                                    previewY = draggingPos.y;
                                }

                                return newParent && renderConnectionPath(
                                    newParent,
                                    // Create a temporary object with preview position instead of using the actual dragging element
                                    {
                                        ...draggingElement,
                                        x: previewX,
                                        y: previewY
                                    },
                                    {
                                        parent: { x: newParent.x, y: newParent.y },
                                        element: { x: previewX, y: previewY }
                                    },
                                    CONNECTION_PATH_STYLE.DRAGGING_COLOR,
                                    CONNECTION_PATH_STYLE.STROKE
                                );
                            })()
                        )}

                        {renderPopupMenus()}
                        {renderDebugInfo()}
                        {renderDropPreview()}
                    </svg>
                )}
                <InputFields
                    element={editingNode as CanvasElement | undefined}
                    onEndEditing={() => {
                        dispatch({ type: 'END_EDITING' });
                        svgRef.current?.focus();
                    }}
                />
            </div>
        </>
    );
};

export default React.memo(CanvasArea);
