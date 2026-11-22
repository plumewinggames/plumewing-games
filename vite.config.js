import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        puffGuard: resolve(__dirname, 'puff-guard/index.html'),
        trackA: resolve(__dirname, 'track-a-flight/index.html'),
        trackB: resolve(__dirname, 'track-b-chase/index.html')
      }
    }
  }
});
