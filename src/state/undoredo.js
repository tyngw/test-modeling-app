// state/undoredo.js

let snapshots = [];
let snapshotIndex = 0;

export const Undo = (nodes) => {
    if (snapshotIndex > 0) {
        snapshots[snapshotIndex] = nodes;
        snapshotIndex--;
        return snapshots[snapshotIndex];
    } else {
        return nodes;
    }
};

export const Redo = (nodes) => {
    if (snapshotIndex < snapshots.length - 1) {
        snapshotIndex++;
        return snapshots[snapshotIndex];
    } else {
        return nodes;
    }
};

export const saveSnapshot = (nodes) => {
    // console.log(`saveSnapshot snapshotIndex: ${snapshotIndex}`);
    const newSnapshots = snapshots.slice(0, snapshotIndex + 1);

    newSnapshots.push(nodes);
    saveToLocalStorage(nodes);
    snapshots = newSnapshots;
    snapshotIndex++;
};

// スナップショットをクリアする
export const clearSnapshots = () => {
    snapshots = [];
    snapshotIndex = 0;
    clearLocalStorage();
};

export const clearLocalStorage = () => {
    localStorage.clear();
};

export const saveToLocalStorage = (nodes) => {
    localStorage.setItem('nodes', JSON.stringify(nodes));
};

export const loadFromLocalStorage = () => {
    // localStorageに値がない場合は空の配列を返す
    if (!localStorage.getItem('nodes')) {
        return [];
    }
    const nodes = JSON.parse(localStorage.getItem('nodes'));
    return nodes;
};