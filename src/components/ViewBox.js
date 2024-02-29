// src/components/ViewBox.js
import React, { useRef, useEffect, useState, useCallback } from 'react';
import Node from './Node';
import { Marker } from './Marker';
import MenuBar from './Menubar';
import InputFields from './InputFields';
import { useStore } from '../state/state';
import { calculateCanvasSize } from '../utils/LayoutUtilities';
import { calculateNodeWidth } from '../utils/TextUtilities';
import {
    NODE_HEIGHT,
    ARROW_OFFSET,
    CURVE_CONTROL_OFFSET,
    X_OFFSET,
} from '../constants/Node';

const ViewBox = () => {
    const svgRef = useRef();
    const { state, dispatch } = useStore();

    // canvasSizeの初期値をウィンドウサイズにする
    const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [viewBox, setViewBox] = useState(`0 0 ${canvasSize.width} ${canvasSize.height}`);

    const editingNode = state.nodes.find((node) => node.editing);

    const [dragging, setDragging] = useState(null);
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });

    const updateText = (text, field) => {
        console.log(`[updateText] field: ${field} text: ${text}`);
        dispatch({ type: 'UPDATE_TEXT', payload: { id: editingNode.id, field: field, value: text } });
    };

    // 編集モードを終了する
    const endEditing = () => {
        dispatch({ type: 'END_EDITING' });
        // フォーカスをsvgに戻す
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

    const handleMouseDown = (e, id) => {
        // idがnullの場合は、何もしない
        if (id === undefined || id === null) {
            return;
        }
        const node = getNodeById(state.nodes, id);
        setDragging(id);
        // 現在の座標を保存する
        setStartPosition({ x: e.clientX - node.x, y: e.clientY - node.y });
        setOriginalPosition({ x: node.x, y: node.y }); // 元の座標を保存
        e.stopPropagation();
    };

    useEffect(() => {
        if (dragging !== null) {
            const handleMouseMove = (e) => {
                const newX = e.clientX - startPosition.x;
                const newY = e.clientY - startPosition.y;

                // ノードの移動処理(stateの更新)
                dispatch({ type: 'DRAG_NODE', payload: { id: dragging, x: newX, y: newY } });
            };

            document.addEventListener('mousemove', handleMouseMove);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
            };
        }
    }, [dragging, startPosition, dispatch]);

    const handleMouseUp = useCallback((e) => {
        if (dragging !== null) {
            const dropX = e.clientX;
            const dropY = e.clientY;

            const droppedOverNode = state.nodes.find(node => {
                const width = calculateNodeWidth([node.text, node.text2, node.text3]);
                console.log(`width: ${width}`)
                return dropX >= node.x && dropX <= node.x + width &&
                    dropY >= node.y && dropY <= node.y + NODE_HEIGHT &&
                    node.id !== dragging;
            });

            if (droppedOverNode) {
                console.log(`droppedOverNode.id: ${droppedOverNode.id}`)
                const draggingNode = getNodeById(state.nodes, dragging);
                const originalParentId = draggingNode.parentId;
                const newParentId = droppedOverNode.id;

                // Undoのスナップショットを追加
                dispatch({ type: 'SNAPSHOT', payload: state.nodes });

                // ノードのorderを更新する前に、移動元の兄弟ノードのorderをデクリメント
                dispatch({ type: 'DECREMENT_ORDER', payload: { parentId: originalParentId, draggingNodeOrder: draggingNode.order } });

                // 移動元の親ノードの情報を更新
                dispatch({ type: 'UPDATE_SOURCE_PARENT_NODE', payload: originalParentId });

                // 移動先の親ノードの情報を更新
                dispatch({ type: 'UPDATE_DEST_PARENT_NODE', payload: newParentId });

                // 移動先の子ノードの数に基づいて新しいorderを計算
                const siblings = state.nodes.filter(node => node.parentId === newParentId);
                const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(node => node.order)) + 1 : 0;
                const newX = siblings.length > 0 ? siblings[0].x : droppedOverNode.x + X_OFFSET;
                const newY = siblings.length > 0 ? siblings[maxOrder - 1].y + NODE_HEIGHT + 10 : droppedOverNode.y;

                dispatch({ type: 'DROP_NODE', payload: { id: dragging, x: newX, y: newY, parentId: newParentId, order: maxOrder, depth: droppedOverNode.depth + 1 } });
            } else {
                dispatch({ type: 'DRAG_NODE', payload: { id: dragging, x: originalPosition.x, y: originalPosition.y } });
            }

            setDragging(null);
        }
    }, [dragging, originalPosition.x, originalPosition.y]);

    // ノードの編集処理
    const handleDoubleClick = (id) => {
        dispatch({ type: 'EDIT_NODE', payload: id});
    };

    const getSelectedNode = (nodes) => {
        return nodes.find((node) => node.selected);
    }

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
            dispatch({ type: 'EDIT_NODE', payload: {id:selectedNode.id, editingField: 'text'}});
        }
    }

    // ノードの追加処理
    // ノード選択中にTabキーを押すと、選択中のノードの子ノードを追加する
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
            // Ctrl+Z or Command+ZでUndo処理を行う
            e.preventDefault();
            dispatch({ type: 'UNDO', payload: state.nodes });
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
            // Shift+Ctrl+Z or Shift+Command+ZでRedo処理を行う
            e.preventDefault();
            dispatch({ type: 'REDO', payload: state.nodes });
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
                    onDoubleClick={(e) => handleDoubleClick()}
                    onMouseDown={(e) => handleMouseDown(e)}
                    onMouseUp={(e) => handleMouseUp(e)}
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
                            nodes={nodes}
                            handleMouseDown={handleMouseDown}
                        // handleDoubleClick={handleDoubleClick}
                        />
                    ))}
                </svg>

                <InputFields node={editingNode} updateText={updateText} endEditing={endEditing} />
            </div>
        </>

    );
}

export default ViewBox;