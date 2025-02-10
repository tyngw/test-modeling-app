// src/App.tsx
import React from 'react';
import CanvasArea from './components/CanvasArea';
import './App.css';
import { isMobileDevice } from './utils/DeviceChecker';
import { CanvasProvider } from './context/CanvasContext';

function App() {
  return (
    <div className="App">
      {isMobileDevice() && (
        <div style={{backgroundColor: '#006666', color: 'white', textAlign: 'center'}}>
          このアプリはモバイルデバイスに対応していません。
        </div>
      )}
      <CanvasProvider>
        <CanvasArea/>
      </CanvasProvider>
    </div>
  );
}

export default App;