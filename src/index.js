import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ReactGA from "react-ga4";

const root = ReactDOM.createRoot(document.getElementById('root'));

function MyApp() {
  useEffect(() => {
    ReactGA.initialize("G-CVYKPR22E4");
    ReactGA.send("pageview");
  }, []);

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

root.render(<MyApp />);