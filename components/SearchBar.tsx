
import React from 'react';
import { SearchIcon } from './Icons';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, setSearchTerm, onSearch, isLoading }) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') onSearch();
  };

  return (
    <div className="relative flex items-center bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-reveal">
      <div className="pl-4 flex items-center pointer-events-none">
        <SearchIcon className="w-5 h-5 text-gray-400" />
      </div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite uma palavra-chave (ex: Amor, Fé, Paz)..."
        disabled={isLoading}
        className="w-full bg-transparent py-4 pl-3 pr-4 text-[14px] text-gray-800 placeholder-gray-400 focus:outline-none transition-all"
      />
      <button
        onClick={onSearch}
        disabled={isLoading}
        className="mr-2 bg-[#000080] hover:bg-[#000066] text-white px-6 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
      >
        {isLoading ? '...' : 'Buscar'}
      </button>
    </div>
  );
};
