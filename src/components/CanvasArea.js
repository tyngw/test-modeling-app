// src/components/CanvasArea.js
import React, { useRef, useState, useCallback, useEffect } from 'react';
import IdeaElement from './IdeaElement';
import { Marker } from './Marker';
import QuickMenuBar from './QuickMenuBar';
import InputFields from './InputFields';
import { useStore } from '../state/state';
import useResizeEffect from '../hooks/useResizeEffect';
import { useNodeDragEffect } from '../hooks/useNodeDragEffect';
import { useClickOutside } from '../hooks/useClickOutside';
import { loadFromLocalStorage } from '../state/undoredo';
import { saveSvg, loadNodes, saveNodes } from '../utils/FileHelpers';
import FoldingIcon from './FoldingIcon';
import CustomWindow from './CustomWindow';
import { helpContent } from '../constants/HelpContent';
import {
    ICONBAR_HEIGHT,
  } from '../constants/NodeSettings';

const CanvasArea = () => {
    const svgRef = useRef();
    const { state, dispatch } = useStore();

    const [displayScopeSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [displayArea, setDisplayArea] = useState(`0 0 ${displayScopeSize.width} ${displayScopeSize.height  - ICONBAR_HEIGHT}`);

    const [isHelpOpen, setHelpOpen] = useState(false);
    const toggleHelp = () => setHelpOpen(!isHelpOpen);

    const editingNode = Object.values(state.nodes).find(node => node.editing);

    const updateText = (text, field) => {
        if (!editingNode) return;
        dispatch({ type: 'UPDATE_TEXT', payload: { id: editingNode.id, field, value: text } });
    };

    useEffect(() => {
        const nodeList = loadFromLocalStorage();
        if (nodeList) dispatch({ type: 'LOAD_NODES', payload: nodeList });
    }, [dispatch]);

    const endEditing = () => {
        dispatch({ type: 'END_EDITING' });
        svgRef.current.focus();
    };

    useResizeEffect({ setCanvasSize, setDisplayArea, state });
    useClickOutside(svgRef, dispatch, editingNode, endEditing);
    const { handleMouseDown, handleMouseUp, overDropTarget } = useNodeDragEffect(state, dispatch);

    const handleDoubleClick = useCallback(() => dispatch({ type: 'EDIT_NODE' }), [dispatch]);
    const handleButtonClick = useCallback(action => dispatch({ type: action }), [dispatch]);
    const selectNode = useCallback(id => dispatch({ type: 'SELECT_NODE', payload: id }), [dispatch]);

    const handleFileSelect = event => {
        loadNodes(event)
            .then(nodes => dispatch({ type: 'LOAD_NODES', payload: nodes }))
            .catch(alert);
    };

    const keyActionMap = {
        'Ctrl+z': 'UNDO', 'Ctrl+Shift+z': 'REDO', 'ArrowUp': 'ARROW_UP', 
        'ArrowDown': 'ARROW_DOWN', 'ArrowRight': 'ARROW_RIGHT', 'Ctrl+ArrowRight': 'EXPAND_NODE',
        'ArrowLeft': 'ARROW_LEFT', 'Ctrl+ArrowLeft': 'COLLAPSE_NODE', 'Ctrl+x': 'CUT_NODE',
        'Ctrl+c': 'COPY_NODE', 'Ctrl+v': 'PASTE_NODE', 'Tab': 'ADD_NODE', 
        'Delete': 'DELETE_NODE', 'Backspace': 'DELETE_NODE', 'Enter': 'EDIT_NODE'
    };

    const handleKeyDown = e => {
        e.preventDefault();
        const keyCombo = `${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;
        if (keyActionMap[keyCombo]) dispatch({ type: keyActionMap[keyCombo] });
    };

    const updateNodeSize = useCallback((id, width, height, { sectionHeights }) => {
        dispatch({ type: 'UPDATE_NODE_SIZE', payload: { id, width, height, sectionHeights } });
    }, [dispatch]);

    return (
        <>
            <QuickMenuBar
                handleButtonClick={handleButtonClick}
                saveSvg={() => saveSvg(svgRef.current, 'download.svg')}
                loadNodes={handleFileSelect}
                saveNodes={() => saveNodes(Object.values(state.nodes))}
                toggleHelp={toggleHelp}
            />

            <div style={{ position: 'absolute', top: ICONBAR_HEIGHT, left: 0, overflow: 'auto' }}>
                <CustomWindow isOpen={isHelpOpen} onClose={toggleHelp}>
                    <div dangerouslySetInnerHTML={{ __html: helpContent }} />
                </CustomWindow>

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
                    {Object.values(state.nodes)
                        .filter(node => node.visible)
                        .map(node => {
                            const hasHiddenChildren = Object.values(state.nodes)
                                .some(n => n.parentId === node.id && !n.visible);
                            return (
                                <React.Fragment key={node.id}>
                                    <IdeaElement
                                        elements={state.nodes}
                                        element={node}
                                        zoomRatio={state.zoomRatio}
                                        selectNode={selectNode}
                                        handleMouseUp={handleMouseUp}
                                        handleMouseDown={handleMouseDown}
                                        handleDoubleClick={handleDoubleClick}
                                        overDropTarget={overDropTarget}
                                        updateNodeSize={updateNodeSize}
                                    />
                                    {hasHiddenChildren && <FoldingIcon node={node} />}
                                </React.Fragment>
                            );
                        })}
                </svg>

                <InputFields
                    node={editingNode}
                    updateText={updateText}
                    endEditing={endEditing}
                    zoomRatio={state.zoomRatio}
                />
            </div>
        </>
    );
};

export default React.memo(CanvasArea);