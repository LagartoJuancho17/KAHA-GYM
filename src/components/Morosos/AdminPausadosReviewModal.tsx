// src/components/Morosos/AdminPausadosReviewModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  PauseCircle, X, Check, Clock, UserMinus, Search, 
  AlertCircle, AlertTriangle, ArrowRight, ShieldCheck, RefreshCw
} from 'lucide-react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { estaPausado, obtenerMesPausa, pausadosPendientesDeRevision } from '../../lib/pausa';
import { hoyArgentina } from '../../lib/fechas';

interface AdminPausadosReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPausadosReviewModal: React.FC<AdminPausadosReviewModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    clientes, planes, retomarSocioPausado, postergarPausaSocio, 
    eliminarCliente, googleUser 
  } = useGym();

  const [filtro, setFiltro] = useState<'PENDIENTES' | 'TODOS'>('PENDIENTES');
  const [searchText, setSearchText] = useState('');
  const [clienteParaBaja, setClienteParaBaja] = useState<Cliente | null>(null);

  const hoyArg = hoyArgentina();
  const mesActual = hoyArg.slice(0, 7);

  // Pausados cuyo mes de pausa ya venció (ej: pausados en agosto y estamos en septiembre)
  const pausadosVencidos = useMemo(() => {
    return pausadosPendientesDeRevision(clientes, mesActual);
  }, [clientes, mesActual]);

  // Todos los pausados activos
  const todosLosPausados = useMemo(() => {
    return clientes.filter(c => estaPausado(c) && c.activo !== false);
  }, [clientes]);

  const listaActual = filtro === 'PENDIENTES' ? pausadosVencidos : todosLosPausados;

  const filteredPausados = useMemo(() => {
    if (!searchText.trim()) return listaActual;
    const q = searchText.toLowerCase();
    return listaActual.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.turnos_fijos || []).some(t => t.toLowerCase().includes(q))
    );
  }, [listaActual, searchText]);

  if (!isOpen) return null;

  const handleRetomar = (c: Cliente) => {
    retomarSocioPausado(c.id, googleUser?.email);
  };

  const handlePostergar = (c: Cliente) => {
    postergarPausaSocio(c.id, googleUser?.email, mesActual);
  };

  const handleConfirmarBaja = () => {
    if (!clienteParaBaja) return;
    eliminarCliente(clienteParaBaja.id);
    setClienteParaBaja(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="px-6 py-5 bg-zinc-950 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                  Revisión de Socios en Pausa
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                  {pausadosVencidos.length} por revisar
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">
                Socios que completaron su mes de pausa. Definí si retoman sus clases, se postergan o se dan de baja.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTROLES Y FILTROS */}
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex bg-zinc-200/80 p-0.5 rounded-xl border border-zinc-300/60 w-full sm:w-auto">
            <button
              onClick={() => setFiltro('PENDIENTES')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${
                filtro === 'PENDIENTES'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
              }`}
            >
              Pendientes de Revisión ({pausadosVencidos.length})
            </button>
            <button
              onClick={() => setFiltro('TODOS')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg font-bold transition-all border-none cursor-pointer ${
                filtro === 'TODOS'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900 bg-transparent'
              }`}
            >
              Todos los Pausados ({todosLosPausados.length})
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, turno o email..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs outline-hidden focus:border-zinc-400"
            />
          </div>
        </div>

        {/* LISTADO DE SOCIOS PAUSADOS */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredPausados.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 font-sans space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto stroke-1" />
              <p className="font-semibold text-zinc-700 text-sm">No hay socios pausados pendientes de revisión.</p>
              <p className="text-xs text-zinc-400">
                {filtro === 'PENDIENTES' 
                  ? 'Todos los socios en pausa fueron revisados para este mes.' 
                  : 'No hay socios en condición de pausa registrados.'}
              </p>
            </div>
          ) : (
            filteredPausados.map(c => {
              const pl = planes.find(p => p.id === c.plan_id);
              const mesPausa = obtenerMesPausa(c, mesActual);
              const esVencido = mesPausa < mesActual;

              return (
                <div 
                  key={c.id}
                  className={`border rounded-2xl p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    esVencido 
                      ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300' 
                      : 'bg-white border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-zinc-950 text-sm">
                        {c.apellido}, {c.nombre}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        Mes Pausa: {mesPausa}
                      </span>
                      {esVencido && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-red-100 text-red-800 border border-red-200 animate-pulse">
                          ⚠️ Requiere Definición
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-500 flex-wrap">
                      <span>Plan: <strong className="text-zinc-800">{pl ? pl.nombre : 'Plan Base'}</strong></span>
                      <span>Turnos fijos en Matriz: <strong className="text-zinc-800">{c.turnos_fijos && c.turnos_fijos.length > 0 ? c.turnos_fijos.join(' · ') : 'Sin turnos fijos'}</strong></span>
                      <span className="text-zinc-400 font-mono text-[10px]">{c.email}</span>
                    </div>

                    <p className="text-[11px] text-zinc-500 italic">
                      ℹ️ Lugar reservado en la Matriz Fija Semanal. Liberado de la Turnera de tiempo real.
                    </p>
                  </div>

                  {/* BOTONES DE ACCIÓN: RETOMAR, POSTERGAR, DAR DE BAJA */}
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0 flex-wrap">
                    <button
                      onClick={() => handleRetomar(c)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer border-none"
                      title="El socio vuelve a entrenar este mes. Se reactiva en la Turnera y mantiene sus turnos fijos."
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Retomar (Vuelve)</span>
                    </button>

                    <button
                      onClick={() => handlePostergar(c)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer border-none"
                      title={`Pausar también para ${mesActual}. Sigue liberando la Turnera este mes y conserva la Matriz.`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Postergar 1 Mes</span>
                    </button>

                    <button
                      onClick={() => setClienteParaBaja(c)}
                      className="px-2.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Dar de baja definitiva y liberar turnos fijos de la Matriz."
                    >
                      <UserMinus className="w-3.5 h-3.5 text-rose-600" />
                      <span>Dar de Baja</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* MODAL DOBLE CONFIRMACIÓN BAJA DEFINITIVA */}
        {clienteParaBaja && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-sans">
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in text-xs">
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-zinc-950">¿Confirmar Baja Definitiva?</h4>
                  <p className="text-zinc-500 text-[11px] mt-0.5">
                    Esta acción liberará permanentemente los turnos fijos de <strong>{clienteParaBaja.nombre} {clienteParaBaja.apellido}</strong> en la Matriz.
                  </p>
                </div>
              </div>

              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 space-y-1 text-zinc-700">
                <div>Socio: <strong>{clienteParaBaja.apellido}, {clienteParaBaja.nombre}</strong></div>
                <div>Turnos que se liberarán: <strong className="font-mono text-zinc-900">{clienteParaBaja.turnos_fijos?.join(', ') || 'Ninguno'}</strong></div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClienteParaBaja(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition-colors cursor-pointer border-none"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarBaja}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors cursor-pointer border-none"
                >
                  Sí, Confirmar Baja
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
