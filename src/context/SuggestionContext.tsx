'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SuggestionContextType {
  isSuggestionEnabled: boolean;
  toggleSuggestion: () => void;
  setSuggestionEnabled: (enabled: boolean) => void;
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

interface SuggestionProviderProps {
  children: ReactNode;
}

export const SuggestionProvider: React.FC<SuggestionProviderProps> = ({ children }) => {
  const [isSuggestionEnabled, setIsSuggestionEnabled] = useState(false);

  const toggleSuggestion = useCallback(() => {
    setIsSuggestionEnabled((prev) => !prev);
  }, []);

  const setSuggestionEnabled = useCallback((enabled: boolean) => {
    setIsSuggestionEnabled(enabled);
  }, []);

  return (
    <SuggestionContext.Provider
      value={{
        isSuggestionEnabled,
        toggleSuggestion,
        setSuggestionEnabled,
      }}
    >
      {children}
    </SuggestionContext.Provider>
  );
};

export const useSuggestion = (): SuggestionContextType => {
  const context = useContext(SuggestionContext);
  if (context === undefined) {
    throw new Error('useSuggestion must be used within a SuggestionProvider');
  }
  return context;
};
