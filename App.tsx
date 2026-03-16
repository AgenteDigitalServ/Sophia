
import React, { useState, useCallback, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { QuoteCard } from './components/QuoteCard';
import { Spinner } from './components/Spinner';
import { getPhilosophicalQuotes, getRandomQuote, generateQuoteImage, getTopicDescription } from './services/geminiService';
import type { Quote } from './types';
import { BookIcon, SearchIcon, StarIcon, HistoryIcon, DownloadIcon } from './components/Icons';

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
      setError("Não foi possível carregar a sugestão do dia.");
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
      const [description, fetchedQuotes] = await Promise.all([
        getTopicDescription(searchTerm),
        getPhilosophicalQuotes(searchTerm)
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
      setError("Ocorreu um erro ao buscar sabedoria.");
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
    <div className="bg-[#f8fafc] min-h-screen text-gray-800 flex justify-center selection:bg-blue-500/30">
      <div className="w-full max-w-2xl min-h-screen flex flex-col relative overflow-x-hidden">
        
        {/* Superior Header - Navy Blue Gradient */}
        <header className="bg-navy-gradient px-6 py-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full border-2 border-[#FFD700] flex items-center justify-center bg-transparent">
                <BookIcon className="w-8 h-8 text-[#FFD700]" />
              </div>
              <div>
                <h1 className="text-2xl font-title font-bold text-[#FFD700] tracking-wider leading-tight">SOPHIA</h1>
                <p className="text-[10px] text-white/70 tracking-[0.2em] font-medium">SABEDORIA FILOSÓFICA</p>
              </div>
            </div>
            
            <div className="flex bg-black/20 rounded-full p-1 border border-white/10">
              <button 
                onClick={() => setCurrentView('search')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${currentView === 'search' ? 'bg-[#FFD700] text-[#000033]' : 'text-white/60'}`}
              >
                <SearchIcon className="w-4 h-4" /> Busca
              </button>
              <button 
                onClick={() => setCurrentView('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${currentView === 'history' ? 'bg-[#FFD700] text-[#000033]' : 'text-white/60'}`}
              >
                <HistoryIcon className="w-4 h-4" /> Histórico
              </button>
              <button 
                onClick={() => setCurrentView('favorites')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${currentView === 'favorites' ? 'bg-[#FFD700] text-[#000033]' : 'text-white/60'}`}
              >
                <StarIcon className="w-4 h-4" fill={currentView === 'favorites'} /> Favoritos
              </button>
            </div>
          </div>
        </header>

        {/* Tabs Section */}
        <div className="px-6 mt-8">
          <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <button 
              onClick={() => setActiveTab('keyword')}
              className={`flex-1 py-3 text-xs font-bold tracking-widest transition-all ${activeTab === 'keyword' ? 'bg-[#000080] text-white' : 'text-gray-400'}`}
            >
              PALAVRA-CHAVE
            </button>
            <button 
              onClick={() => setActiveTab('reference')}
              className={`flex-1 py-3 text-xs font-bold tracking-widest transition-all ${activeTab === 'reference' ? 'bg-[#000080] text-white' : 'text-gray-400'}`}
            >
              REFERÊNCIA
            </button>
          </div>
        </div>
        
        <main className="flex-1 px-6 pb-12 space-y-8 overflow-y-auto scrollbar-hide mt-6">
          {currentView === 'favorites' ? (
            <div className="animate-reveal space-y-8">
                {favorites.length === 0 ? (
                    <div className="flex flex-col justify-center items-center py-40 text-center opacity-20">
                        <StarIcon className="w-16 h-16 mb-6" />
                        <p className="text-[10px] uppercase tracking-[0.4em] font-black italic">Sua coleção está vazia.</p>
                    </div>
                ) : (
                    <>
                        <h2 className="font-serif-display text-2xl text-[#000080] italic border-b border-gray-200 pb-2">Minha Coleção</h2>
                        {favorites.map((fav) => (
                            <QuoteCard key={fav.id} quote={fav} isFavorite={true} onToggleFavorite={toggleFavorite} onRegenerateImage={handleRegenerateImage} />
                        ))}
                    </>
                )}
            </div>
          ) : currentView === 'history' ? (
            <div className="animate-reveal space-y-8">
                <h2 className="font-serif-display text-2xl text-[#000080] italic border-b border-gray-200 pb-2">Histórico de Buscas</h2>
                <div className="flex flex-col justify-center items-center py-40 text-center opacity-20">
                    <HistoryIcon className="w-16 h-16 mb-6" />
                    <p className="text-[10px] uppercase tracking-[0.4em] font-black italic">Nenhuma busca recente.</p>
                </div>
            </div>
          ) : (
            <div className="animate-reveal space-y-8">
                <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} onSearch={handleSearch} isLoading={isLoading} />

                <div className="flex items-center gap-2 text-[#000080] font-serif-display text-lg italic">
                  <span>{">"}</span>
                  <h2>SABEDORIA ENCONTRADA</h2>
                </div>

                {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-32">
                      <Spinner className="w-10 h-10 text-[#000080]" />
                      <p className="mt-6 text-[#000080]/60 text-[10px] uppercase tracking-[0.5em] font-black animate-pulse text-center">Buscando sabedoria...</p>
                    </div>
                ) : error ? (
                    <div className="py-20 text-center px-6">
                        <p className="text-xs uppercase tracking-widest font-bold text-red-500 italic">{error}</p>
                        <button onClick={resetToHome} className="mt-8 text-[#000080] text-[10px] font-black uppercase tracking-[0.3em]">Tentar novamente</button>
                    </div>
                ) : quotes.length > 0 ? (
                    <div className="space-y-10">
                        {topicDescription && (
                          <p className="text-sm text-gray-500 italic font-serif-display leading-relaxed border-l-2 border-[#FFD700] pl-4 py-1">
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
                    <div className="flex flex-col justify-center items-center py-24 text-center border-2 border-dashed border-gray-200 rounded-3xl bg-white/50">
                        <BookIcon className="w-16 h-16 mb-6 text-gray-200" />
                        <p className="text-gray-400 text-sm font-medium italic">Nenhum versículo encontrado ainda.</p>
                    </div>
                )}

                {/* Daily Suggestion */}
                {!searchTerm && !isLoading && randomQuote && (
                    <div className="pt-10 space-y-6">
                        <div className="flex items-center gap-2 text-[#000080] font-serif-display text-lg italic">
                          <span>{">"}</span>
                          <h2>PENSAMENTO DO DIA</h2>
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
