
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente do arquivo .env, independentemente do prefixo
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioriza a variável do sistema (hospedagem), depois .env (API_KEY), e por fim fallback para VITE_API_KEY
  // Adicionamos .trim() para evitar erros com espaços em branco ao copiar a chave
  let apiKey = process.env.API_KEY || env.API_KEY || env.VITE_API_KEY;
  
  if (apiKey) {
    apiKey = apiKey.trim();
  }

  return {
    plugins: [react()],
    define: {
      // Injeta a variável globalmente no código do cliente
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
