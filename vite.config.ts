import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:4321',
        ws: true,
      },
      '/api': 'http://localhost:4321',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
