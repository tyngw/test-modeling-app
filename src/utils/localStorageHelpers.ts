// src/utils/localStorageHelpers.ts
import { NUMBER_OF_SECTIONS } from '../constants/ElementSettings';

export const getNumberOfSections = (): number => {
    const stored = localStorage.getItem('numberOfSections');
    if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed)) {
            return parsed;
        }
    }
    return NUMBER_OF_SECTIONS;
};