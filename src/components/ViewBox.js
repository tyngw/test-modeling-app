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
    }, [dispatch]);

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

    const handleKeyAction = (e, actionType, payload) => {
        e.preventDefault();
        dispatch({ type: actionType, payload: payload });
    };

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

    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            handleKeyAction(e, 'UNDO');
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
            handleKeyAction(e, 'REDO');
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
            handleKeyAction(e, 'EXPAND_NODE');
            return;
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
            handleKeyAction(e, 'COLLAPSE_NODE');
            return;
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
            handleKeyAction(e, 'CUT_NODE');
            return;
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            handleKeyAction(e, 'COPY_NODE');
            return;
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            handleKeyAction(e, 'PASTE_NODE');
            return;
        }

        switch (e.key) {
            case 'Tab':
                handleKeyAction(e, 'ADD_NODE');
                break;
            case 'Delete':
            case 'Backspace':
                handleKeyAction(e, 'DELETE_NODE');
                break;
            case 'Enter':
                handleKeyAction(e, 'EDIT_NODE', { editingField: 'text' });
                break;
            case 'ArrowUp':
                handleKeyAction(e, 'ARROW_UP');
                break;
            case 'ArrowDown':
                handleKeyAction(e, 'ARROW_DOWN');
                break;
            // 右キー
            case 'ArrowRight':
                handleKeyAction(e, 'ARROW_RIGHT');
                break;
            case 'ArrowLeft':
                handleKeyAction(e, 'ARROW_LEFT');
                break;
            default:
                console.log(`editingNode: ${editingNode}`)
                break;
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