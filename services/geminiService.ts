
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import type { Quote } from '../types';

// Singleton para a instância da IA
let aiInstance: GoogleGenAI | null = null;

// Imagens de fallback para quando a cota de imagem acabar ou não houver faturamento
const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=720&auto=format&fit=crop", // Cinema projector/Dark
  "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=720&auto=format&fit=crop", // Mountains/Starry
  "https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=720&auto=format&fit=crop", // Red lights/Dark
  "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?q=80&w=720&auto=format&fit=crop", // Dark clouds
  "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=720&auto=format&fit=crop", // Dark mood
  "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=720&auto=format&fit=crop"  // Black and white abstract
];

const getRandomFallbackImage = () => {
  return FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
};

// Função para gerar IDs simples
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Função auxiliar para obter o cliente de forma segura
const getAiClient = () => {
  if (aiInstance) return aiInstance;

  if (!process.env.API_KEY) {
    console.error("API Key não encontrada. Verifique se API_KEY está definida.");
    throw new Error("API_KEY_MISSING");
  }

  aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  return aiInstance;
};

// Função de delay para backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper para tentar novamente em caso de erro 503 (Overloaded)
async function withRetry<T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    const isOverloaded = 
      error?.message?.includes('overloaded') || 
      error?.message?.includes('503') || 
      error?.code === 503 ||
      error?.status === 'UNAVAILABLE';

    if (isOverloaded && retries > 0) {
      console.warn(`Modelo sobrecarregado. Tentando novamente em ${delay}ms... Restam ${retries} tentativas.`);
      await sleep(delay);
      return withRetry(operation, retries - 1, delay * 2); // Backoff exponencial
    }
    throw error;
  }
}

interface RawQuote {
  quote: string;
  author: string;
}

// Função auxiliar para limpar JSON que vem com markdown (```json ... ```)
const cleanJsonString = (str: string | undefined): string => {
  if (!str) return "{}";
  let cleaned = str.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```/, "").replace(/```$/, "");
  }
  return cleaned.trim();
};

export async function getPhilosophicalQuotes(theme: string): Promise<Quote[]> {
  const ai = getAiClient();
  
  const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-2.5-flash", 
    contents: `Gere um array JSON contendo exatamente 3 citações filosóficas profundas e concisas sobre o tema '${theme}'.
    
    REGRAS OBRIGATÓRIAS:
    1. As citações devem estar EXCLUSIVAMENTE em PORTUGUÊS DO BRASIL (pt-BR). Não retorne em inglês ou outro idioma.
    2. Cada citação deve ser de um filósofo ou pensador renomado da história.
    3. Cada objeto no array deve ter as chaves "quote" e "author".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
              quote: {
                type: Type.STRING,
                description: "O texto da citação filosófica estritamente em Português do Brasil.",
              },
              author: {
                type: Type.STRING,
                description: "O nome do filósofo autor da citação.",
              },
            },
          required: ["quote", "author"],
        }
      },
    },
  }));

  const jsonString = cleanJsonString(response.text);
  if (!jsonString || jsonString === "{}") throw new Error("API retornou conteúdo vazio.");
  
  const quotesRaw: RawQuote[] = JSON.parse(jsonString);
  
  // Mapeia adicionando ID e placeholder de imagem vazio (será preenchido depois)
  return quotesRaw.map(q => ({
      ...q,
      id: generateId(),
      imageUrl: ''
  }));
}

export async function getQuoteOfTheDay(): Promise<Quote> {
  const ai = getAiClient();

  const quoteResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Gere UMA, e apenas uma, citação filosófica em PORTUGUÊS DO BRASIL (pt-BR).
    
    REGRAS:
    1. Idioma: Português do Brasil apenas.
    2. A citação deve ser curta, profunda e inspiradora, sobre o tema 'sabedoria', 'natureza humana' ou 'resiliência'.
    3. Autor deve ser um filósofo renomado (ex: Sêneca, Marco Aurélio, Nietzsche, etc).
    4. A resposta deve ser apenas o JSON com texto e autor.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          author: { type: Type.STRING },
        },
        required: ["quote", "author"],
      },
    },
  }));

  const jsonString = cleanJsonString(quoteResponse.text);
  if (!jsonString || jsonString === "{}") throw new Error("API retornou conteúdo vazio para Citação do Dia.");

  const dailyQuoteRaw: RawQuote = JSON.parse(jsonString);
  
  if (!dailyQuoteRaw || !dailyQuoteRaw.quote) {
    throw new Error("Formato inválido recebido da API.");
  }

  // Tenta gerar a imagem, mas se falhar (por faturamento), usa fallback silenciosamente
  const imageUrl = await generateQuoteImage(dailyQuoteRaw.quote);
  return { 
      ...dailyQuoteRaw, 
      id: generateId(),
      imageUrl 
  };
}


export async function generateQuoteImage(quoteText: string): Promise<string> {
    try {
        const ai = getAiClient();

        // Step 1: Generate a visual prompt (Text model - Free friendly)
        // Refinado para evitar texto e focar em planos de fundo
        const descriptionResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Atue como um Diretor de Arte. Crie um prompt descritivo para uma IMAGEM DE FUNDO (Wallpaper) baseada nesta citação:
            "${quoteText}"
            
            Objetivo: A imagem servirá de fundo para um texto branco sobreposto. Ela deve ser limpa, atmosférica e SEM TEXTOS ou NÚMEROS na cena.
            
            Regras Estritas:
            1. Responda APENAS com o prompt em INGLÊS.
            2. Foco visual: Paisagens, Natureza, Texturas Abstratas, Jogos de Luz e Sombra, Macrofotografia, Céu, Água.
            3. PROIBIDO: Placas, Sinais, Livros com letras, Relógios digitais, Claquetes de cinema, Jornais, Telas com dados.
            4. Estilo: Minimalista, Cinemático, Fotorealista, Profundidade de campo suave (Blur no fundo).
            5. Mantenha curto (max 25 palavras).`,
        }));
        
        const visualPrompt = descriptionResponse.text?.trim();
        if (!visualPrompt) {
            console.warn("Falha ao gerar prompt visual, usando imagem padrão.");
            return getRandomFallbackImage();
        }

        // Step 2: Generate the image (Image model - Billing required)
        // Reforçando negative prompts no próprio prompt positivo
        const fullImagePrompt = `Cinematographic background wallpaper, ${visualPrompt}. Soft focus, blurry background, negative space, moody lighting, 8k, photorealistic. NO TEXT, NO NUMBERS, NO WRITING, NO WATERMARKS, NO SIGNATURES.`;

        const response = await withRetry<any>(() => ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: fullImagePrompt,
            config: {
                numberOfImages: 1,
                aspectRatio: '9:16',
                outputMimeType: 'image/jpeg',
            },
        }));

        if (!response.generatedImages?.[0]?.image?.imageBytes) {
            throw new Error("API de Imagem não retornou dados.");
        }

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;

    } catch (error: any) {
        // Se der erro (especialmente erro 400 de faturamento/billing ou 503 persistente), usamos o fallback
        console.warn("Erro na geração de imagem (API Imagen ou Overload). Usando imagem de fallback.", error.message);
        return getRandomFallbackImage();
    }
}
