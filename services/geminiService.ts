
import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import type { Quote } from '../types';

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1507502707541-f369a3b18502?q=80&w=1080&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1516466723877-e4ec1d736c8a?q=80&w=1080&auto=format&fit=crop", 
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=1080&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1080&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1080&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?q=80&w=1080&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1080&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1080&auto=format&fit=crop"
];

const PEXELS_API_KEY = "0jlOztyKr3RcmCGI4otTNAzcAa4EvwQjuhYdwsGkrwdlueL4uUIn1Wh5";
const NATURE_QUERIES = [
  "sunny sea landscape", 
  "mountain range daylight", 
  "bright forest", 
  "desert dunes sun", 
  "clear blue sky", 
  "waterfall nature bright", 
  "sunny field", 
  "wild birds sky", 
  "river stream daylight", 
  "ocean waves bright", 
  "arctic ice sun", 
  "volcanic landscape bright"
];

const VISUAL_STYLES = [
  "minimalist bright abstract nature",
  "cinematic vibrant nature landscape",
  "ethereal bright nature atmosphere",
  "geometric nature patterns bright",
  "soft bokeh nature well-lit",
  "vibrant nature colors",
  "zen garden nature aesthetic bright",
  "cosmic nebula vibrant",
  "watercolor nature wash bright"
];

const getStaticFallbackImage = () => {
  const base = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
  return `${base}&sig=${Math.random()}`;
};

async function getPexelsImage(): Promise<string> {
  try {
    const query = NATURE_QUERIES[Math.floor(Math.random() * NATURE_QUERIES.length)];
    // Adicionamos "no people" na query para reforçar, embora Pexels não suporte "NOT" diretamente, queries de natureza costumam ser limpas.
    const response = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=20&orientation=portrait`, {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });
    const data = await response.json();
    if (data.photos && data.photos.length > 0) {
      const randomPhoto = data.photos[Math.floor(Math.random() * data.photos.length)];
      return randomPhoto.src.large2x || randomPhoto.src.large;
    }
  } catch (error) {
    console.error("Pexels Error:", error);
  }
  return getStaticFallbackImage();
}
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

const getAIInstance = () => {
  const apiKey = process.env.GEMINI_API_KEY || "";
  // Não lançamos erro aqui para permitir que o app carregue a UI, mesmo sem a chave.
  return new GoogleGenAI({ apiKey });
};

export async function getRandomQuote(): Promise<Quote> {
  const ai = getAIInstance();
  if (!process.env.GEMINI_API_KEY) throw new Error("API_KEY_MISSING");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Gere um pensamento filosófico profundo ou uma citação de sabedoria em Português. Retorne um objeto JSON com 'quote' (a frase) e 'author' (o filósofo ou pensador).`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
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
  });

  const text = response.text || "{}";
  const data = JSON.parse(text);
  let imageUrl = await getPexelsImage();
  
  try {
    imageUrl = await generateQuoteImage(data.quote);
  } catch (e) {
    console.warn("Falha ao gerar imagem, usando Pexels.");
  }

  return { ...data, id: generateId(), imageUrl };
}

export async function getTopicDescription(theme: string): Promise<string> {
  const ai = getAIInstance();
  if (!process.env.GEMINI_API_KEY) return "Sabedoria em busca de conexão...";
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Descreva em 100 caracteres a essência de "${theme}". Seja minimalista.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });
  return response.text || "";
}

export async function getPhilosophicalQuotes(theme: string): Promise<Quote[]> {
  const ai = getAIInstance();
  if (!process.env.GEMINI_API_KEY) throw new Error("API_KEY_MISSING");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Gere 3 pensamentos ou citações filosóficas sobre '${theme}'. Retorne um array JSON de objetos com 'quote' e 'author' (pensador).`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            quote: { type: Type.STRING },
            author: { type: Type.STRING },
          },
          required: ["quote", "author"],
        }
      },
    },
  });

  const text = response.text || "[]";
  const parsed = JSON.parse(text);
  
  return Promise.all(parsed.map(async (q: any) => ({ 
    ...q, 
    id: generateId(), 
    imageUrl: await getPexelsImage() 
  })));
}

export async function generateQuoteImage(quoteText: string): Promise<string> {
  const ai = getAIInstance();
  if (!process.env.GEMINI_API_KEY) return getPexelsImage();

  const randomStyle = VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [{ 
          text: `STRICTLY NO PEOPLE. ABSOLUTELY NO HUMANS. EMPTY NATURE LANDSCAPE ONLY. BRIGHT AND WELL-LIT. 
          
          Analyze the mood and metaphor of this philosophical thought: "${quoteText}". 
          Create a deep, cinematic, photorealistic and minimalist NATURE representation that visually reflects this message. 
          
          Background must be strictly inanimate nature (forest, mountains, ocean, clouds, etc) in bright daylight or golden hour. 
          NO BUILDINGS, NO STADIUMS, NO URBAN ELEMENTS. 
          Style: ${randomStyle}. Cinematic lighting, 8k, vibrant colors.` 
        }] 
      },
      config: { imageConfig: { aspectRatio: "9:16" } },
    });

    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData?.data) {
      return `data:image/jpeg;base64,${part.inlineData.data}`;
    }
    return getPexelsImage();
  } catch (e) {
    return getPexelsImage();
  }
}
