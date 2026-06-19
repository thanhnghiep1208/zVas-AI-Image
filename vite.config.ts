import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: {
          port: 24679,
          clientPort: 24679,
          host: 'localhost',
        },
      },
      plugins: [react(), tailwindcss()],
      optimizeDeps: {
        include: ['p-retry'],
        exclude: ['@google/genai', 'firebase', 'gaxios', 'node-fetch', 'formdata-polyfill', 'whatwg-fetch', 'isomorphic-fetch', 'cross-fetch', 'unfetch', 'isomorphic-unfetch', 'isomorphic-form-data', 'form-data']
      },
      build: {
        // Firebase + Firestore SDK ~560 kB minified — split sub-chunks to avoid single >500 kB warning.
        chunkSizeWarningLimit: 600,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (/node_modules\/(react\/|react-dom\/|scheduler\/)/.test(id)) {
                return 'react-vendor';
              }
              if (
                id.includes('node_modules/@firebase/firestore') ||
                id.includes('node_modules/firebase/firestore')
              ) {
                return 'firebase-firestore-vendor';
              }
              if (
                id.includes('node_modules/@firebase/auth') ||
                id.includes('node_modules/firebase/auth')
              ) {
                return 'firebase-auth-vendor';
              }
              if (
                id.includes('node_modules/@firebase/app') ||
                id.includes('node_modules/firebase/app')
              ) {
                return 'firebase-app-vendor';
              }
              if (id.includes('node_modules/@firebase/') || id.includes('node_modules/firebase/')) {
                return 'firebase-misc-vendor';
              }
              if (id.includes('node_modules/lucide-react/')) {
                return 'lucide-vendor';
              }
              if (id.includes('node_modules/recharts/')) {
                return 'recharts-vendor';
              }
              if (id.includes('node_modules/sonner/')) {
                return 'sonner-vendor';
              }
              return undefined;
            },
          },
        },
      },
      resolve: {
        alias: [
          { find: '@', replacement: path.resolve(__dirname, '.') },
          { find: 'p-retry', replacement: path.resolve(__dirname, './shims/p-retry-shim.ts') },
          { find: 'formdata-polyfill/esm.min.js', replacement: path.resolve(__dirname, './shims/formdata-shim.js') },
          { find: 'formdata-polyfill/FormData.js', replacement: path.resolve(__dirname, './shims/formdata-shim.js') },
          { find: /formdata-polyfill/, replacement: path.resolve(__dirname, './shims/formdata-shim.js') },
          { find: /isomorphic-form-data/, replacement: path.resolve(__dirname, './shims/formdata-shim.js') },
          { find: /form-data/, replacement: path.resolve(__dirname, './shims/formdata-shim.js') },
          { find: /node-fetch/, replacement: path.resolve(__dirname, './shims/node-fetch-shim.js') },
          { find: /whatwg-fetch/, replacement: path.resolve(__dirname, './shims/whatwg-fetch-shim.js') },
          { find: /isomorphic-fetch/, replacement: path.resolve(__dirname, './shims/whatwg-fetch-shim.js') },
          { find: /cross-fetch/, replacement: path.resolve(__dirname, './shims/whatwg-fetch-shim.js') },
          { find: /unfetch/, replacement: path.resolve(__dirname, './shims/whatwg-fetch-shim.js') },
          { find: /isomorphic-unfetch/, replacement: path.resolve(__dirname, './shims/whatwg-fetch-shim.js') },
        ]
      }
    };
});
