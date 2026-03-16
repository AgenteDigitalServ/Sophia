
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  let apiKey = process.env.API_KEY || env.API_KEY || env.VITE_API_KEY;
  if (apiKey) {
    apiKey = apiKey.trim();
  }

  const DEFAULT_PEXELS_KEY = "0jlOztyKr3RcmCGI4otTNAzcAa4EvwQjuhYdwsGkrwdlueL4uUIn1Wh5";
  
  let pexelsKey = process.env.PEXELS_API_KEY || env.PEXELS_API_KEY || env.VITE_PEXELS_API_KEY || DEFAULT_PEXELS_KEY;
  if (pexelsKey) {
    pexelsKey = pexelsKey.trim();
  }

  return {
    plugins: [react()],
    base: '/',
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.PEXELS_API_KEY': JSON.stringify(pexelsKey),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
          }
        }
      }
    }
  };
});
