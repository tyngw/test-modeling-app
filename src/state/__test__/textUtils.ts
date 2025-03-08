// src/state/__test__/testUtils.ts
import { useReducer } from 'react';
import { initialState, reducer } from '../state';
import { Element } from '../../types';

export const useStore = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    return { state, dispatch };
};

export const createTestElements = () => {
    return {
        '1': {
            ...initialState.elements['1'],
            children: 1,
        },
        '1-1': {
            ...initialState.elements['1'],
            id: '2',
            parentId: '1',
            depth: 1,
            order: 0,
        },
        '1-2': {
            ...initialState.elements['1'],
            id: '3',
            parentId: '1',
            depth: 1,
            order: 1,
        },
        '1-2-1': {
            ...initialState.elements['1'],
            id: '4',
            parentId: '3',
            depth: 2,
            order: 0,
        }
    };
};