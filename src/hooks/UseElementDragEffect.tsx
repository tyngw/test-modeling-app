/**
 * useElementDragEffect
 *
 * マインドマップ形式のドラッグ＆ドロップ機能を提供します。
 * 要素間の階層的な親子関係を視覚的に構築・管理します。
 */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  findParentNodeInHierarchy,
  getSelectedElementsFromHierarchy,
} from '../utils/hierarchical/hierarchicalConverter';
import { Element } from '../types/types';
import { useCanvas } from '../context/CanvasContext';
import { ToastMessages } from '../constants/toastMessages';
import { useToast } from '../context/ToastContext';
import { debugLog } from '../utils/debugLogHelpers';

// 分離されたモジュールからインポート
import { Position, DropTargetInfo, ElementDragEffectResult } from './useElementDragEffect/types';
import { convertToZoomCoordinates } from './useElementDragEffect/coordinateUtils';
import { findDropTarget } from './useElementDragEffect/dropTargetCalculator';
import {
  validateParentChange,
  processChildDrop,
  processBetweenDrop,
} from './useElementDragEffect/dropProcessor';
import {
  calculateTargetOrderValues,
  moveElementsWithinSameParent,
  adjustOrdersForNewElements,
} from './useElementDragEffect/orderCalculator';

// 型を再エクスポート（後方互換性のため）
export type { DropTargetInfo, ElementDragEffectResult };

interface DragEffectOptions {
  viewBoxOffsets?: { minX: number; minY: number };
  resolveEventCoordinates?: (event: MouseEvent | TouchEvent) => { x: number; y: number } | null;
  onDragMove?: (event: MouseEvent | TouchEvent) => void;
  onDragEnd?: () => void;
}

export const useElementDragEffect = ({
  viewBoxOffsets = { minX: 0, minY: 0 },
  resolveEventCoordinates,
  onDragMove,
  onDragEnd,
}: DragEffectOptions = {}): ElementDragEffectResult => {
  const { state, dispatch } = useCanvas();
  const { addToast } = useToast();

  const [draggingElement, setDraggingElement] = useState<Element | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<Position>({ x: 0, y: 0 });
  const [currentDropTarget, setCurrentDropTarget] = useState<DropTargetInfo>(null);
  // 元の位置を各要素ごとに記録するためのMap
  const elementOriginalPositions = useRef<Map<string, Position>>(new Map());

  const resolveCoordinates = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (resolveEventCoordinates) {
        const customPoint = resolveEventCoordinates(event);
        if (customPoint) {
          return customPoint;
        }
      }
      return convertToZoomCoordinates(event, state.zoomRatio, viewBoxOffsets);
    },
    [resolveEventCoordinates, state.zoomRatio, viewBoxOffsets],
  );

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent<HTMLElement | SVGElement> | React.TouchEvent<HTMLElement | SVGElement>,
      element: Element,
    ) => {
      // 要素が選択状態でない場合、またはルート要素の場合はドラッグを開始しない
      const parentNode = state.hierarchicalData
        ? findParentNodeInHierarchy(state.hierarchicalData, element.id)
        : null;
      if (!element.selected || (!parentNode && element.direction !== 'none')) {
        return;
      }

      // stopPropagationが存在する場合のみ呼び出す
      if (e.stopPropagation && typeof e.stopPropagation === 'function') {
        e.stopPropagation();
      }

      // nativeEventが存在しない場合の対処
      if (!e.nativeEvent) {
        // ネイティブイベントが不足している場合の警告をdebugLogで出力
        debugLog(`[DEBUG] nativeEvent is missing for element ${element.id}`);
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

      const zoomAdjustedPos = resolveCoordinates(nativeEvent);

      setDraggingElement(element);
      setDragStartOffset({
        x: zoomAdjustedPos.x - element.x,
        y: zoomAdjustedPos.y - element.y,
      });

      // ドラッグ開始時に選択されている全要素の元の位置を保存（階層構造ベース）
      elementOriginalPositions.current.clear();
      const selectedElements = state.hierarchicalData
        ? getSelectedElementsFromHierarchy(state.hierarchicalData)
        : [];

      selectedElements.forEach((el) => {
        const element = el as Element;
        elementOriginalPositions.current.set(element.id, { x: element.x, y: element.y });
      });
    },
    [state.hierarchicalData, resolveCoordinates],
  );

  const resetElementsPosition = useCallback(() => {
    const selectedElements = state.hierarchicalData
      ? getSelectedElementsFromHierarchy(state.hierarchicalData)
      : [];
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
  }, [state.hierarchicalData, dispatch]);

  const handleMouseUp = useCallback(async () => {
    if (!draggingElement) return;

    try {
      const selectedElements = state.hierarchicalData
        ? getSelectedElementsFromHierarchy(state.hierarchicalData)
        : [];

      if (currentDropTarget) {
        const { element: target, position } = currentDropTarget;

        // 直接自身の子孫要素かチェック
        const invalidElement = selectedElements.find(
          (el) => !validateParentChange(el, target.id, state.hierarchicalData).isValid,
        );
        if (invalidElement) {
          const { errorMessage } = validateParentChange(
            invalidElement,
            target.id,
            state.hierarchicalData,
          );
          addToast(errorMessage || ToastMessages.dropChildElement, 'warn');
          resetElementsPosition();
          return;
        }

        // ドロップ処理の共通パラメータを準備
        const dropParams = {
          hierarchicalData: state.hierarchicalData,
          currentDropTarget,
          dispatch,
          addToast,
          resetElementsPosition,
          calculateTargetOrderValues,
          moveElementsWithinSameParent,
          adjustOrdersForNewElements,
        };

        let dropSuccess = false;
        if (position === 'child') {
          // 子要素としてドロップ
          dropSuccess = processChildDrop(target, selectedElements, dropParams);
        } else if (position === 'between') {
          // 要素間（右側）にドロップ
          dropSuccess = processBetweenDrop(target, selectedElements, dropParams);
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
      if (onDragEnd) {
        onDragEnd();
      }
    }
  }, [
    draggingElement,
    currentDropTarget,
    dispatch,
    addToast,
    resetElementsPosition,
    state.hierarchicalData,
    onDragEnd,
  ]);

  // ドラッグ中に実行される処理
  const handleMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!draggingElement) return;

      if (e instanceof TouchEvent && e.touches.length === 1) {
        e.preventDefault();
      }

      const dropTarget = findDropTarget({
        event: e,
        draggingElement,
        hierarchicalData: state.hierarchicalData,
        zoomRatio: state.zoomRatio,
        convertToZoomCoordinates: (event, _ratio) => resolveCoordinates(event),
      });

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
              currentDropTarget.insertY !== dropTarget.insertY) ||
            currentDropTarget.direction !== dropTarget.direction ||
            currentDropTarget.insertX !== dropTarget.insertX));

      if (isTargetChanged) {
        setCurrentDropTarget(dropTarget);
      }

      const zoomAdjustedPos = resolveCoordinates(e);
      const newPosition = {
        x: zoomAdjustedPos.x - dragStartOffset.x,
        y: zoomAdjustedPos.y - dragStartOffset.y,
      };

      dispatch({
        type: 'MOVE_ELEMENT',
        payload: { id: draggingElement.id, ...newPosition },
      });

      if (onDragMove) {
        onDragMove(e);
      }
    },
    [
      draggingElement,
      currentDropTarget,
      dragStartOffset,
      dispatch,
      state.zoomRatio,
      state.hierarchicalData,
      resolveCoordinates,
      onDragMove,
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
