// src/components/ViewBox.js

// App.jsのsvgの描画処理をViewBox.jsに移動する

import React, { useRef, useEffect, useCallback } from 'react';
import Node from './Node';
import { Marker } from './Marker';
// import { saveSnapshot } from '../state/undoredo';
import { useStore } from '../state/state';

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
        dispatch({ type: 'DESELECT_ALL' });
        dispatch({ type: 'SELECT_NODE', payload: id });
    };

    // ノードの編集処理
    const handleDoubleClick = (id) => {
        dispatch({ type: 'EDIT_NODE', payload: id });
    };

    // ノードの追加処理
    // ノード選択中にTabキーを押すと、選択中のノードの子ノードを追加する
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const selectedNode = state.nodes.find((node) => node.selected);
            if (selectedNode) {
                dispatch({ type: 'ADD_NODE', payload: selectedNode });
            }
        }
    }, [state.nodes, dispatch]);

    // Tabキー押下時に子ノードを追加するために、KeyDownイベントを追加
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

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
        >
            <Marker />
            {nodes.map((node) => (
                <Node
                    key={node.id}
                    node={node}
                    getNodeById={getNodeById}
                    selectNode={selectNode}
                    handleDoubleClick={handleDoubleClick}
                    handleMouseDown={handleMouseDown}
                    nodes={nodes}
                />
            ))}
        </svg>
    );
}

export default ViewBox;