// src/components/CanvasArea.tsx
import React, { useRef, useState, useEffect } from 'react';
import IdeaElement from './IdeaElement';
import QuickMenuBar from './QuickMenuBar';
import InputFields from './InputFields';
import ModalWindow from './ModalWindow';
import useResizeEffect from '../hooks/useResizeEffect';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import { useCanvas } from '../context/CanvasContext';
import { Marker } from './Marker';
import { keyActionMap } from '../constants/KeyActionMap';
import { useClickOutside } from '../hooks/useClickOutside';
import { useElementDragEffect } from '../hooks/useElementDragEffect';
import { loadFromLocalStorage } from '../state/undoredo';
import { saveSvg, loadElements, saveElements } from '../utils/FileHelpers';
import { helpContent } from '../constants/HelpContent';
import { ICONBAR_HEIGHT } from '../constants/ElementSettings';
import { Element } from '../types';

interface Toast {
    id: string;
    message: string;
}

const CanvasArea: React.FC = () => {
    const svgRef = useRef<SVGSVGElement>(null);
    const { state, dispatch } = useCanvas();
    const [displayScopeSize, setCanvasSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });
    const [displayArea, setDisplayArea] = useState(
        `0 0 ${displayScopeSize.width} ${displayScopeSize.height - ICONBAR_HEIGHT}`
    );
    const [isHelpOpen, setHelpOpen] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const toggleHelp = () => setHelpOpen(!isHelpOpen);
    const editingNode = Object.values(state.elements).find((element) => (element as Element).editing) as Element | undefined;

    useEffect(() => {
        const elementList = loadFromLocalStorage();
        if (elementList) dispatch({ type: 'LOAD_NODES', payload: elementList });
    }, [dispatch]);

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
            <QuickMenuBar
                saveSvg={() => saveSvg(svgRef.current!, 'download.svg')}
                loadElements={(event) => loadElements(event.nativeEvent)
                    .then(elements => dispatch({ type: 'LOAD_NODES', payload: elements }))
                    .catch(alert)}
                saveElements={() => saveElements(Object.values(state.elements))}
                toggleHelp={toggleHelp}
            />

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

            <div style={{ position: 'absolute', top: ICONBAR_HEIGHT, left: 0, overflow: 'auto' }}>
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
                    <Marker />
                    {Object.values(state.elements)
                        .filter((element): element is Element => (element as Element).visible)
                        .map(element => {
                            const hasHiddenChildren = Object.values(state.elements)
                                .some((n): n is Element => (n as Element).parentId === element.id && !(n as Element).visible);
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
                                    {hasHiddenChildren && (
                                        <g
                                            transform={`translate(${element.x + element.width * 1.05},${element.y})`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                dispatch({ type: 'SELECT_NODE', payload: element.id });
                                                dispatch({ type: 'EXPAND_NODE' });
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
                                                    style={{
                                                        width: '100%',
                                                        height: '100%'
                                                    }}
                                                />
                                            </svg>
                                        </g>
                                    )}
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