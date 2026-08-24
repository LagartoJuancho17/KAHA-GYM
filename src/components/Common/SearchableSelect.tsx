import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  searchString?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  noOptionsText?: string;
  className?: string;
  theme?: 'light' | 'dark';
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- Selecciona --',
  noOptionsText = 'No se encontraron resultados',
  className = '',
  theme = 'light'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDark = theme === 'dark';

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find(opt => opt.value === value) || null;
  }, [options, value]);

  // Set the search text based on the selected option or when the dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearch(selectedOption ? selectedOption.label : '');
    }
  }, [selectedOption, isOpen]);

  // Filter options based on the search query
  const filteredOptions = useMemo(() => {
    if (!search || !isOpen || (selectedOption && search === selectedOption.label)) {
      return options;
    }
    const cleanSearch = search
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove accents/tildes
    
    return options.filter(opt => {
      const cleanLabel = opt.label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const cleanSearchString = opt.searchString
        ? opt.searchString.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        : '';
      
      return cleanLabel.includes(cleanSearch) || cleanSearchString.includes(cleanSearch);
    });
  }, [options, search, isOpen, selectedOption]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectOption = (opt: SearchableSelectOption) => {
    onChange(opt.value);
    setSearch(opt.label);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const toggleDropdown = () => {
    const nextOpenState = !isOpen;
    setIsOpen(nextOpenState);
    if (nextOpenState) {
      setTimeout(() => {
        inputRef.current?.focus();
        if (selectedOption) {
          setSearch(''); // Clear search on open to show all options
        }
      }, 0);
    }
  };

  return (
    <div ref={containerRef} className={`relative flex-1 ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            if (selectedOption && search === selectedOption.label) {
              setSearch(''); // Clear text to show all options
            }
          }}
          placeholder={selectedOption ? selectedOption.label : placeholder}
          className={`w-full rounded-lg p-2 pr-12 text-xs outline-hidden font-medium cursor-text transition-colors ${
            isDark
              ? 'bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-zinc-500'
              : 'bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400'
          }`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className={`p-1 rounded-md transition-colors cursor-pointer border-none bg-transparent ${
                isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
              }`}
              title="Limpiar selección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleDropdown}
            className={`p-1 rounded-md transition-colors cursor-pointer border-none bg-transparent ${
              isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-xl max-h-60 overflow-y-auto font-medium border ${
          isDark
            ? 'bg-zinc-900 border-zinc-800 text-white'
            : 'bg-white border border-zinc-200 text-zinc-900'
        }`}>
          {filteredOptions.length === 0 ? (
            <div className={`p-2.5 text-xs italic text-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              {noOptionsText}
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer border-none block ${
                    isDark
                      ? isSelected
                        ? 'bg-zinc-800 font-bold text-white border-l-2 border-lime-400'
                        : 'text-zinc-300 hover:bg-zinc-800/70'
                      : isSelected
                      ? 'bg-zinc-100 font-bold text-black border-l-2 border-black'
                      : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
