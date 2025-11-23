
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

// ==========================================
// SERVIÇO PEXELS (FALLBACK)
// ==========================================
async function fetchPexelsImage(query: string): Promise<string | null> {
    const pexelsKey = process.env.PEXELS_API_KEY;
    
    if (!pexelsKey) {
        console.warn("Chave da API do Pexels não configurada. Pulando fallback Pexels.");
        return null;
    }

    try {
        console.log(`Buscando no Pexels por: ${query}`);
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=portrait&size=large`, {
            headers: {
                Authorization: pexelsKey
            }
        });

        if (!response.ok) {
            throw new Error(`Pexels API Error: ${response.status}`);
        }

        const data = await response.json();
        if (data.photos && data.photos.length > 0) {
            // Retorna a imagem large2x (boa qualidade)
            return data.photos[0].src.large2x;
        }
        return null;
    } catch (error) {
        console.error("Erro ao buscar imagem no Pexels:", error);
        return null;
    }
}

// ==========================================
// SERVIÇOS GEMINI (TEXTO)
// ==========================================

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

// ==========================================
// GERAÇÃO DE IMAGEM (AI + FALLBACK PEXELS)
// ==========================================

export async function generateQuoteImage(quoteText: string): Promise<string> {
    const ai = getAiClient();
    let searchKeywords = "abstract nature"; // Padrão

    try {
        // Passo 1: Analisar a citação para criar um prompt visual coerente e palavras-chave
        const promptAnalysisResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Analyze this quote: "${quoteText}"
            
            Task:
            1. Create a "visual_prompt" for an AI Image Generator. It must be METAPHORICAL and ATMOSPHERIC.
               - Example: Quote about "Time" -> Visual: "An ancient hourglass buried in sand dunes at sunset".
               - Example: Quote about "Hope" -> Visual: "A single small sprout growing from a crack in a dark concrete wall, ray of light".
               - STYLE: Cinematic, Photorealistic, 8k, Dramatic Lighting.
               - STRICTLY NO TEXT, NO LETTERS.

            2. Create "search_keywords" for a stock photo site (Pexels).
               - 2 to 3 English keywords that capture the mood/subject.
            
            Output JSON format only.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        visual_prompt: { type: Type.STRING },
                        search_keywords: { type: Type.STRING }
                    }
                }
            }
        }));

        const analysisData = JSON.parse(cleanJsonString(promptAnalysisResponse.text));
        const visualPrompt = analysisData.visual_prompt;
        searchKeywords = analysisData.search_keywords || "nature abstract";

        // Passo 2: Tentar gerar imagem com Nano Banana (Gemini 2.5 Flash Image)
        // Prompt final blindado para nitidez e HD
        const fullImagePrompt = `${visualPrompt}, photorealistic, sharp focus, 8k, highly detailed, HD. NO TEXT, NO WATERMARKS, NO SIGNATURES, NO TYPOGRAPHY.`;

        try {
            const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                  parts: [{ text: fullImagePrompt }]
                },
                config: {
                    // @ts-ignore
                    imageConfig: {
                        aspectRatio: "9:16",
                    }
                },
            }));

            let base64ImageBytes: string | null = null;
            if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData && part.inlineData.data) {
                  base64ImageBytes = part.inlineData.data;
                  break;
                }
              }
            }

            if (base64ImageBytes) {
                return `data:image/jpeg;base64,${base64ImageBytes}`;
            }
            throw new Error("Dados de imagem não encontrados na resposta da IA.");

        } catch (aiError) {
            console.warn("Falha na geração IA (Nano Banana). Tentando Pexels...", aiError);
            // Se falhar a geração IA, lança erro para cair no catch abaixo e tentar Pexels
            throw aiError;
        }

    } catch (error: any) {
        // Passo 3: Fallback para Pexels se a IA falhar (Ex: Billing, Cota, Erro 500)
        console.log("Tentando fallback via Pexels com keywords:", searchKeywords);
        
        const pexelsImage = await fetchPexelsImage(searchKeywords);
        if (pexelsImage) {
            return pexelsImage;
        }

        // Passo 4: Fallback final (Imagens Hardcoded)
        console.warn("Falha total (IA e Pexels). Usando imagem estática.", error.message);
        return getRandomFallbackImage();
    }
}
