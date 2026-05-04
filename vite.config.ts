import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
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
      define: {
        'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
      },
      optimizeDeps: {
        include: ['p-retry'],
        exclude: ['@google/genai', 'firebase', 'gaxios', 'node-fetch', 'formdata-polyfill', 'whatwg-fetch', 'isomorphic-fetch', 'cross-fetch', 'unfetch', 'isomorphic-unfetch', 'isomorphic-form-data', 'form-data']
      },
      resolve: {
        alias: [
          { find: '@', replacement: path.resolve(__dirname, '.') },
          { find: 'p-retry', replacement: path.resolve(__dirname, './src/p-retry-shim.ts') },
          { find: 'formdata-polyfill/esm.min.js', replacement: path.resolve(__dirname, './src/formdata-shim.js') },
          { find: 'formdata-polyfill/FormData.js', replacement: path.resolve(__dirname, './src/formdata-shim.js') },
          { find: /formdata-polyfill/, replacement: path.resolve(__dirname, './src/formdata-shim.js') },
          { find: /isomorphic-form-data/, replacement: path.resolve(__dirname, './src/formdata-shim.js') },
          { find: /form-data/, replacement: path.resolve(__dirname, './src/formdata-shim.js') },
          { find: /node-fetch/, replacement: path.resolve(__dirname, './src/node-fetch-shim.js') },
          { find: /whatwg-fetch/, replacement: path.resolve(__dirname, './src/whatwg-fetch-shim.js') },
          { find: /isomorphic-fetch/, replacement: path.resolve(__dirname, './src/whatwg-fetch-shim.js') },
          { find: /cross-fetch/, replacement: path.resolve(__dirname, './src/whatwg-fetch-shim.js') },
          { find: /unfetch/, replacement: path.resolve(__dirname, './src/whatwg-fetch-shim.js') },
          { find: /isomorphic-unfetch/, replacement: path.resolve(__dirname, './src/whatwg-fetch-shim.js') },
        ]
      }
    };
});
