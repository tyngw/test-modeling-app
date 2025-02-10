// state/undoredo.js

let snapshots: any[] = [];
let snapshotIndex = 0;

export const Undo = (elements: any) => {
    if (snapshotIndex > 0) {
        snapshots[snapshotIndex] = elements;
        snapshotIndex--;
        return snapshots[snapshotIndex] as any;
    } else {
        return elements;
    }
};

export const Redo = (elements: any) => {
    if (snapshotIndex < snapshots.length - 1) {
        snapshotIndex++;
        return snapshots[snapshotIndex];
    } else {
        return elements;
    }
};

export const saveSnapshot = (elements: any) => {
    console.log(`saveSnapshot snapshotIndex: ${snapshotIndex}`);
    const newSnapshots: any[] = snapshots.slice(0, snapshotIndex + 1);

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

export const saveToLocalStorage = (elements: any) => {
    localStorage.setItem('elements', JSON.stringify(elements));
};

export const loadFromLocalStorage = () => {
    // localStorageに値がない場合は空の配列を返す
    if (!localStorage.getItem('elements')) {
        return [];
    }
    const elements = JSON.parse(localStorage.getItem('elements') || '[]');
    return elements;
};