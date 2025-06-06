// components/Providers.tsx
'use client';

import React from 'react';
import { ReactNode } from 'react';
import { TabsProvider } from '../context/TabsContext';
import { ToastProvider } from '../context/ToastContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <TabsProvider>{children}</TabsProvider>
    </ToastProvider>
  );
}
