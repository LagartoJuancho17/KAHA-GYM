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
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = '-- Selecciona --',
  noOptionsText = 'No se encontraron resultados',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          className="w-full border border-zinc-200 rounded-lg p-2 pr-12 text-xs bg-white outline-hidden font-medium cursor-text focus:border-zinc-400 transition-colors"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer border-none bg-transparent"
              title="Limpiar selección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={toggleDropdown}
            className="p-1 hover:bg-zinc-100 rounded-md text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer border-none bg-transparent"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-60 overflow-y-auto font-medium">
          {filteredOptions.length === 0 ? (
            <div className="p-2.5 text-xs text-zinc-400 italic text-center">
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
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-zinc-50 transition-colors cursor-pointer border-none block ${
                    isSelected ? 'bg-zinc-100 font-bold text-black border-l-2 border-black' : 'text-zinc-700'
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
