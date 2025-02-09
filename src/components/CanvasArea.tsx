import React, { useRef, useState, useEffect } from 'react';
import { useCanvas } from '../context/CanvasContext';
import IdeaElement from './IdeaElement';
import { Marker } from './Marker';
import QuickMenuBar from './QuickMenuBar';
import InputFields from './InputFields';
import useResizeEffect from '../hooks/useResizeEffect';
import { useClickOutside } from '../hooks/useClickOutside';
import { useNodeDragEffect } from '../hooks/useNodeDragEffect';
import { loadFromLocalStorage } from '../state/undoredo';
import { saveSvg, loadNodes, saveNodes } from '../utils/FileHelpers';
import FoldingIcon from './FoldingIcon';
import ModalWindow from './ModalWindow';
import { helpContent } from '../constants/HelpContent';
import {
    ICONBAR_HEIGHT,
  } from '../constants/NodeSettings';

const CanvasArea = () => {
    const svgRef = useRef();
    const { state, dispatch } = useCanvas();
    const [displayScopeSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [displayArea, setDisplayArea] = useState(`0 0 ${displayScopeSize.width} ${displayScopeSize.height - ICONBAR_HEIGHT}`);
    const [isHelpOpen, setHelpOpen] = useState(false);

    const toggleHelp = () => setHelpOpen(!isHelpOpen);
    const editingNode = Object.values(state.elements).find(element => element.editing);

    useEffect(() => {
        const elementList = loadFromLocalStorage();
        if (elementList) dispatch({ type: 'LOAD_NODES', payload: elementList });
    }, [dispatch]);

    useResizeEffect({ setCanvasSize, setDisplayArea, state });
    useClickOutside(svgRef, editingNode);
    const { handleMouseDown, handleMouseUp, overDropTarget } = useNodeDragEffect();

    const handleKeyDown = (e) => {
        e.preventDefault();
        const keyCombo = `${e.ctrlKey || e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
        const keyActionMap = {
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
        if (keyActionMap[keyCombo]) dispatch({ type: keyActionMap[keyCombo] });
    };

    return (
        <>
            <QuickMenuBar
                saveSvg={() => saveSvg(svgRef.current, 'download.svg')}
                loadNodes={(event) => loadNodes(event).then(elements => dispatch({ type: 'LOAD_NODES', payload: elements })).catch(alert)}
                saveNodes={() => saveNodes(Object.values(state.elements))}
                toggleHelp={toggleHelp}
            />

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
                    tabIndex="0"
                    onKeyDown={handleKeyDown}
                    style={{ outline: 'none' }}
                    className="svg-element"
                >
                    <Marker />
                    {Object.values(state.elements)
                        .filter(element => element.visible)
                        .map(element => {
                            const hasHiddenChildren = Object.values(state.elements)
                              .some(n => n.parentId === element.id && !n.visible);
                            return (
                            <React.Fragment key={element.id}>
                                <IdeaElement
                                    element={element}
                                    overDropTarget={overDropTarget}
                                    handleMouseDown={handleMouseDown}
                                    handleMouseUp={handleMouseUp}
                                />
                                {hasHiddenChildren && <FoldingIcon element={element} />}
                            </React.Fragment>
                            )
                        }
                    )}
                </svg>

                <InputFields element={editingNode} />
            </div>
        </>
    );
};

export default React.memo(CanvasArea);