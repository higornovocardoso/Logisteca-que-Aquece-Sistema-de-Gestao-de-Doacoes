import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    minify: 'terser',
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // React e o roteador mudam pouco: num arquivo próprio, ficam no cache do navegador entre publicações
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|@remix-run)[\\/]/.test(id)) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
});
