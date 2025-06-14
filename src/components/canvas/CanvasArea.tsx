// src/components/canvas/CanvasArea.tsx
'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import IdeaElement from '../elements/IdeaElement';
import DebugInfo from '../DebugInfo';
import InputFields from '../InputFields';
import { MarkerElements } from '../markers/MarkerElements';
import { MarkerMenu } from '../markers/MarkerMenu';
import { MarkerButton } from '../markers/MarkerButton';
import { ConnectionPath } from '../connections/ConnectionPath';
import useResizeEffect from '../../hooks/UseResizeEffect';
import { useCanvas } from '../../context/CanvasContext';
import { useClickOutside } from '../../hooks/UseClickOutside';
import { useElementDragEffect } from '../../hooks/UseElementDragEffect';
import { useTouchHandlers } from '../../hooks/UseTouchHandlers';
import { useKeyboardHandler } from '../../hooks/UseKeyboardHandler';
import {
  HEADER_HEIGHT,
  CONNECTION_PATH_STYLE,
  OFFSET,
  DEFAULT_CANVAS_BACKGROUND_COLOR,
  DEFAULT_CONNECTION_PATH_COLOR,
  DEFAULT_CONNECTION_PATH_STROKE,
} from '../../config/elementSettings';
import { Element as CanvasElement, MarkerType } from '../../types/types';
import { isDescendant } from '../../utils/element/elementHelpers';
import { useToast } from '../../context/ToastContext';
import {
  getConnectionPathColor,
  getConnectionPathStroke,
  getCanvasBackgroundColor,
} from '../../utils/storage/localStorageHelpers';
import { calculateDropCoordinates } from '../../utils/dropCoordinateHelpers';

interface CanvasAreaProps {
  isHelpOpen: boolean;
  toggleHelp: () => void;
}

// SVG領域のスタイル定義
const svgStyle = {
  outline: 'none',
  userSelect: 'none' as const,
  WebkitUserSelect: 'none' as const,
};

// Canvas領域の背景スタイル
const canvasBackgroundStyle = {
  position: 'fixed' as const, // absoluteからfixedに変更
  top: HEADER_HEIGHT,
  left: 0,
  width: '100vw', // 100%から100vwに変更
  height: 'calc(100vh - ' + HEADER_HEIGHT + 'px)', // 100%から計算値に変更
  overflow: 'hidden',
  zIndex: -1,
};

// Canvas領域のコンテナスタイル
const canvasContainerStyle = {
  position: 'absolute' as const,
  top: HEADER_HEIGHT,
  left: 0,
  right: 0,
  minWidth: '100%',
  minHeight: 'calc(100vh - ' + HEADER_HEIGHT + 'px)',
  overflow: 'auto',
};

const CanvasArea: React.FC<CanvasAreaProps> = ({
  isHelpOpen: _isHelpOpen,
  toggleHelp: _toggleHelp,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isClient, setIsClient] = useState(false);
  const { state, dispatch } = useCanvas();
  const { elements } = state;
  const [connectionPathColor, setConnectionPathColor] = useState(DEFAULT_CONNECTION_PATH_COLOR);
  const [connectionPathStroke, setConnectionPathStroke] = useState(DEFAULT_CONNECTION_PATH_STROKE);
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState(
    DEFAULT_CANVAS_BACKGROUND_COLOR,
  );
  const { addToast } = useToast();
  const [displayScopeSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [displayArea, setDisplayArea] = useState('0 0 0 0');
  const editingNode = Object.values(elements).find(
    (element) => (element as CanvasElement).editing,
  ) as CanvasElement | undefined;
  const [hover, setHover] = useState<string | null>(null);
  const [showMenuForElement, setShowMenuForElement] = useState<string | null>(null);
  const [hoveredElements, setHoveredElements] = useState<{ [key: string]: boolean }>({});

  // カスタムフックの使用
  useResizeEffect({
    setCanvasSize,
    setDisplayArea,
    state,
    isClient,
  });

  useClickOutside(svgRef, !!editingNode);

  const {
    handleMouseDown,
    handleMouseUp,
    currentDropTarget,
    dropPosition,
    draggingElement,
    dropInsertY,
    siblingInfo,
  } = useElementDragEffect();

  // タッチ操作のハンドラーをカスタムフックから取得
  const { isPinching, handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchHandlers({
    handleMouseDown,
    elements: state.elements,
  });

  // キーボード操作のハンドラーをカスタムフックから取得
  const handleKeyDown = useKeyboardHandler({
    dispatch,
    elements: state.elements,
    addToast,
  });

  // 要素選択時にフォーカスを維持するための処理
  useEffect(() => {
    if (!editingNode) {
      requestAnimationFrame(() => {
        const { scrollX, scrollY } = window;
        svgRef.current?.focus({ preventScroll: true });
        window.scrollTo(scrollX, scrollY);
      });
    }
  }, [editingNode]);

  // 初期化処理
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      // 色設定の初期化だけをここで行う
      setConnectionPathColor(getConnectionPathColor() || DEFAULT_CONNECTION_PATH_COLOR);
      setConnectionPathStroke(getConnectionPathStroke() || DEFAULT_CONNECTION_PATH_STROKE);
      setCanvasBackgroundColor(getCanvasBackgroundColor() || DEFAULT_CANVAS_BACKGROUND_COLOR);
    }
  }, []);

  const handleMarkerSelect = (elementId: string, markerType: MarkerType, isEndMarker: boolean) => {
    if (isEndMarker) {
      dispatch({
        type: 'UPDATE_END_MARKER',
        payload: { id: elementId, endMarker: markerType },
      });
    } else {
      dispatch({
        type: 'UPDATE_START_MARKER',
        payload: { id: elementId, startMarker: markerType },
      });
    }
    setShowMenuForElement(null);
  };

  const handleElementHover = useCallback(
    (elementId: string, isHovered: boolean) => {
      // ドラッグ中はホバー状態の更新をスキップ
      if (draggingElement) return;

      setHoveredElements((prev) => {
        // 既に同じ状態の場合は更新をスキップ
        if (prev[elementId] === isHovered) return prev;

        const newState = { ...prev };
        if (isHovered) {
          newState[elementId] = true;
        } else {
          if (Object.prototype.hasOwnProperty.call(newState, elementId)) {
            delete newState[elementId];
          }
        }
        return newState;
      });
    },
    [draggingElement],
  );

  // マーカーメニューが表示されているときの外部クリック処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMenuForElement && !(event.target as HTMLElement).closest('.popup-menu')) {
        setShowMenuForElement(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenuForElement]);

  // 要素のレンダリング（ルート要素とネスト要素のグループ化）
  const renderElements = () => {
    // グループ化用のオブジェクト（キー: parentId_depth）
    const elementGroups: { [key: string]: CanvasElement[] } = {};
    // 子要素を持つ非ルート要素のリスト（始点マーカーボタン用）
    const nonRootElementsWithChildren: CanvasElement[] = [];

    // 要素を可視状態でフィルタリングしつつグループ化
    Object.values(elements)
      .filter((element): element is CanvasElement => element.visible)
      .forEach((element) => {
        // グループキーの生成（ルート要素は特別扱い）
        const groupKey = element.parentId ? `${element.parentId}_${element.depth}` : 'root';

        // グループが存在しない場合は初期化
        if (!elementGroups[groupKey]) {
          elementGroups[groupKey] = [];
        }
        elementGroups[groupKey].push(element);

        // 子要素を持つ非ルート要素を記録（始点マーカーボタン用）
        if (
          element.parentId &&
          Object.values(elements).some((el) => el.parentId === element.id && el.visible)
        ) {
          nonRootElementsWithChildren.push(element);
        }
      });

    // グループごとのレンダリング処理
    return (
      <>
        {Object.entries(elementGroups).flatMap(([groupKey, groupElements]) => {
          // ルート要素グループの処理
          if (groupKey === 'root') {
            return groupElements.map((element) => {
              // 始点マーカーボタンを表示するかどうかの条件チェック
              const hasChildren = Object.values(elements).some(
                (el) => el.parentId === element.id && el.visible,
              );

              return (
                <React.Fragment key={element.id}>
                  <IdeaElement
                    element={element}
                    currentDropTarget={currentDropTarget as CanvasElement | null}
                    dropPosition={dropPosition}
                    draggingElement={draggingElement}
                    handleMouseDown={handleMouseDown}
                    handleMouseUp={handleMouseUp}
                    onHoverChange={handleElementHover}
                    dropInsertY={dropInsertY}
                    siblingInfo={siblingInfo}
                  />
                  {hasChildren && (
                    <MarkerButton
                      element={element}
                      absolutePosition={{ x: element.x, y: element.y }}
                      hoverId={hover}
                      onHover={setHover}
                      onShowMenu={setShowMenuForElement}
                    />
                  )}
                </React.Fragment>
              );
            });
          }

          // グループキーから親要素IDを取得
          const [parentId] = groupKey.split('_');
          const parentElement = elements[parentId] as CanvasElement | undefined;

          // 親要素が存在しない場合はスキップ（論理エラー防止）
          if (!parentElement) return [];

          // グループの基準位置計算（親要素の右端 + OFFSET）
          const groupX = parentElement.x + parentElement.width + OFFSET.X;
          const groupY = parentElement.y;

          // グループ全体をSVGグループ要素でラップ
          return [
            <g
              key={groupKey}
              transform={`translate(${groupX}, ${groupY})`}
              className="element-group"
              data-parent-id={parentId}
              data-depth={groupElements[0].depth}
            >
              {groupElements.map((element) => {
                // グループ内相対座標に変換
                const relativeX = element.x - groupX;
                const relativeY = element.y - groupY;

                return (
                  <IdeaElement
                    key={element.id}
                    element={{
                      ...element,
                      x: relativeX,
                      y: relativeY,
                    }}
                    currentDropTarget={currentDropTarget as CanvasElement | null}
                    dropPosition={dropPosition}
                    draggingElement={draggingElement}
                    handleMouseDown={(e) => {
                      // 型キャストなしで直接ハンドラを呼び出す
                      handleMouseDown(e, element);
                    }}
                    handleMouseUp={handleMouseUp}
                    onHoverChange={handleElementHover}
                    dropInsertY={dropInsertY}
                    siblingInfo={siblingInfo}
                  />
                );
              })}
            </g>,
          ];
        })}
        {/* 非ルート要素の始点マーカーボタンを別途レンダリング（グループの変形の影響を受けないように） */}
        {nonRootElementsWithChildren.map((element) => (
          <MarkerButton
            key={`marker-start-${element.id}`}
            element={element}
            absolutePosition={{ x: element.x, y: element.y }}
            hoverId={hover}
            onHover={setHover}
            onShowMenu={setShowMenuForElement}
          />
        ))}
      </>
    );
  };

  // 接続パスとエンドマーカーボタンのレンダリング
  const renderConnectionPaths = () => {
    return Object.values(elements)
      .filter((element): element is CanvasElement => element.visible && !!element.parentId)
      .map((element) => {
        const parentId = element.parentId;
        if (!parentId) return null;

        const parent = elements[parentId] as CanvasElement;
        if (
          draggingElement &&
          (element.id === draggingElement.id ||
            isDescendant(elements, draggingElement.id, element.id))
        ) {
          return null;
        }

        return (
          <React.Fragment key={`connection-group-${element.id}`}>
            <ConnectionPath
              parentElement={parent}
              element={element}
              absolutePositions={{
                parent: { x: parent.x, y: parent.y },
                element: { x: element.x, y: element.y },
              }}
              strokeColor={connectionPathColor}
              strokeWidth={connectionPathStroke}
            />
            {/* 終点マーカー設定ボタンを描画 */}
            <MarkerButton
              element={element}
              absolutePosition={{ x: element.x, y: element.y }}
              isEndMarker={true}
              hoverId={hover}
              onHover={setHover}
              onShowMenu={setShowMenuForElement}
            />
          </React.Fragment>
        );
      })
      .filter(Boolean);
  };

  // デバッグ情報の表示
  const renderDebugInfo = () => {
    // 表示対象の要素を選別
    // 1. マウスオーバー中の要素（hoveredElements）
    // 2. ドラッグ中のドロップターゲット要素（currentDropTarget）
    const elementsToShow = new Set<string>();

    // マウスオーバー中の要素を追加
    Object.keys(hoveredElements).forEach((id) => elementsToShow.add(id));

    // ドラッグ中の場合、ドロップターゲットを追加
    if (draggingElement && currentDropTarget) {
      elementsToShow.add(currentDropTarget.id);
    }

    // 表示対象の要素がなければ何も表示しない
    if (elementsToShow.size === 0) return null;

    return Array.from(elementsToShow)
      .map((elementId) => {
        const element = elements[elementId];
        if (!element || !element.visible) return null;

        return (
          <DebugInfo
            key={`debug-${element.id}`}
            element={element}
            isHovered={true}
            currentDropTarget={currentDropTarget}
            dropPosition={dropPosition}
            siblingInfo={siblingInfo}
            elements={elements}
          />
        );
      })
      .filter(Boolean);
  };

  // ドラッグドロップの視覚的なプレビューを描画
  const renderDropPreview = () => {
    if (!draggingElement || !currentDropTarget || !dropPosition) return null;

    // 型ガード: currentDropTarget がCanvasElement であることを確認
    const target = currentDropTarget as CanvasElement;

    // ドロップ座標を計算（ユーティリティ関数を使用）
    const coordinates = calculateDropCoordinates({
      elements,
      currentDropTarget: target,
      draggingElement,
      dropPosition,
      dropInsertY,
      siblingInfo,
    });

    if (!coordinates) return null;

    // 背景色の設定
    const bgColor =
      dropPosition === 'child'
        ? 'rgba(103, 208, 113, 0.3)' // childモードの場合: 緑色
        : 'rgba(157, 172, 244, 0.3)'; // betweenモードの場合: 青色

    return (
      <rect
        x={coordinates.x}
        y={coordinates.y}
        width={draggingElement.width}
        height={draggingElement.height}
        fill={bgColor}
        stroke="#555"
        strokeDasharray="2,2"
        strokeWidth={1}
        rx={4}
        ry={4}
        className="drop-preview"
        data-exclude-from-export="true"
      />
    );
  };

  // ドラッグ中の要素の接続パスプレビューを描画
  const renderDraggingElementConnectionPath = () => {
    if (!currentDropTarget || !draggingElement || !dropPosition) return null;

    // 型ガード: currentDropTarget がCanvasElement であることを確認
    const target = currentDropTarget as CanvasElement;

    const newParent =
      dropPosition === 'child' ? target : target.parentId ? elements[target.parentId] : null;

    if (!newParent) return null;

    // ドロップ座標を計算（ユーティリティ関数を使用）
    const coordinates = calculateDropCoordinates({
      elements,
      currentDropTarget: target,
      draggingElement,
      dropPosition,
      dropInsertY,
      siblingInfo,
    });

    if (!coordinates) return null;

    return (
      <ConnectionPath
        parentElement={newParent}
        element={{
          ...draggingElement,
          x: coordinates.x,
          y: coordinates.y,
        }}
        absolutePositions={{
          parent: { x: newParent.x, y: newParent.y },
          element: { x: coordinates.x, y: coordinates.y },
        }}
        strokeColor={CONNECTION_PATH_STYLE.DRAGGING_COLOR}
        strokeWidth={CONNECTION_PATH_STYLE.STROKE}
      />
    );
  };

  // マーカーメニューのレンダリング
  const renderMarkerMenu = () => {
    if (!showMenuForElement) return null;

    // 通常のマーカー設定か、終点マーカー設定かを判断
    const isEndMarkerMenu = showMenuForElement.startsWith('end-');
    let elementId = showMenuForElement;

    // 終点マーカーの場合はプレフィックスを削除
    if (isEndMarkerMenu) {
      elementId = showMenuForElement.substring(4);
    }

    const element = elements[elementId] as CanvasElement;
    if (!element) return null;

    const totalHeight = element.height;

    // ポップアップメニューの表示位置を計算
    let popupX, popupY;

    if (isEndMarkerMenu) {
      // 終点マーカーの場合は要素の左側に表示
      popupX = element.x - 170; // メニューの幅(150px) + マージン(20px)
      popupY = element.y + totalHeight / 2 - 135; // 中央に表示
    } else {
      // 始点マーカーの場合は要素の右側に表示
      popupX = element.x + element.width + 20; // 要素の右端 + マージン
      popupY = element.y + totalHeight / 2 - 135; // 中央に表示
    }

    return (
      <MarkerMenu
        popupX={popupX}
        popupY={popupY}
        isEndMarkerMenu={isEndMarkerMenu}
        elementId={elementId}
        onMarkerSelect={handleMarkerSelect}
        onClose={() => setShowMenuForElement(null)}
      />
    );
  };

  return (
    <>
      {/* 背景 */}
      <div
        style={{
          ...canvasBackgroundStyle,
          backgroundColor: canvasBackgroundColor,
        }}
      />
      {/* Canvas領域 */}
      <div
        style={{
          ...canvasContainerStyle,
          touchAction: isPinching ? 'none' : 'manipulation',
          backgroundColor: canvasBackgroundColor,
        }}
      >
        {isClient && (
          <svg
            data-testid="view-area"
            ref={svgRef}
            width={displayScopeSize.width}
            height={displayScopeSize.height}
            viewBox={displayArea}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              ...svgStyle,
              touchAction: isPinching ? 'none' : 'manipulation',
              backgroundColor: canvasBackgroundColor,
            }}
            className="svg-element"
          >
            <defs>
              <MarkerElements
                connectionPathColor={connectionPathColor}
                connectionPathStroke={connectionPathStroke}
              />
            </defs>

            {renderElements()}
            {renderConnectionPaths()}
            {renderDraggingElementConnectionPath()}
            {renderMarkerMenu()}
            {renderDebugInfo()}
            {renderDropPreview()}
          </svg>
        )}
        <InputFields
          element={editingNode}
          onEndEditing={() => {
            dispatch({ type: 'END_EDITING' });
            svgRef.current?.focus();
          }}
        />
      </div>
    </>
  );
};

export default React.memo(CanvasArea);
