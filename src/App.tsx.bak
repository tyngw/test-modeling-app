// src/App.tsx
import React from 'react';
import './App.css';
import { TabsProvider } from './context/tabsContext';
import { ToastProvider } from './context/toastContext';
import AppContent from './appContent';

function App() {
  return (
    <div className="App">
      <ToastProvider>
        <TabsProvider>
          <AppContent />
        </TabsProvider>
      </ToastProvider>

    </div>
  );
}

export default App;