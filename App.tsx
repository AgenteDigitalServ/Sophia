
import React, { useState, useCallback, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { QuoteCard } from './components/QuoteCard';
import { Spinner } from './components/Spinner';
import { getPhilosophicalQuotes, getRandomQuote, generateQuoteImage, getTopicDescription, getQuotesByReference } from './services/geminiService';
import type { Quote } from './types';
import { BookIcon, SearchIcon, StarIcon, HistoryIcon, DownloadIcon, RefreshIcon } from './components/Icons';

type ViewState = 'search' | 'favorites' | 'history';

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'keyword' | 'reference'>('keyword');
  const [topicDescription, setTopicDescription] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [randomQuote, setRandomQuote] = useState<Quote | null>(null);
  const [isRandomLoading, setIsRandomLoading] = useState<boolean>(true);
  
  const [favorites, setFavorites] = useState<Quote[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('search');
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  const fetchRandomQuote = useCallback(async () => {
    setIsRandomLoading(true);
    setError(null);
    try {
      const quote = await getRandomQuote();
      setRandomQuote(quote);
    } catch (err: any) {
      if (err.message === "API_KEY_MISSING") {
        setError("Configuração pendente: Chave de API não configurada.");
      } else {
        setError("Não foi possível carregar a sugestão do dia.");
      }
    } finally {
      setIsRandomLoading(false);
    }
  }, []);

  const resetToHome = useCallback(() => {
    setSearchTerm('');
    setQuotes([]);
    setTopicDescription('');
    setCurrentView('search');
    fetchRandomQuote();
  }, [fetchRandomQuote]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem('sophia_favorites');
    if (savedFavorites) {
      try { setFavorites(JSON.parse(savedFavorites)); } catch (e) { console.error(e); }
    }
    fetchRandomQuote();

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, [fetchRandomQuote]);

  useEffect(() => {
    localStorage.setItem('sophia_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBtn(false);
    setDeferredPrompt(null);
  };

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      resetToHome();
      return;
    }
    setIsLoading(true);
    setError(null);
    setQuotes([]);
    setTopicDescription('');
    setCurrentView('search');

    try {
      const isReference = activeTab === 'reference';
      const [description, fetchedQuotes] = await Promise.all([
        getTopicDescription(searchTerm, isReference),
        !isReference
          ? getPhilosophicalQuotes(searchTerm) 
          : getQuotesByReference(searchTerm)
      ]);
      setTopicDescription(description);

      if (fetchedQuotes.length === 0) {
        setError('Nenhum pensamento encontrado.');
        setIsLoading(false);
        return;
      }
      
      // Mostrar os textos imediatamente para o usuário
      setQuotes(fetchedQuotes);
      setIsLoading(false);

      // Buscar imagens em segundo plano para cada citação
      fetchedQuotes.forEach(async (quote) => {
        try {
          const imageUrl = await generateQuoteImage(quote.quote);
          setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, imageUrl } : q));
        } catch (err) {
          console.error("Erro ao carregar imagem em background:", err);
        }
      });
    } catch (err: any) {
      console.error("Erro na busca:", err);
      if (err.message === "API_KEY_MISSING") {
        setError("Configuração pendente: Chave de API não configurada no servidor.");
      } else {
        setError("Ocorreu um erro ao buscar sabedoria.");
      }
      setIsLoading(false);
    }
  }, [searchTerm, resetToHome]);

  const handleRegenerateImage = async (quote: Quote) => {
    try {
      const newImageUrl = await generateQuoteImage(quote.quote);
      setQuotes(prev => prev.map(q => q.id === quote.id ? { ...q, imageUrl: newImageUrl } : q));
      if (randomQuote?.id === quote.id) setRandomQuote(prev => prev ? { ...prev, imageUrl: newImageUrl } : null);
      setFavorites(prev => prev.map(q => q.quote === quote.quote ? { ...q, imageUrl: newImageUrl } : q));
    } catch (err) { console.error(err); }
  };

  const toggleFavorite = (quote: Quote) => {
    setFavorites(prev => {
      const exists = prev.some(fav => fav.quote === quote.quote);
      return exists ? prev.filter(fav => fav.quote !== quote.quote) : [quote, ...prev];
    });
  };

  return (
    <div className="bg-[#F2F0E9] min-h-screen text-[#2B2B2B] flex justify-center selection:bg-[#1C5D99]/20">
      <div className="w-full max-w-2xl min-h-screen flex flex-col relative overflow-x-hidden px-4 sm:px-10">
        
        {/* Superior Header - Academia de Platão Moderna */}
        <header className="pt-10 sm:pt-16 pb-8 sm:pb-12">
          <div className="flex flex-col items-center gap-6 sm:gap-10">
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <h1 className="text-3xl sm:text-4xl font-title text-[#1C5D99] tracking-tight font-bold text-center">
                {activeTab === 'keyword' ? 'Pensamento do Dia' : 'Sabedoria Filosófica'}
              </h1>
              <div className="h-[2px] w-16 bg-[#D4B483]"></div>
              <button 
                onClick={fetchRandomQuote}
                className="text-[#B76E55] hover:text-[#1C5D99] transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em]"
              >
                <RefreshIcon className="w-3 h-3" /> Nova Reflexão
              </button>
            </div>
            
            <div className="flex bg-[#1C5D99]/5 rounded-none p-1 border border-[#1C5D99]/10 w-full max-w-[320px]">
              <button 
                onClick={() => setCurrentView('search')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-none text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${currentView === 'search' ? 'bg-[#1C5D99] text-white shadow-md' : 'text-[#1C5D99]/60'}`}
              >
                Busca
              </button>
              <button 
                onClick={() => setCurrentView('favorites')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-none text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${currentView === 'favorites' ? 'bg-[#1C5D99] text-white shadow-md' : 'text-[#1C5D99]/60'}`}
              >
                Favoritos
              </button>
            </div>
          </div>
        </header>

        {/* Tabs Section - Academy theme */}
        <div className="mb-10">
          <div className="flex border-b border-[#1C5D99]/10">
            <button 
              onClick={() => {
                setActiveTab('keyword');
                setSearchTerm('');
              }}
              className={`flex-1 py-5 text-[10px] font-bold tracking-[0.3em] transition-all border-b-2 ${activeTab === 'keyword' ? 'border-[#B76E55] text-[#B76E55]' : 'border-transparent text-[#2B2B2B]/40'}`}
            >
              PALAVRA-CHAVE
            </button>
            <button 
              onClick={() => {
                setActiveTab('reference');
                setSearchTerm('');
              }}
              className={`flex-1 py-5 text-[10px] font-bold tracking-[0.3em] transition-all border-b-2 ${activeTab === 'reference' ? 'border-[#B76E55] text-[#B76E55]' : 'border-transparent text-[#2B2B2B]/40'}`}
            >
              REFERÊNCIA
            </button>
          </div>
        </div>
        
        <main className="flex-1 px-2 sm:px-6 pb-12 space-y-8 overflow-y-auto scrollbar-hide mt-4 sm:mt-6">
          {currentView === 'favorites' ? (
            <div className="animate-reveal space-y-8">
                {favorites.length === 0 ? (
                    <div className="flex flex-col justify-center items-center py-40 text-center opacity-20">
                        <StarIcon className="w-16 h-16 mb-6 text-[#D4B483]" />
                        <p className="text-[10px] uppercase tracking-[0.4em] font-black italic text-[#2B2B2B]">Sua coleção está vazia.</p>
                    </div>
                ) : (
                    <>
                        <h2 className="font-serif-display text-2xl text-[#1C5D99] italic border-b border-[#D4B483]/30 pb-2">Minha Coleção</h2>
                        {favorites.map((fav) => (
                            <QuoteCard key={fav.id} quote={fav} isFavorite={true} onToggleFavorite={toggleFavorite} onRegenerateImage={handleRegenerateImage} />
                        ))}
                    </>
                )}
            </div>
          ) : currentView === 'history' ? (
            <div className="animate-reveal space-y-8">
                <h2 className="font-serif-display text-2xl text-[#1C5D99] italic border-b border-[#D4B483]/30 pb-2">Histórico de Buscas</h2>
                <div className="flex flex-col justify-center items-center py-40 text-center opacity-20">
                    <HistoryIcon className="w-16 h-16 mb-6 text-[#D4B483]" />
                    <p className="text-[10px] uppercase tracking-[0.4em] font-black italic text-[#2B2B2B]">Nenhuma busca recente.</p>
                </div>
            </div>
          ) : (
            <div className="animate-reveal space-y-8">
                <SearchBar 
                  searchTerm={searchTerm} 
                  setSearchTerm={setSearchTerm} 
                  onSearch={handleSearch} 
                  isLoading={isLoading} 
                  placeholder={activeTab === 'keyword' ? "Amor, Fé, Paz..." : "Filósofo e Tema (ex: Platão, Justiça)..."}
                />

                <div className="flex items-center gap-4 text-[#1C5D99] font-title text-2xl">
                  <div className="h-[2px] w-8 bg-[#D4B483]"></div>
                  <h2>Sabedoria Encontrada</h2>
                </div>

                {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-32">
                      <Spinner className="w-10 h-10 text-[#B76E55]" />
                      <p className="mt-8 text-[#B76E55] text-[10px] uppercase tracking-[0.5em] font-bold animate-pulse text-center">Consultando o Oráculo...</p>
                    </div>
                ) : error ? (
                    <div className="py-20 text-center px-6 bg-white rounded-none border border-[#1C5D99]/10">
                        <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#B76E55] italic">{error}</p>
                        <button onClick={resetToHome} className="mt-10 text-[#1C5D99]/60 hover:text-[#1C5D99] text-[10px] font-bold uppercase tracking-[0.3em] transition-colors underline underline-offset-8">Tentar novamente</button>
                    </div>
                ) : quotes.length > 0 ? (
                    <div className="space-y-16">
                        {topicDescription && (
                          <p className="text-sm text-[#2B2B2B]/70 italic font-serif-display leading-relaxed border-l-2 border-[#D4B483] pl-6 py-2">
                            {topicDescription}
                          </p>
                        )}
                        {quotes.map((quote) => (
                            <QuoteCard 
                                key={quote.id} 
                                quote={quote} 
                                isFavorite={favorites.some(f => f.quote === quote.quote)} 
                                onToggleFavorite={toggleFavorite}
                                onRegenerateImage={handleRegenerateImage}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col justify-center items-center py-24 text-center border border-dashed border-[#1C5D99]/20 rounded-none bg-white/50">
                        <BookIcon className="w-16 h-16 mb-8 text-[#1C5D99]/10" />
                        <p className="text-[#1C5D99]/30 text-sm font-medium italic">O silêncio precede a sabedoria.</p>
                    </div>
                )}

                {/* Daily Suggestion */}
                {!searchTerm && !isLoading && randomQuote && (
                    <div className="pt-16 space-y-10">
                        <div className="flex items-center gap-4 text-[#1C5D99] font-title text-2xl">
                          <div className="h-[2px] w-8 bg-[#D4B483]"></div>
                          <h2>Sugestão do Dia</h2>
                        </div>
                        <QuoteCard 
                            quote={randomQuote} 
                            isFavorite={favorites.some(f => f.quote === randomQuote.quote)} 
                            onToggleFavorite={toggleFavorite}
                            onRegenerateImage={handleRegenerateImage}
                        />
                    </div>
                )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
