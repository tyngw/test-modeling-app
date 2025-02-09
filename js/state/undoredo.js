"use strict";
// state/undoredo.js
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadFromLocalStorage = exports.saveToLocalStorage = exports.clearLocalStorage = exports.clearSnapshots = exports.saveSnapshot = exports.Redo = exports.Undo = void 0;
let snapshots = [];
let snapshotIndex = 0;
const Undo = (elements) => {
    if (snapshotIndex > 0) {
        snapshots[snapshotIndex] = elements;
        snapshotIndex--;
        return snapshots[snapshotIndex];
    }
    else {
        return elements;
    }
};
exports.Undo = Undo;
const Redo = (elements) => {
    if (snapshotIndex < snapshots.length - 1) {
        snapshotIndex++;
        return snapshots[snapshotIndex];
    }
    else {
        return elements;
    }
};
exports.Redo = Redo;
const saveSnapshot = (elements) => {
    console.log(`saveSnapshot snapshotIndex: ${snapshotIndex}`);
    const newSnapshots = snapshots.slice(0, snapshotIndex + 1);
    newSnapshots.push(elements);
    (0, exports.saveToLocalStorage)(elements);
    snapshots = newSnapshots;
    snapshotIndex++;
};
exports.saveSnapshot = saveSnapshot;
// スナップショットをクリアする
const clearSnapshots = () => {
    snapshots = [];
    snapshotIndex = 0;
    (0, exports.clearLocalStorage)();
};
exports.clearSnapshots = clearSnapshots;
const clearLocalStorage = () => {
    localStorage.clear();
};
exports.clearLocalStorage = clearLocalStorage;
const saveToLocalStorage = (elements) => {
    localStorage.setItem('elements', JSON.stringify(elements));
};
exports.saveToLocalStorage = saveToLocalStorage;
const loadFromLocalStorage = () => {
    // localStorageに値がない場合は空の配列を返す
    if (!localStorage.getItem('elements')) {
        return [];
    }
    const elements = JSON.parse(localStorage.getItem('elements'));
    return elements;
};
exports.loadFromLocalStorage = loadFromLocalStorage;
