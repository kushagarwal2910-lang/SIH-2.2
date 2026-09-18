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
      '/api/incois-thredds': {
        target: 'https://incois.gov.in',
        changeOrigin: true,
        secure: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://incois.gov.in/site/services/osf.jsp',
        },
        rewrite: (path) => path.replace(/^\/api\/incois-thredds/, '/thredds'),
      },
      '/api/backend': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/backend/, ''),
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
});
