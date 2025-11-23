
import React, { useRef, useState, useEffect } from 'react';
import type { Quote } from '../types';
import { DownloadIcon, HeartIcon } from './Icons';
import html2canvas from 'html2canvas';

interface QuoteCardProps {
  quote: Quote;
  isFavorite?: boolean;
  onToggleFavorite?: (quote: Quote) => void;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ quote, isFavorite = false, onToggleFavorite }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [isImageReady, setIsImageReady] = useState(false);

  // Efeito para processar a imagem (Converter URL externa para Base64 local)
  // Isso resolve o problema de CORS/Tainted Canvas no html2canvas definitivamente.
  useEffect(() => {
    let isMounted = true;
    setIsImageReady(false);

    const processImage = async () => {
      if (!quote.imageUrl) return;

      // Se já for base64 (gerado pela IA), usa direto
      if (quote.imageUrl.startsWith('data:')) {
        if (isMounted) {
          setImgSrc(quote.imageUrl);
          setIsImageReady(true);
        }
        return;
      }

      // Se for URL externa (Fallback/Unsplash), converte para Base64 via fetch
      try {
        const response = await fetch(quote.imageUrl, { mode: 'cors' });
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = () => {
          if (isMounted) {
            setImgSrc(reader.result as string);
            setIsImageReady(true);
          }
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error("Erro ao converter imagem para download:", error);
        // Fallback: tenta usar a URL original se a conversão falhar
        if (isMounted) {
          setImgSrc(quote.imageUrl);
          setIsImageReady(true);
        }
      }
    };

    processImage();

    return () => {
      isMounted = false;
    };
  }, [quote.imageUrl]);

  const handleDownload = async () => {
    if (!cardRef.current || !isImageReady) return;

    setIsDownloading(true);
    try {
      // Aguarda um momento para garantir que o renderizador atualizou
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,       // Mantém true por segurança
        allowTaint: false,   // Impede canvas sujo (se falhar, lança erro em vez de baixar img quebrada)
        scale: 2,            // Alta resolução
        backgroundColor: '#111827',
        logging: false,
        ignoreElements: (element) => element.classList.contains('exclude-from-capture'),
      });

      const image = canvas.toDataURL("image/jpeg", 0.9);

      const link = document.createElement('a');
      const safeAuthor = quote.author.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      link.download = `sophia-${safeAuthor}-${Date.now()}.jpg`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Erro fatal no download:', error);
      alert('Não foi possível baixar a imagem devido a restrições do navegador. Tente tirar um print da tela.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div ref={cardRef} className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-lg shadow-black/50 bg-gray-800 group">
        
        {/* Imagem de Fundo (Agora sempre segura para CORS ou Base64) */}
        {imgSrc ? (
            <img 
                src={imgSrc} 
                alt={`Citação de ${quote.author}`} 
                // Alterações aqui: Removido blur e scale, aumentado opacity para nitidez HD
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${isImageReady ? 'opacity-90' : 'opacity-0'}`}
            />
        ) : null}

        {/* Skeleton / Loading State */}
        {!isImageReady && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center z-20">
                <span className="text-gray-500 text-sm font-medium">Processando arte...</span>
            </div>
        )}
        
        {/* Overlay Escuro Mais Robusto para Legibilidade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/40 z-0"></div>
        
        {/* Conteúdo de Texto */}
        <div className="absolute inset-0 flex flex-col justify-center items-center p-8 text-white text-center h-full z-10">
            <div className="flex-1 flex flex-col justify-center">
                <blockquote 
                    className="font-serif-display text-2xl sm:text-3xl md:text-4xl font-bold leading-snug tracking-wide"
                    style={{ textShadow: '0 4px 12px rgba(0,0,0,0.9)' }}
                >
                    “{quote.quote}”
                </blockquote>
            </div>
            
            <div className="pb-12 w-full flex justify-end">
                <cite 
                    className="font-serif-display text-xl sm:text-2xl text-blue-200 not-italic border-t border-blue-500/30 pt-4 pl-8"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,1)' }}
                >
                    — {quote.author}
                </cite>
            </div>
        </div>
        
        {/* Botão Favoritar (Não aparece no print) */}
        {onToggleFavorite && (
            <button
                onClick={() => onToggleFavorite(quote)}
                className="exclude-from-capture absolute top-4 right-4 p-3 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all duration-300 z-20 group/heart"
                title={isFavorite ? "Remover dos Favoritos" : "Salvar nos Favoritos"}
            >
                <HeartIcon 
                    className={`w-6 h-6 transition-colors ${isFavorite ? 'text-red-500' : 'text-white group-hover/heart:text-red-300'}`} 
                    fill={isFavorite}
                />
            </button>
        )}
        
        {/* Watermark */}
        <div className="absolute bottom-3 left-0 right-0 text-center opacity-40 text-[10px] uppercase tracking-widest font-sans text-white z-10">
            Sophia • Biblioteca de Pensamentos
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={isDownloading || !isImageReady}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3.5 px-4 rounded-full flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-blue-900/20 active:scale-95"
      >
        {isDownloading ? (
            <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Gerando imagem...
            </span>
        ) : (
            <>
                <DownloadIcon className="w-5 h-5" />
                Baixar Citação
            </>
        )}
      </button>
    </div>
  );
};
