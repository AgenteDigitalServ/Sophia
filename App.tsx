
import React, { useState, useCallback, useEffect } from 'react';
import { SearchBar } from './components/SearchBar';
import { QuoteCard } from './components/QuoteCard';
import { Spinner } from './components/Spinner';
import { getPhilosophicalQuotes, getQuoteOfTheDay, generateQuoteImage } from './services/geminiService';
import type { Quote } from './types';
import { SophiaIcon, SearchIcon, BookmarkIcon } from './components/Icons';

type ViewState = 'search' | 'favorites';

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [isDailyQuoteLoading, setIsDailyQuoteLoading] = useState<boolean>(true);
  
  const [favorites, setFavorites] = useState<Quote[]>([]);
  const [currentView, setCurrentView] = useState<ViewState>('search');

  // Carrega favoritos do localStorage ao iniciar
  useEffect(() => {
    const savedFavorites = localStorage.getItem('sophia_favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error("Erro ao carregar favoritos", e);
      }
    }
  }, []);

  // Salva favoritos no localStorage sempre que mudar
  useEffect(() => {
    localStorage.setItem('sophia_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Função auxiliar para formatar erros amigáveis
  const handleApiError = (err: any) => {
    console.error("Erro capturado na App:", err);
    const msg = err.message || "";

    if (msg === 'API_KEY_MISSING') {
      return "Configuração necessária: Verifique se a API_KEY está definida no .env ou no painel de hospedagem.";
    } 
    
    if (msg.includes("503") || msg.includes("overloaded") || msg.includes("UNAVAILABLE")) {
      return "Nossa musa inspiradora está com alta demanda no momento. Por favor, aguarde alguns segundos e tente novamente.";
    }

    if (msg.includes("429") || msg.includes("quota")) {
      return "Limite de requisições excedido. Aguarde um momento antes de buscar novamente.";
    }

    return `Erro: ${msg || "Falha desconhecida na conexão."}`;
  };

  useEffect(() => {
    const fetchDailyQuote = async () => {
      setIsDailyQuoteLoading(true);
      setError(null);
      try {
        const quote = await getQuoteOfTheDay();
        setDailyQuote(quote);
      } catch (err: any) {
        setError(handleApiError(err));
      } finally {
        setIsDailyQuoteLoading(false);
      }
    };
    fetchDailyQuote();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setError('Por favor, insira um tema para a busca.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setQuotes([]);
    setCurrentView('search'); // Força volta para busca se estiver em favoritos

    try {
      const fetchedQuotes = await getPhilosophicalQuotes(searchTerm);
      if (!fetchedQuotes || fetchedQuotes.length === 0) {
        setError('Não foram encontradas citações para este tema. Tente outro.');
        setIsLoading(false);
        return;
      }
      
      const quotesWithImagesPromises = fetchedQuotes.map(async (quote) => {
        // Generate image based on the specific quote text for better relevance.
        const imageUrl = await generateQuoteImage(quote.quote);
        return { ...quote, imageUrl };
      });

      const resolvedQuotes = await Promise.all(quotesWithImagesPromises);
      setQuotes(resolvedQuotes);
    } catch (err: any) {
      setError(handleApiError(err));
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  const toggleFavorite = (quote: Quote) => {
    setFavorites(prev => {
      // Verifica se a citação (pelo texto) já existe nos favoritos
      const exists = prev.some(fav => fav.quote === quote.quote);
      if (exists) {
        // Remove
        return prev.filter(fav => fav.quote !== quote.quote);
      } else {
        // Adiciona
        return [quote, ...prev];
      }
    });
  };

  const isQuoteFavorite = (quoteText: string) => {
    return favorites.some(fav => fav.quote === quoteText);
  };

  return (
    <div className="bg-black min-h-screen text-white flex justify-center items-center p-2 sm:p-4">
      <div className="w-full max-w-md h-[95vh] sm:h-[85vh] bg-gray-900 rounded-3xl shadow-2xl shadow-blue-500/10 flex flex-col overflow-hidden border border-gray-700 relative">
        <header className="p-6 text-center border-b border-gray-700 flex flex-col items-center relative z-10 bg-gray-900">
          <div className="flex justify-center items-center gap-3 mb-2">
            <SophiaIcon className="w-8 h-8 text-blue-300" />
            <h1 className="text-2xl font-serif-display font-bold tracking-wider text-gray-200">
              Sophia
            </h1>
          </div>
          
          {/* Navigation Tabs */}
          <div className="flex bg-gray-800 p-1 rounded-full mt-2 w-full max-w-[240px]">
             <button 
                onClick={() => setCurrentView('search')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-4 rounded-full text-xs font-medium transition-all duration-300 ${currentView === 'search' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
             >
                <SearchIcon className="w-3 h-3" />
                Explorar
             </button>
             <button 
                onClick={() => setCurrentView('favorites')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-4 rounded-full text-xs font-medium transition-all duration-300 ${currentView === 'favorites' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
             >
                <BookmarkIcon className="w-3 h-3" fill={currentView === 'favorites'} />
                Favoritos
             </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-hide relative">
          
          {/* FAVORITES VIEW */}
          {currentView === 'favorites' && (
            <div className="animate-fadeIn space-y-6">
                {favorites.length === 0 ? (
                    <div className="flex flex-col justify-center items-center h-64 text-center text-gray-500 px-6">
                        <BookmarkIcon className="w-12 h-12 opacity-20 mb-4" />
                        <p className="text-gray-400">Você ainda não salvou nenhuma citação.</p>
                        <button 
                            onClick={() => setCurrentView('search')}
                            className="mt-4 text-blue-400 text-sm hover:underline"
                        >
                            Voltar para explorar
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className="text-center font-serif-display text-xl text-blue-200/80 pb-2 border-b border-gray-800">
                            Sua Coleção ({favorites.length})
                        </h2>
                        {favorites.map((fav) => (
                            <QuoteCard 
                                key={fav.id} 
                                quote={fav} 
                                isFavorite={true}
                                onToggleFavorite={toggleFavorite}
                            />
                        ))}
                    </>
                )}
            </div>
          )}

          {/* SEARCH/HOME VIEW */}
          {currentView === 'search' && (
            <div className="animate-fadeIn space-y-6">
                <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-sm pb-2 pt-1">
                    <SearchBar 
                        searchTerm={searchTerm} 
                        setSearchTerm={setSearchTerm} 
                        onSearch={handleSearch}
                        isLoading={isLoading || isDailyQuoteLoading}
                    />
                </div>

                {isLoading ? (
                    <div className="flex flex-col justify-center items-center py-12">
                    <Spinner />
                    <p className="mt-4 text-gray-400 animate-pulse">Gerando obras de arte...</p>
                    </div>
                ) : quotes.length > 0 ? (
                    quotes.map((quote, index) => (
                        <QuoteCard 
                            key={quote.id || index} 
                            quote={quote} 
                            isFavorite={isQuoteFavorite(quote.quote)}
                            onToggleFavorite={toggleFavorite}
                        />
                    ))
                ) : error ? (
                    <div className="flex flex-col justify-center items-center py-12 text-center text-gray-500 px-6">
                        <SophiaIcon className="w-16 h-16 opacity-20 mb-4" />
                        <p className="text-red-400 font-medium">{error}</p>
                        {(error.includes("demanda") || error.includes("Limite")) && (
                        <button 
                            onClick={() => window.location.reload()}
                            className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm text-blue-300 transition-colors"
                        >
                            Tentar novamente
                        </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Daily Quote Section */}
                        {isDailyQuoteLoading ? (
                            <div className="flex flex-col justify-center items-center py-12">
                                <Spinner />
                                <p className="mt-4 text-gray-400">Carregando a inspiração do dia...</p>
                            </div>
                        ) : dailyQuote && (
                            <div className="animate-slideUp">
                                <h2 className="text-center font-serif-display text-xl text-gray-400 mb-4">
                                    Citação do Dia
                                </h2>
                                <QuoteCard 
                                    quote={dailyQuote} 
                                    isFavorite={isQuoteFavorite(dailyQuote.quote)}
                                    onToggleFavorite={toggleFavorite}
                                />
                            </div>
                        )}
                        
                        {!isDailyQuoteLoading && !dailyQuote && (
                            <div className="text-center px-6 py-8">
                                <p className="text-gray-400">
                                    Insira um tema acima como "Amor", "Justiça" ou "Tempo".
                                </p>
                            </div>
                        )}
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
