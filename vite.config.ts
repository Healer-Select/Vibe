import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 'base' ensures assets use relative paths (./) instead of absolute (/),
  // preventing 404s when the app is installed or hosted in a subfolder.
  base: './', 
  build: {
    outDir: 'dist',
    // Removed explicit rollupOptions input to fix "Could not resolve entry module" error.
    // Vite automatically finds index.html in the root.
  },
  server: {
    port: 3000,
    host: true
  },
});