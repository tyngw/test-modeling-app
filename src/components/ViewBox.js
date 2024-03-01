// src/components/ViewBox.js
import React, { useRef, useEffect, useState, useCallback } from 'react';
import Node from './Node';
import { Marker } from './Marker';
import MenuBar from './Menubar';
import InputFields from './InputFields';
import { useStore } from '../state/state';
import useResizeEffect from '../hooks/useResizeEffect';
import { useDragEffect } from '../hooks/useDragEffect';
import { useClickOutside } from '../hooks/useClickOutside';

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

    // zoomRatioに応じてviewBoxのサイズを変更する
    useEffect(() => {
        setViewBox(`0 0 ${window.innerWidth * (1 / state.zoomRatio)} ${window.innerHeight * (1 / state.zoomRatio)}`);
    }, [canvasSize, state.nodes, state.zoomRatio]);

    useResizeEffect({ setCanvasSize, state });

    useClickOutside(svgRef, dispatch, editingNode, endEditing);

    // const getNodeById = (nodes, id) => {
    //     return nodes.find((node) => node.id === id);
    // };

    const getSelectedNode = (nodes) => {
        return nodes.find((node) => node.selected);
    }

    const { handleMouseDown, handleMouseUp } = useDragEffect(state, dispatch);

    const handleDoubleClick = (id) => {
        dispatch({ type: 'EDIT_NODE', payload: id });
    };

    const handleTabKey = (state, dispatch) => {
        const selectedNode = getSelectedNode(state.nodes);
        if (selectedNode) {
            dispatch({ type: 'ADD_NODE', payload: selectedNode });
        }
    };

    const handleDeleteKey = (state, dispatch) => {
        const selectedNode = getSelectedNode(state.nodes);
        if (selectedNode) {
            dispatch({ type: 'DELETE_NODE', payload: selectedNode });
        }
    };

    const handleEnterKey = (state, dispatch) => {
        const selectedNode = state.nodes.find((node) => node.selected);
        if (selectedNode) {
            dispatch({ type: 'EDIT_NODE', payload: { id: selectedNode.id, editingField: 'text' } });
        }
    }

    const handleUndo = () => {
        dispatch({ type: 'UNDO', payload: state.nodes });
    };

    const handleRedo = () => {
        dispatch({ type: 'REDO', payload: state.nodes });
    };

    const handleKeyDown = (e) => {
        switch (e.key) {
            case 'Tab':
                e.preventDefault();
                handleTabKey(state, dispatch);
                break;
            case 'Delete':
            case 'Backspace':
                e.preventDefault();
                handleDeleteKey(state, dispatch);
                break;
            case 'Enter':
                e.preventDefault();
                handleEnterKey(state, dispatch);
                break;
            case 'ArrowUp':
                e.preventDefault();
                dispatch({ type: 'ARROW_UP', payload: state.nodes });
                break;
            case 'ArrowDown':
                e.preventDefault();
                dispatch({ type: 'ARROW_DOWN', payload: state.nodes });
                break;
            // 右キー
            case 'ArrowRight':
                e.preventDefault();
                console.log('ArrowRight');
                dispatch({ type: 'ARROW_RIGHT', payload: state.nodes });
                break;
            case 'ArrowLeft':
                e.preventDefault();
                dispatch({ type: 'ARROW_LEFT', payload: state.nodes });
                break;
            default:
                console.log(`editingNode: ${editingNode}`)
                break;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            dispatch({ type: 'UNDO', payload: state.nodes });
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
            e.preventDefault();
            dispatch({ type: 'REDO', payload: state.nodes });
        }
    };

    const selectNode = (id) => {
        dispatch({ type: 'SELECT_NODE', payload: id });
    };

    const nodes = state.nodes;

    return (
        <>
            <MenuBar menubarWidth={canvasSize.width} handleUndo={handleUndo} handleRedo={handleRedo} ZoomInViewBox={ZoomInViewBox} ZoomOutViewBox={ZoomOutViewBox} />
            <div style={{ position: 'absolute', top: '40px', left: 0 }}>
                <svg
                    ref={svgRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    viewBox={viewBox}
                    tabIndex="0"
                    onKeyDown={(e) => handleKeyDown(e)}
                    onDoubleClick={(e) => handleDoubleClick()}
                    onMouseDown={(e) => handleMouseDown(e)}
                    onMouseUp={(e) => handleMouseUp(e)}
                    style={{ outline: 'none' }}
                >
                    <Marker />
                    {nodes.map((node) => (
                        <Node
                            key={node.id}
                            node={node}
                            // getNodeById={getNodeById}
                            selectNode={selectNode}
                            nodes={nodes}
                            handleMouseDown={handleMouseDown}
                        />
                    ))}
                </svg>
                <InputFields node={editingNode} updateText={updateText} endEditing={endEditing} />
            </div>
        </>

    );
}

export default ViewBox;