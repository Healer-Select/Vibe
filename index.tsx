
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Register Service Worker for PWA with relative path handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Vibe ServiceWorker registered'))
      .catch(err => console.log('ServiceWorker registration failed:', err));
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Could not find root element to mount to");
}
