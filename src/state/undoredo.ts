// state/undoredo.ts
import { Element } from '../types/types';

/**
 * 要素の状態を保存するスナップショット配列
 */
let snapshots: Record<string, Element>[] = [];
let snapshotIndex = 0;

/**
 * 操作を元に戻す関数
 * @param elements 現在の要素の状態
 * @returns 前回の状態
 */
export const Undo = (elements: Record<string, Element>): Record<string, Element> => {
  if (snapshotIndex > 0) {
    snapshots[snapshotIndex] = elements;
    snapshotIndex--;
    return snapshots[snapshotIndex];
  } else {
    return elements;
  }
};

/**
 * 操作をやり直す関数
 * @param elements 現在の要素の状態
 * @returns 次の状態
 */
export const Redo = (elements: Record<string, Element>): Record<string, Element> => {
  if (snapshotIndex < snapshots.length - 1) {
    snapshotIndex++;
    return snapshots[snapshotIndex];
  } else {
    return elements;
  }
};

/**
 * 現在の状態をスナップショットとして保存する
 * @param elements 現在の要素の状態
 */
export const saveSnapshot = (elements: Record<string, Element>): void => {
  const newSnapshots: Record<string, Element>[] = snapshots.slice(0, snapshotIndex + 1);

  newSnapshots.push(elements);
  // saveToLocalStorage(elements);
  snapshots = newSnapshots;
  snapshotIndex++;
};
