// App.js
import React from 'react';
import ViewBox from './components/ViewBox';
import './App.css';
import { isMobileDevice } from './utils/DeviceChecker';

function App() {
  return (
    <div className="App">
        {isMobileDevice() && <div style={{backgroundColor: '#006666', color: 'white', textAlign: 'center'}}>このアプリはモバイルデバイスに対応していません。</div>}
        <ViewBox/>
    </div>
  );
}

export default App;
