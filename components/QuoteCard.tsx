
import React, { useRef, useState, useEffect } from 'react';
import type { Quote } from '../types';
import { DownloadIcon, HeartIcon, RefreshIcon, ShareIcon } from './Icons';
import { Spinner } from './Spinner';
import html2canvas from 'html2canvas';

interface QuoteCardProps {
  quote: Quote;
  isFavorite?: boolean;
  onToggleFavorite?: (quote: Quote) => void;
  onRegenerateImage?: (quote: Quote) => Promise<void>;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ 
  quote, 
  isFavorite = false, 
  onToggleFavorite,
  onRegenerateImage 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setIsImageLoaded(false);
    setHasImageError(false);
  }, [quote.imageUrl]);

  const captureImage = async () => {
    if (!cardRef.current) return null;
    return await html2canvas(cardRef.current, {
      useCORS: true,
      scale: 3, 
      backgroundColor: '#F2F0E9',
      logging: false,
      ignoreElements: (el) => el.classList.contains('exclude-from-capture'),
    });
  };

  const handleDownload = async () => {
    if (!cardRef.current || isRegenerating || isDownloading) return;
    setIsDownloading(true);
    try {
      const canvas = await captureImage();
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = `sophia-academy-${Date.now()}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } finally { setIsDownloading(false); }
  };

  const handleShare = async () => {
    if (!cardRef.current || isRegenerating || isSharing) return;
    setIsSharing(true);
    
    try {
      const canvas = await captureImage();
      if (!canvas) return;
      
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `sophia-academy-${Date.now()}.jpg`, { type: "image/jpeg" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ 
          files: [file], 
          title: 'Sophia: Academia de Platão', 
          text: `"${quote.quote}" — ${quote.author}` 
        });
      } else {
        await navigator.clipboard.writeText(`"${quote.quote}" — ${quote.author}`);
        alert('Texto copiado com sucesso!');
      }
    } catch (err) {
      console.error("Erro no compartilhamento:", err);
    } finally { 
      setIsSharing(false); 
    }
  };

  const onImageChange = async () => {
    if (!onRegenerateImage || isRegenerating) return;
    setIsRegenerating(true);
    try { await onRegenerateImage(quote); } finally { setIsRegenerating(false); }
  };

  const isBusy = isSharing || isDownloading || isRegenerating;

  return (
    <div className="space-y-10 animate-reveal w-full pb-10">
      <div 
        ref={cardRef} 
        className="relative w-full aspect-[4/5] rounded-none overflow-hidden shadow-xl bg-white border border-[#1C5D99]/10 flex flex-col group"
      >
        {/* Visual Engine */}
        {quote.imageUrl ? (
            <img 
                src={quote.imageUrl} 
                alt="Pensamento" 
                referrerPolicy="no-referrer"
                onLoad={() => setIsImageLoaded(true)}
                onError={() => {
                  setHasImageError(true);
                  setIsImageLoaded(true);
                }}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${isImageLoaded ? 'opacity-50 grayscale-[0.3] scale-100' : 'opacity-0 scale-110 blur-2xl'}`}
            />
        ) : <div className="absolute inset-0 bg-[#F2F0E9]"></div>}

        {/* Cinematic Overlays - Academy theme */}
        <div className="absolute inset-0 bg-[#F2F0E9]/40 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#F2F0E9] via-transparent to-[#F2F0E9]/20 z-10"></div>
        
        {/* Aesthetic Quote Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-16 text-center z-20 pointer-events-none">
            <div className="space-y-6 sm:space-y-10">
              <blockquote className="font-title text-xl sm:text-4xl leading-relaxed text-[#1C5D99] font-bold drop-shadow-[0_2px_4px_rgba(255,255,255,0.8)] break-words">
                  “{quote.quote}”
              </blockquote>
              
              <div className="flex flex-col items-center gap-2 sm:gap-4">
                <div className="h-[1px] sm:h-[2px] w-8 sm:w-12 bg-[#D4B483]"></div>
                <cite className="text-[10px] sm:text-[12px] text-[#B76E55] not-italic tracking-[0.2em] sm:tracking-[0.4em] font-bold uppercase">
                    {quote.author}
                </cite>
              </div>
            </div>
        </div>
        
        {/* Internal Action Panel */}
        <div className="exclude-from-capture absolute top-4 right-4 sm:top-8 sm:right-8 flex flex-col gap-3 sm:gap-4 z-30">
            <button
                onClick={onImageChange}
                disabled={isBusy}
                className="p-3 sm:p-4 rounded-none bg-white/90 backdrop-blur-md border border-[#1C5D99]/10 text-[#1C5D99]/60 hover:text-[#1C5D99] transition-all active:scale-90 shadow-md disabled:opacity-20"
                title="Novo cenário"
            >
                <RefreshIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${isRegenerating ? 'animate-spin text-[#B76E55]' : ''}`} />
            </button>
            <button
                onClick={() => onToggleFavorite?.(quote)}
                disabled={isBusy}
                className="p-3 sm:p-4 rounded-none bg-white/90 backdrop-blur-md border border-[#1C5D99]/10 text-[#1C5D99]/60 hover:text-[#1C5D99] transition-all active:scale-90 shadow-md"
                title="Favoritar"
            >
                <HeartIcon className={`w-3 h-3 sm:w-4 sm:h-4 ${isFavorite ? 'text-[#B76E55] fill-[#B76E55]' : ''}`} fill={isFavorite} />
            </button>
        </div>
        
        {/* Minimal Signature */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center gap-3 opacity-20 z-20">
          <span className="text-[9px] uppercase tracking-[1em] font-bold text-[#1C5D99]">SOPHIA</span>
        </div>
        
        {/* Elegant Loading Stage */}
        {(isRegenerating || (!isImageLoaded && !hasImageError)) && (
            <div className="absolute inset-0 bg-[#F2F0E9]/95 backdrop-blur-md flex flex-col items-center justify-center z-50 transition-opacity">
                <Spinner className="w-10 h-10 text-[#B76E55]" />
                <p className="text-[10px] text-[#B76E55] mt-8 uppercase tracking-[0.5em] font-bold animate-pulse">
                  {isRegenerating ? 'Contemplando' : 'Buscando Essência'}
                </p>
            </div>
        )}
      </div>

      {/* Hero Interaction Bar */}
      <div className="flex gap-4 px-1">
            <button
                onClick={handleShare}
                disabled={isBusy}
                className="flex-[3] bg-[#B76E55] hover:bg-[#9E5A44] text-white font-bold py-6 rounded-none flex items-center justify-center gap-4 transition-all text-[11px] uppercase tracking-[0.2em] disabled:opacity-30 shadow-lg"
            >
                {isSharing ? <Spinner className="w-4 h-4 text-white" /> : <ShareIcon className="w-4 h-4" />}
                {isSharing ? 'Preparando...' : 'Compartilhar'}
            </button>
            <button
                onClick={handleDownload}
                disabled={isBusy}
                className="flex-1 bg-white hover:bg-[#F2F0E9] text-[#1C5D99] py-6 rounded-none flex items-center justify-center transition-all border border-[#1C5D99]/10 disabled:opacity-20 group shadow-md"
                title="Salvar"
            >
                {isDownloading ? <Spinner className="w-4 h-4 text-[#1C5D99]" /> : <DownloadIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />}
            </button>
      </div>
    </div>
  );
};
