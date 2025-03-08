// components/Providers.tsx
'use client'

import React from 'react'
import { ReactNode } from 'react'
import { TabsProvider } from '../context/tabsContext'
import { ToastProvider } from '../context/toastContext'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <TabsProvider>
        {children}
      </TabsProvider>
    </ToastProvider>
  )
}