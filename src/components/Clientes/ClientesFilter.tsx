// src/components/Clientes/ClientesFilter.tsx
import React from 'react';
import { Search, UserCheck } from 'lucide-react';

interface ClientesFilterProps {
  buscar: string;
  setBuscar: (val: string) => void;
  filtroEstado: string;
  setFiltroEstado: (val: string) => void;
  selectedProfesores: string[];
  setSelectedProfesores: React.Dispatch<React.SetStateAction<string[]>>;
  profesoresDisponibles: string[];
  matchModoProfe: 'O' | 'Y';
  setMatchModoProfe: (modo: 'O' | 'Y') => void;
}

export const ClientesFilter: React.FC<ClientesFilterProps> = ({
  buscar,
  setBuscar,
  filtroEstado,
  setFiltroEstado,
  selectedProfesores,
  setSelectedProfesores,
  profesoresDisponibles,
  matchModoProfe,
  setMatchModoProfe
}) => {
  return (
    <div className="bg-white border border-zinc-200 p-4 rounded-xl space-y-3 shadow-3xs" id="filter-bar-container">
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por Nombre, Apellido o Email..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-zinc-200 rounded-lg text-xs font-sans outline-hidden focus:border-zinc-500 bg-white"
            id="search-input-box"
          />
        </div>

        {/* ESTADO FILTER */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-500 font-sans font-medium text-[11px]">Estado Deuda:</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-zinc-200 rounded-lg py-1.5 px-2.5 outline-hidden text-zinc-800 bg-white cursor-pointer font-medium text-xs shadow-2xs"
            id="filter-status-select"
          >
            <option value="TODOS">Todos</option>
            <option value="ACTIVO">Al Día</option>
            <option value="CON_DEUDA">Con Deuda</option>
            <option value="MOROSO">Morosos</option>
          </select>
        </div>
      </div>

      {/* CHECKBOXES DE PROFESORES */}
      <div className="pt-2.5 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-zinc-500 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 shrink-0">
            <UserCheck className="w-3.5 h-3.5 text-violet-600" />
            Profesor:
          </span>

          <button
            type="button"
            onClick={() => setSelectedProfesores([])}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
              selectedProfesores.length === 0
                ? 'bg-black text-white border-black shadow-2xs'
                : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            Todos los profes
          </button>

          {profesoresDisponibles.map((profName) => {
            const isChecked = selectedProfesores.includes(profName);
            return (
              <label
                key={profName}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer select-none transition-all ${
                  isChecked
                    ? 'bg-violet-100/80 text-violet-950 border-violet-300 font-bold shadow-2xs'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProfesores(prev => [...prev, profName]);
                    } else {
                      setSelectedProfesores(prev => prev.filter(p => p !== profName));
                    }
                  }}
                  className="w-3.5 h-3.5 accent-violet-600 rounded border-zinc-300 cursor-pointer"
                  id={`chk-profesor-${profName.toLowerCase()}`}
                />
                <span>{profName}</span>
              </label>
            );
          })}
        </div>

        {/* Modo de coincidencia (si hay más de 1 profesor seleccionado) */}
        {selectedProfesores.length > 1 && (
          <div className="flex items-center gap-1 text-[11px] bg-violet-50 text-violet-900 border border-violet-200 rounded-lg p-1 shrink-0">
            <span className="font-medium pl-1">Filtrar por:</span>
            <button
              type="button"
              onClick={() => setMatchModoProfe('O')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all border-none ${
                matchModoProfe === 'O' ? 'bg-violet-700 text-white shadow-2xs' : 'bg-transparent text-violet-700 hover:bg-violet-100'
              }`}
              title="Muestra socios que cursan con CUALQUIERA de los profesores marcados"
            >
              Cualquiera (O)
            </button>
            <button
              type="button"
              onClick={() => setMatchModoProfe('Y')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all border-none ${
                matchModoProfe === 'Y' ? 'bg-violet-700 text-white shadow-2xs' : 'bg-transparent text-violet-700 hover:bg-violet-100'
              }`}
              title="Muestra socios que cursan obligatoriamente con TODOS los profesores marcados (ej: Juanchi Y Rulo)"
            >
              Ambos / Todos (Y)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
