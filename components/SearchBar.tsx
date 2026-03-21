
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
    <div className="relative flex items-center bg-white/80 rounded-none border border-[#1C5D99]/20 shadow-sm overflow-hidden animate-reveal">
      <div className="pl-5 flex items-center pointer-events-none">
        <SearchIcon className="w-5 h-5 text-[#1C5D99]/40" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="w-full bg-transparent py-5 pl-4 pr-4 text-[14px] text-[#2B2B2B] placeholder-[#2B2B2B]/40 focus:outline-none transition-all font-medium"
      />
      <button
        onClick={onSearch}
        disabled={isLoading}
        className="mr-3 bg-[#B76E55] hover:bg-[#9E5A44] text-white px-4 sm:px-8 py-3 rounded-none text-[10px] font-bold uppercase tracking-[0.2em] transition-all active:scale-95 disabled:opacity-50 shadow-md"
      >
        {isLoading ? '...' : 'Buscar'}
      </button>
    </div>
  );
};
