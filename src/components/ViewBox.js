// src/components/ViewBox.js
import React, { useRef, useState, useCallback, useEffect } from 'react';
import Node from './Node';
import { Marker } from './Marker';
import IconBar from './IconBar';
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

const ViewBox = () => {
    const svgRef = useRef();
    const { state, dispatch } = useStore();

    const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [viewBox, setViewBox] = useState(`0 0 ${canvasSize.width} ${canvasSize.height}`);

    const [isHelpOpen, setHelpOpen] = useState(false);

    const toggleHelp = () => {
        setHelpOpen(!isHelpOpen);
    };

    const editingNode = state.nodes.find((node) => node.editing);

    const updateText = (text, field) => {
        console.log(`[updateText] field: ${field} text: ${text}`);
        dispatch({ type: 'UPDATE_TEXT', payload: { id: editingNode.id, field: field, value: text } });

    };

    useEffect(() => {
        const nodeList = loadFromLocalStorage();
        if (nodeList) {
            dispatch({ type: 'LOAD_NODES', payload: nodeList });
        }
    }, []);

    const endEditing = () => {
        dispatch({ type: 'END_EDITING' });
        svgRef.current.focus();
    };

    useResizeEffect({ setCanvasSize, setViewBox, state });

    useClickOutside(svgRef, dispatch, editingNode, endEditing);

    const { handleMouseDown, handleMouseUp, overDropTarget } = useNodeDragEffect(state, dispatch);

    const handleDoubleClick = useCallback((id) => {
        dispatch({ type: 'EDIT_NODE' });
    }, [dispatch]);

    const handleFileSelect = (event) => {
        loadNodes(event)
            .then(nodes => {
                dispatch({ type: 'LOAD_NODES', payload: nodes });
            })
            .catch(error => {
                alert(error);
            });
    };

    const keyActionMap = {
        'Ctrl+z': { action: 'UNDO' },
        'Ctrl+Shift+z': { action: 'REDO' },
        'ArrowUp': { action: 'ARROW_UP' },
        'ArrowDown': { action: 'ARROW_DOWN' },
        'ArrowRight': { action: 'ARROW_RIGHT' },
        'Ctrl+ArrowRight': { action: 'EXPAND_NODE' },
        'ArrowLeft': { action: 'ARROW_LEFT' },
        'Ctrl+ArrowLeft': { action: 'COLLAPSE_NODE' },
        'Ctrl+x': { action: 'CUT_NODE' },
        'Ctrl+c': { action: 'COPY_NODE' },
        'Ctrl+v': { action: 'PASTE_NODE' },
        'Tab': { action: 'ADD_NODE' },
        'Delete': { action: 'DELETE_NODE' },
        'Backspace': { action: 'DELETE_NODE' },
        'Enter': { action: 'EDIT_NODE', payload: { editingField: 'text' } },
    };

    const handleKeyDown = (e) => {
        e.preventDefault();
        const keyName = `${e.ctrlKey ? 'Ctrl+' : ''}${e.metaKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`;

        const keyAction = keyActionMap[keyName];
        if (keyAction) {
            dispatch({ type: keyAction.action, payload: keyAction.payload });
        }
    };

    const handleButtonClick = (action) => {
        dispatch({ type: action });
    };

    const selectNode = useCallback((id) => {
        dispatch({ type: 'SELECT_NODE', payload: id });
    }, [dispatch]);

    const updateNodeSize = useCallback((id, width, height) => {
        dispatch({ type: 'UPDATE_NODE_SIZE', payload: { id, width, height } });
    }, [dispatch]);

    return (
        <>
            <IconBar
                handleButtonClick={handleButtonClick}
                saveSvg={() => saveSvg(svgRef.current, 'download.svg')}
                loadNodes={handleFileSelect}
                saveNodes={() => saveNodes(state.nodes)}
                toggleHelp={toggleHelp}
            />
            <div style={{ position: 'absolute', top: 0, left: 0, overflow: 'auto', }}>
                <CustomWindow isOpen={isHelpOpen} onClose={toggleHelp}>
                    <div dangerouslySetInnerHTML={{ __html: helpContent }} />
                </CustomWindow>
                <svg
                    ref={svgRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    viewBox={viewBox}
                    tabIndex="0"
                    onKeyDown={(e) => handleKeyDown(e)}
                    style={{ outline: 'none' }}
                    className="svg-element"
                >
                    <Marker />
                    {state.nodes.filter(node => node.visible).map(node => {
                        // node.idをparentIdとして持つノードのうち、visibleがfalseのものがあるかどうか
                        const hasHiddenChildren = state.nodes.some(n => n.parentId === node.id && !n.visible);
                        return (
                            <>
                                <Node
                                    key={node.id}
                                    nodes={state.nodes}
                                    node={node}
                                    zoomRatio={state.zoomRatio}
                                    selectNode={selectNode}
                                    handleMouseUp={handleMouseUp}
                                    handleMouseDown={handleMouseDown}
                                    handleDoubleClick={handleDoubleClick}
                                    overDropTarget={overDropTarget}
                                    updateNodeSize={updateNodeSize}
                                />
                                {hasHiddenChildren && <FoldingIcon node={node} />}
                            </>
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
}

export default ViewBox;