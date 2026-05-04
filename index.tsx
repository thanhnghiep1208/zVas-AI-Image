
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

console.log("DEBUG: index.tsx starting...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("DEBUG: Could not find root element");
  throw new Error("Could not find root element to mount to");
}

console.log("DEBUG: Mounting React app...");
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
console.log("DEBUG: root.render called");
