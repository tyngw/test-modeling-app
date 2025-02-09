// state/undoredo.js

let snapshots = [];
let snapshotIndex = 0;

export const Undo = (elements) => {
    if (snapshotIndex > 0) {
        snapshots[snapshotIndex] = elements;
        snapshotIndex--;
        return snapshots[snapshotIndex];
    } else {
        return elements;
    }
};

export const Redo = (elements) => {
    if (snapshotIndex < snapshots.length - 1) {
        snapshotIndex++;
        return snapshots[snapshotIndex];
    } else {
        return elements;
    }
};

export const saveSnapshot = (elements) => {
    console.log(`saveSnapshot snapshotIndex: ${snapshotIndex}`);
    const newSnapshots = snapshots.slice(0, snapshotIndex + 1);

    newSnapshots.push(elements);
    saveToLocalStorage(elements);
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

export const saveToLocalStorage = (elements) => {
    localStorage.setItem('elements', JSON.stringify(elements));
};

export const loadFromLocalStorage = () => {
    // localStorageに値がない場合は空の配列を返す
    if (!localStorage.getItem('elements')) {
        return [];
    }
    const elements = JSON.parse(localStorage.getItem('elements'));
    return elements;
};