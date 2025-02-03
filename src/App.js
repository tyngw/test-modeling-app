// App.js
import React from 'react';
import DisplayArea from './components/DisplayArea';
import './App.css';
import { isMobileDevice } from './utils/DeviceChecker';

function App() {
  return (
    <div className="App">
        {isMobileDevice() && <div style={{backgroundColor: '#006666', color: 'white', textAlign: 'center'}}>このアプリはモバイルデバイスに対応していません。</div>}
        <DisplayArea/>
    </div>
  );
}

export default App;
