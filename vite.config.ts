import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// ESM-safe alias resolution. `__dirname` isn't defined in pure ESM modules,
// so we derive the project root from import.meta.url instead.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/ws':  { target: 'ws://localhost:4321', ws: true },
      '/api':   'http://localhost:4321',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
