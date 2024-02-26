// src/components/ViewBox.js

// App.jsのsvgの描画処理をViewBox.jsに移動する

import React, { useRef, useEffect, useState } from 'react';
import Node from './Node';
import { Marker } from './Marker';
import MenuBar from './Menubar';
import InputFields from './InputFields';
import { useStore } from '../state/state';
import { Undo, Redo } from '../state/undoredo';
import { calculateCanvasSize } from '../utils/LayoutUtilities';
import {
    NODE_HEIGHT,
    ARROW_OFFSET,
    CURVE_CONTROL_OFFSET,
    X_OFFSET,
} from '../constants/Node';

const ViewBox = () => {
    const svgRef = useRef();
    const { state, dispatch } = useStore();

    const [canvasSize, setCanvasSize] = useState({ width: state.width, height: state.height });
    const [viewBox, setViewBox] = useState(`0 0 ${canvasSize.width} ${canvasSize.height}`);

    const editingNode = state.nodes.find((node) => node.editing);
    const editingField = editingNode ? editingNode.editingField : null;

    const updateText = (text, field) => {
        dispatch({ type: 'UPDATE_TEXT', payload: { text, field } });
    };

    const ZoomInViewBox = () => {
        dispatch({ type: 'ZOOM_IN' });
    };

    const ZoomOutViewBox = () => {
        dispatch({ type: 'ZOOM_OUT' });
    };

    // zoomRatioに応じてviewBoxのサイズを変更する
    useEffect(() => {
        //calculateCanvasSize(state.nodes, NODE_HEIGHT, X_OFFSET, state.zoomRatio);
        setViewBox(`0 0 ${canvasSize.width * (1 / state.zoomRatio)} ${canvasSize.height * (1 / state.zoomRatio)}`);
    }, [canvasSize, state.nodes, state.zoomRatio]);

    // ノードのサイズに応じてcanvasSizeの変更する
    useEffect(() => {
        const newCanvasSize = calculateCanvasSize(state.nodes, NODE_HEIGHT, X_OFFSET, state.zoomRatio);
        setCanvasSize(newCanvasSize);
    }, [state.nodes, state.zoomRatio]);

    useEffect(() => {
        const svg = svgRef.current;
        svg.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'svg') {
                dispatch({ type: 'DESELECT_ALL' });
            }
        });
    }, [dispatch]);

    // ノードの選択処理
    const handleMouseDown = (e, id) => {
        e.stopPropagation();
        dispatch({ type: 'SELECT_NODE', payload: id });
    };

    // ノードの編集処理
    const handleDoubleClick = (id) => {
        dispatch({ type: 'EDIT_NODE', payload: id });
    };

    // ノードの追加処理
    // ノード選択中にTabキーを押すと、選択中のノードの子ノードを追加する
    const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const selectedNode = state.nodes.find((node) => node.selected);
            if (selectedNode) {
                dispatch({ type: 'ADD_NODE', payload: selectedNode });
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            const selectedNode = state.nodes.find((node) => node.selected);
            if (selectedNode) {
                dispatch({ type: 'DELETE_NODE', payload: selectedNode });
            }
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            // Ctrl+Z or Command+ZでUndo処理を行う
            e.preventDefault();
            dispatch({ type: 'UNDO', payload: state.nodes });
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
            // Shift+Ctrl+Z or Shift+Command+ZでRedo処理を行う
            e.preventDefault();
            dispatch({ type: 'REDO', payload: state.nodes });
        } else if (e.key === 'Enter') {
            // 編集中モードに遷移し、InputFieldsコンポーネントを表示する
            const selectedNode = state.nodes.find((node) => node.selected);
            if (selectedNode) {
                dispatch({ type: 'EDIT_NODE', payload: selectedNode.id });
            }
        }
    };

    const handleUndo = () => {
        dispatch({ type: 'UNDO', payload: state.nodes });
    };

    const handleRedo = () => {
        dispatch({ type: 'REDO', payload: state.nodes });
    };

    // ノードの選択処理
    const selectNode = (id) => {
        dispatch({ type: 'SELECT_NODE', payload: id });
    };

    const getNodeById = (nodes, id) => {
        return nodes.find((node) => node.id === id);
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
                    // onMouseDown={(e) => handleMouseDown(e)}
                    onDoubleClick={(e) => handleDoubleClick()}

                    // フォーカスが当たった時の枠線を非表示にする
                    style={{ outline: 'none' }}
                >
                    <Marker />
                    {nodes.map((node) => (
                        <Node
                            key={node.id}
                            node={node}
                            getNodeById={getNodeById}
                            selectNode={selectNode}
                            // handleKeyDown={handleKeyDown}
                            // handleDoubleClick={handleDoubleClick}
                            // handleMouseDown={handleMouseDown}
                            handleMouseDown={(e) => handleMouseDown(e, node.id)}
                            nodes={nodes}
                        />
                    ))}
                </svg>

                <InputFields node={editingNode} updateText={updateText} editingField={editingField} />
            </div>
        </>

    );
}

export default ViewBox;