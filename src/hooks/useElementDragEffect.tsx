// src/hooks/useElementDragEffect.tsx
'use client';

/**
 * useElementDragEffect
 *
 * このカスタムフックは、キャンバス内の要素に対するドラッグ＆ドロップ機能を提供します。
 * 要素のドラッグ中の状態を管理し、ドロップターゲットを計算し、要素の位置を更新します。
 *
 * 主な機能:
 * - 現在ドラッグ中の要素とマウス位置からのオフセットを追跡します。
 * - マウス位置と要素の境界に基づいて有効なドロップターゲットを特定します。
 * - ドラッグ中に要素の位置を動的に更新します。
 * - 無効なターゲットや子孫要素へのドロップなどのエッジケースを処理します。
 * - キャンバスと統合するためのマウスイベント（mousedown、mouseup、mousemove）のコールバックを提供します。
 *
 * 依存関係:
 * - `useCanvas`: キャンバスの状態とdispatch関数へのアクセスを提供します。
 * - `useToast`: ユーザーへのフィードバック用のトーストメッセージを表示します。
 * - 位置計算、ドロップの検証、要素の関係管理のためのユーティリティ関数。
 *
 * 戻り値:
 * - `handleMouseDown`: 要素のドラッグを開始するためのコールバック。
 * - `handleMouseUp`: ドラッグ操作を完了するためのコールバック。
 * - `currentDropTarget`: 現在のドロップターゲット要素（存在する場合）。
 * - `dropPosition`: ドロップターゲットに対する位置（例: before, after, child）。
 * - `draggingElement`: 現在ドラッグ中の要素。
 * - `dropInsertY`: ドラッグされた要素を挿入するためのY座標。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Element } from '../types';
import { useCanvas } from '../context/canvasContext';
import { isDescendant } from '../utils/elementHelpers';
import { ToastMessages } from '../constants/toastMessages';
import { HEADER_HEIGHT, OFFSET, SIZE } from '../constants/elementSettings';
import { useToast } from '../context/toastContext';
import { debugLog } from '../utils/debugLogHelpers';

const isTouchEvent = (event: MouseEvent | TouchEvent): event is TouchEvent => {
  return 'touches' in event;
};

interface State {
  zoomRatio: number;
  elements: { [key: string]: Element };
}

// ElementsMap型の定義を追加
type ElementsMap = { [key: string]: Element };

type Position = { x: number; y: number };
type DropPosition = 'before' | 'after' | 'child' | 'between';
type DropTargetInfo = { element: Element; position: DropPosition; insertY?: number; siblingInfo?: { prevElement?: Element, nextElement?: Element } } | null;
// 要素のシフト情報を追跡するための型
type ShiftedElement = { id: string, originalY: number, shiftAmount: number };

// 要素の兄弟要素を取得するヘルパー関数
const getSiblings = (element: Element, elements: ElementsMap): Element[] => {
  return element.parentId 
    ? Object.values(elements)
        .filter(e => e.parentId === element.parentId && e.visible && e.id !== element.id)
        .sort((a, b) => a.order - b.order)
    : [];
};

// 要素の子要素を取得するヘルパー関数
const getChildren = (element: Element, elements: ElementsMap): Element[] => {
  return Object.values(elements)
    .filter(e => e.parentId === element.id && e.visible)
    .sort((a, b) => a.order - b.order);
};

// X座標が要素の範囲内かどうかを判定
const isXInElementRange = (element: Element, mouseX: number, draggingElementWidth: number): boolean => {
  // ドラッグ中の要素の幅を使用して右側のドロップ可能領域を計算
  const rightSidePadding = OFFSET.X + draggingElementWidth;
  const rightSideCoordinate = element.x + element.width;

  return (
    // 要素上のドロップ
    (mouseX > element.x && mouseX < rightSideCoordinate) ||
    // 要素の右側領域でのドロップ（拡張版）
    (mouseX >= rightSideCoordinate && mouseX < rightSideCoordinate + rightSidePadding)
  );
};

export const useElementDragEffect = () => {
  const { state, dispatch } = useCanvas() as { state: State; dispatch: React.Dispatch<any> };
  const { addToast } = useToast();
  const [draggingElement, setDraggingElement] = useState<Element | null>(null);
  const [dragStartOffset, setDragStartOffset] = useState<Position>({ x: 0, y: 0 });
  const [originalPosition, setOriginalPosition] = useState<Position>({ x: 0, y: 0 });
  const [currentDropTarget, setCurrentDropTarget] = useState<DropTargetInfo>(null);
  // 元の位置を各要素ごとに記録するためのMap
  const elementOriginalPositions = useRef<Map<string, Position>>(new Map());
  // シフトされた要素を追跡するための状態
  const [shiftedElements, setShiftedElements] = useState<ShiftedElement[]>([]);

  const convertToZoomCoordinates = useCallback((e: MouseEvent | TouchEvent): Position => {
    let clientX: number, clientY: number;

    if (isTouchEvent(e)) {
      clientX = e.touches[0].clientX + window.scrollX;
      clientY = e.touches[0].clientY + window.scrollY;
    } else {
      clientX = e.clientX + window.scrollX;
      clientY = e.clientY + window.scrollY;
    }
    
    return {
      x: clientX / state.zoomRatio,
      y: (clientY - HEADER_HEIGHT) / state.zoomRatio,
    };
  }, [state.zoomRatio]);

  // 要素の上部にドロップする場合の位置を計算する関数
  const calculateBeforePosition = useCallback((element: Element): { position: DropPosition; insertY: number } => {
        return {
      position: 'before', 
            insertY: element.y - (draggingElement?.height || 0) - OFFSET.Y
    };
  }, [draggingElement]);
  
  // 要素の下部にドロップする場合の位置を計算する関数
  const calculateAfterPosition = useCallback((element: Element): { position: DropPosition; insertY: number } => {
    return {
      position: 'after',
      insertY: element.y + element.height + OFFSET.Y
    };
  }, []);
  
  // 要素間にドロップする場合の位置を計算する関数
  const calculateBetweenPosition = useCallback((
    prevElement: Element, 
    nextElement: Element | undefined
  ): { position: DropPosition; insertY: number; siblingInfo: { prevElement: Element; nextElement?: Element } } => {
    let insertY: number;
    
    if (nextElement) {
      // 2つの要素の間
      insertY = prevElement.y + prevElement.height + (nextElement.y - (prevElement.y + prevElement.height)) / 2;
    } else {
      // 最後の要素の後
      insertY = prevElement.y + prevElement.height + OFFSET.Y;
    }
    
    return {
      position: 'between',
      insertY,
      siblingInfo: { prevElement, nextElement }
    };
  }, []);
  
  // 右側（子要素）エリアのドロップ位置を計算する関数
  const calculateChildPosition = useCallback((element: Element, mouseY: number, elements: ElementsMap): { position: DropPosition; insertY: number } => {
    const elemTop = element.y;
    const children = getChildren(element, elements);
    
    let closestY = mouseY;
    let closestIndex = children.findIndex(child => closestY < child.y + child.height / 2);
    if (closestIndex === -1) closestIndex = children.length;
    
    let insertY: number;
    
    if (children.length === 0) {
      insertY = elemTop + element.height / 2;
    } else if (closestIndex === 0) {
      insertY = children[0].y - OFFSET.Y;
    } else if (closestIndex === children.length) {
      insertY = children[children.length - 1].y + children[children.length - 1].height + OFFSET.Y;
    } else {
      const prevChild = children[closestIndex - 1];
      insertY = prevChild.y + prevChild.height + OFFSET.Y / 2;
    }
    
    return { position: 'child', insertY };
  }, []);

  // ドロップ位置と要素中心からの距離を計算する関数
  const calculatePositionAndDistance = useCallback((
    element: Element,
    mouseX: number,
    mouseY: number,
    elements: ElementsMap
  ): { position: DropPosition; distanceSq: number; insertY: number; siblingInfo?: { prevElement?: Element, nextElement?: Element } } => {
    const elemTop = element.y;
    const elemBottom = element.y + element.height;
    const elemRight = element.x + element.width;
    const rightSidePadding = OFFSET.X + (draggingElement?.width ?? 0);
    
    // 要素の右側（子要素として追加）かどうかを判定
    const isOnRightSide = mouseX >= elemRight && mouseX < elemRight + rightSidePadding;
    
    // 要素の内側にあるかどうかを判定
    const isInsideElement = 
      mouseX >= element.x && 
      mouseX < elemRight && 
      mouseY >= elemTop && 
      mouseY <= elemBottom;
  
    let result: {
      position: DropPosition;
      insertY: number;
      siblingInfo?: { prevElement?: Element, nextElement?: Element };
    };
    
    // 要素の上にある場合は子要素として追加
    if (isInsideElement) {
      result = calculateChildPosition(element, mouseY, elements);
      debugLog('Drop position mode (inside element):', 'child');
    } else if (isOnRightSide) {
      // 子要素として追加する場合
      result = calculateChildPosition(element, mouseY, elements);
    } else {
      // SVG要素グループを活用して判定を行う
      // グループを特定するためのキー
      const groupKey = `${element.parentId}_${element.depth}`;
      
      // 同じ親を持つ要素（兄弟要素）を取得
      const siblings = Object.values(elements).filter(el => 
        el.visible && el.parentId === element.parentId && el.depth === element.depth
      ).sort((a, b) => a.y - b.y);
      
      // グループの最初と最後の要素を特定
      const firstSibling = siblings[0];
      const lastSibling = siblings[siblings.length - 1];
      
      // グループの境界を計算
      const groupTop = firstSibling ? firstSibling.y : element.y;
      const groupBottom = lastSibling ? lastSibling.y + lastSibling.height : element.y + element.height;
      
      // SVGグループ要素を探す（存在する場合）
      const svgGroup = document.querySelector(`.element-group[data-parent-id="${element.parentId}"][data-depth="${element.depth}"]`);
      
      // 判定用の閾値領域を計算
      const halfOffset = OFFSET.Y * 0.5;
      
      // before/after/between領域の境界計算
      const beforeThreshold = groupTop + halfOffset;
      const afterThreshold = groupBottom - halfOffset;
      
      debugLog('Group boundaries', {
        groupKey,
        groupTop,
        groupBottom,
        mouseY,
        beforeThreshold,
        afterThreshold,
        svgGroupExists: !!svgGroup
      });
      
      // 領域判定
      if (mouseY < beforeThreshold) {
        // before: グループの上端 - (OFFSET.Y * 0.5) の領域
        result = calculateBeforePosition(firstSibling || element);
        debugLog('Drop position mode (top region):', 'before');
      } else if (mouseY > afterThreshold) {
        // after: グループの下端 + (OFFSET.Y * 0.5) の領域
        result = calculateAfterPosition(lastSibling || element);
        debugLog('Drop position mode (bottom region):', 'after');
      } else {
        // between: グループの「上端 + (OFFSET.Y * 0.5)」から「下端 - (OFFSET.Y * 0.5)」までの領域
        
        // 最も近い要素を見つけるための変数を初期化
        let prevElement: Element | null = null;
        let nextElement: Element | null = null;
        
        // SVGグループが存在する場合、その座標系内での相対位置を使って判定する
        if (svgGroup) {
          const groupRect = svgGroup.getBoundingClientRect();
          // SVGグループ内での相対Y座標を計算
          const relativeMouseY = (mouseY * state.zoomRatio) - groupRect.top;
          debugLog('SVG group relative position', { 
            relativeMouseY, 
            groupRect: { top: groupRect.top, bottom: groupRect.bottom, height: groupRect.height }
          });
          
          for (let i = 0; i < siblings.length; i++) {
            const current = siblings[i];
            if (current.id === draggingElement?.id) continue; // ドラッグ中の要素自身は無視
            
            // SVGグループ内での相対座標に基づく位置計算
            const currentY = current.y;
            const currentBottom = current.y + current.height;
            
            if (relativeMouseY < currentY) {
              nextElement = current;
              if (i > 0) prevElement = siblings[i - 1];
              break;
            } else if (relativeMouseY < currentBottom) {
              const midpoint = currentY + current.height / 2;
              if (relativeMouseY < midpoint) {
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
          
          debugLog('Between elements calculation (SVG)', { 
            prevElementId: prevElement?.id, 
            nextElementId: nextElement?.id 
          });
        } else {
          // SVGグループが見つからない場合は通常の方法で計算
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
          
          debugLog('Between elements calculation (normal)', { 
            prevElementId: prevElement?.id, 
            nextElementId: nextElement?.id 
          });
        }
        
        // between位置の計算
        if (prevElement && nextElement) {
          // 2つの要素の間
          const gap = nextElement.y - (prevElement.y + prevElement.height);
          const insertY = prevElement.y + prevElement.height + gap / 2;
          result = {
            position: 'between',
            insertY,
            siblingInfo: { prevElement, nextElement }
          };
        } else if (prevElement) {
          // 最後の要素の後
          const insertY = prevElement.y + prevElement.height + OFFSET.Y;
          result = {
            position: 'between',
            insertY,
            siblingInfo: { prevElement }
          };
        } else if (nextElement) {
          // 最初の要素の前
          const insertY = nextElement.y - OFFSET.Y;
          result = {
            position: 'between',
            insertY,
            siblingInfo: { nextElement }
          };
        } else {
          // 要素が1つしかない場合や、ドラッグ中の要素のみの場合
          result = {
            position: 'between',
            insertY: element.y + element.height + OFFSET.Y,
            siblingInfo: {}
          };
        }
        
        debugLog('Drop position mode (middle region):', 'between');
      }
    }
    
    // 要素中心からの距離を計算
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distanceSq = dx * dx + dy * dy;
    
    return { ...result, distanceSq };
  }, [calculateChildPosition, calculateBeforePosition, calculateAfterPosition, draggingElement, state.zoomRatio]);

  // 要素間（between）の位置にあるかどうかを判断するヘルパー関数
  const checkIfBetweenSiblings = useCallback((
    element: Element, 
    mouseY: number,
    siblings: Element[],
    elements: ElementsMap
  ): { prevElement: Element, nextElement?: Element } | null => {
    // 同じ親を持つ兄弟要素をY座標でソート
    const sortedSiblings = [...siblings, element]
      .filter(el => el.visible)
      .sort((a, b) => a.y - b.y);
    
    // 各要素の間の位置を確認
    for (let i = 0; i < sortedSiblings.length - 1; i++) {
      const current = sortedSiblings[i];
      const next = sortedSiblings[i + 1];
      
      const currentBottom = current.y + current.height;
      const nextTop = next.y;
      const gap = nextTop - currentBottom;
      
      // 要素間に十分なスペースがあり、マウスがその間にある場合
      if (gap >= 10 && mouseY > currentBottom && mouseY < nextTop) {
        return { prevElement: current, nextElement: next };
      }
    }
    
    return null;
  }, []);

  const findDropTarget = useCallback((e: MouseEvent | TouchEvent, elements: ElementsMap): DropTargetInfo => {
    if (!draggingElement) return null;
    
    const zoomAdjustedPos = convertToZoomCoordinates(e);
    const mouseX = zoomAdjustedPos.x;
    const mouseY = zoomAdjustedPos.y;
  
    const candidates = Object.values(elements).filter(
      (element) =>
        element.visible &&
        element.id !== draggingElement.id &&
        isXInElementRange(element, mouseX, draggingElement.width ?? SIZE.WIDTH.MIN)
    );
  
    let closestTarget: DropTargetInfo = null;
    let minSquaredDistance = Infinity;
  
    for (const element of candidates) {
      const { position, distanceSq, insertY, siblingInfo } = calculatePositionAndDistance(
        element,
        mouseX,
        mouseY,
        elements
      );

      debugLog('Drop position mode:', position);
      
      if (distanceSq < minSquaredDistance) {
        minSquaredDistance = distanceSq;
        closestTarget = { element, position, insertY, siblingInfo };
      }
    }
    
    return closestTarget;
  }, [draggingElement, convertToZoomCoordinates, calculatePositionAndDistance]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>, element: Element) => {
      if (!element.parentId) return;
      e.stopPropagation();

      let nativeEvent: MouseEvent | TouchEvent;
      if (e.nativeEvent instanceof TouchEvent) {
        e.preventDefault();
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
      
      setOriginalPosition({ x: element.x, y: element.y });
      
      // ドラッグ開始時に選択されている全要素の元の位置を保存
      elementOriginalPositions.current.clear();
      const selectedElements = Object.values(state.elements).filter(el => el.selected);
      
      selectedElements.forEach(el => {
        elementOriginalPositions.current.set(el.id, { x: el.x, y: el.y });
      });
    },
    [convertToZoomCoordinates, state.elements]
  );

  const resetElementsPosition = useCallback(() => {
    const selectedElements = Object.values(state.elements).filter(el => el.selected);
    selectedElements.forEach(element => {
      // 保存した元の位置情報を使用
      const originalPos = elementOriginalPositions.current.get(element.id);
      if (originalPos) {
        dispatch({
          type: 'MOVE_ELEMENT',
          payload: { id: element.id, x: originalPos.x, y: originalPos.y }
        });
      }
    });
    // 状態をリセット
    setDraggingElement(null);
    elementOriginalPositions.current.clear();
  }, [state.elements, dispatch]);

  // 要素をドロップする際の親変更を検証する関数
  const validateParentChange = useCallback((element: Element, newParentId: string | null): boolean => {
    // 自身の子孫要素に移動しようとしている場合は無効
    if (newParentId && isDescendant(state.elements, element.id, newParentId)) {
      return false;
    }
    return true;
  }, [state.elements]);

  // 子要素としてドロップする処理
  const processChildDrop = useCallback((target: Element, selectedElements: Element[]): boolean => {
    // 自身の子孫要素への移動チェック
    if (selectedElements.some(el => !validateParentChange(el, target.id))) {
      addToast(ToastMessages.dropChildElement, 'warn');
      resetElementsPosition();
      return false;
    }

    dispatch({ type: 'SNAPSHOT' });

    // 全要素に対して移動処理
    selectedElements.forEach((element, index) => {
      // childモードの場合、新しい親の深さ+1を設定
      const newDepth = target.depth + 1;
      dispatch({
        type: 'DROP_ELEMENT',
        payload: {
          id: element.id,
          oldParentId: element.parentId,
          newParentId: target.id,
          newOrder: target.children + index,
          depth: newDepth,
        },
      });
    });
    return true;
  }, [validateParentChange, addToast, resetElementsPosition, dispatch]);

  // 兄弟要素としてドロップする処理
  const processSiblingDrop = useCallback((target: Element, position: DropPosition, selectedElements: Element[]): boolean => {
    // 基本的なドロップ処理
    let baseOrder, newParentId;
    
    if (position === 'between' && currentDropTarget?.siblingInfo) {
      // 要素間へのドロップ
      const { prevElement, nextElement } = currentDropTarget.siblingInfo;
      
      if (prevElement && nextElement) {
        // 要素間の場合（両方の要素が存在）
        baseOrder = prevElement.order + 1;
        newParentId = prevElement.parentId;
      } else if (prevElement) {
        // 末尾の要素の後の場合
        baseOrder = prevElement.order + 1;
        newParentId = prevElement.parentId;
      } else if (nextElement) {
        // 先頭の要素の前の場合
        baseOrder = nextElement.order;
        newParentId = nextElement.parentId;
      } else {
        // どちらも存在しない場合（通常ありえない）
        baseOrder = target.order;
        newParentId = target.parentId;
      }
    } else {
      // 従来の before/after 処理
      baseOrder = position === 'before' ? target.order : target.order + 1;
      newParentId = target.parentId;
    }

    // 無効な親変更をチェック
    if (selectedElements.some(el => !validateParentChange(el, newParentId))) {
      addToast(ToastMessages.dropChildElement, 'warn');
      resetElementsPosition();
      return false;
    }

    dispatch({ type: 'SNAPSHOT' });

    // 順序を調整しながら一括移動
    selectedElements.forEach((element, index) => {
      dispatch({
        type: 'DROP_ELEMENT',
        payload: {
          id: element.id,
          oldParentId: element.parentId,
          newParentId,
          newOrder: baseOrder + index,
          depth: target.depth,
        },
      });
    });
    return true;
  }, [currentDropTarget, validateParentChange, addToast, resetElementsPosition, dispatch]);

  const handleMouseUp = useCallback(async () => {
    if (!draggingElement) return;

    try {
      const selectedElements = Object.values(state.elements).filter(el => el.selected);

      if (currentDropTarget) {
        const { element: target, position } = currentDropTarget;

        // 直接自身の子孫要素かチェック
        if (selectedElements.some(el => isDescendant(state.elements, el.id, target.id))) {
          resetElementsPosition();
          addToast(ToastMessages.dropChildElement, 'warn');
          return;
        }

        let dropSuccess = false;
        if (position === 'child') {
          dropSuccess = processChildDrop(target, selectedElements);
        } else {
          dropSuccess = processSiblingDrop(target, position, selectedElements);
        }

        if (!dropSuccess) {
          resetElementsPosition();
          return;
        }
      } else {
        resetElementsPosition();
      }
    } catch (error) {
      console.error('Drag error:', error);
      addToast(ToastMessages.dragError, 'warn');
      resetElementsPosition();
    } finally {
      // シフトされた要素を元に戻す
      if (shiftedElements.length > 0) {
        shiftedElements.forEach(shifted => {
          const element = state.elements[shifted.id];
          if (element) {
            dispatch({
              type: 'MOVE_ELEMENT',
              payload: { id: shifted.id, x: element.x, y: shifted.originalY }
            });
          }
        });
        setShiftedElements([]);
      }

      // 状態のリセットを確実に行う
      setDraggingElement(null);
      setCurrentDropTarget(null);
      elementOriginalPositions.current.clear();
    }
  }, [
    draggingElement, 
    currentDropTarget, 
    state.elements, 
    dispatch, 
    addToast, 
    shiftedElements, 
    resetElementsPosition, 
    processChildDrop, 
    processSiblingDrop
  ]);

  // ドラッグ中に実行される処理
  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggingElement) return;
    
    if (e instanceof TouchEvent && e.touches.length === 1) {
      e.preventDefault();
    }

    const dropTarget = findDropTarget(e, state.elements);
    
    // 新しいドロップターゲットと現在のドロップターゲットを比較し、
    // 実際に変更がある場合のみステートを更新する
    const isTargetChanged = 
      (!currentDropTarget && dropTarget) || 
      (currentDropTarget && !dropTarget) ||
      (currentDropTarget && dropTarget && (
        currentDropTarget.element.id !== dropTarget.element.id ||
        currentDropTarget.position !== dropTarget.position ||
        currentDropTarget.insertY !== dropTarget.insertY
      ));

    if (isTargetChanged) {
      setCurrentDropTarget(dropTarget);
    }

    const zoomAdjustedPos = convertToZoomCoordinates(e);
    const newPosition = {
      x: zoomAdjustedPos.x - dragStartOffset.x,
      y: zoomAdjustedPos.y - dragStartOffset.y,
    };

    dispatch({
      type: 'MOVE_ELEMENT',
      payload: { id: draggingElement.id, ...newPosition }
    });
  }, [draggingElement, currentDropTarget, state.elements, findDropTarget, convertToZoomCoordinates, dragStartOffset, dispatch]);

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

  // シフトされた要素を元の位置に戻す処理を関数として抽出
  const resetShiftedElements = useCallback(() => {
    if (shiftedElements.length > 0) {
      shiftedElements.forEach(shifted => {
        const element = state.elements[shifted.id];
        if (element) {
          dispatch({
            type: 'MOVE_ELEMENT',
            payload: { id: shifted.id, x: element.x, y: shifted.originalY }
          });
        }
      });
      setShiftedElements([]);
    }
  }, [dispatch, shiftedElements, state.elements]);

  // プレビューが表示されたときに、下にある要素を移動するための関数
  const shiftSiblingElements = useCallback((dropTarget: Element | null, position: DropPosition | null, previewHeight: number) => {
    // 現在のドラッグプレビューが無効か、ドラッグ中の要素が無い場合は何もしない
    if (!dropTarget || !position || !draggingElement) {
      resetShiftedElements();
      return;
    }

    // まず、現在シフトされている要素をすべて元の位置に戻す
    resetShiftedElements();
    
    // 影響を受ける要素を特定する
    let elementsToShift: Element[] = [];
    
    if (position === 'child') {
      // 子要素ドロップの場合
      const siblings = getChildren(dropTarget, state.elements);
      const previewY = currentDropTarget?.insertY ?? (dropTarget.y + dropTarget.height / 2 - previewHeight / 2);
      elementsToShift = siblings.filter(sibling => 
        sibling.visible && 
        sibling.id !== draggingElement.id &&
        sibling.y >= previewY
      );
    } else if (['before', 'after', 'between'].includes(position)) {
      // 兄弟要素間ドロップの場合
      const parentId = dropTarget.parentId;
      if (parentId === null) return; // ルート要素の場合は何もしない

      // 同じ親を持つ兄弟要素を取得
      const siblings = getSiblings(dropTarget, state.elements);

      // 要素が移動し始める基準のY座標を決定
      let startY: number;
      
      if (position === 'between' && currentDropTarget?.siblingInfo) {
        const { nextElement } = currentDropTarget.siblingInfo;
        startY = nextElement ? nextElement.y : (dropTarget.y + dropTarget.height);
      } else if (position === 'before') {
        // beforeモードの場合は、対象要素自体と自身を除くすべての要素をシフト
        // order=0の要素の上にドラッグした場合も同様に処理する
        startY = dropTarget.y;
        
        // order=0の要素上にドラッグした場合も含む
        elementsToShift = [...siblings, dropTarget].filter(sibling => 
          sibling.visible && 
          sibling.id !== draggingElement.id &&
          sibling.y >= startY
        );
        
        // elementsToShiftが既に設定されているので早期リターン
        if (elementsToShift.length > 0) {
          // 新たに移動が必要な要素を特定
          const newShiftedElements: ShiftedElement[] = [];
          
          // 影響を受ける要素を下にシフト
          elementsToShift.forEach(element => {
            // 元のY座標を記録 (既に記録されていない場合)
            const originalY = elementOriginalPositions.current.get(element.id)?.y ?? element.y;
            if (!elementOriginalPositions.current.has(element.id)) {
              elementOriginalPositions.current.set(element.id, { x: element.x, y: element.y });
            }
            
            // 要素を移動
            dispatch({
              type: 'MOVE_ELEMENT',
              payload: { id: element.id, x: element.x, y: originalY + previewHeight }
            });

            // 移動情報を記録
            newShiftedElements.push({
              id: element.id,
              originalY: originalY,
              shiftAmount: previewHeight
            });
          });

          // 移動情報を保存
          setShiftedElements(newShiftedElements);
          return;
        }
      } else { // after
        startY = dropTarget.y + dropTarget.height;
      }

      // ドロップ位置より下にある兄弟要素を特定
      elementsToShift = siblings.filter(sibling => 
        sibling.visible && 
        sibling.id !== draggingElement.id &&
        sibling.y >= startY
      );
    }
    
    // 影響を受ける要素が存在しない場合は何もしない
    if (elementsToShift.length === 0) return;
    
    // 新たに移動が必要な要素を特定
    const newShiftedElements: ShiftedElement[] = [];
    
    // 影響を受ける要素を下にシフト
    elementsToShift.forEach(element => {
      // 元のY座標を記録 (既に記録されていない場合)
      const originalY = elementOriginalPositions.current.get(element.id)?.y ?? element.y;
      if (!elementOriginalPositions.current.has(element.id)) {
        elementOriginalPositions.current.set(element.id, { x: element.x, y: element.y });
      }
      
      // 要素を移動
      dispatch({
        type: 'MOVE_ELEMENT',
        payload: { id: element.id, x: element.x, y: originalY + previewHeight }
      });

      // 移動情報を記録
      newShiftedElements.push({
        id: element.id,
        originalY: originalY,
        shiftAmount: previewHeight
      });
    });

    // 移動情報を保存
    setShiftedElements(newShiftedElements);
  }, [state.elements, draggingElement, currentDropTarget, resetShiftedElements, dispatch]);
  
  // ドロップターゲットが変更されたときに要素のシフトを行うエフェクト
  useEffect(() => {
    if (!draggingElement) return;
    
    // ドロップターゲットが存在する場合、ドロップ位置に応じて要素をシフト
    if (currentDropTarget) {
      shiftSiblingElements(
        currentDropTarget.element,
        currentDropTarget.position,
        draggingElement.height
      );
    } else {
      // ドロップターゲットがない場合は要素を元に戻す
      shiftSiblingElements(null, null, 0);
    }
  }, [draggingElement, currentDropTarget, shiftSiblingElements]);

  return {
    handleMouseDown,
    handleMouseUp,
    currentDropTarget: currentDropTarget?.element || null,
    dropPosition: currentDropTarget?.position || null,
    draggingElement,
    dropInsertY: currentDropTarget?.insertY
  };
};