// state/undoredo.ts
import { Element } from '../types/types';
import { HierarchicalStructure } from '../types/hierarchicalTypes';

/**
 * 階層構造の状態を保存するスナップショット配列
 */
let hierarchicalSnapshots: HierarchicalStructure[] = [];
let hierarchicalSnapshotIndex = 0;

/**
 * 要素の状態を保存するスナップショット配列（後方互換性のため保持）
 */
let snapshots: Record<string, Element>[] = [];
let snapshotIndex = 0;

/**
 * 階層構造ベースの操作を元に戻す関数
 * @param hierarchicalData 現在の階層構造
 * @returns 前回の階層構造
 */
export const UndoHierarchical = (
  hierarchicalData: HierarchicalStructure | null,
): HierarchicalStructure | null => {
  if (hierarchicalSnapshotIndex > 0 && hierarchicalData) {
    hierarchicalSnapshots[hierarchicalSnapshotIndex] = hierarchicalData;
    hierarchicalSnapshotIndex--;
    return hierarchicalSnapshots[hierarchicalSnapshotIndex];
  } else {
    return hierarchicalData;
  }
};

/**
 * 階層構造ベースの操作をやり直す関数
 * @param hierarchicalData 現在の階層構造
 * @returns 次の階層構造
 */
export const RedoHierarchical = (
  hierarchicalData: HierarchicalStructure | null,
): HierarchicalStructure | null => {
  if (hierarchicalSnapshotIndex < hierarchicalSnapshots.length - 1) {
    hierarchicalSnapshotIndex++;
    return hierarchicalSnapshots[hierarchicalSnapshotIndex];
  } else {
    return hierarchicalData;
  }
};

/**
 * 現在の階層構造をスナップショットとして保存する
 * @param hierarchicalData 現在の階層構造
 */
export const saveHierarchicalSnapshot = (hierarchicalData: HierarchicalStructure): void => {
  const newSnapshots: HierarchicalStructure[] = hierarchicalSnapshots.slice(
    0,
    hierarchicalSnapshotIndex + 1,
  );

  // 階層構造のディープコピーを作成
  const deepCopyHierarchical = JSON.parse(JSON.stringify(hierarchicalData));
  newSnapshots.push(deepCopyHierarchical);

  hierarchicalSnapshots = newSnapshots;
  hierarchicalSnapshotIndex++;
};

/**
 * 操作を元に戻す関数（後方互換性のため保持）
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
 * 操作をやり直す関数（後方互換性のため保持）
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
 * 現在の状態をスナップショットとして保存する（後方互換性のため保持）
 * @param elements 現在の要素の状態
 */
export const saveSnapshot = (elements: Record<string, Element>): void => {
  const newSnapshots: Record<string, Element>[] = snapshots.slice(0, snapshotIndex + 1);

  newSnapshots.push(elements);
  // saveToLocalStorage(elements);
  snapshots = newSnapshots;
  snapshotIndex++;
};
