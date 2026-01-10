import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 'base' ensures assets use relative paths (./) instead of absolute (/),
  // preventing 404s when the app is installed or hosted in a subfolder.
  base: './', 
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    port: 3000,
    host: true
  },
});