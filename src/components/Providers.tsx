// components/Providers.tsx
'use client';

import React from 'react';
import { ReactNode } from 'react';
import { TabsProvider } from '../context/TabsContext';
import { ToastProvider } from '../context/ToastContext';
import { SuggestionProvider } from '../context/SuggestionContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SuggestionProvider>
        <TabsProvider>{children}</TabsProvider>
      </SuggestionProvider>
    </ToastProvider>
  );
}
