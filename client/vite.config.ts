import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
      '@shared/': fileURLToPath(new URL('../shared/src/', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@dimforge') || id.includes('rapier')) return 'rapier';
            if (id.includes('three')) return 'three';
            if (id.includes('react') || id.includes('scheduler') || id.includes('zustand')) return 'react';
            return 'vendor';
          }
        },
      },
    },
  },
});
