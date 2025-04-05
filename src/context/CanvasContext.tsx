// src/context/canvasContext.tsx
'use client';

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { State, Action } from '../state/state';

type CanvasContextValue = {
  state: State;
  dispatch: React.Dispatch<Action>;
};

const CanvasContext = createContext<CanvasContextValue | undefined>(undefined);

export const CanvasProvider: React.FC<{
  children: ReactNode;
  state: State;
  dispatch: React.Dispatch<Action>;
}> = ({ children, state, dispatch }) => {
  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return (
    <CanvasContext.Provider value={value}>
      {children}
    </CanvasContext.Provider>
  );
};

export const useCanvas = () => {
  const context = useContext(CanvasContext);
  if (!context) throw new Error('useCanvas must be used within a CanvasProvider');
  return context;
};
