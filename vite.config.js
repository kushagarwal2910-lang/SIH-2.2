import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 800,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: false,
    proxy: {
      '/api/argo': {
        target: 'https://erddap.ifremer.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/argo/, '/erddap'),
      },
      '/api/marine': {
        target: 'https://marine-api.open-meteo.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/marine/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
});
