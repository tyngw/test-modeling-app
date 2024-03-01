// App.js
import React from 'react';
import ViewBox from './components/ViewBox';
import './App.css';

function App() {
  return (
    <div className="App" style={{ width: '100%', height: '100%', overflow: 'auto' }}>
      {/* <div style={{ position: 'absolute', top: '40px', left: 0 }}> */}
        <ViewBox/>
    </div>
  );
}

export default App;
