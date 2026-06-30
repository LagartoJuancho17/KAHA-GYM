// src/components/Morosos/MorososList.tsx
import React from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { Receipt } from 'lucide-react';

interface MorososListProps {
  deudoresCount: number;
  morososCount: number;
  listadoDeudoresMora: any[];
  filtroMora: 'TODOS' | 'MOROSO' | 'CON_DEUDA';
  setFiltroMora: (val: 'TODOS' | 'MOROSO' | 'CON_DEUDA') => void;
  onFastClearClick: (cl: Cliente) => void;
}

export const MorososList: React.FC<MorososListProps> = ({
  deudoresCount,
  morososCount,
  listadoDeudoresMora,
  filtroMora,
  setFiltroMora,
  onFastClearClick
}) => {
  const { planes } = useGym();

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs text-xs font-sans">
      
      {/* Filtros rápidos mora */}
      <div className="bg-zinc-50 px-5 py-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
        <h3 className="font-sans font-bold text-zinc-900 leading-none">Miembros con deuda activa registrada</h3>
        
        <div className="flex text-xs bg-white p-0.5 rounded-lg border border-zinc-200 font-sans">
          <button
            onClick={() => setFiltroMora('TODOS')}
            className={`px-3 py-1 rounded-md transition-all border-none bg-transparent cursor-pointer ${filtroMora === 'TODOS' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Todos ({deudoresCount})
          </button>
          <button
            onClick={() => setFiltroMora('MOROSO')}
            className={`px-3 py-1 rounded-md transition-all border-none bg-transparent cursor-pointer ${filtroMora === 'MOROSO' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-500 hover:text-zinc-950'}`}
            id="filter-morosos-button"
          >
            Morosos Críticos ({morososCount})
          </button>
          <button
            onClick={() => setFiltroMora('CON_DEUDA')}
            className={`px-3 py-1 rounded-md transition-all border-none bg-transparent cursor-pointer ${filtroMora === 'CON_DEUDA' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-500 hover:text-zinc-900'}`}
          >
            Atrasos de Gracia
          </button>
        </div>
      </div>

      {/* Listado */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#fbfcff] text-zinc-500 border-b border-zinc-200 font-semibold uppercase tracking-wider text-[10px]">
              <th className="p-4">Socio</th>
              <th className="p-4">Plan contratado</th>
              <th className="p-4">Último abono cubierto</th>
              <th className="p-4">Días de Atraso</th>
              <th className="p-4">Monto Adeudado</th>
              <th className="p-4 text-center">Acción Rápida de Cobro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
            {listadoDeudoresMora.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-400 italic">No hay deudores ni morosos registrados de acuerdo con los criterios seleccionados.</td>
              </tr>
            ) : (
              listadoDeudoresMora.map(c => {
                const pl = planes.find(p => p.id === c.plan_id);
                return (
                  <tr key={c.id} className="hover:bg-zinc-50/50">
                    <td className="p-4">
                      <div className="font-bold text-zinc-950 flex items-center gap-1.5 flex-wrap">
                        <span>{c.apellido}, {c.nombre}</span>
                        {c.exencion_cobro && c.exencion_cobro !== 'NINGUNA' && (
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase shrink-0 ${
                            c.exencion_cobro === 'SUSPENDIDO' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                            c.exencion_cobro === 'POSTERGADO' ? 'bg-cyan-100 text-cyan-700 border border-cyan-200' :
                            'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {c.exencion_cobro === 'SUSPENDIDO' ? 'Cobro Suspendido' :
                             c.exencion_cobro === 'POSTERGADO' ? 'Postergado' : 'Perdonado'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{c.email}</div>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-zinc-800">{pl ? pl.nombre : 'Plan base'}</span>
                    </td>
                    <td className="p-4 font-mono text-zinc-600">{c.ultimo_mes_pagado || 'Sin abonos'}</td>
                    <td className="p-4 text-zinc-950 font-bold">
                      {c.estado === 'MOROSO' ? (
                        <span className="font-mono text-red-600 font-bold">{c.atrasoDias} días de atraso</span>
                      ) : (
                        <span className="font-sans text-zinc-400 font-normal">Dentro de fecha límite</span>
                      )}
                    </td>
                    <td className="p-4 font-mono font-bold text-red-700">
                      ${c.deuda_acumulada.toLocaleString('es-AR')}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => onFastClearClick(c)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-colors border-none cursor-pointer"
                        id={`btn-cobro-rapido-${c.id}`}
                      >
                        <Receipt className="w-3.5 h-3.5 text-white" />
                        Registrar Cobro
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
