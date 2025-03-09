// state/undoredo.ts

let snapshots: any[] = [];
let snapshotIndex = 0;

export const Undo = (elements: any) => {
    if (snapshotIndex > 0) {
        snapshots[snapshotIndex] = elements;
        snapshotIndex--;
        console.log(`Undo snapshotIndex: ${snapshotIndex}`);
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
    // saveToLocalStorage(elements);
    snapshots = newSnapshots;
    snapshotIndex++;
};