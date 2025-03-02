// src/index.tsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ReactGA from "react-ga4";

const root = ReactDOM.createRoot(document.getElementById('root')!);

function MyApp() {
  useEffect(() => {
    const trackingId = process.env.REACT_APP_GA_TRACKING_ID || '';
    if (trackingId) {
      ReactGA.initialize(trackingId);
      ReactGA._gaCommandSendPageview(window.location.pathname, {});
    } else {
      console.warn('Google Analytics tracking ID is not set.');
    }
  }, []);

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

root.render(<MyApp />);