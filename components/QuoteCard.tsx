
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
      backgroundColor: '#020305',
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
      link.download = `palavra-diaria-${Date.now()}.jpg`;
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
      const file = new File([blob], `palavra-diaria-${Date.now()}.jpg`, { type: "image/jpeg" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ 
          files: [file], 
          title: 'A Palavra Diária', 
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
    <div className="space-y-6 animate-reveal w-full">
      <div 
        ref={cardRef} 
        className="relative w-full aspect-[4/5] sm:aspect-[9/16] rounded-[2.5rem] overflow-hidden shadow-2xl bg-[#0a0c10] border border-white/5 flex flex-col group"
      >
        {/* Visual Engine */}
        {quote.imageUrl ? (
            <img 
                src={quote.imageUrl} 
                alt="Pensamento" 
                onLoad={() => setIsImageLoaded(true)}
                onError={() => {
                  setHasImageError(true);
                  setIsImageLoaded(true);
                }}
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ${isImageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110 blur-2xl'}`}
            />
        ) : <div className="absolute inset-0 bg-[#0a0c10]"></div>}

        {/* Cinematic Overlays - Lightened for better visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)] z-10"></div>
        
        {/* Aesthetic Quote Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-14 text-center z-20 pointer-events-none">
            <div className="space-y-10">
              <blockquote className="font-serif-display text-3xl sm:text-4xl leading-tight italic text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] tracking-wide font-light">
                  “{quote.quote}”
              </blockquote>
              
              <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 mx-auto shadow-lg">
                <cite className="font-serif-display text-lg text-[#FFD700] not-italic tracking-widest font-medium drop-shadow-md">
                    {quote.author}
                </cite>
              </div>
            </div>
        </div>
        
        {/* Internal Action Panel */}
        <div className="exclude-from-capture absolute top-6 right-6 flex flex-col gap-3 z-30">
            <button
                onClick={onImageChange}
                disabled={isBusy}
                className="p-3.5 rounded-full glass-action text-white/60 hover:text-white transition-all active:scale-90 shadow-xl disabled:opacity-20"
                title="Novo cenário"
            >
                <RefreshIcon className={`w-4 h-4 ${isRegenerating ? 'animate-spin text-blue-500' : ''}`} />
            </button>
            <button
                onClick={() => onToggleFavorite?.(quote)}
                disabled={isBusy}
                className="p-3.5 rounded-full glass-action text-white/60 hover:text-white transition-all active:scale-90 shadow-xl"
                title="Favoritar"
            >
                <HeartIcon className={`w-4 h-4 ${isFavorite ? 'text-red-500 fill-red-500' : ''}`} fill={isFavorite} />
            </button>
        </div>
        
        {/* Minimal Signature */}
        <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-3 opacity-30 z-20">
          <span className="text-[9px] uppercase tracking-[0.6em] font-black text-white">SOPHIA</span>
        </div>
        
        {/* Elegant Loading Stage */}
        {(isRegenerating) && (
            <div className="absolute inset-0 bg-[#000033]/95 backdrop-blur-3xl flex flex-col items-center justify-center z-50 transition-opacity">
                <Spinner className="w-10 h-10 text-[#FFD700]" />
                <p className="text-[9px] text-[#FFD700] mt-6 uppercase tracking-[0.4em] font-black animate-pulse">Tecendo Arte</p>
            </div>
        )}
      </div>

      {/* Hero Interaction Bar */}
      <div className="flex gap-3 px-1">
            <button
                onClick={handleShare}
                disabled={isBusy}
                className="flex-[3] bg-[#000080] hover:bg-[#000066] text-white font-black py-5 rounded-[1.8rem] flex items-center justify-center gap-3 transition-all text-[12px] uppercase tracking-[0.15em] disabled:opacity-30 border border-white/10"
            >
                {isSharing ? <Spinner className="w-4 h-4 text-white" /> : <ShareIcon className="w-4 h-4" />}
                {isSharing ? 'Preparando...' : 'Compartilhar'}
            </button>
            <button
                onClick={handleDownload}
                disabled={isBusy}
                className="flex-1 bg-white shadow-sm hover:bg-gray-50 text-gray-800 py-5 rounded-[1.8rem] flex items-center justify-center transition-all border border-gray-200 disabled:opacity-20 group"
                title="Salvar"
            >
                {isDownloading ? <Spinner className="w-4 h-4 text-[#000080]" /> : <DownloadIcon className="w-5 h-5 group-hover:text-[#000080] transition-colors" />}
            </button>
      </div>
    </div>
  );
};
