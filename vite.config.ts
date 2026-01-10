
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', 
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000, // Silence warnings for vendor chunks under 1MB
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-utils': ['lucide-react', 'ably'],
          'vendor-firebase': ['firebase/app', 'firebase/messaging', 'firebase/analytics']
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true
  },
});
