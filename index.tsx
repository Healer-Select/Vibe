
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use relative path for sw.js to prevent 404 errors
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Vibe ServiceWorker ready'))
      .catch(err => console.log('PWA features disabled:', err));
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
