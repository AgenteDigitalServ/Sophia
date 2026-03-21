
import React from 'react';
import { SearchIcon } from './Icons';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSearch: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  onSearch, 
  isLoading,
  placeholder = "Digite uma palavra-chave (ex: Amor, Fé, Paz)..."
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSearch();
  };

  return (
    <div className="relative flex items-center bg-white/80 rounded-none border-y-2 border-[#2C3E50]/40 shadow-sm overflow-hidden animate-reveal">
      {/* Scroll Decorative Ends */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D4A373]/40"></div>
      <div className="absolute right-0 top-0 bottom-0 w-1 bg-[#D4A373]/40"></div>
      
      <div className="pl-5 flex items-center pointer-events-none">
        <SearchIcon className="w-5 h-5 text-[#2C3E50]/40" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="w-full bg-transparent py-5 pl-4 pr-4 text-[14px] text-[#6C757D] placeholder-[#6C757D]/40 focus:outline-none transition-all font-body font-medium"
      />
      <button
        onClick={onSearch}
        disabled={isLoading}
        className="mr-3 bg-[#D4A373] hover:bg-[#C08F5E] text-white px-4 sm:px-8 py-3 rounded-none text-[11px] font-decorative font-bold uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 shadow-md"
      >
        {isLoading ? '...' : 'BUSCAR'}
      </button>
    </div>
  );
};
