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
import { saveSvg, saveNodes } from '../utils/FileHelpers';
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

    // 編集モードを終了する
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

    const loadNodes = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                const contents = e.target.result;
                try {
                    const nodes = JSON.parse(contents);
                    dispatch({ type: 'LOAD_NODES', payload: nodes });
                } catch (error) {
                    alert('Error: JSON形式のファイルを選択してください');
                }
            };
            reader.readAsText(file);
        }
        event.target.value = null;
    }

    const keyActionMap = {
        'z': { ctrl: true, action: 'UNDO' },
        'z': { ctrl: true, shift: true, action: 'REDO' },
        'ArrowRight': { ctrl: true, action: 'EXPAND_NODE' },
        'ArrowLeft': { ctrl: true, action: 'COLLAPSE_NODE' },
        'x': { ctrl: true, action: 'CUT_NODE' },
        'c': { ctrl: true, action: 'COPY_NODE' },
        'v': { ctrl: true, action: 'PASTE_NODE' },
        'Tab': { action: 'ADD_NODE' },
        'Delete': { action: 'DELETE_NODE' },
        'Backspace': { action: 'DELETE_NODE' },
        'Enter': { action: 'EDIT_NODE', payload: { editingField: 'text' } },
        'ArrowUp': { action: 'ARROW_UP' },
        'ArrowDown': { action: 'ARROW_DOWN' },
        'ArrowRight': { action: 'ARROW_RIGHT' },
        'ArrowLeft': { action: 'ARROW_LEFT' }
    };

    const handleKeyDown = (e) => {
        const keyAction = keyActionMap[e.key];
        if (keyAction && keyAction.ctrl === e.ctrlKey && keyAction.shift === e.shiftKey) {
            e.preventDefault();
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
                loadNodes={loadNodes}
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
                <InputFields node={editingNode} updateText={updateText} endEditing={endEditing} zoomRatio={state.zoomRatio} />
            </div>
        </>

    );
}

export default ViewBox;