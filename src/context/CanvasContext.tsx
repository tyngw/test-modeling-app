// src/context/CanvasContext.tsx
import React, { createContext, useReducer, useContext, ReactNode, Dispatch } from 'react';
import { initialState, reducer, State, Action } from '../state/state';

interface CanvasContextProps {
  state: State;
  dispatch: Dispatch<Action>;
}

const CanvasContext = createContext<CanvasContextProps | undefined>(undefined);

interface CanvasProviderProps {
  children: ReactNode;
}

export const CanvasProvider: React.FC<CanvasProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <CanvasContext.Provider value={{ state, dispatch }}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = (): CanvasContextProps => {
  const context = useContext(CanvasContext);
  if (context === undefined) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  return context;
};