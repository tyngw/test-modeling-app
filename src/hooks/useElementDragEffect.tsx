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
type DropPosition = 'child' | 'between';
type DropTargetInfo = { element: Element; position: DropPosition; insertY?: number; siblingInfo?: { prevElement?: Element, nextElement?: Element } } | null;

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

  // 子要素エリアのドロップ位置を計算する関数
  const calculateChildPosition = useCallback((element: Element, mouseY: number, elements: ElementsMap): { position: DropPosition; insertY: number } => {
    const elemTop = element.y;
    const children = getChildren(element, elements);
    
    // 子要素が存在しない場合は、要素の中央に配置
    if (children.length === 0) {
      return {
        position: 'child',
        insertY: elemTop + element.height / 2
      };
    }
    
    // 子要素がある場合は、マウス位置に基づいて挿入位置を計算
    let insertY: number;
    let closestChildIndex = -1;
    
    // マウス位置に最も近い子要素のインデックスを見つける
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childMidPoint = child.y + child.height / 2;
      
      if (mouseY < childMidPoint) {
        closestChildIndex = i;
        break;
      }
    }
    
    // マウスが全ての子要素よりも下にある場合
    if (closestChildIndex === -1) {
      const lastChild = children[children.length - 1];
      insertY = lastChild.y + lastChild.height + OFFSET.Y;
    } 
    // マウスが最初の子要素より上にある場合
    else if (closestChildIndex === 0) {
      insertY = children[0].y - OFFSET.Y;
    } 
    // マウスが子要素の間にある場合
    else {
      const prevChild = children[closestChildIndex - 1];
      const nextChild = children[closestChildIndex];
      const gap = nextChild.y - (prevChild.y + prevChild.height);
      insertY = prevChild.y + prevChild.height + gap / 2;
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
    
    // 要素の右側かどうかを判定
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
    
    // 要素の上にある場合は子要素として追加 (child mode)
    if (isInsideElement) {
      result = calculateChildPosition(element, mouseY, elements);
      debugLog('Drop position mode (inside element):', 'child');
    } else if (isOnRightSide) {
      // 要素の右側にある場合 (between mode)
      const children = getChildren(element, elements);
      
      if (children.length === 0) {
        // 子要素がない場合は、要素の子として追加 (childモード同様の挙動)
        result = {
          position: 'between',
          insertY: element.y + element.height / 2,
          siblingInfo: { }
        };
        debugLog('Drop position mode (right side, no children):', 'between');
      } else {
        // 子要素がある場合は、子要素の間に挿入
        let prevElement: Element | undefined;
        let nextElement: Element | undefined;
        
        // マウス位置に最も近い子要素を見つける
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (mouseY < child.y) {
            nextElement = child;
            if (i > 0) prevElement = children[i - 1];
            break;
          } else if (mouseY < child.y + child.height) {
            const midpoint = child.y + child.height / 2;
            if (mouseY < midpoint) {
              nextElement = child;
              if (i > 0) prevElement = children[i - 1];
            } else {
              prevElement = child;
              if (i < children.length - 1) nextElement = children[i + 1];
            }
            break;
          } else if (i === children.length - 1 || mouseY < children[i + 1].y) {
            prevElement = child;
            if (i < children.length - 1) nextElement = children[i + 1];
            break;
          }
        }
        
        if (prevElement && nextElement) {
          // 2つの子要素の間
          const gap = nextElement.y - (prevElement.y + prevElement.height);
          result = {
            position: 'between',
            insertY: prevElement.y + prevElement.height + gap / 2,
            siblingInfo: { prevElement, nextElement }
          };
        } else if (prevElement) {
          // 最後の子要素の後
          result = {
            position: 'between',
            insertY: prevElement.y + prevElement.height + OFFSET.Y,
            siblingInfo: { prevElement }
          };
        } else if (nextElement) {
          // 最初の子要素の前
          result = {
            position: 'between',
            insertY: nextElement.y - OFFSET.Y,
            siblingInfo: { nextElement }
          };
        } else {
          // このケースは通常発生しないはず
          result = {
            position: 'between',
            insertY: element.y + element.height / 2,
            siblingInfo: { }
          };
        }
        
        debugLog('Drop position mode (right side, with children):', 'between');
      }
    } else {
      // 同じ親を持つ要素（兄弟要素）を取得
      const draggingElementId = draggingElement?.id;
      const siblings = Object.values(elements).filter(el => 
        el.visible && 
        el.parentId === element.parentId && 
        el.depth === element.depth &&
        el.id !== draggingElementId // ドラッグ中の要素自身を除外
      ).sort((a, b) => a.y - b.y);
      
      debugLog(`[calculatePositionAndDistance] Found ${siblings.length} siblings (excluding dragging element) for element ${element.id}`);
      
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
      
      // between位置の計算
      if (prevElement && nextElement) {
        // 2つの要素の間
        const gap = nextElement.y - (prevElement.y + prevElement.height);
        result = {
          position: 'between',
          insertY: prevElement.y + prevElement.height + gap / 2,
          siblingInfo: { prevElement, nextElement }
        };
      } else if (prevElement) {
        // 最後の要素の後
        result = {
          position: 'between',
          insertY: prevElement.y + prevElement.height + OFFSET.Y,
          siblingInfo: { prevElement }
        };
      } else if (nextElement) {
        // 最初の要素の前
        result = {
          position: 'between',
          insertY: nextElement.y - OFFSET.Y,
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
      
      debugLog('Drop position mode (between siblings):', 'between');
    }
    
    // 要素中心からの距離を計算
    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const distanceSq = dx * dx + dy * dy;
    
    return { ...result, distanceSq };
  }, [calculateChildPosition, draggingElement, state.zoomRatio]);

  // 要素間（between）の位置にあるかどうかを判断するヘルパー関数
  const checkIfBetweenSiblings = useCallback((
    element: Element, 
    mouseY: number,
    siblings: Element[],
    elements: ElementsMap
  ): { prevElement: Element, nextElement?: Element } | null => {
    // ドラッグ中の要素IDを取得
    const draggingElementId = draggingElement?.id;
    
    // 同じ親を持つ兄弟要素をY座標でソート（ドラッグ中の要素を除外）
    const sortedSiblings = [...siblings, element]
      .filter(el => el.visible && el.id !== draggingElementId)
      .sort((a, b) => a.y - b.y);
    
    debugLog(`[checkIfBetweenSiblings] Found ${sortedSiblings.length} siblings (excluding dragging element)`);
    
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
  }, [draggingElement]);

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

  // 兄弟要素間にドロップする処理
  const processBetweenDrop = useCallback((target: Element, selectedElements: Element[]): boolean => {
    // ドロップ処理時のデバッグログを追加
    debugLog(`[processBetweenDrop] target=${target.id}, siblingInfo: ${JSON.stringify({
      prevElementId: currentDropTarget?.siblingInfo?.prevElement?.id,
      nextElementId: currentDropTarget?.siblingInfo?.nextElement?.id
    })}`);
    
    // 要素間へのドロップ処理
    let newParentId: string | null;
    
    if (currentDropTarget?.siblingInfo) {
      // 要素間へのドロップ
      const { prevElement, nextElement } = currentDropTarget.siblingInfo;
      
      if (prevElement && nextElement) {
        // 2つの要素の間にドロップする場合
        debugLog(`  Between two elements: prev=${prevElement.id}(order=${prevElement.order}), next=${nextElement.id}(order=${nextElement.order})`);
        newParentId = prevElement.parentId;
      } else if (prevElement) {
        // 最後の要素の後にドロップする場合
        debugLog(`  After last element: prev=${prevElement.id}(order=${prevElement.order})`);
        newParentId = prevElement.parentId;
      } else if (nextElement) {
        // 最初の要素の前にドロップする場合
        debugLog(`  Before first element: next=${nextElement.id}(order=${nextElement.order})`);
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
    if (newParentId === null && !selectedElements.every(el => el.depth === 1)) {
      addToast(ToastMessages.invalidDrop, 'warn');
      resetElementsPosition();
      return false;
    }

    // 無効な親変更をチェック
    if (selectedElements.some(el => !validateParentChange(el, newParentId))) {
      addToast(ToastMessages.dropChildElement, 'warn');
      resetElementsPosition();
      return false;
    }

    dispatch({ type: 'SNAPSHOT' });

    // ドラッグ中の要素が移動元と移動先で同じparentIdを持つ場合の処理
    const isMovingWithinSameParent = selectedElements.some(el => el.parentId === newParentId);
    
    // 移動対象の要素の現在のorder値を取得
    const draggedElements = selectedElements.filter(el => el.parentId === newParentId);
    const targetOrderValues = calculateTargetOrderValues(currentDropTarget, draggedElements);
    
    if (isMovingWithinSameParent) {
      // 同じ親内での移動の場合、要素の順序を正しく更新
      moveElementsWithinSameParent(draggedElements, targetOrderValues.baseOrder, newParentId);
    } else {
      // 異なる親への移動、または同じ親でも後続要素のorderを調整
      adjustOrdersForNewElements(targetOrderValues.baseOrder, selectedElements.length, newParentId);
    }

    // 順序を調整しながら一括移動
    selectedElements.forEach((element, index) => {
      // 新しい親が元の要素の場合は深さを1レベル深くする、それ以外は対象要素と同じ深さにする
      const newDepth = newParentId === target.id ? target.depth + 1 : target.depth;
      
      dispatch({
        type: 'DROP_ELEMENT',
        payload: {
          id: element.id,
          oldParentId: element.parentId,
          newParentId,
          newOrder: targetOrderValues.baseOrder + index,
          depth: newDepth,
        },
      });
    });
    return true;
  }, [currentDropTarget, validateParentChange, addToast, resetElementsPosition, dispatch, state.elements]);

  // ドロップ先のorder値を計算する関数
  const calculateTargetOrderValues = useCallback((dropTarget: DropTargetInfo, draggedElements: Element[]) => {
    let baseOrder = 0;

    if (dropTarget?.siblingInfo) {
      const { prevElement, nextElement } = dropTarget.siblingInfo;
      
      if (prevElement && nextElement) {
        // 2つの要素の間にドロップする場合
        
        // 移動する要素が現在この2つの要素の間にあるかチェック
        const isDraggingElementBetween = draggedElements.some(el => 
          el.order > prevElement.order && el.order < nextElement.order
        );
        
        if (isDraggingElementBetween) {
          // 既に間にある場合は現在のorder値を維持
          baseOrder = draggedElements[0].order;
        } else {
          // 移動元の要素が移動先の前にある場合
          const allDraggedBeforePrev = draggedElements.every(el => el.order < prevElement.order);
          
          if (allDraggedBeforePrev) {
            // 前から後ろへの移動: nextElement.orderから逆算
            baseOrder = nextElement.order - draggedElements.length;
          } else {
            // 後ろから前への移動: prevElement.orderから計算
            baseOrder = prevElement.order + 1;
          }
        }
      } else if (prevElement) {
        // 最後の要素の後にドロップする場合
        baseOrder = prevElement.order + 1;
      } else if (nextElement) {
        // 最初の要素の前にドロップする場合
        // 移動元の要素が既に先頭にあるかチェック
        const isDraggingFirst = draggedElements.some(el => el.order === 0);
        
        if (isDraggingFirst && nextElement.order === draggedElements.length) {
          // 既に先頭にあり、かつ移動先も先頭の場合は維持
          baseOrder = 0;
        } else {
          baseOrder = 0; // 最初の位置
        }
      }
    } else {
      baseOrder = 0;
    }
    
    return { baseOrder };
  }, []);

  // 同じ親内での要素移動時にorder値を調整する関数
  const moveElementsWithinSameParent = useCallback((draggedElements: Element[], targetBaseOrder: number, parentId: string | null) => {
    if (draggedElements.length === 0) return;
    
    // ドラッグしている要素のorder値
    const draggedOrders = draggedElements.map(el => el.order).sort((a, b) => a - b);
    const minDraggedOrder = draggedOrders[0];
    const maxDraggedOrder = draggedOrders[draggedOrders.length - 1];
    
    // 前から後ろに移動する場合（移動元order < 移動先order）
    if (maxDraggedOrder < targetBaseOrder) {
      // 移動元と移動先の間にある要素のorderを減らす
      const affectedElements = Object.values(state.elements).filter(el => 
        el.parentId === parentId && 
        el.order > maxDraggedOrder && 
        el.order < targetBaseOrder + draggedElements.length && 
        !draggedElements.some(dragged => dragged.id === el.id)
      );
      
      affectedElements.forEach(element => {
        dispatch({
          type: 'UPDATE_ELEMENT_ORDER',
          payload: {
            id: element.id,
            order: element.order - draggedElements.length
          }
        });
      });
    } 
    // 後ろから前に移動する場合（移動元order > 移動先order）
    else if (minDraggedOrder > targetBaseOrder) {
      // 移動先と移動元の間にある要素のorderを増やす
      const affectedElements = Object.values(state.elements).filter(el => 
        el.parentId === parentId && 
        el.order >= targetBaseOrder && 
        el.order < minDraggedOrder && 
        !draggedElements.some(dragged => dragged.id === el.id)
      );
      
      affectedElements.forEach(element => {
        dispatch({
          type: 'UPDATE_ELEMENT_ORDER',
          payload: {
            id: element.id,
            order: element.order + draggedElements.length
          }
        });
      });
    }
    // 移動元と移動先が同じ場合は何もしない
  }, [state.elements, dispatch]);

  // 新しい要素追加時にorder値を調整する関数
  const adjustOrdersForNewElements = useCallback((baseOrder: number, count: number, parentId: string | null) => {
    // baseOrder以上のorderを持つ既存要素のorderを調整
    const affectedElements = Object.values(state.elements).filter(el => 
      el.parentId === parentId && 
      el.order >= baseOrder
    );
    
    affectedElements.forEach(element => {
      dispatch({
        type: 'UPDATE_ELEMENT_ORDER',
        payload: {
          id: element.id,
          order: element.order + count
        }
      });
    });
  }, [state.elements, dispatch]);

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
      console.error('Drag error:', error);
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
    state.elements, 
    dispatch, 
    addToast, 
    resetElementsPosition, 
    processChildDrop, 
    processBetweenDrop
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

  return {
    handleMouseDown,
    handleMouseUp,
    currentDropTarget: currentDropTarget?.element || null,
    dropPosition: currentDropTarget?.position || null,
    draggingElement,
    dropInsertY: currentDropTarget?.insertY,
    siblingInfo: currentDropTarget?.siblingInfo || null
  };
};