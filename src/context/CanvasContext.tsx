// src/context/CanvasContext.js
import React, { createContext, useReducer, useContext } from 'react';
import { initialState, reducer } from '../state/state';

const CanvasContext = createContext();

export const CanvasProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <CanvasContext.Provider value={{ state, dispatch }}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => useContext(CanvasContext);