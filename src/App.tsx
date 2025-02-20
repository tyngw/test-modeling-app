// src/App.tsx
import React from 'react';
import './App.css';
import { isMobileDevice } from './utils/DeviceChecker';
import { TabsProvider } from './context/TabsContext';
import AppContent from './context/AppContent';

function App() {
  return (
    <div className="App">
      {isMobileDevice() && (
        <div style={{ backgroundColor: '#006666', color: 'white', textAlign: 'center' }}>
          このアプリはモバイルデバイスに対応していません。
        </div>
      )}
      <TabsProvider>
        <AppContent />
      </TabsProvider>
    </div>
  );
}

export default App;