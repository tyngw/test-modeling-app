// src/components/canvasArea.tsx
import React, { useRef, useState, useEffect, useCallback } from 'react';
import IdeaElement from './ideaElement';
import InputFields from './inputFields';
import ModalWindow from './modalWindow';
import useResizeEffect from '../hooks/useResizeEffect';
import { useCanvas } from '../context/canvasContext';
import { Marker } from './marker';
import { keyActionMap } from '../constants/keyActionMap';
import { useClickOutside } from '../hooks/useClickOutside';
import { useElementDragEffect } from '../hooks/useElementDragEffect';
import { helpContent } from '../constants/helpContent';
import { ICONBAR_HEIGHT, HEADER_HEIGHT } from '../constants/elementSettings';
import { Element } from '../types';

interface CanvasAreaProps {
    isHelpOpen: boolean;
    toggleHelp: () => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ isHelpOpen, toggleHelp }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { state, dispatch } = useCanvas();
    const { elements, zoomRatio } = state;
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
    const editingNode = Object.values(elements).find((element) => (element as Element).editing) as Element | undefined;

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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        const keyCombo = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
        const actionType = keyActionMap[keyCombo];
        if (actionType) dispatch({ type: actionType });
    };

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

    return (
        <>
            <div style={{
                position: 'absolute',
                top: HEADER_HEIGHT,
                left: 0,
                overflow: 'auto',
                touchAction: isPinching ? 'none' : 'pan-y'
            }}>
                <ModalWindow isOpen={isHelpOpen} onClose={toggleHelp}>
                    <div dangerouslySetInnerHTML={{ __html: helpContent }} />
                </ModalWindow>
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
                        touchAction: isPinching ? 'none' : 'pan-y',
                        userSelect: 'none',
                        WebkitUserSelect: 'none'
                    }}
                    className="svg-element"
                >
                    {Object.values(elements)
                        .filter((element): element is Element => element.visible)
                        .map(element => (
                            <React.Fragment key={element.id}>
                                <IdeaElement
                                    element={element}
                                    currentDropTarget={currentDropTarget as Element | null}
                                    dropPosition={dropPosition}
                                    draggingElement={draggingElement}
                                    handleMouseDown={handleMouseDown as unknown as (e: React.MouseEvent<SVGElement>, element: Element) => void}
                                    handleMouseUp={handleMouseUp}
                                />
                            </React.Fragment>
                        ))}
                </svg>
                <InputFields
                    element={editingNode as Element | undefined}
                    onEndEditing={() => svgRef.current?.focus()}
                />
            </div>
        </>
    );
};

export default React.memo(CanvasArea);