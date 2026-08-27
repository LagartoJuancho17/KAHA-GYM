// src/components/Auth/SocioSimulatorSelector.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Search, X, ChevronDown, Check, SearchX } from 'lucide-react';
import { Cliente, Plan } from '../../types';

interface SocioSimulatorSelectorProps {
  clientes: Cliente[];
  planes?: Plan[];
  selectedSocioId: string | null;
  onSelectSocio: (id: string | null) => void;
}

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const SocioSimulatorSelector: React.FC<SocioSimulatorSelectorProps> = ({
  clientes,
  planes = [],
  selectedSocioId,
  onSelectSocio,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Active / eligible socios sorted alphabetically by last name, first name
  const eligibleSocios = useMemo(() => {
    return clientes
      .filter((c) => c.activo && c.autorizado !== false)
      .sort((a, b) => {
        const apA = (a.apellido || '').trim().toLowerCase();
        const apB = (b.apellido || '').trim().toLowerCase();
        if (apA !== apB) return apA.localeCompare(apB);
        const nomA = (a.nombre || '').trim().toLowerCase();
        const nomB = (b.nombre || '').trim().toLowerCase();
        return nomA.localeCompare(nomB);
      });
  }, [clientes]);

  // Currently selected socio object
  const selectedSocio = useMemo(() => {
    return eligibleSocios.find((c) => c.id === selectedSocioId) || null;
  }, [eligibleSocios, selectedSocioId]);

  // Plan lookup helper
  const getPlanName = (planId?: string) => {
    if (!planId) return null;
    const plan = planes.find((p) => p.id === planId);
    return plan ? plan.nombre : null;
  };

  // Filtered socios based on search query
  const filteredSocios = useMemo(() => {
    if (!searchQuery.trim()) {
      return eligibleSocios;
    }

    const q = normalizeText(searchQuery);

    return eligibleSocios.filter((socio) => {
      const nombre = normalizeText(socio.nombre || '');
      const apellido = normalizeText(socio.apellido || '');
      const full1 = `${apellido} ${nombre}`;
      const full2 = `${nombre} ${apellido}`;
      const email = normalizeText(socio.email || '');
      const telefono = normalizeText(socio.telefono || '');
      const codigo = normalizeText(socio.codigo_socio || '');
      const planName = normalizeText(getPlanName(socio.plan_id) || '');

      return (
        nombre.includes(q) ||
        apellido.includes(q) ||
        full1.includes(q) ||
        full2.includes(q) ||
        email.includes(q) ||
        telefono.includes(q) ||
        codigo.includes(q) ||
        planName.includes(q)
      );
    });
  }, [eligibleSocios, searchQuery, planes]);

  // Focus search input when dropdown opens & reset highlight
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < filteredSocios.length - 1 ? prev + 1 : 0;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredSocios.length - 1;
        scrollIndexIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSocios[highlightedIndex]) {
        handleSelect(filteredSocios[highlightedIndex].id);
      }
    }
  };

  const scrollIndexIntoView = (index: number) => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-socio-item]');
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelect = (socioId: string) => {
    onSelectSocio(socioId);
    setIsOpen(false);
  };

  const getInitials = (nombre: string, apellido: string) => {
    const n = (nombre || '').trim().charAt(0).toUpperCase();
    const a = (apellido || '').trim().charAt(0).toUpperCase();
    return `${a}${n}` || 'SC';
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef} onKeyDown={handleKeyDown}>
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100/80 transition-all cursor-pointer shadow-2xs group min-w-0"
        title="Buscar y simular socio"
        id="socio-simulator-trigger"
      >
        <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="text-[10px] text-emerald-700/80 font-semibold hidden sm:inline">Simular:</span>
        <span className="truncate max-w-[120px] sm:max-w-[160px] text-slate-800 font-bold">
          {selectedSocio ? `${selectedSocio.apellido}, ${selectedSocio.nombre}` : 'Elegir socio...'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-emerald-700 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* DROPDOWN POPOVER */}
      {isOpen && (
        <div
          className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-in text-xs"
          role="listbox"
          id="socio-simulator-popover"
        >
          {/* SEARCH INPUT BAR */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Buscar por nombre, apellido, DNI..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 font-medium transition-all"
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    inputRef.current?.focus();
                  }}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 cursor-pointer border-none bg-transparent"
                  title="Borrar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* RESULTS COUNT & META */}
            <div className="flex items-center justify-between px-1 pt-1.5 text-[10px] text-slate-400 font-medium">
              <span>
                {filteredSocios.length} {filteredSocios.length === 1 ? 'socio' : 'socios'}{' '}
                {searchQuery ? 'encontrados' : 'disponibles'}
              </span>
              <span className="font-mono text-[9px] text-slate-400 hidden sm:inline">
                ↑↓ navegar · ↵ elegir
              </span>
            </div>
          </div>

          {/* SOCIO OPTIONS LIST */}
          <div ref={listRef} className="max-h-64 sm:max-h-72 overflow-y-auto divide-y divide-slate-50">
            {filteredSocios.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <SearchX className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-600">No se encontraron socios</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No hay coincidencias con "{searchQuery}"
                </p>
              </div>
            ) : (
              filteredSocios.map((socio, idx) => {
                const isSelected = socio.id === selectedSocioId;
                const isHighlighted = idx === highlightedIndex;
                const planName = getPlanName(socio.plan_id);

                return (
                  <button
                    key={socio.id}
                    data-socio-item
                    type="button"
                    onClick={() => handleSelect(socio.id)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2.5 transition-colors cursor-pointer border-none ${
                      isSelected
                        ? 'bg-emerald-50/80 font-bold text-emerald-950'
                        : isHighlighted
                        ? 'bg-slate-50 text-slate-900'
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* AVATAR */}
                      {socio.foto_url ? (
                        <img
                          src={socio.foto_url}
                          alt={`${socio.nombre} ${socio.apellido}`}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isSelected
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {getInitials(socio.nombre, socio.apellido)}
                        </div>
                      )}

                      {/* TEXT INFO */}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-slate-800">
                          {socio.apellido}, {socio.nombre}
                        </div>
                        <div className="truncate text-[10px] text-slate-400 flex items-center gap-1.5">
                          {planName && (
                            <span className="text-emerald-700 font-medium bg-emerald-50 px-1 py-0.2 rounded text-[9px]">
                              {planName}
                            </span>
                          )}
                          {socio.email && <span className="truncate">{socio.email}</span>}
                        </div>
                      </div>
                    </div>

                    {/* SELECTION CHECKMARK */}
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.5]" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
