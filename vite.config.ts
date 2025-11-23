
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente do arquivo .env, independentemente do prefixo
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioriza a variável do sistema (hospedagem), depois .env (API_KEY), e por fim fallback para VITE_API_KEY
  let apiKey = process.env.API_KEY || env.API_KEY || env.VITE_API_KEY;
  if (apiKey) {
    apiKey = apiKey.trim();
  }

  // Carrega a chave do Pexels: Prioridade ENV > .env > Hardcoded Fallback (fornecida pelo usuário)
  // A chave fornecida atua como garantia de funcionamento da "Segunda Opção" (Fallback)
  const DEFAULT_PEXELS_KEY = "0jlOztyKr3RcmCGI4otTNAzcAa4EvwQjuhYdwsGkrwdlueL4uUIn1Wh5";
  
  let pexelsKey = process.env.PEXELS_API_KEY || env.PEXELS_API_KEY || env.VITE_PEXELS_API_KEY || DEFAULT_PEXELS_KEY;
  if (pexelsKey) {
    pexelsKey = pexelsKey.trim();
  }

  return {
    plugins: [react()],
    define: {
      // Injeta a variável globalmente no código do cliente
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.PEXELS_API_KEY': JSON.stringify(pexelsKey),
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
