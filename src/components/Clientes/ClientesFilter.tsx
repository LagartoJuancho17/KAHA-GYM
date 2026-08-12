// src/components/Clientes/ClientesFilter.tsx
import React from 'react';
import { Search, UserCheck } from 'lucide-react';

interface ClientesFilterProps {
  buscar: string;
  setBuscar: (val: string) => void;
  filtroEstado: string;
  setFiltroEstado: (val: string) => void;
  filtroProfesor: string;
  setFiltroProfesor: (val: string) => void;
  profesoresDisponibles: string[];
}

export const ClientesFilter: React.FC<ClientesFilterProps> = ({
  buscar,
  setBuscar,
  filtroEstado,
  setFiltroEstado,
  filtroProfesor,
  setFiltroProfesor,
  profesoresDisponibles
}) => {
  return (
    <div className="bg-white border border-zinc-200 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-3xs" id="filter-bar-container">
      {/* Search Input */}
      <div className="relative w-full md:w-72">
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

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
        {/* PROFESOR FILTER */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-500 font-sans font-bold text-[11px] flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
            Profesor:
          </span>
          <select
            value={filtroProfesor}
            onChange={(e) => setFiltroProfesor(e.target.value)}
            className="border border-zinc-200 rounded-lg py-1.5 px-2.5 outline-hidden text-zinc-800 bg-white cursor-pointer font-medium text-xs shadow-2xs"
            id="filter-profesor-select"
          >
            <option value="TODOS">Todos los Profesores</option>
            <optgroup label="--- Solo un Profesor ---">
              {profesoresDisponibles.map(p => (
                <option key={`SOLO_${p}`} value={`SOLO_${p}`}>Solo {p}</option>
              ))}
            </optgroup>
            <optgroup label="--- Combinaciones Especiales ---">
              <option value="JUANCHI_Y_RULO">Juanchi y Rulo (Ambos)</option>
            </optgroup>
            <optgroup label="--- Alumnos que cursan con ---">
              {profesoresDisponibles.map(p => (
                <option key={`INC_${p}`} value={`INC_${p}`}>Cursan con {p} (Solo o con otros)</option>
              ))}
            </optgroup>
            <option value="SIN_PROFESOR">Sin Profesor Asignado</option>
          </select>
        </div>

        {/* ESTADO FILTER */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-500 font-sans font-medium text-[11px]">Estado:</span>
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
    </div>
  );
};
