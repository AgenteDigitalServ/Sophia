
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
    if (event.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Busque por um tema..."
        disabled={isLoading}
        className="w-full bg-gray-800 border border-gray-600 rounded-full py-3 pl-5 pr-12 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
      />
      <button
        onClick={onSearch}
        disabled={isLoading}
        className="absolute inset-y-0 right-0 flex items-center justify-center w-12 h-full text-gray-400 hover:text-blue-300 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors duration-300"
      >
        <SearchIcon className="w-5 h-5" />
      </button>
    </div>
  );
};
