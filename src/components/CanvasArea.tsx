// src/components/CanvasArea.tsx
import React, { useRef, useState, useEffect } from 'react';
import IdeaElement from './IdeaElement';
import InputFields from './InputFields';
import ModalWindow from './ModalWindow';
import useResizeEffect from '../hooks/useResizeEffect';
import { useCanvas } from '../context/CanvasContext';
import { Marker } from './Marker';
import { keyActionMap } from '../constants/KeyActionMap';
import { useClickOutside } from '../hooks/useClickOutside';
import { useElementDragEffect } from '../hooks/useElementDragEffect';
import { helpContent } from '../constants/HelpContent';
import { ICONBAR_HEIGHT, HEADER_HEIGHT } from '../constants/ElementSettings';
import { Element } from '../types';

interface Toast {
    id: string;
    message: string;
}

interface CanvasAreaProps {
    isHelpOpen: boolean;
    toggleHelp: () => void;
}

const CanvasArea: React.FC<CanvasAreaProps> = ({ isHelpOpen, toggleHelp }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { state, dispatch } = useCanvas();
    const [displayScopeSize, setCanvasSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });
    const [displayArea, setDisplayArea] = useState(
        `0 0 ${displayScopeSize.width} ${displayScopeSize.height - ICONBAR_HEIGHT}`
    );
    const [toasts, setToasts] = useState<Toast[]>([]);
    const editingNode = Object.values(state.elements).find((element) => (element as Element).editing) as Element | undefined;

    useEffect(() => {
        if (!editingNode) {
            svgRef.current?.focus();
        }
    }, [editingNode]);

    useResizeEffect({ setCanvasSize, setDisplayArea, state });
    useClickOutside(svgRef, !!editingNode);

    const addToast = (message: string) => {
        const id = new Date().getTime().toString() + Math.random().toString();
        const newToast: Toast = { id, message };
        setToasts(prevToasts => {
            // 既に表示されているトーストが5つ以上なら最古のものを削除
            const updatedToasts = [...prevToasts, newToast];
            if (updatedToasts.length > 5) {
                updatedToasts.shift();
            }
            return updatedToasts;
        });
        // 3秒後に自動でトーストを非表示にする
        setTimeout(() => {
            setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
        }, 3000);
    };

    const {
        handleMouseDown,
        handleMouseUp,
        currentDropTarget,
        dropPosition,
        draggingElement
    } = useElementDragEffect({ showToast: addToast });

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        const keyCombo = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
        const actionType = keyActionMap[keyCombo];
        if (actionType) dispatch({ type: actionType });
    };

    return (
        <>
            {toasts.map((toast, index) => (
                <div
                    key={toast.id}
                    style={{
                        position: 'fixed',
                        bottom: `${20 + index * 60}px`, // 各トーストごとに60pxずつ下方向へずらす
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(255, 100, 100, 0.9)',
                        color: 'white',
                        padding: '10px 20px',
                        borderRadius: '10px',
                        transition: 'opacity 0.5s',
                        opacity: 1,
                        pointerEvents: 'none',
                        zIndex: 1000,
                    }}
                >
                    {toast.message}
                </div>
            ))}

            <div style={{
                position: 'absolute',
                top: HEADER_HEIGHT,
                left: 0,
                overflow: 'auto'
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
                    style={{ outline: 'none' }}
                    className="svg-element"
                >
                    {/* <Marker /> */}
                    {Object.values(state.elements)
                        .filter((element): element is Element => element.visible)
                        .map(element => {
                            return (
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
                            );
                        })}
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