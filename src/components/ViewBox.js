// src/components/ViewBox.js

// App.jsのsvgの描画処理をViewBox.jsに移動する

import React, { useRef, useEffect } from 'react';
import Node from './Node';
import { Marker } from './Marker';
import { useStore } from '../state/state';
import { Undo, Redo } from '../state/undoredo';

const ViewBox = () => {
    const svgRef = useRef();
    const { state, dispatch } = useStore();



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
        }
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

        <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${state.width} ${state.height}`}
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

    );
}

export default ViewBox;