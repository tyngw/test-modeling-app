// App.js
import React from 'react';
import CanvasArea from './components/CanvasArea';
import './App.css';
import { isMobileDevice } from './utils/DeviceChecker';

function App() {
  return (
    <div className="App">
        {isMobileDevice() && <div style={{backgroundColor: '#006666', color: 'white', textAlign: 'center'}}>このアプリはモバイルデバイスに対応していません。</div>}
        <CanvasArea/>
    </div>
  );
}

export default App;
