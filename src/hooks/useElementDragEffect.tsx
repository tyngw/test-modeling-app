// src/hooks/useElementDragEffect.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Element } from '../types';
import { useCanvas } from '../context/canvasContext';
import { isDescendant } from '../utils/elementHelpers';
import { ToastMessages } from '../constants/toastMessages';
import { HEADER_HEIGHT, OFFSET, SIZE } from '../constants/elementSettings';
import { useToast } from '../context/toastContext';

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
      clientX = e.touches[0].clientX + window.scrollX; // スクロールオフセットを追加
      clientY = e.touches[0].clientY + window.scrollY; // スクロールオフセットを追加
    } else {
      clientX = e.clientX + window.scrollX; // スクロールオフセットを追加
      clientY = e.clientY + window.scrollY; // スクロールオフセットを追加
    }

    return {
      x: clientX / state.zoomRatio,
      y: (clientY - HEADER_HEIGHT) / state.zoomRatio,
    };
  }, [state.zoomRatio]);

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

  const resetElementsPosition = () => {
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
  };

  const adjustElementPosition = useCallback(() => {
    // ドロップ完了後に要素の位置を調整するロジックを追加
    console.log('Adjusting element positions...');
    // 必要に応じてdispatchを使用して要素の位置を更新
  }, []);

  const handleMouseUp = useCallback(async () => {
    if (!draggingElement) return;

    try {
      const selectedElements = Object.values(state.elements).filter(el => el.selected);

      // 親変更の検証関数
      const validateParentChange = (element: Element, newParentId: string | null): boolean => {
        // 自身の子孫要素に移動しようとしている場合は無効
        if (newParentId && isDescendant(state.elements, element.id, newParentId)) {
          return false;
        }
        return true;
      };

      const processChildDrop = (target: Element): boolean => {
        // 自身の子孫要素への移動チェック
        if (selectedElements.some(el => !validateParentChange(el, target.id))) {
          addToast(ToastMessages.dropChildElement, 'warn');
          resetElementsPosition();
          return false;
        }

        dispatch({ type: 'SNAPSHOT' });

        // 全要素に対して移動処理
        selectedElements.forEach(element => {
          // childモードの場合、新しい親の深さ+1を設定
          const newDepth = target.depth + 1;
          dispatch({
            type: 'DROP_ELEMENT',
            payload: {
              id: element.id,
              oldParentId: element.parentId,
              newParentId: target.id,
              newOrder: target.children + selectedElements.indexOf(element),
              depth: newDepth,
            },
          });
        });
        return true;
      };

      const processSiblingDrop = (target: Element, position: DropPosition): boolean => {
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
      };

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
          dropSuccess = processChildDrop(target);
        } else {
          dropSuccess = processSiblingDrop(target, position);
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

      // ドロップ完了後に要素の位置を調整
      adjustElementPosition();
    }
  }, [draggingElement, currentDropTarget, state.elements, dispatch, addToast, shiftedElements, adjustElementPosition]);

  useEffect(() => {
    if (!draggingElement) return;

    const findDropTarget = (e: MouseEvent | TouchEvent, elements: ElementsMap): DropTargetInfo => {
      const zoomAdjustedPos = convertToZoomCoordinates(e);
      const mouseX = zoomAdjustedPos.x;
      const mouseY = zoomAdjustedPos.y;
    
      const candidates = Object.values(elements).filter(element => 
        element.visible &&
        element.id !== draggingElement?.id &&
        isXInElementRange(element, mouseX)
      );
    
      let closestTarget: DropTargetInfo = null;
      let minSquaredDistance = Infinity;
    
      for (const element of candidates) {
        const { position, distanceSq, insertY } = calculatePositionAndDistance(element, mouseX, mouseY, elements);
        if (distanceSq < minSquaredDistance) {
          minSquaredDistance = distanceSq;
          closestTarget = { element, position, insertY };
        }
      }
    
      return closestTarget;
    };

    const isXInElementRange = (element: Element, mouseX: number): boolean => {
      // ドラッグ中の要素の幅を使用して右側のドロップ可能領域を計算
      const rightSidePadding = OFFSET.X + (draggingElement?.width ?? SIZE.WIDTH.MIN);
      const rightSideCoordinate = element.x + element.width;

      return (
        // 要素上のドロップ
        (mouseX > element.x && mouseX < rightSideCoordinate) ||
        // 要素の右側領域でのドロップ（拡張版）
        (mouseX >= rightSideCoordinate && mouseX < rightSideCoordinate + rightSidePadding)
      );
    };

    const calculatePositionAndDistance = (
      element: Element,
      mouseX: number,
      mouseY: number,
      elements: ElementsMap
    ): { position: DropPosition; distanceSq: number; insertY?: number; siblingInfo?: { prevElement?: Element, nextElement?: Element } } => {
      const elemTop = element.y;
      const elemBottom = element.y + element.height;
      const elemRight = element.x + element.width;
      const thresholdY = element.height * 0.2;
      const rightSidePadding = OFFSET.X + SIZE.WIDTH.MIN;
    
      let position: DropPosition = 'child';
      let insertY = elemTop + element.height / 2;
      let siblingInfo: { prevElement?: Element, nextElement?: Element } | undefined = undefined;
    
      const isOnRightSide = mouseX >= elemRight && mouseX < elemRight + rightSidePadding;
    
      if (!isOnRightSide) {
        // 兄弟要素の取得
        const siblings = element.parentId 
          ? Object.values(elements)
              .filter(e => e.parentId === element.parentId && e.visible && e.id !== element.id)
              .sort((a, b) => a.order - b.order)
          : [];
        
        // 兄弟要素間のドロップ位置の判定を最適化
        // 先頭要素より上の場合
        if (mouseY < elemTop + thresholdY && element.order === 0) {
          position = 'before';
          insertY = elemTop - OFFSET.Y;
        }
        // 末尾要素より下の場合
        else if (mouseY > elemBottom - thresholdY && !siblings.some(s => s.order > element.order)) {
          position = 'after';
          insertY = elemBottom + OFFSET.Y;
        }
        // 要素間の場合
        else {
          // 要素間を検出
          const nextElement = siblings.find(s => s.order > element.order);
          
          // 次の要素が存在する場合、要素間と判定
          if (nextElement && mouseY > elemBottom - thresholdY) {
            position = 'between';
            siblingInfo = { prevElement: element, nextElement };
            // 要素間の中心位置に表示
            insertY = elemBottom + (nextElement.y - elemBottom) / 2 - OFFSET.Y;
          }
          // 要素の上半分をhover中
          else if (mouseY < elemTop + element.height / 2) {
            // 前の要素を探す
            const currentIndex = siblings.findIndex(s => s.order > element.order);
            const prevElement = currentIndex > 0 ? siblings[currentIndex - 1] : undefined;
            
            if (prevElement) {
              position = 'between';
              siblingInfo = { prevElement, nextElement: element };
              insertY = prevElement.y + prevElement.height + (elemTop - (prevElement.y + prevElement.height)) / 2;
            } else {
              position = 'before';
              insertY = elemTop - OFFSET.Y;
            }
          }
          // 要素の下半分をhover中
          else {
            position = 'after';
            
            if (nextElement) {
              position = 'between';
              siblingInfo = { prevElement: element, nextElement };
              insertY = elemBottom + (nextElement.y - elemBottom) / 2 - OFFSET.Y;
            } else {
              insertY = elemBottom + OFFSET.Y;
            }
          }
        }
      } else {
        // 子要素ドロップ位置の処理（既存コード）
        const children = Object.values(elements)
          .filter(e => e.parentId === element.id && e.visible)
          .sort((a, b) => a.order - b.order);
    
        let closestY = mouseY;
        let closestIndex = children.findIndex(child => closestY < child.y + child.height / 2);
        if (closestIndex === -1) closestIndex = children.length;
    
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
      }
    
      const centerX = element.x + element.width / 2;
      const centerY = elemTop + element.height / 2;
      const dx = mouseX - centerX;
      const dy = mouseY - centerY;
    
      return { position, distanceSq: dx * dx + dy * dy, insertY, siblingInfo };
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
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
    };

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
  }, [draggingElement, dragStartOffset, state.elements, convertToZoomCoordinates, dispatch, handleMouseUp]);

  // プレビューが表示されたときに、下にある要素を移動するための関数
  const shiftSiblingElements = useCallback((dropTarget: Element | null, position: DropPosition | null, previewHeight: number) => {
    // 現在のドラッグプレビューが無効か、ドラッグ中の要素が無い場合は何もしない
    if (!dropTarget || !position || !draggingElement) {
      // シフトされた状態があれば元に戻す
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
      return;
    }

    // まず、現在シフトされている要素をすべて元の位置に戻す
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
      // シフト情報をリセット
      setShiftedElements([]);
    }
    
    // ドロップタイプによって異なる処理
    if (position === 'child') {
      // 子要素ドロップの場合: ターゲットの子要素（同じ親を持つ要素）をシフト
      const siblings = Object.values(state.elements).filter(el => 
        el.parentId === dropTarget.id && // 同じ親を持つ
        el.visible && // 表示されている
        el.id !== draggingElement.id // ドラッグ中の要素自身は除外
      ).sort((a, b) => a.y - b.y); // Y座標でソート

      // プレビュー要素のY位置とその高さから影響を受ける兄弟要素を特定
      const previewY = currentDropTarget?.insertY ?? (dropTarget.y + dropTarget.height / 2 - previewHeight / 2);

      // 影響を受ける要素のリスト（プレビューの下にある要素）
      const elementsToShift = siblings.filter(sibling => sibling.y >= previewY);

      // 新たに移動が必要な要素を特定
      const newShiftedElements: ShiftedElement[] = [];

      // 影響を受ける要素を下にシフト
      elementsToShift.forEach(element => {
        // 元のY座標を記録 (既に記録されていない場合)
        const originalY = elementOriginalPositions.current.get(element.id)?.y ?? element.y;
        if (!elementOriginalPositions.current.has(element.id)) {
          elementOriginalPositions.current.set(element.id, { x: element.x, y: element.y });
        }
        
        const shiftAmount = previewHeight;

        // 要素を移動
        dispatch({
          type: 'MOVE_ELEMENT',
          payload: { id: element.id, x: element.x, y: originalY + shiftAmount }
        });

        // 移動情報を記録
        newShiftedElements.push({
          id: element.id,
          originalY: originalY,
          shiftAmount: shiftAmount
        });
      });

      // 移動情報を保存
      setShiftedElements(newShiftedElements);
    } 
    else if (position === 'before' || position === 'after' || position === 'between') {
      // 兄弟要素間ドロップの場合
      const parentId = dropTarget.parentId;
      if (parentId === null) return; // ルート要素の場合は何もしない

      // 同じ親を持つ兄弟要素を取得
      const siblings = Object.values(state.elements).filter(el => 
        el.parentId === parentId && 
        el.visible && 
        el.id !== draggingElement.id
      ).sort((a, b) => a.y - b.y); // Y座標でソート

      let startY;
      if (position === 'between' && currentDropTarget?.siblingInfo) {
        const { nextElement } = currentDropTarget.siblingInfo;
        // between の場合は、プレビュー表示位置から判断
        startY = nextElement ? nextElement.y : (dropTarget.y + dropTarget.height);
      } else if (position === 'before') {
        startY = dropTarget.y;
      } else { // after
        startY = dropTarget.y + dropTarget.height;
      }

      // 影響を受ける要素のリスト（ドロップ位置より下にある要素）
      const elementsToShift = siblings.filter(sibling => sibling.y >= startY);
      
      // 新たに移動が必要な要素を特定
      const newShiftedElements: ShiftedElement[] = [];

      // 影響を受ける要素を下にシフト
      elementsToShift.forEach(element => {
        // 元のY座標を記録 (既に記録されていない場合)
        const originalY = elementOriginalPositions.current.get(element.id)?.y ?? element.y;
        if (!elementOriginalPositions.current.has(element.id)) {
          elementOriginalPositions.current.set(element.id, { x: element.x, y: element.y });
        }
        
        const shiftAmount = previewHeight;

        // 要素を移動
        dispatch({
          type: 'MOVE_ELEMENT',
          payload: { id: element.id, x: element.x, y: originalY + shiftAmount }
        });

        // 移動情報を記録
        newShiftedElements.push({
          id: element.id,
          originalY: originalY,
          shiftAmount: shiftAmount
        });
      });

      // 移動情報を保存
      setShiftedElements(newShiftedElements);
    }
  }, [state.elements, draggingElement, shiftedElements, currentDropTarget, dispatch]);
  
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