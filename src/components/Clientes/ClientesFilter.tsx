// src/components/Clientes/ClientesFilter.tsx
import React from 'react';
import { Search } from 'lucide-react';

interface ClientesFilterProps {
  buscar: string;
  setBuscar: (val: string) => void;
  filtroEstado: string;
  setFiltroEstado: (val: string) => void;
  verInactivos: boolean;
  setVerInactivos: (val: boolean) => void;
}

export const ClientesFilter: React.FC<ClientesFilterProps> = ({
  buscar,
  setBuscar,
  filtroEstado,
  setFiltroEstado,
  verInactivos,
  setVerInactivos
}) => {
  return (
    <div className="bg-white border border-zinc-200 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between" id="filter-bar-container">
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

      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
        {/* ESTADO */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-zinc-500 font-sans font-medium">Estado:</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="border border-zinc-200 rounded-md py-1 px-2 outline-hidden text-zinc-700 bg-white cursor-pointer"
            id="filter-status-select"
          >
            <option value="TODOS">Todos</option>
            <option value="ACTIVO">Al Día</option>
            <option value="CON_DEUDA">Con Deuda</option>
            <option value="MOROSO">Morosos</option>
          </select>
        </div>

        {/* BAJA LOGICA TOGGLE */}
        <label className="flex items-center gap-2 cursor-pointer text-xs font-sans select-none border-l border-zinc-200 pl-3">
          <input
            type="checkbox"
            checked={verInactivos}
            onChange={(e) => setVerInactivos(e.target.checked)}
            className="rounded-sm border-zinc-300 text-black focus:ring-black h-4 w-4 cursor-pointer"
            id="ver-inactivos-checkbox"
          />
          <span className="text-zinc-600 font-medium font-sans">Ver Socios Inactivos / Bajas</span>
        </label>
      </div>
    </div>
  );
};
