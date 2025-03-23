// src/components/canvasArea.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import IdeaElement, { DebugInfo } from './ideaElement';
import InputFields from './inputFields';
import useResizeEffect from '../hooks/useResizeEffect';
import { useCanvas } from '../context/canvasContext';
import { keyActionMap } from '../constants/keyActionMap';
import { useClickOutside } from '../hooks/useClickOutside';
import { useElementDragEffect } from '../hooks/useElementDragEffect';
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
} from '../constants/elementSettings';
import { Element as CanvasElement } from '../types';
import { isDescendant } from '../utils/elementHelpers';
import { useToast } from '../context/toastContext';
import { ToastMessages } from '../constants/toastMessages';
import { getConnectionPathColor, getConnectionPathStroke, getCanvasBackgroundColor } from '../utils/localStorageHelpers';

interface CanvasAreaProps {
    isHelpOpen: boolean;
    toggleHelp: () => void;
}

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
    const [hoveredElements, setHoveredElements] = useState<{[key: string]: boolean}>({});
    
    useEffect(() => {
        if (!editingNode) {
            // 編集モード終了時のフォーカス処理を改善
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
            
            // Get localStorage values only on the client side
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
        draggingElement
    } = useElementDragEffect();

    const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => {
        e.preventDefault();
        const keyCombo = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
        const actionType = keyActionMap[keyCombo];

        if (actionType === 'PASTE_ELEMENT') {
            // cutElementsがある場合は通常の貼り付け
            if (state.cutElements && Object.keys(state.cutElements).length > 0) {
                dispatch({ type: actionType });
            } else {
                try {
                    // クリップボードからテキストを取得
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
    }, [dispatch, state.cutElements, state.elements, addToast]);

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

            if (target instanceof SVGRectElement) {
                const syntheticEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    bubbles: true
                });
                target.dispatchEvent(syntheticEvent);
            }
        }
    }, []);

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

    const renderConnectionPath = (
        parentElement: CanvasElement | undefined,
        element: CanvasElement,
        strokeColor: string = CONNECTION_PATH_STYLE.COLOR,
        strokeWidth: number = CONNECTION_PATH_STYLE.STROKE,
    ) => {
        if (!parentElement) return null;
        let offset = 0;
        switch (parentElement.connectionPathType) {
            case MARKER_TYPES.ARROW:
            case MARKER_TYPES.FILLED_ARROW:
                offset = MARKER.OFFSET;
                break;
            case MARKER_TYPES.CIRCLE:
            case MARKER_TYPES.FILLED_CIRCLE:
                offset = EQUILATERAL_MARKER.OFFSET;
                break;
            case MARKER_TYPES.SQUARE:
            case MARKER_TYPES.FILLED_SQUARE:
                offset = EQUILATERAL_MARKER.OFFSET;
                break;
            case MARKER_TYPES.DIAMOND:
            case MARKER_TYPES.FILLED_DIAMOND:
                offset = MARKER.OFFSET;
                break;
            default:
                offset = 0;
        }
        const totalHeight = element.height;
        const pathCommands = [
            `M ${parentElement.x + parentElement.width + offset},${parentElement.y + parentElement.height / 2}`,
            `C ${parentElement.x + parentElement.width + CURVE_CONTROL_OFFSET},${parentElement.y + parentElement.height / 2}`,
            `${element.x - CURVE_CONTROL_OFFSET},${element.y + totalHeight / 2}`,
            `${element.x},${element.y + totalHeight / 2}`
        ].join(' ');

        // マーカーの選択
        let markerStart = undefined;
        switch (parentElement.connectionPathType) {
            case MARKER_TYPES.ARROW:
                markerStart = 'url(#arrowhead)';
                break;
            case MARKER_TYPES.FILLED_ARROW:
                markerStart = 'url(#filledarrowhead)';
                break;
            case MARKER_TYPES.CIRCLE:
                markerStart = 'url(#circlemarker)';
                break;
            case MARKER_TYPES.FILLED_CIRCLE:
                markerStart = 'url(#filledcirclemarker)';
                break;
            case MARKER_TYPES.SQUARE:
                markerStart = 'url(#squaremarker)';
                break;
            case MARKER_TYPES.FILLED_SQUARE:
                markerStart = 'url(#filledsquaremarker)';
                break;
            case MARKER_TYPES.DIAMOND:
                markerStart = 'url(#diamondmarker)';
                break;
            case MARKER_TYPES.FILLED_DIAMOND:
                markerStart = 'url(#filleddiamondmarker)';
                break;
        }

        return (
            <g key={`connection-${element.id}-${element.parentId}`}>
                {(hover === element.id || showMenuForElement === element.id) && (
                    <circle
                        cx={element.x + element.width + 10}
                        cy={element.y + totalHeight / 2}
                        r={10}
                        fill="#bfbfbf"
                        opacity={0.5}
                        // style={{ pointerEvents: 'none' }}
                    />
                )}
                <path
                    key={`connection-${element.id}-${element.parentId}`}
                    d={pathCommands}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    fill="none"
                    markerStart={markerStart}
                    style={{ pointerEvents: 'none' }}
                />
                <circle
                    cx={element.x + element.width + 10}
                    cy={element.y + totalHeight / 2}
                    r={10}
                    fill="transparent"
                    // style={{ pointerEvents: 'all' }}
                    onMouseEnter={() => setHover(element.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setShowMenuForElement(element.id)}
                />
                
            </g>
        );
    };

    // Generate popup menus for rendering at the top level
    const renderPopupMenus = () => {
        if (!showMenuForElement) return null;
        const element = elements[showMenuForElement];
        if (!element) return null;
        const totalHeight = element.height;
        
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
                x={element.x + element.width + 20}
                y={element.y + totalHeight / 2 - 25}
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
                                dispatch({
                                    type: 'UPDATE_CONNECTION_PATH_TYPE',
                                    payload: {
                                        id: element.id,
                                        connectionPathType: option.id
                                    }
                                });
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

    // Add a method to track hovered elements
    const handleElementHover = useCallback((elementId: string, isHovered: boolean) => {
        setHoveredElements(prev => {
            // Only update if the state is actually changing
            if (prev[elementId] === isHovered) {
                return prev;
            }
            
            // Create a new object to trigger re-render
            const newState = { ...prev };
            
            if (isHovered) {
                newState[elementId] = true;
            } else {
                delete newState[elementId];
            }
            
            return newState;
        });
    }, []);

    // Modify IdeaElement to track hover status at the top level
    const renderElements = () => {
        return Object.values(elements)
            .filter((element): element is CanvasElement => element.visible)
            .map(element => (
                <React.Fragment key={element.id}>
                    <IdeaElement
                        element={element}
                        currentDropTarget={currentDropTarget as CanvasElement | null}
                        dropPosition={dropPosition}
                        draggingElement={draggingElement}
                        handleMouseDown={handleMouseDown as unknown as (e: React.MouseEvent<SVGElement>, element: CanvasElement) => void}
                        handleMouseUp={handleMouseUp}
                        onHoverChange={handleElementHover}
                    />
                </React.Fragment>
            ));
    };

    // Render debug info at the top level
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
                    />
                );
            })
            .filter(Boolean);
    };

    return (
        <>
            <div style={{
                position: 'absolute',
                top: HEADER_HEIGHT,
                left: 0,
                overflow: 'auto',
                touchAction: isPinching ? 'none' : 'manipulation',
                backgroundColor: canvasBackgroundColor // キャンバスの背景色を設定
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
                            backgroundColor: canvasBackgroundColor // SVG自体にも背景色を適用
                        }}
                        className="svg-element"
                    >
                        <defs>
                            {/* 矢印マーカー */}
                            <marker 
                                id="arrowhead" 
                                markerWidth={MARKER.WIDTH} 
                                markerHeight={MARKER.HEIGHT} 
                                refX={MARKER.WIDTH} 
                                refY={MARKER.HEIGHT / 2} 
                                orient="auto" 
                                fill="none" 
                                stroke={connectionPathColor}
                                markerUnits="userSpaceOnUse"
                                viewBox="0 0 MARKER.WIDTH MARKER.HEIGHT"
                                strokeWidth={connectionPathStroke}
                            >
                                <polygon
                                    points={`${MARKER.WIDTH} 0, ${MARKER.WIDTH} ${MARKER.HEIGHT}, 0 ${MARKER.HEIGHT / 2}`}
                                    fill="none"
                                    stroke={connectionPathColor}
                                />
                            </marker>
                            {/* Filled 矢印マーカー */}
                            <marker 
                                id="filledarrowhead" 
                                markerWidth={MARKER.WIDTH} 
                                markerHeight={MARKER.HEIGHT} 
                                refX={MARKER.WIDTH} 
                                refY={MARKER.HEIGHT / 2} 
                                orient="auto" 
                                fill={connectionPathColor} 
                                stroke={connectionPathColor}
                                markerUnits="userSpaceOnUse"
                                viewBox="0 0 MARKER.WIDTH MARKER.HEIGHT"
                                strokeWidth={connectionPathStroke}
                            >
                                <polygon
                                    points={`${MARKER.WIDTH} 0, ${MARKER.WIDTH} ${MARKER.HEIGHT}, 0 ${MARKER.HEIGHT / 2}`}
                                    fill={connectionPathColor}
                                    stroke={connectionPathColor}
                                />
                            </marker>
                            {/* 円形マーカー */}
                            <marker 
                                id="circlemarker" 
                                markerWidth={EQUILATERAL_MARKER.SIZE}
                                markerHeight={EQUILATERAL_MARKER.SIZE}
                                refX={EQUILATERAL_MARKER.SIZE}
                                refY={EQUILATERAL_MARKER.SIZE / 2} 
                                orient="auto"
                                markerUnits="userSpaceOnUse"
                                viewBox="0 0 EQUILATERAL_MARKER.SIZE EQUILATERAL_MARKER.SIZE"
                                strokeWidth={connectionPathStroke}
                            >
                                <circle 
                                    cx={EQUILATERAL_MARKER.SIZE / 2} 
                                    cy={EQUILATERAL_MARKER.SIZE / 2} 
                                    r={EQUILATERAL_MARKER.SIZE / 2 - 1} 
                                    fill="none" 
                                    stroke={connectionPathColor}
                                />
                            </marker>
                            {/* Filled 円形マーカー */}
                            <marker 
                                id="filledcirclemarker" 
                                markerWidth={EQUILATERAL_MARKER.SIZE}
                                markerHeight={EQUILATERAL_MARKER.SIZE}
                                refX={EQUILATERAL_MARKER.SIZE}
                                refY={EQUILATERAL_MARKER.SIZE / 2} 
                                orient="auto"
                                markerUnits="userSpaceOnUse"
                                viewBox="0 0 EQUILATERAL_MARKER.SIZE EQUILATERAL_MARKER.SIZE"
                                strokeWidth={connectionPathStroke}
                            >
                                <circle 
                                    cx={EQUILATERAL_MARKER.SIZE / 2} 
                                    cy={EQUILATERAL_MARKER.SIZE / 2} 
                                    r={EQUILATERAL_MARKER.SIZE / 2 - 1} 
                                    fill={connectionPathColor} 
                                    stroke={connectionPathColor}
                                />
                            </marker>
                            {/* 四角形マーカー */}
                            <marker 
                                id="squaremarker" 
                                markerWidth={EQUILATERAL_MARKER.SIZE}
                                markerHeight={EQUILATERAL_MARKER.SIZE}
                                refX={EQUILATERAL_MARKER.SIZE}
                                refY={EQUILATERAL_MARKER.SIZE / 2}
                                orient="auto"
                                markerUnits="userSpaceOnUse"
                                viewBox="0 0 EQUILATERAL_MARKER.SIZE EQUILATERAL_MARKER.SIZE"
                                strokeWidth={connectionPathStroke}
                            >
                                <rect 
                                    x="1" 
                                    y="1" 
                                    width={EQUILATERAL_MARKER.SIZE - 2} 
                                    height={EQUILATERAL_MARKER.SIZE - 2} 
                                    fill="none" 
                                    stroke={connectionPathColor}
                                />
                            </marker>
                            {/* Filled 四角形マーカー */}
                            <marker 
                                id="filledsquaremarker" 
                                markerWidth={EQUILATERAL_MARKER.SIZE}
                                markerHeight={EQUILATERAL_MARKER.SIZE}
                                refX={EQUILATERAL_MARKER.SIZE}
                                refY={EQUILATERAL_MARKER.SIZE / 2}
                                orient="auto"
                                markerUnits="userSpaceOnUse"
                                viewBox="0 0 EQUILATERAL_MARKER.SIZE EQUILATERAL_MARKER.SIZE"
                                strokeWidth={connectionPathStroke}
                            >
                                <rect 
                                    x="1" 
                                    y="1" 
                                    width={EQUILATERAL_MARKER.SIZE - 2} 
                                    height={EQUILATERAL_MARKER.SIZE - 2} 
                                    fill={connectionPathColor} 
                                    stroke={connectionPathColor}
                                />
                            </marker>
                            {/* ダイヤモンドマーカー */}
                            <marker 
                                id="diamondmarker" 
                                markerWidth={MARKER.WIDTH} 
                                markerHeight={MARKER.HEIGHT} 
                                refX={MARKER.WIDTH} 
                                refY={MARKER.HEIGHT / 2} 
                                orient="auto"
                                markerUnits="userSpaceOnUse"
                                viewBox="0 0 MARKER.WIDTH MARKER.HEIGHT"
                                strokeWidth={connectionPathStroke}
                            >
                                <polygon 
                                    points={`${MARKER.WIDTH / 2},1 ${MARKER.WIDTH - 1},${MARKER.HEIGHT / 2} ${MARKER.WIDTH / 2},${MARKER.HEIGHT - 1} 1,${MARKER.HEIGHT / 2}`} 
                                    fill="none" 
                                    stroke={connectionPathColor} 
                                    // strokeWidth="1" 
                                />
                            </marker>
                            {/* Filled ダイヤモンドマーカー */}
                            <marker 
                                id="filleddiamondmarker" 
                                markerWidth={MARKER.WIDTH} 
                                markerHeight={MARKER.HEIGHT} 
                                refX={MARKER.WIDTH} 
                                refY={MARKER.HEIGHT / 2} 
                                orient="auto"
                                markerUnits="userSpaceOnUse"
                                viewBox="0 0 MARKER.WIDTH MARKER.HEIGHT"
                                strokeWidth={connectionPathStroke}
                            >
                                <polygon 
                                    points={`${MARKER.WIDTH / 2},1 ${MARKER.WIDTH - 1},${MARKER.HEIGHT / 2} ${MARKER.WIDTH / 2},${MARKER.HEIGHT - 1} 1,${MARKER.HEIGHT / 2}`} 
                                    fill={connectionPathColor} 
                                    stroke={connectionPathColor} 
                                    // strokeWidth="1" 
                                />
                            </marker>
                        </defs>
                        
                        {/* Render main elements */}
                        {renderElements()}

                        {/* 通常の接続線 */}
                        {Object.values(elements)
                            .filter((element): element is CanvasElement => element.visible && !!element.parentId)
                            .map(element => {
                                const parent = state.elements[element.parentId!];
                                // ドラッグ中の要素またはその子孫要素の接続パスは非表示にする
                                if (draggingElement && (element.id === draggingElement.id || isDescendant(state.elements, draggingElement.id, element.id))) {
                                    return null;
                                }
                                return renderConnectionPath(parent, element, connectionPathColor, connectionPathStroke);
                            })}

                        {/* ドラッグプレビュー用の接続パス */}
                        {currentDropTarget && draggingElement && (
                            (() => {
                                const newParent = dropPosition === 'child'
                                    ? currentDropTarget
                                    : currentDropTarget.parentId
                                        ? state.elements[currentDropTarget.parentId]
                                        : null;

                                const draggingPos = state.elements[draggingElement.id];

                                return newParent && draggingPos && renderConnectionPath(
                                    newParent,
                                    draggingPos,
                                    CONNECTION_PATH_STYLE.DRAGGING_COLOR,
                                    CONNECTION_PATH_STYLE.STROKE
                                );
                            })()
                        )}
                        
                        {/* Always render popup menus and debug info at the end so they appear on top */}
                        {renderPopupMenus()}
                        {renderDebugInfo()}
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