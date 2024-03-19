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

const ViewBox = () => {
    const svgRef = useRef();
    const { state, dispatch } = useStore();

    const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [viewBox, setViewBox] = useState(`0 0 ${canvasSize.width} ${canvasSize.height}`);

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

    const ZoomInViewBox = () => {
        dispatch({ type: 'ZOOM_IN' });
    };

    const ZoomOutViewBox = () => {
        dispatch({ type: 'ZOOM_OUT' });
    };

    useResizeEffect({ setCanvasSize, setViewBox, state });

    useClickOutside(svgRef, dispatch, editingNode, endEditing);

    const { handleMouseDown, handleMouseUp, overDropTarget } = useNodeDragEffect(state, dispatch);

    const handleDoubleClick = useCallback((id) => {
        dispatch({ type: 'EDIT_NODE', payload: id });
    }, [dispatch]);

    const handleUndo = () => {
        dispatch({ type: 'UNDO', payload: state.nodes });
    };

    const handleRedo = () => {
        dispatch({ type: 'REDO', payload: state.nodes });
    };

    const handleNewFile = () => {
        dispatch({ type: 'NEW' });
    };

    const handleFileSelect = (event) => {
        loadNodes(event)
            .then(nodes => {
                dispatch({ type: 'LOAD_NODES', payload: nodes });
            })
            .catch(error => {
                console.error(error);
            });
    };

    const keyActionMap = {
        'z': { 
            true: { shift: false, action: 'UNDO' },
            false: { shift: true, action: 'REDO' }
        },
        'ArrowUp': { 
            false: { shift: false, action: 'ARROW_UP' }
        },
        'ArrowDown': {
            false: { shift: false, action: 'ARROW_DOWN' }
        },
        'ArrowRight': { 
            false: { shift: false, action: 'ARROW_RIGHT' },
            true: { shift: false, action: 'EXPAND_NODE'}
        },
        'ArrowLeft': {
            false: { shift: false, action: 'ARROW_LEFT' },
            true: { shift: false, action: 'COLLAPSE_NODE' }
        },
        'x': { true: { shift: false, action: 'CUT_NODE' } },
        'c': { true: { shift: false, action: 'COPY_NODE' } },
        'v': { true: { shift: false, action: 'PASTE_NODE' } },
        'Tab': { false: { shift: false, action: 'ADD_NODE' } },
        'Delete': { false: { shift: false, action: 'DELETE_NODE' } },
        'Backspace': { false: { shift: false, action: 'DELETE_NODE' } },
        'Enter': { false: { shift: false, action: 'EDIT_NODE', payload: { editingField: 'text' } } },
        
    };

    const handleKeyDown = (e) => {
        e.preventDefault();
        const keyAction = keyActionMap[e.key] && keyActionMap[e.key][e.ctrlKey || e.metaKey];
        if (keyAction && keyAction.shift === e.shiftKey) {
            dispatch({ type: keyAction.action, payload: keyAction.payload });
        }
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
                handleNewFile={handleNewFile}
                handleUndo={handleUndo}
                handleRedo={handleRedo}
                ZoomInViewBox={ZoomInViewBox}
                ZoomOutViewBox={ZoomOutViewBox}
                saveSvg={() => saveSvg(svgRef.current, 'download.svg')}
                loadNodes={handleFileSelect}
                saveNodes={() => saveNodes(state.nodes)}
            />
            <div style={{ position: 'absolute', top: 0, left: 0, overflow: 'auto', }}>
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
                                    node={node}
                                    selectNode={selectNode}
                                    nodes={state.nodes}
                                    handleMouseUp={handleMouseUp}
                                    handleMouseDown={handleMouseDown}
                                    handleDoubleClick={handleDoubleClick}
                                    overDropTarget={overDropTarget}
                                    updateNodeSize={updateNodeSize}
                                    zoomRatio={state.zoomRatio}
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