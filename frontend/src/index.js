import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <App />
);

// Log metrics in development only (avoid noise in production)
// In production you can replace console.log with a function that POSTs metrics to your analytics endpoint.
if (process.env.NODE_ENV === 'development') {
  reportWebVitals(console.log);
}
