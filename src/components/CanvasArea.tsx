// src/components/CanvasArea.tsx
import React, { useRef, useState, useEffect } from 'react';
import { useCanvas } from '../context/CanvasContext';
import IdeaElement from './IdeaElement';
import { Marker } from './Marker';
import QuickMenuBar from './QuickMenuBar';
import InputFields from './InputFields';
import useResizeEffect from '../hooks/useResizeEffect';
import { useClickOutside } from '../hooks/useClickOutside';
import { useElementDragEffect } from '../hooks/useElementDragEffect';
import { loadFromLocalStorage } from '../state/undoredo';
import { saveSvg, loadElements, saveElements } from '../utils/FileHelpers';
import FoldingIcon from './FoldingIcon';
import ModalWindow from './ModalWindow';
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

    const { handleMouseDown, handleMouseUp, overDropTarget } = useElementDragEffect({ showToast: addToast });

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        const keyCombo = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
        const keyActionMap: { [key: string]: string } = {
            'Ctrl+z': 'UNDO',
            'Ctrl+Shift+z': 'REDO',
            'ArrowUp': 'ARROW_UP',
            'ArrowDown': 'ARROW_DOWN',
            'ArrowRight': 'ARROW_RIGHT',
            'Ctrl+ArrowRight': 'EXPAND_NODE',
            'ArrowLeft': 'ARROW_LEFT',
            'Ctrl+ArrowLeft': 'COLLAPSE_NODE',
            'Ctrl+x': 'CUT_NODE',
            'Ctrl+c': 'COPY_NODE',
            'Ctrl+v': 'PASTE_NODE',
            'Tab': 'ADD_NODE',
            'Delete': 'DELETE_NODE',
            'Backspace': 'DELETE_NODE',
            'Enter': 'EDIT_NODE'
        };
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
                                        overDropTarget={overDropTarget as Element | null}
                                        handleMouseDown={handleMouseDown as unknown as (e: React.MouseEvent<SVGElement>, element: Element) => void}
                                        handleMouseUp={handleMouseUp}
                                    />
                                    {hasHiddenChildren && <FoldingIcon element={element} />}
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