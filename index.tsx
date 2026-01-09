
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Register Service Worker for PWA (Only works on HTTPS/Localhost)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Vibe ServiceWorker ready'))
      .catch(err => console.log('PWA features disabled in this environment'));
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
