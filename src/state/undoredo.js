// state/undoredo.js
// 別ファイルから呼び出せるようにする

// Undo/Redoのためのノードのスナップショットを保存
let snapshots = [];
let snapshotIndex = 0;

// Undo処理を行う関数
export const Undo = (nodes) => {
    // console.log(`Undo snapshotIndex: ${snapshotIndex} snapshots.length-1: ${snapshots.length - 1}`);
    if (snapshotIndex > 0) {
        // 引数として渡されたnodesをsnapshotsに追加する処理
        snapshots[snapshotIndex] = nodes;
        snapshotIndex--;
        return snapshots[snapshotIndex];
    } else {
        return nodes;
    }
};

// Redo処理を行う関数
export const Redo = (nodes) => {
    // console.log(`Redo snapshotIndex: ${snapshotIndex}, snapshots.length-1: ${snapshots.length - 1}`)
    if (snapshotIndex < snapshots.length - 1) {
        snapshotIndex++;
        return snapshots[snapshotIndex];
    } else {
        return nodes;
    }
};

// ノードのスナップショットを保存する関数
export const saveSnapshot = (nodes) => {
    console.log(`saveSnapshot snapshotIndex: ${snapshotIndex}`);
    // snapshotIndex+1以降のスナップショットを削除する処理
    const newSnapshots = snapshots.slice(0, snapshotIndex + 1);

    newSnapshots.push(nodes);
    snapshots = newSnapshots;
    snapshotIndex++;
};