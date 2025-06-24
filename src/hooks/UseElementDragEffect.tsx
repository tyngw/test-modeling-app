// src/hooks/useElementDragEffect.tsx
'use client';

/**
 * useElementDragEffect
 *
 * このカスタムフックは、マインドマップに類似した体験を提供するドラッグ＆ドロップ機能を実装します。
 * 要素のドラッグ操作を通じて階層的な関係を視覚的に表現し、直感的なインターフェースを実現します。
 *
 * 主な機能:
 * - 要素のドラッグ＆ドロップで親子関係をシームレスに構築
 * - 接続線の視覚的なフィードバックによる関係性の明示
 * - 親要素からの相対的な位置で子要素を配置
 * - 放射状/階層的なレイアウトの自動調整
 * - ドラッグ中の位置プレビューとハイライト効果
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAllElementsFromHierarchy } from '../utils/hierarchical/hierarchicalConverter';
import { Element, DropPosition, DirectionType } from '../types/types';
import { useCanvas } from '../context/CanvasContext';
import { isDescendant } from '../utils/element/elementHelpers';
import { ToastMessages } from '../constants/toastMessages';
import { HEADER_HEIGHT, OFFSET } from '../config/elementSettings';
import { useToast } from '../context/ToastContext';
import { debugLog } from '../utils/debugLogHelpers';
import { ElementsMap } from '../types/elementTypes';

const isTouchEvent = (event: MouseEvent | TouchEvent): event is TouchEvent => {
  return 'touches' in event;
};

type Position = { x: number; y: number };
export type DropTargetInfo = {
  element: Element;
  position: DropPosition;
  insertY?: number;
  insertX?: number;
  angle?: number; // 親要素からの角度（放射状レイアウト用）
  distance?: number; // 親要素からの距離
  siblingInfo?: { prevElement?: Element; nextElement?: Element };
  direction?: DirectionType; // ドロップ先の方向
} | null;

// 要素の子要素を取得するヘルパー関数
const getChildren = (element: Element, elements: ElementsMap): Element[] => {
  return Object.values(elements)
    .filter((e) => e.parentId === element.id && e.visible)
    .sort((a, b) => a.id.localeCompare(b.id)); // IDでソート（階層構造では配列の順序で管理）
};

// X座標が要素の範囲内かどうかを判定

// フックの戻り値の型を定義
export interface ElementDragEffectResult {
  handleMouseDown: (
    e: React.MouseEvent<HTMLElement | SVGElement> | React.TouchEvent<HTMLElement | SVGElement>,
    element: Element,
  ) => void;
  handleMouseUp: () => void;
  currentDropTarget: Element | null;
  dropPosition: DropPosition;
  draggingElement: Element | null;
  dropInsertY: number | undefined;
  dropInsertX: number | undefined;
  dropTargetDirection: DirectionType | undefined;
  siblingInfo: { prevElement?: Element; nextElement?: Element } | null;
  isDragInProgress: boolean; // ドラッグ中かどうかを示すフラグ
}

export const useElementDragEffect = (): ElementDragEffectResult => {
  const { state, dispatch } = useCanvas();
  const { addToast } = useToast();

  // hierarchicalDataからelementsMapを生成
  const elementsMap = useMemo(() => {
    if (!state.hierarchicalData) return {};

    const allElements = getAllElementsFromHierarchy(state.hierarchicalData);
    return allElements.reduce(
      (acc, element) => {
        acc[element.id] = element;
        return acc;
      },
      {} as Record<string, Element>,
    );
  }, [state.hierarchicalData]);

  const [draggingElement, setDraggingElement] = useState<Element | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<Position>({ x: 0, y: 0 });
  const [currentDropTarget, setCurrentDropTarget] = useState<DropTargetInfo>(null);
  // 元の位置を各要素ごとに記録するためのMap
  const elementOriginalPositions = useRef<Map<string, Position>>(new Map());

  const convertToZoomCoordinates = useCallback(
    (e: MouseEvent | TouchEvent): Position => {
      let clientX: number, clientY: number;

      if (isTouchEvent(e)) {
        // タッチイベントの場合
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        // マウスイベントの場合
        clientX = e.clientX;
        clientY = e.clientY;
      }

      // キャンバスSVG要素を優先的に取得
      const canvasSvg = document.querySelector('svg[data-testid="view-area"]');
      if (canvasSvg) {
        const rect = canvasSvg.getBoundingClientRect();
        // SVG要素からの相対座標を計算
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;

        return {
          x: relativeX / state.zoomRatio,
          y: relativeY / state.zoomRatio,
        };
      }

      // フォールバック: SVG要素が見つからない場合は従来の方法を使用
      const canvasContainer = document.querySelector('[data-canvas-container]') || document.body;
      const rect = canvasContainer.getBoundingClientRect();

      // キャンバスコンテナからの相対座標を計算
      const relativeX = clientX - rect.left;
      const relativeY = clientY - rect.top;

      return {
        x: relativeX / state.zoomRatio,
        y: (relativeY - HEADER_HEIGHT) / state.zoomRatio,
      };
    },
    [state.zoomRatio],
  );

  // 子要素エリアのドロップ位置を計算する関数
  const calculateChildPosition = useCallback(
    (
      element: Element,
      mouseY: number,
      elements: ElementsMap,
    ): { position: DropPosition; insertY: number; insertX?: number } => {
      const elemTop = element.y;
      const children = getChildren(element, elements);

      // 要素の方向（ルート要素は特別扱い）
      const direction = element.direction || 'right';
      const isRootInMindmap = element.direction === 'none' && element.parentId === null;

      // 方向に応じてX座標を計算
      let insertX;
      if (direction === 'left') {
        // 左方向の場合
        insertX = element.x - OFFSET.X;
      } else if (direction === 'right' || isRootInMindmap) {
        // 右方向の場合、またはルート要素の場合（デフォルトで右方向）
        insertX = element.x + element.width + OFFSET.X;
      } else {
        // フォールバック: 右方向
        insertX = element.x + element.width + OFFSET.X;
      }

      // 子要素が存在しない場合は、要素の中央に配置
      if (children.length === 0) {
        return {
          position: 'child',
          insertY: elemTop + element.height / 2,
          insertX,
        };
      }

      // 子要素がある場合でも、常に親要素の中央に配置する
      // これにより、マウス位置に関わらず常に同じ位置にプレビュー表示される
      return {
        position: 'child',
        insertY: elemTop + element.height / 2,
        insertX,
      };
    },
    [],
  );

  // ドロップ位置と要素中心からの距離を計算する関数
  const calculatePositionAndDistance = useCallback(
    (
      element: Element,
      mouseX: number,
      mouseY: number,
      elements: ElementsMap,
    ): {
      position: DropPosition;
      distanceSq: number;
      insertY: number;
      insertX?: number;
      siblingInfo?: { prevElement?: Element; nextElement?: Element };
      direction?: DirectionType;
    } => {
      const elemTop = element.y;
      const elemBottom = element.y + element.height;
      const elemLeft = element.x;
      const elemRight = element.x + element.width;

      // マインドマップのルート要素（direction: none）の場合は特別扱い
      const isRootInMindmap = element.direction === 'none' && element.parentId === null;

      const rightSidePadding = isRootInMindmap
        ? OFFSET.X * 2 + (draggingElement?.width ?? 0)
        : OFFSET.X + (draggingElement?.width ?? 0);
      const leftSidePadding = isRootInMindmap
        ? OFFSET.X * 2 + (draggingElement?.width ?? 0)
        : OFFSET.X + (draggingElement?.width ?? 0);

      // 要素の方向を取得
      const direction = element.direction || 'right';

      // 要素の右側/左側にあるかどうかを判定
      const isOnRightSide = mouseX >= elemRight && mouseX < elemRight + rightSidePadding;
      const isOnLeftSide = mouseX <= elemLeft && mouseX > elemLeft - leftSidePadding;

      // 要素の内側にあるかどうかを判定
      const isInsideElement =
        mouseX >= element.x && mouseX < elemRight && mouseY >= elemTop && mouseY <= elemBottom;

      // 要素の右側/左側かつY座標が要素の範囲内かどうかを判定
      const isOnRightSideInYRange = isOnRightSide && mouseY >= elemTop && mouseY <= elemBottom;
      const isOnLeftSideInYRange = isOnLeftSide && mouseY >= elemTop && mouseY <= elemBottom;

      // ルート要素の左側ドロップのデバッグ
      if (isRootInMindmap) {
        console.log(`[Root calc] Element ${element.id}:`, {
          mouseX,
          elemLeft,
          elemRight,
          leftPadding: leftSidePadding,
          rightPadding: rightSidePadding,
          isOnLeftSide,
          isOnRightSide,
          leftSideInRange: isOnLeftSideInYRange,
          rightSideInRange: isOnRightSideInYRange,
          insideElement: isInsideElement,
        });
        debugLog(`[Root calc] mouseX: ${mouseX}, elemLeft: ${elemLeft}, elemRight: ${elemRight}`);
        debugLog(`[Root calc] leftPadding: ${leftSidePadding}, rightPadding: ${rightSidePadding}`);
        debugLog(`[Root calc] isOnLeftSide: ${isOnLeftSide}, isOnRightSide: ${isOnRightSide}`);
        debugLog(
          `[Root calc] leftSideInRange: ${isOnLeftSideInYRange}, rightSideInRange: ${isOnRightSideInYRange}`,
        );
        debugLog(`[Root calc] insideElement: ${isInsideElement}`);
      }

      // ルート要素の場合、左右どちらにもドロップ可能
      const isOnValidSide =
        (isRootInMindmap && (isOnRightSideInYRange || isOnLeftSideInYRange)) ||
        (direction === 'right' && isOnRightSideInYRange) ||
        (direction === 'left' && isOnLeftSideInYRange);

      if (isRootInMindmap) {
        debugLog(`[Root calc] isOnValidSide: ${isOnValidSide}, direction: ${direction}`);
      }

      let result: {
        position: DropPosition;
        insertY: number;
        insertX?: number;
        siblingInfo?: { prevElement?: Element; nextElement?: Element };
        direction?: DirectionType;
      };

      // 要素の上にある場合は子要素として追加 (child mode)
      // これを最優先で処理して、要素上のドラッグは常にchildモードになるようにする
      if (isInsideElement) {
        result = calculateChildPosition(element, mouseY, elements);
        // 要素の方向を設定（ルート要素の場合は右方向をデフォルトとする）
        result.direction = element.direction || 'right';
        debugLog(`Drop position mode (inside element ${element.id}):`, 'child');
        debugLog(
          `[Inside element] Element ${element.id} - direction: ${result.direction}, insertX: ${result.insertX}`,
        );
      } else if (isOnValidSide) {
        // 要素の適切な側（方向に応じた）かつY座標範囲内の場合 (between mode)
        const children = getChildren(element, elements);

        // ルート要素（direction: none）の場合、ドロップ位置に応じて子要素の方向を決定
        let childDirection: DirectionType = direction;
        if (isRootInMindmap) {
          childDirection = isOnLeftSideInYRange ? 'left' : 'right';
          debugLog(
            `[childDirection calculation] isOnLeftSideInYRange: ${isOnLeftSideInYRange}, childDirection: ${childDirection}`,
          );
        }

        if (children.length === 0) {
          // 子要素がない場合は、要素の子として追加 (childモード同様の挙動)
          // 位置は子要素モードと同じく、要素の側に表示
          const insertX =
            childDirection === 'left'
              ? element.x - OFFSET.X - (draggingElement?.width ?? 0)
              : element.x + element.width + OFFSET.X;

          console.log(`[calculatePositionAndDistance] Root ${element.id} no children:`, {
            childDirection,
            insertX,
            elementX: element.x,
            elementWidth: element.width,
            draggingWidth: draggingElement?.width,
          });

          result = {
            position: 'child', // betweenからchildに変更: 子要素として追加するため
            insertY: element.y + element.height / 2,
            insertX,
            siblingInfo: {}, // siblingInfoは保持
            direction: childDirection,
          };
          debugLog(`Drop position mode (${childDirection} side, no children):`, 'child');
        } else {
          // 子要素がある場合は、子要素の間に挿入
          const insertX =
            childDirection === 'left'
              ? element.x - OFFSET.X - (draggingElement?.width ?? 0)
              : element.x + element.width + OFFSET.X;

          // ルート要素の場合は、betweenモードではなくchildモードを使用
          if (isRootInMindmap) {
            result = {
              position: 'child',
              insertY: element.y + element.height / 2,
              insertX,
              siblingInfo: {},
              direction: childDirection,
            };
            debugLog(`Drop position mode (${childDirection} side, root with children):`, 'child');
            debugLog(`[Root result] direction set to: ${childDirection}, insertX: ${insertX}`);
          } else {
            let prevElement: Element | undefined;
            let nextElement: Element | undefined;

            // 同じ方向の子要素のみをフィルタリング（ルート要素の場合）
            const directionFilteredChildren = isRootInMindmap
              ? children.filter((child) => child.direction === childDirection)
              : children;

            // マウス位置に最も近い子要素を見つける
            for (let i = 0; i < directionFilteredChildren.length; i++) {
              const child = directionFilteredChildren[i];
              if (mouseY < child.y) {
                nextElement = child;
                if (i > 0) prevElement = directionFilteredChildren[i - 1];
                break;
              } else if (mouseY < child.y + child.height) {
                const midpoint = child.y + child.height / 2;
                if (mouseY < midpoint) {
                  nextElement = child;
                  if (i > 0) prevElement = directionFilteredChildren[i - 1];
                } else {
                  prevElement = child;
                  if (i < directionFilteredChildren.length - 1)
                    nextElement = directionFilteredChildren[i + 1];
                }
                break;
              } else if (
                i === directionFilteredChildren.length - 1 ||
                mouseY < directionFilteredChildren[i + 1].y
              ) {
                prevElement = child;
                if (i < directionFilteredChildren.length - 1)
                  nextElement = directionFilteredChildren[i + 1];
                break;
              }
            }

            if (prevElement && nextElement) {
              // 2つの子要素の間
              const gap = nextElement.y - (prevElement.y + prevElement.height);
              result = {
                position: 'between',
                insertY: prevElement.y + prevElement.height + gap / 2,
                insertX,
                siblingInfo: { prevElement, nextElement },
                direction: childDirection,
              };
            } else if (prevElement) {
              // 最後の子要素の後
              result = {
                position: 'between',
                insertY: prevElement.y + prevElement.height + OFFSET.Y,
                insertX,
                siblingInfo: { prevElement },
                direction: childDirection,
              };
            } else if (nextElement) {
              // 最初の子要素の前
              result = {
                position: 'between',
                insertY: nextElement.y - OFFSET.Y,
                insertX,
                siblingInfo: { nextElement },
                direction: childDirection,
              };
            } else {
              // このケースは通常発生しないはず
              result = {
                position: 'between',
                insertY: element.y + element.height / 2,
                insertX,
                siblingInfo: {},
                direction: childDirection,
              };
            }

            debugLog(`Drop position mode (${childDirection} side, with children):`, 'between');
          }
        }
      } else if (isRootInMindmap || element.parentId === null) {
        // ルート要素の場合は兄弟判定をスキップし、デフォルトのchild位置を返す
        debugLog(`[Root element ${element.id}] Not on valid side, using default child position`);
        result = {
          position: 'child',
          insertY: element.y + element.height / 2,
          insertX: element.x + element.width + OFFSET.X,
          siblingInfo: {},
          direction: element.direction || 'right', // 要素の方向を保持
        };
      } else {
        // 同じ親を持つ要素（兄弟要素）を取得
        const draggingElementId = draggingElement?.id;
        const siblings = Object.values(elements)
          .filter(
            (el) =>
              el.visible &&
              el.parentId === element.parentId &&
              el.depth === element.depth &&
              el.id !== draggingElementId, // ドラッグ中の要素自身を除外
          )
          .sort((a, b) => a.y - b.y);

        debugLog(
          `[calculatePositionAndDistance] Found ${siblings.length} siblings (excluding dragging element) for element ${element.id}`,
        );

        // 兄弟要素間の位置を計算
        let prevElement: Element | null = null;
        let nextElement: Element | null = null;

        for (let i = 0; i < siblings.length; i++) {
          const current = siblings[i];
          if (current.id === draggingElement?.id) continue; // ドラッグ中の要素自身は無視

          const currentBottom = current.y + current.height;

          if (mouseY < current.y) {
            nextElement = current;
            if (i > 0) prevElement = siblings[i - 1];
            break;
          } else if (mouseY < currentBottom) {
            const midpoint = current.y + current.height / 2;
            if (mouseY < midpoint) {
              nextElement = current;
              if (i > 0) prevElement = siblings[i - 1];
            } else {
              prevElement = current;
              if (i < siblings.length - 1) nextElement = siblings[i + 1];
            }
            break;
          } else {
            prevElement = current;
            if (i < siblings.length - 1) nextElement = siblings[i + 1];
          }
        }

        // between位置の計算 - 兄弟要素のdirectionを考慮してX座標を設定
        let insertX: number;
        let siblingDirection: DirectionType = 'right'; // デフォルト値

        // 兄弟要素のdirectionを取得（prevElementまたはnextElementから）
        if (prevElement && prevElement.direction) {
          siblingDirection = prevElement.direction;
        } else if (nextElement && nextElement.direction) {
          siblingDirection = nextElement.direction;
        } else if (element.direction && element.direction !== 'none') {
          siblingDirection = element.direction;
        }

        // directionに基づいてX座標を計算
        const parentElement = element.parentId ? elements[element.parentId] : null;
        if (parentElement) {
          insertX =
            siblingDirection === 'left'
              ? parentElement.x - OFFSET.X - (draggingElement?.width ?? 0)
              : parentElement.x + parentElement.width + OFFSET.X;
        } else {
          // 親がない場合（ルート要素の兄弟）
          insertX =
            siblingDirection === 'left'
              ? element.x - OFFSET.X - (draggingElement?.width ?? 0)
              : element.x + element.width + OFFSET.X;
        }

        if (prevElement && nextElement) {
          // 2つの要素の間
          const gap = nextElement.y - (prevElement.y + prevElement.height);
          result = {
            position: 'between',
            insertY: prevElement.y + prevElement.height + gap / 2,
            insertX,
            siblingInfo: { prevElement, nextElement },
            direction: siblingDirection,
          };
        } else if (prevElement) {
          // 最後の要素の後
          result = {
            position: 'between',
            insertY: prevElement.y + prevElement.height + OFFSET.Y,
            insertX,
            siblingInfo: { prevElement },
            direction: siblingDirection,
          };
        } else if (nextElement) {
          // 最初の要素の前
          result = {
            position: 'between',
            insertY: nextElement.y - OFFSET.Y,
            insertX,
            siblingInfo: { nextElement },
            direction: siblingDirection,
          };
        } else {
          // 要素が1つしかない場合や、ドラッグ中の要素のみの場合
          result = {
            position: 'between',
            insertY: element.y + element.height + OFFSET.Y,
            insertX,
            siblingInfo: {},
            direction: siblingDirection,
          };
        }

        debugLog(
          `Drop position mode (between siblings) - direction: ${siblingDirection}, insertX: ${insertX}`,
          'between',
        );
      }

      // 要素中心からの距離を計算
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;
      const distanceSq = dx * dx + dy * dy;

      // デバッグログ: 詳細な判定情報を出力
      debugLog(
        `[Position calc] Element ${element.id}: mouseInside=${isInsideElement}, onValidSide=${isOnValidSide}, position=${result.position}, distanceSq=${distanceSq.toFixed(2)}`,
      );

      if (isRootInMindmap) {
        debugLog(
          `[Root calc] Final result - position: ${result.position}, distanceSq: ${distanceSq}, insertY: ${result.insertY}, direction: ${result.direction}`,
        );
      }

      return { ...result, distanceSq };
    },
    [calculateChildPosition, draggingElement],
  );

  const findDropTarget = useCallback(
    (e: MouseEvent | TouchEvent, elements: ElementsMap): DropTargetInfo => {
      if (!draggingElement) return null;

      const zoomAdjustedPos = convertToZoomCoordinates(e);
      const mouseX = zoomAdjustedPos.x;
      const mouseY = zoomAdjustedPos.y;

      // 選択中の全要素のIDリストを取得（これらはドロップ先から除外する必要がある）
      const selectedElementIds = Object.values(elements)
        .filter((el) => el.selected)
        .map((el) => el.id);

      // ルート要素を取得
      const rootElement = Object.values(elements).find(
        (el) => el.direction === 'none' && el.parentId === null,
      );

      // ドラッグしている要素のdirectionを取得
      const draggingDirection = draggingElement?.direction || 'right';

      // マウス位置からドロップ先の方向を判定（ルート要素が存在する場合のみ）
      let targetDirection = draggingDirection;
      if (rootElement) {
        const rootCenterX = rootElement.x + rootElement.width / 2;
        if (mouseX < rootCenterX) {
          targetDirection = 'left';
        } else {
          targetDirection = 'right';
        }
        debugLog(
          `[Direction detection] mouse(${mouseX}), rootCenter(${rootCenterX}), targetDirection: ${targetDirection}`,
        );
      }

      // 候補となる要素をフィルタリング - 自分自身と選択中の要素を除外
      const candidates = Object.values(elements).filter((element) => {
        if (!element.visible || selectedElementIds.includes(element.id)) {
          return false;
        }

        // マウス位置が要素の範囲内かチェック
        const elemTop = element.y;
        const elemBottom = element.y + element.height;
        const elemLeft = element.x;
        const elemRight = element.x + element.width;

        // ルート要素の場合
        const isRootElement = element.direction === 'none' && element.parentId === null;

        let isInDropArea = false;

        if (isRootElement) {
          // ルート要素自体は候補から除外（子要素のみを対象とする）
          return false;
        } else {
          // 非ルート要素の場合
          // ルート要素の子要素の場合は、targetDirectionと一致する要素のみを候補とする
          if (element.parentId === rootElement?.id) {
            if (element.direction !== targetDirection) {
              debugLog(
                `[Direction filter] Excluding ${element.id} (direction: ${element.direction}, target: ${targetDirection})`,
              );
              return false; // 方向が一致しない子要素は除外
            }
          }

          // 要素の周辺領域を含めたドロップ可能範囲で判定
          const leftPadding = OFFSET.X;
          const rightPadding = OFFSET.X;

          const dropAreaTop = elemTop - OFFSET.Y;
          const dropAreaBottom = elemBottom + OFFSET.Y;
          const dropAreaLeft = elemLeft - leftPadding;
          const dropAreaRight = elemRight + rightPadding;

          isInDropArea =
            mouseX >= dropAreaLeft &&
            mouseX <= dropAreaRight &&
            mouseY >= dropAreaTop &&
            mouseY <= dropAreaBottom;

          if (isInDropArea) {
            debugLog(
              `[Candidate found] ${element.id} (direction: ${element.direction}, target: ${targetDirection})`,
            );
          }
        }

        return isInDropArea;
      });

      debugLog(`[findDropTarget] Found ${candidates.length} candidates`);
      candidates.forEach((candidate) => {
        const isRoot = candidate.direction === 'none' && candidate.parentId === null;
        debugLog(`[findDropTarget] Candidate: ${candidate.id}, isRoot: ${isRoot}`);
      });

      // 要素間の領域を検出 - direction別の空間検出を最優先で実行
      // すべての可視要素を親のIDでグループ化
      const elementsByParent: { [parentId: string]: Element[] } = {};

      Object.values(elements)
        .filter((el) => el.visible && !selectedElementIds.includes(el.id))
        .forEach((el) => {
          const parentId = el.parentId || 'root';
          if (!elementsByParent[parentId]) {
            elementsByParent[parentId] = [];
          }
          elementsByParent[parentId].push(el);
        });

      // 各グループを順序でソート
      for (const parentId in elementsByParent) {
        elementsByParent[parentId].sort((a, b) => a.y - b.y);
      }

      // 各グループ内で要素間の空間を検出 - directionを考慮（最優先）
      for (const [parentKey, groupElements] of Object.entries(elementsByParent)) {
        if (groupElements.length < 2) continue; // 少なくとも2つの要素が必要

        // 親要素を取得してルート要素かどうかを判定
        const parentElement = parentKey !== 'root' ? elements[parentKey] : null;
        const isParentRoot =
          parentElement && parentElement.direction === 'none' && parentElement.parentId === null;

        if (isParentRoot) {
          // ドラッグしている要素のdirectionを取得
          const draggingDirection = draggingElement?.direction || 'right';

          // ルート要素の子の場合、directionでグループ分け
          const leftChildren = groupElements
            .filter((el) => el.direction === 'left')
            .sort((a, b) => a.y - b.y);
          const rightChildren = groupElements
            .filter((el) => el.direction === 'right')
            .sort((a, b) => a.y - b.y);

          // ドラッグしている要素のdirectionに応じて、適切な領域のギャップのみをチェック
          if (draggingDirection === 'left') {
            // 左側の子要素間のスペースをチェック（left要素のドラッグ時のみ）
            for (let i = 0; i < leftChildren.length - 1; i++) {
              const currentElement = leftChildren[i];
              const nextElement = leftChildren[i + 1];

              // 要素間の空間を計算
              const gap = nextElement.y - (currentElement.y + currentElement.height);
              if (gap < 5) continue; // 最小ギャップの閾値

              // 要素間の領域を定義
              const gapAreaTop = currentElement.y + currentElement.height;
              const gapAreaBottom = nextElement.y;

              // 左側の要素なので、親要素の左側の範囲で判定
              const gapAreaLeft = parentElement.x - OFFSET.X * 2 - (draggingElement?.width ?? 0);
              const gapAreaRight = parentElement.x;

              debugLog(
                `[Left gap check] dragging:${draggingDirection}, mouse(${mouseX},${mouseY}), gapArea(${gapAreaLeft},${gapAreaTop},${gapAreaRight},${gapAreaBottom})`,
              );

              // マウスが要素間の空間にあるかチェック
              if (
                mouseX >= gapAreaLeft &&
                mouseX <= gapAreaRight &&
                mouseY >= gapAreaTop &&
                mouseY <= gapAreaBottom
              ) {
                debugLog(`[Left gap found] Between ${currentElement.id} and ${nextElement.id}`);
                return {
                  element: currentElement,
                  position: 'between',
                  insertY: gapAreaTop + gap / 2,
                  insertX: parentElement.x - OFFSET.X - (draggingElement?.width ?? 0),
                  siblingInfo: {
                    prevElement: currentElement,
                    nextElement: nextElement,
                  },
                };
              }
            }
          } else {
            // 右側の子要素間のスペースをチェック（right要素のドラッグ時のみ）
            for (let i = 0; i < rightChildren.length - 1; i++) {
              const currentElement = rightChildren[i];
              const nextElement = rightChildren[i + 1];

              // 要素間の空間を計算
              const gap = nextElement.y - (currentElement.y + currentElement.height);
              if (gap < 5) continue; // 最小ギャップの閾値

              // 要素間の領域を定義
              const gapAreaTop = currentElement.y + currentElement.height;
              const gapAreaBottom = nextElement.y;

              // 右側の要素なので、親要素の右側の範囲で判定
              const gapAreaLeft = parentElement.x + parentElement.width;
              const gapAreaRight = gapAreaLeft + OFFSET.X * 2 + (draggingElement?.width ?? 0);

              debugLog(
                `[Right gap check] dragging:${draggingDirection}, mouse(${mouseX},${mouseY}), gapArea(${gapAreaLeft},${gapAreaTop},${gapAreaRight},${gapAreaBottom})`,
              );

              // マウスが要素間の空間にあるかチェック
              if (
                mouseX >= gapAreaLeft &&
                mouseX <= gapAreaRight &&
                mouseY >= gapAreaTop &&
                mouseY <= gapAreaBottom
              ) {
                debugLog(`[Right gap found] Between ${currentElement.id} and ${nextElement.id}`);
                return {
                  element: currentElement,
                  position: 'between',
                  insertY: gapAreaTop + gap / 2,
                  insertX: parentElement.x + parentElement.width + OFFSET.X,
                  siblingInfo: {
                    prevElement: currentElement,
                    nextElement: nextElement,
                  },
                };
              }
            }
          }
        } else {
          // ルート以外の親の場合は従来の処理
          groupElements.sort((a, b) => a.y - b.y);

          for (let i = 0; i < groupElements.length - 1; i++) {
            const currentElement = groupElements[i];
            const nextElement = groupElements[i + 1];

            // 要素間の空間を計算
            const gap = nextElement.y - (currentElement.y + currentElement.height);
            if (gap < 5) continue; // 最小ギャップの閾値

            // 要素間の領域を定義
            const gapAreaTop = currentElement.y + currentElement.height;
            const gapAreaBottom = nextElement.y;

            // X座標の検出範囲を定義
            const currentElementRight = currentElement.x + currentElement.width;
            const nextElementRight = nextElement.x + nextElement.width;
            const gapAreaLeft = Math.min(currentElement.x, nextElement.x);
            const gapAreaRight = Math.max(currentElementRight, nextElementRight);

            // マウスが要素間の空間にあるかチェック
            if (
              mouseX >= gapAreaLeft &&
              mouseX <= gapAreaRight &&
              mouseY >= gapAreaTop &&
              mouseY <= gapAreaBottom
            ) {
              // 要素間の空間が見つかった場合、betweenモードでのドロップを提案
              return {
                element: currentElement,
                position: 'between',
                insertY: gapAreaTop + gap / 2,
                siblingInfo: {
                  prevElement: currentElement,
                  nextElement: nextElement,
                },
              };
            }
          }
        }
      }

      // グループの最後の要素の下部領域の検出
      for (const [parentKey, groupElements] of Object.entries(elementsByParent)) {
        if (groupElements.length === 0) continue;

        // 親要素を取得してルート要素かどうかを判定
        const parentElement = parentKey !== 'root' ? elements[parentKey] : null;
        const isParentRoot =
          parentElement && parentElement.direction === 'none' && parentElement.parentId === null;

        if (isParentRoot) {
          // ドラッグしている要素のdirectionを取得
          const draggingDirection = draggingElement?.direction || 'right';

          // ルート要素の子の場合、directionで分けて最後の要素を取得
          const filteredElements = groupElements.filter((el) =>
            draggingDirection === 'left' ? el.direction === 'left' : el.direction === 'right',
          );

          if (filteredElements.length === 0) continue;

          // グループ内で最も下にある要素を探す
          const lastElement = filteredElements.reduce((last, current) => {
            return current.y + current.height > last.y + last.height ? current : last;
          }, filteredElements[0]);

          // direction別の検出範囲を計算
          let groupLeft, groupRight;
          if (draggingDirection === 'left') {
            // 左側の要素の場合
            groupLeft = parentElement.x - OFFSET.X * 2 - (draggingElement?.width ?? 0);
            groupRight = parentElement.x;
          } else {
            // 右側の要素の場合
            groupLeft = parentElement.x + parentElement.width;
            groupRight = groupLeft + OFFSET.X * 2 + (draggingElement?.width ?? 0);
          }

          const bottomThreshold = lastElement.y + lastElement.height + OFFSET.Y * 2;

          debugLog(
            `[Bottom area check] dragging:${draggingDirection}, mouse(${mouseX},${mouseY}), bottomArea(${groupLeft},${lastElement.y + lastElement.height},${groupRight},${bottomThreshold})`,
          );

          if (
            mouseX >= groupLeft &&
            mouseX <= groupRight &&
            mouseY >= lastElement.y + lastElement.height &&
            mouseY <= bottomThreshold
          ) {
            // 最後の要素の下部にドロップする場合
            const insertX =
              draggingDirection === 'left'
                ? parentElement.x - OFFSET.X - (draggingElement?.width ?? 0)
                : parentElement.x + parentElement.width + OFFSET.X;

            debugLog(
              `[Bottom area found] Below ${lastElement.id}, direction: ${draggingDirection}`,
            );
            return {
              element: lastElement,
              position: 'between',
              insertY: lastElement.y + lastElement.height + OFFSET.Y,
              insertX: insertX,
              siblingInfo: { prevElement: lastElement },
            };
          }
        } else {
          // ルート以外の親の場合は従来の処理
          // グループ内で最も下にある要素を探す
          const lastElement = groupElements.reduce((last, current) => {
            return current.y + current.height > last.y + last.height ? current : last;
          }, groupElements[0]);

          // マウスがこのグループの水平範囲内で、最後の要素よりも下にあるかチェック
          let groupLeft, groupRight;

          if (parentElement) {
            // 親要素がある場合は親の右側から検出範囲を計算
            groupLeft = parentElement.x + parentElement.width;
            groupRight = groupLeft + OFFSET.X * 2 + lastElement.width;
          } else {
            // ルート要素の場合
            groupLeft = lastElement.x - OFFSET.X;
            groupRight = lastElement.x + lastElement.width + OFFSET.X;
          }

          const bottomThreshold = lastElement.y + lastElement.height + OFFSET.Y * 2;

          if (
            mouseX >= groupLeft &&
            mouseX <= groupRight &&
            mouseY >= lastElement.y + lastElement.height &&
            mouseY <= bottomThreshold
          ) {
            // 最後の要素の下部にドロップする場合
            return {
              element: lastElement,
              position: 'between',
              insertY: lastElement.y + lastElement.height + OFFSET.Y,
              siblingInfo: { prevElement: lastElement },
            };
          }
        }
      }

      // 要素間空間が見つからなかった場合、通常の候補要素による検索を実行

      let closestTarget: DropTargetInfo = null;
      let minSquaredDistance = Infinity;

      for (const element of candidates) {
        const { position, distanceSq, insertY, insertX, siblingInfo, direction } =
          calculatePositionAndDistance(element, mouseX, mouseY, elements);

        // ルート要素への左側または右側のドロップには優先度を与える
        const isRootElement = element.direction === 'none' && element.parentId === null;
        const isValidRootSideDrop =
          isRootElement && (position === 'child' || position === 'between');

        debugLog(
          `[findDropTarget] Checking element ${element.id}, isRoot: ${isRootElement}, position: ${position}, distance: ${distanceSq}`,
        );

        if (isValidRootSideDrop) {
          debugLog(
            `[findDropTarget] PRIORITY: Valid root side drop detected for element ${element.id}, position: ${position}`,
          );
          // ルート要素への側面ドロップは最高優先度
          closestTarget = { element, position, insertY, insertX, siblingInfo, direction };
          debugLog(
            `[findDropTarget] Root side drop - direction: ${direction}, insertX: ${insertX}`,
          );
          break; // ルート要素が見つかったら即座に選択
        } else if (distanceSq < minSquaredDistance) {
          minSquaredDistance = distanceSq;
          closestTarget = { element, position, insertY, insertX, siblingInfo, direction };
          debugLog(
            `[findDropTarget] New closest: ${element.id}, distance: ${distanceSq}, direction: ${direction}`,
          );
        }
      }

      if (closestTarget) {
        debugLog(
          `[findDropTarget] Final selection: ${closestTarget.element.id}, position: ${closestTarget.position}, direction: ${closestTarget.direction}`,
        );
      } else {
        debugLog(`[findDropTarget] No drop target found in candidates`);

        // 候補が見つからない場合、ルート要素への直接ドロップを検討
        if (rootElement) {
          const rootCenterX = rootElement.x + rootElement.width / 2;
          const dropAreaTop = rootElement.y - OFFSET.Y;
          const dropAreaBottom = rootElement.y + rootElement.height + OFFSET.Y;

          // 左側領域への直接ドロップ
          const leftAreaLeft = rootElement.x - OFFSET.X * 2 - (draggingElement?.width ?? 0);
          const leftAreaRight = rootCenterX;

          // 右側領域への直接ドロップ
          const rightAreaLeft = rootCenterX;
          const rightAreaRight =
            rootElement.x + rootElement.width + OFFSET.X * 2 + (draggingElement?.width ?? 0);

          if (mouseY >= dropAreaTop && mouseY <= dropAreaBottom) {
            if (mouseX >= leftAreaLeft && mouseX <= leftAreaRight) {
              // 左側領域への直接ドロップ
              debugLog(`[findDropTarget] Direct drop to root left area`);
              return {
                element: rootElement,
                position: 'child',
                insertY: rootElement.y + rootElement.height / 2,
                insertX: rootElement.x - OFFSET.X,
                direction: 'left',
              };
            } else if (mouseX >= rightAreaLeft && mouseX <= rightAreaRight) {
              // 右側領域への直接ドロップ
              debugLog(`[findDropTarget] Direct drop to root right area`);
              return {
                element: rootElement,
                position: 'child',
                insertY: rootElement.y + rootElement.height / 2,
                insertX: rootElement.x + rootElement.width + OFFSET.X,
                direction: 'right',
              };
            }
          }
        }

        debugLog(`[findDropTarget] No valid drop target found`);
      }

      return closestTarget;
    },
    [draggingElement, convertToZoomCoordinates, calculatePositionAndDistance],
  );

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLElement | SVGElement> | React.TouchEvent<HTMLElement | SVGElement>,
      element: Element,
    ) => {
      // 要素が選択状態でない場合はドラッグを開始しない
      if (!element.selected || !element.parentId) {
        return;
      }

      // stopPropagationが存在する場合のみ呼び出す
      if (e.stopPropagation && typeof e.stopPropagation === 'function') {
        e.stopPropagation();
      }

      // nativeEventが存在しない場合の対処
      if (!e.nativeEvent) {
        console.warn(`[DEBUG] nativeEvent is missing for element ${element.id}`);
        return;
      }

      let nativeEvent: MouseEvent | TouchEvent;
      if (e.nativeEvent instanceof TouchEvent) {
        if (e.preventDefault && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        nativeEvent = e.nativeEvent;
      } else {
        nativeEvent = e.nativeEvent;
      }

      const zoomAdjustedPos = convertToZoomCoordinates(nativeEvent);

      setDraggingElement(element);
      setDragStartOffset({
        x: zoomAdjustedPos.x - element.x,
        y: zoomAdjustedPos.y - element.y,
      });

      debugLog(
        `[Drag started] Element: ${element.id}, startPos: (${zoomAdjustedPos.x}, ${zoomAdjustedPos.y})`,
      );

      // ドラッグ開始時に選択されている全要素の元の位置を保存
      elementOriginalPositions.current.clear();
      const selectedElements = Object.values(elementsMap).filter((el): el is Element => {
        const element = el as Element;
        return element.selected;
      });

      selectedElements.forEach((el) => {
        const element = el as Element;
        elementOriginalPositions.current.set(element.id, { x: element.x, y: element.y });
      });
    },
    [convertToZoomCoordinates, elementsMap, dispatch],
  );

  const resetElementsPosition = useCallback(() => {
    const selectedElements = Object.values(elementsMap).filter((el): el is Element => {
      const element = el as Element;
      return element.selected;
    });
    selectedElements.forEach((element) => {
      // 保存した元の位置情報を使用
      const originalPos = elementOriginalPositions.current.get(element.id);
      if (originalPos) {
        dispatch({
          type: 'MOVE_ELEMENT',
          payload: { id: element.id, x: originalPos.x, y: originalPos.y },
        });
      }
    });
    // 状態をリセット
    setDraggingElement(null);
    elementOriginalPositions.current.clear();
  }, [elementsMap, dispatch]);

  // 要素をドロップする際の親変更を検証する関数
  const validateParentChange = useCallback(
    (element: Element, newParentId: string | null): { isValid: boolean; errorMessage?: string } => {
      // 新しい親IDがない場合は有効（ルート要素への移動）
      if (newParentId === null) {
        return { isValid: true };
      }

      // 自分自身を親にしようとしている場合は無効
      if (element.id === newParentId) {
        debugLog(
          `無効な操作: 自分自身を親にしようとしています element=${element.id}, newParentId=${newParentId}`,
        );
        return {
          isValid: false,
          errorMessage: ToastMessages.dropSelfChild,
        };
      }

      // 自身の子孫要素に移動しようとしている場合は無効
      if (isDescendant(elementsMap, element.id, newParentId)) {
        // 直接の子要素への移動かどうかを判定
        const isDirectChild = elementsMap[newParentId]?.parentId === element.id;
        debugLog(
          `無効な操作: ${isDirectChild ? '自身の子要素' : '循環参照'} element=${element.id}, newParentId=${newParentId}`,
        );
        return {
          isValid: false,
          errorMessage: isDirectChild
            ? ToastMessages.dropSelfChild
            : ToastMessages.dropCircularReference,
        };
      }

      // 階層構造の制約チェック
      const newParentDepth = newParentId ? elementsMap[newParentId]?.depth || 0 : 0;
      const maxAllowedDepth = 10; // 最大深さの制限値
      if (newParentDepth >= maxAllowedDepth) {
        debugLog(`無効な操作: 最大深さ超過 currentDepth=${newParentDepth}, max=${maxAllowedDepth}`);
        return {
          isValid: false,
          errorMessage: ToastMessages.dropInvalidHierarchy,
        };
      }

      return { isValid: true };
    },
    [elementsMap],
  );

  // 子要素としてドロップする処理
  const processChildDrop = useCallback(
    (target: Element, selectedElements: Element[]): boolean => {
      // 自身の子孫要素への移動チェック
      const invalidElement = selectedElements.find(
        (el) => !validateParentChange(el, target.id).isValid,
      );
      if (invalidElement) {
        const { errorMessage } = validateParentChange(invalidElement, target.id);
        addToast(errorMessage || ToastMessages.dropChildElement, 'warn');
        resetElementsPosition();
        return false;
      }

      dispatch({ type: 'SNAPSHOT' });

      // 全要素に対して移動処理
      selectedElements.forEach((element, index) => {
        // 方向の計算
        let newDirection: DirectionType | undefined = undefined;
        const isTargetRoot = target.direction === 'none' && target.parentId === null;

        if (isTargetRoot) {
          // ルート要素の場合、ドロップターゲット情報から方向を決定
          if (currentDropTarget?.direction) {
            newDirection = currentDropTarget.direction;
            debugLog(
              `[processChildDrop] Using dropTarget direction: ${newDirection} for element ${element.id}`,
            );
          } else if (currentDropTarget?.insertX !== undefined) {
            // fallback: insertXから方向を判定
            const rootCenterX = target.x + target.width / 2;
            newDirection = currentDropTarget.insertX < rootCenterX ? 'left' : 'right';
            debugLog(
              `[processChildDrop] Fallback direction from insertX: ${newDirection} for element ${element.id}`,
            );
          } else {
            // fallback: 要素の現在位置に基づいて判定
            newDirection = element.x < target.x ? 'left' : 'right';
            debugLog(
              `[processChildDrop] Fallback direction from element position: ${newDirection} for element ${element.id}`,
            );
          }
        } else {
          // ルート要素以外の場合、親の方向を継承
          newDirection = target.direction || 'right';
        }

        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: element.id,
            newParentId: target.id,
            newOrder: target.children + index,
            direction: newDirection,
          },
        });
      });
      return true;
    },
    [validateParentChange, addToast, resetElementsPosition, dispatch, currentDropTarget],
  );

  // 兄弟要素間にドロップする処理
  const processBetweenDrop = useCallback(
    (target: Element, selectedElements: Element[]): boolean => {
      // ドロップ処理時のデバッグログを追加
      debugLog(
        `[processBetweenDrop] target=${target.id}, siblingInfo: ${JSON.stringify({
          prevElementId: currentDropTarget?.siblingInfo?.prevElement?.id,
          nextElementId: currentDropTarget?.siblingInfo?.nextElement?.id,
        })}`,
      );

      // 要素間へのドロップ処理
      let newParentId: string | null;

      if (currentDropTarget?.siblingInfo) {
        // 要素間へのドロップ
        const { prevElement, nextElement } = currentDropTarget.siblingInfo;

        if (prevElement && nextElement) {
          // 2つの要素の間にドロップする場合
          debugLog(`  Between two elements: prev=${prevElement.id}, next=${nextElement.id}`);
          newParentId = prevElement.parentId;
        } else if (prevElement) {
          // 最後の要素の後にドロップする場合
          debugLog(`  After last element: prev=${prevElement.id}`);
          newParentId = prevElement.parentId;
        } else if (nextElement) {
          // 最初の要素の前にドロップする場合
          debugLog(`  Before first element: next=${nextElement.id}`);
          newParentId = nextElement.parentId;
        } else {
          // siblingInfoはあるがprevElementもnextElementもない場合
          // 子要素が存在しない場合、親要素の子要素として追加
          debugLog(`  No siblings: target=${target.id}`);
          newParentId = target.id;
        }
      } else {
        // 子要素が存在しない場合、親要素の子要素として追加
        debugLog(`  No siblings info: target=${target.id}`);
        newParentId = target.id;
      }

      // parentIdがnullの場合、ルート要素以外はドロップできないようにする
      if (newParentId === null && !selectedElements.every((el) => el.depth === 1)) {
        addToast(ToastMessages.invalidDrop, 'warn');
        resetElementsPosition();
        return false;
      }

      // 無効な親変更をチェック
      const invalidElement = selectedElements.find(
        (el) => !validateParentChange(el, newParentId).isValid,
      );
      if (invalidElement) {
        const { errorMessage } = validateParentChange(invalidElement, newParentId);
        addToast(errorMessage || ToastMessages.dropChildElement, 'warn');
        resetElementsPosition(); // 必ず位置をリセットする
        return false;
      }

      dispatch({ type: 'SNAPSHOT' });

      // ドラッグ中の要素が移動元と移動先で同じparentIdを持つ場合の処理
      const isMovingWithinSameParent = selectedElements.some((el) => el.parentId === newParentId);

      // 移動対象の要素の現在のorder値を取得
      const draggedElements = selectedElements.filter((el) => el.parentId === newParentId);
      const targetOrderValues = calculateTargetOrderValues(currentDropTarget, draggedElements);

      if (isMovingWithinSameParent) {
        // 同じ親内での移動の場合、要素の順序を正しく更新
        moveElementsWithinSameParent(draggedElements, targetOrderValues.baseOrder, newParentId);
      } else {
        // 異なる親への移動、または同じ親でも後続要素のorderを調整
        adjustOrdersForNewElements(
          targetOrderValues.baseOrder,
          selectedElements.length,
          newParentId,
        );
      }

      // 全要素に対して移動処理
      // 複数要素をドロップする場合、挿入による配列変化を考慮して逆順で処理
      // 逆順で処理することで、後の要素の挿入位置が前の要素の挿入により影響を受けない
      const elementsToProcess = [...selectedElements].reverse();

      elementsToProcess.forEach((element, _index) => {
        // 方向の計算
        let newDirection: DirectionType | undefined = undefined;

        if (newParentId) {
          const newParent = elementsMap[newParentId];
          const isNewParentRoot = newParent?.direction === 'none' && newParent?.parentId === null;

          if (isNewParentRoot) {
            // 新しい親がルート要素の場合
            if (currentDropTarget?.direction) {
              // ドロップターゲットに方向情報がある場合はそれを使用
              newDirection = currentDropTarget.direction;
              debugLog(
                `[processBetweenDrop] Using dropTarget direction: ${newDirection} for element ${element.id}`,
              );
            } else if (currentDropTarget?.siblingInfo) {
              // betweenモードで兄弟要素の間にドロップする場合、兄弟要素のdirectionを継承
              const { prevElement, nextElement } = currentDropTarget.siblingInfo;
              if (prevElement && prevElement.direction) {
                newDirection = prevElement.direction;
              } else if (nextElement && nextElement.direction) {
                newDirection = nextElement.direction;
              } else {
                // 兄弟要素のdirectionが取得できない場合、マウス位置で判定
                if (currentDropTarget && target) {
                  const rootCenterX = target.x + target.width / 2;
                  const mousePos =
                    currentDropTarget.insertX !== undefined
                      ? currentDropTarget.insertX
                      : rootCenterX;
                  newDirection = mousePos < rootCenterX ? 'left' : 'right';
                } else {
                  newDirection = 'right';
                }
              }
            } else {
              // 通常のドロップ（betweenモードではない）の場合、マウス位置で判定
              if (currentDropTarget && target) {
                const rootCenterX = target.x + target.width / 2;
                const mousePos =
                  currentDropTarget.insertX !== undefined ? currentDropTarget.insertX : rootCenterX;
                newDirection = mousePos < rootCenterX ? 'left' : 'right';
              } else {
                newDirection = 'right';
              }
            }
          } else {
            // 新しい親がルート要素以外の場合、親の方向を継承
            newDirection = newParent?.direction || 'right';
          }
        }

        // 逆順処理における各要素の挿入位置を計算
        // 最初の要素（逆順処理では最後に選択された要素）は baseOrder の位置に挿入
        // 後続の要素は baseOrder の位置に挿入（逆順なので同じ位置に連続挿入される）
        const finalOrder = targetOrderValues.baseOrder;

        console.log(
          '[processBetweenDrop] Dispatching DROP_ELEMENT for:',
          element.id,
          'newOrder:',
          finalOrder,
          'newParentId:',
          newParentId,
        );

        dispatch({
          type: 'DROP_ELEMENT',
          payload: {
            id: element.id,
            newParentId,
            newOrder: finalOrder,
            direction: newDirection,
          },
        });
      });
      return true;
    },
    [
      currentDropTarget,
      validateParentChange,
      addToast,
      resetElementsPosition,
      dispatch,
      elementsMap,
    ],
  );

  // ドロップ先のorder値を計算する関数
  const calculateTargetOrderValues = useCallback(
    (dropTarget: DropTargetInfo, draggedElements: Element[]) => {
      let baseOrder = 0;

      console.log('[calculateTargetOrderValues] DropTarget:', dropTarget);
      console.log(
        '[calculateTargetOrderValues] DraggedElements:',
        draggedElements.map((el) => el.id),
      );

      if (dropTarget?.siblingInfo) {
        const { prevElement, nextElement } = dropTarget.siblingInfo;

        // between ドロップの場合、兄弟要素の親を取得
        let targetParentId: string | null = null;
        if (prevElement) {
          targetParentId = prevElement.parentId;
        } else if (nextElement) {
          targetParentId = nextElement.parentId;
        } else {
          // 兄弟要素がない場合は、ドロップターゲットを親とする
          targetParentId = dropTarget.element.id;
        }

        // ドラッグ中の要素のIDリストを作成
        const draggedElementIds = draggedElements.map((el) => el.id);

        // 同じ親を持つ兄弟要素を取得（ドラッグ中の要素を除外）
        const siblings = Object.values(elementsMap)
          .filter(
            (el): el is Element =>
              el.visible && el.parentId === targetParentId && !draggedElementIds.includes(el.id), // ドラッグ中の要素を除外
          )
          .sort((a, b) => a.y - b.y); // Y座標で並び替え

        if (prevElement && nextElement) {
          // 2つの要素の間にドロップする場合
          const nextIndex = siblings.findIndex((el) => el.id === nextElement.id);
          baseOrder = Math.max(0, nextIndex); // nextElementの位置に挿入
        } else if (prevElement) {
          // 最後の要素の後にドロップする場合
          const prevIndex = siblings.findIndex((el) => el.id === prevElement.id);
          baseOrder = prevIndex >= 0 ? prevIndex + 1 : siblings.length; // prevElementの次の位置に挿入
        } else if (nextElement) {
          // 最初の要素の前にドロップする場合
          baseOrder = 0; // 配列の最初に挿入
        } else {
          // 兄弟要素がない場合（最初の子要素として追加）
          baseOrder = 0;
          console.log('[calculateTargetOrderValues] No siblings - baseOrder:', baseOrder);
        }
      } else if (dropTarget) {
        // child ドロップの場合
        const targetParentId = dropTarget.element.id;
        const siblings = Object.values(elementsMap).filter(
          (el): el is Element => el.visible && el.parentId === targetParentId,
        );
        baseOrder = siblings.length; // 末尾に追加
        console.log(
          '[calculateTargetOrderValues] Child drop - siblings length:',
          siblings.length,
          'baseOrder:',
          baseOrder,
        );
      }

      console.log('[calculateTargetOrderValues] Final baseOrder:', baseOrder);
      return { baseOrder };
    },
    [elementsMap],
  );

  // 階層構造での要素移動時の配列順序調整関数（現在は階層操作で自動処理されるため削除予定）
  const moveElementsWithinSameParent = useCallback(
    (_draggedElements: Element[], _targetIndex: number, _elementParentId: string | null) => {
      // 階層構造では配列の順序で管理されるため、orderベースのロジックを階層操作に置き換える
      // この実装は階層構造の操作で自動的に処理されるため、ここでは何もしない
    },
    [],
  );

  // 新しい要素追加時の配列順序調整関数（現在は階層操作で自動処理されるため削除予定）
  const adjustOrdersForNewElements = useCallback(
    (_baseIndex: number, _count: number, _elementParentId: string | null) => {
      // 階層構造では配列の順序で管理されるため、orderベースのロジックを階層操作に置き換える
      // この実装は階層構造の操作で自動的に処理されるため、ここでは何もしない
    },
    [],
  );

  const handleMouseUp = useCallback(async () => {
    if (!draggingElement) return;

    try {
      const selectedElements = Object.values(elementsMap).filter(
        (el): el is Element => el.selected,
      );

      if (currentDropTarget) {
        const { element: target, position } = currentDropTarget;

        // 直接自身の子孫要素かチェック
        const invalidElement = selectedElements.find(
          (el) => !validateParentChange(el, target.id).isValid,
        );
        if (invalidElement) {
          const { errorMessage } = validateParentChange(invalidElement, target.id);
          addToast(errorMessage || ToastMessages.dropChildElement, 'warn');
          resetElementsPosition();
          return;
        }

        let dropSuccess = false;
        if (position === 'child') {
          // 子要素としてドロップ
          dropSuccess = processChildDrop(target, selectedElements);
        } else if (position === 'between') {
          // 要素間（右側）にドロップ
          dropSuccess = processBetweenDrop(target, selectedElements);
        }

        if (!dropSuccess) {
          resetElementsPosition();
          return;
        }
      } else {
        resetElementsPosition();
      }
    } catch (error) {
      // エラーが発生した場合はログを記録
      debugLog('Drag error:', error);
      addToast(ToastMessages.dragError, 'warn');
      resetElementsPosition();
    } finally {
      // 状態のリセットを確実に行う
      setDraggingElement(null);
      setCurrentDropTarget(null);
      elementOriginalPositions.current.clear();
    }
  }, [
    draggingElement,
    currentDropTarget,
    elementsMap,
    dispatch,
    addToast,
    resetElementsPosition,
    processChildDrop,
    processBetweenDrop,
    validateParentChange,
  ]);

  // ドラッグ中に実行される処理
  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!draggingElement) return;

      if (e instanceof TouchEvent && e.touches.length === 1) {
        e.preventDefault();
      }

      const dropTarget = findDropTarget(e, elementsMap);

      // 新しいドロップターゲットと現在のドロップターゲットを比較し、
      // 実際に変更がある場合のみステートを更新する
      const isTargetChanged =
        (!currentDropTarget && dropTarget) ||
        (currentDropTarget && !dropTarget) ||
        (currentDropTarget &&
          dropTarget &&
          (currentDropTarget.element.id !== dropTarget.element.id ||
            // childモードの場合は、同じ要素上にドロップする際にポジションの変更をスキップする
            // betweenモードの場合は、子要素の間に挿入するため、挿入位置の変更を許可する
            currentDropTarget.position !== dropTarget.position ||
            (dropTarget.position === 'between' &&
              currentDropTarget.insertY !== dropTarget.insertY)));

      if (isTargetChanged) {
        debugLog(`[setCurrentDropTarget] Setting drop target:`, dropTarget);
        if (dropTarget) {
          debugLog(
            `[setCurrentDropTarget] Direction: ${dropTarget.direction}, InsertX: ${dropTarget.insertX}`,
          );
        }
        setCurrentDropTarget(dropTarget);
      }

      const zoomAdjustedPos = convertToZoomCoordinates(e);
      const newPosition = {
        x: zoomAdjustedPos.x - dragStartOffset.x,
        y: zoomAdjustedPos.y - dragStartOffset.y,
      };

      dispatch({
        type: 'MOVE_ELEMENT',
        payload: { id: draggingElement.id, ...newPosition },
      });
    },
    [
      draggingElement,
      currentDropTarget,
      elementsMap,
      findDropTarget,
      convertToZoomCoordinates,
      dragStartOffset,
      dispatch,
    ],
  );

  useEffect(() => {
    if (!draggingElement) return;

    const handleMouseMove = (e: MouseEvent) => handleMove(e);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) handleMove(e);
    };

    const handleMouseUpGlobal = () => handleMouseUp();
    const handleTouchEnd = () => handleMouseUp();

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUpGlobal);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleMouseUpGlobal);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [draggingElement, handleMove, handleMouseUp]);

  return {
    handleMouseDown,
    handleMouseUp,
    currentDropTarget: currentDropTarget?.element || null,
    dropPosition: currentDropTarget?.position || null,
    draggingElement,
    dropInsertY: currentDropTarget?.insertY || undefined,
    dropInsertX: currentDropTarget?.insertX || undefined,
    dropTargetDirection: currentDropTarget?.direction || undefined,
    siblingInfo: currentDropTarget?.siblingInfo || null,
    isDragInProgress: !!draggingElement, // draggingElementがnullでない場合にtrue
  };
};
