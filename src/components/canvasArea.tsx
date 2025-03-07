// src/components/canvasArea.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import IdeaElement from './ideaElement';
import InputFields from './inputFields';
import useResizeEffect from '../hooks/useResizeEffect';
import { useCanvas } from '../context/canvasContext';
import { Marker } from './marker';
import { keyActionMap } from '../constants/keyActionMap';
import { useClickOutside } from '../hooks/useClickOutside';
import { useElementDragEffect } from '../hooks/useElementDragEffect';
import { ICONBAR_HEIGHT, HEADER_HEIGHT, CONNECTION_PATH_STYLE, CURVE_CONTROL_OFFSET, ARROW } from '../constants/elementSettings';
import { Element as CanvasElement } from '../types';
import { isDescendant } from '../state/state';
import { useToast } from '../context/toastContext';
import { ToastMessages } from '../constants/toastMessages';

interface CanvasAreaProps {
    isHelpOpen: boolean;
    toggleHelp: () => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ isHelpOpen, toggleHelp }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { state, dispatch } = useCanvas();
    const { elements, zoomRatio } = state;
    const { addToast } = useToast();
    const [displayScopeSize, setCanvasSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });
    const [displayArea, setDisplayArea] = useState(
        `0 0 ${displayScopeSize.width} ${displayScopeSize.height - ICONBAR_HEIGHT}`
    );
    const [isPinching, setIsPinching] = useState(false);
    const [initialPinchDistance, setInitialPinchDistance] = useState(0);
    const [initialScroll, setInitialScroll] = useState({ x: 0, y: 0 });
    const editingNode = Object.values(elements).find((element) => (element as CanvasElement).editing) as CanvasElement | undefined;

    useEffect(() => {
        if (!editingNode) svgRef.current?.focus();
    }, [editingNode]);

    useResizeEffect({ setCanvasSize, setDisplayArea, state });
    useClickOutside(svgRef, !!editingNode);

    const {
        handleMouseDown,
        handleMouseUp,
        currentDropTarget,
        dropPosition,
        draggingElement
    } = useElementDragEffect();

  const handleKeyDown = useCallback(async (e: React.KeyboardEvent) => { // asyncに変更
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
        const totalHeight = element.height;
        const pathCommands = [
            `M ${parentElement.x + parentElement.width + ARROW.OFFSET},${parentElement.y + parentElement.height / 2}`,
            `C ${parentElement.x + parentElement.width + CURVE_CONTROL_OFFSET},${parentElement.y + parentElement.height / 2}`,
            `${element.x - CURVE_CONTROL_OFFSET},${element.y + totalHeight / 2}`,
            `${element.x},${element.y + totalHeight / 2}`
        ].join(' ');
        return (
            <path
                d={pathCommands}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                fill="none"
                markerStart="url(#arrowhead)"
            />
        );
    };

    return (
        <>
            <div style={{
                position: 'absolute',
                top: HEADER_HEIGHT,
                left: 0,
                overflow: 'auto',
                touchAction: isPinching ? 'none' : 'manipulation'
            }}>
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
                        WebkitUserSelect: 'none'
                    }}
                    className="svg-element"
                >
                    {Object.values(elements)
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
                                />
                            </React.Fragment>
                        ))}

                    {/* 通常の接続線 */}
                    {Object.values(elements)
                        .filter((element): element is CanvasElement => element.visible && !!element.parentId)
                        .map(element => {
                            const parent = state.elements[element.parentId!];
                            // ドラッグ中の要素またはその子孫要素の接続パスは非表示にする
                            if (draggingElement && (element.id === draggingElement.id || isDescendant(state.elements, draggingElement.id, element.id))) {
                                return null;
                            }
                            return renderConnectionPath(parent, element);
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
                </svg>
                <InputFields
                    element={editingNode as CanvasElement | undefined}
                    onEndEditing={() => svgRef.current?.focus()}
                />
            </div>
        </>
    );
};

export default React.memo(CanvasArea);