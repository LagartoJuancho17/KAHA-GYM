// src/components/Morosos/AdminBajasReviewModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, X, UserMinus, ShieldCheck, Mail, Search, 
  Check, CheckSquare, Square, MessageCircle, AlertCircle, 
  Clock, Sparkles, RefreshCw
} from 'lucide-react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';

interface AdminBajasReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenEmailModal: () => void;
}

export const AdminBajasReviewModal: React.FC<AdminBajasReviewModalProps> = ({ 
  isOpen, onClose, onOpenEmailModal 
}) => {
  const { 
    clientes, planes, updateCliente, 
    darDeBajaTurnosFijosSocio, darDeBajaTurnosFijosMultiple, googleUser 
  } = useGym();

  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmClienteBaja, setConfirmClienteBaja] = useState<Cliente | null>(null);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesNombre = hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  // Candidatos a baja de turno fijo: activos, con turnos fijos asignados y sin abonar el mes actual
  const candidatosBaja = useMemo(() => {
    return clientes.filter(c => {
      if (!c.activo) return false;
      if (!c.turnos_fijos || c.turnos_fijos.length === 0) return false;
      const noPago = !c.ultimo_mes_pagado || c.ultimo_mes_pagado < mesActual;
      return noPago;
    });
  }, [clientes, mesActual]);

  const filteredCandidatos = useMemo(() => {
    if (!searchText.trim()) return candidatosBaja;
    const q = searchText.toLowerCase();
    return candidatosBaja.filter(c => 
      c.nombre.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.turnos_fijos.some(t => t.toLowerCase().includes(q))
    );
  }, [candidatosBaja, searchText]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredCandidatos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCandidatos.map(c => c.id));
    }
  };

  const handleToggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleConfirmBajaIndividual = (c: Cliente) => {
    setIsProcessing(true);
    darDeBajaTurnosFijosSocio(c.id, 'Falta de pago - Autorizado por Admin (Día 10+)', googleUser?.email);
    setIsProcessing(false);
    setConfirmClienteBaja(null);
    setSelectedIds(prev => prev.filter(id => id !== c.id));
  };

  const handleConfirmBajaMultiple = () => {
    if (selectedIds.length === 0) return;
    setIsProcessing(true);
    darDeBajaTurnosFijosMultiple(selectedIds, 'Baja en lote por falta de pago (Día 10+)', googleUser?.email);
    setIsProcessing(false);
    setConfirmBulkOpen(false);
    setSelectedIds([]);
  };

  const handleEximirOMantener = (c: Cliente, tipo: 'POSTERGADO' | 'SUSPENDIDO') => {
    updateCliente(c.id, {
      exencion_cobro: tipo
    });
  };

  const totalDeudaCandidatos = candidatosBaja.reduce((acc, c) => acc + (c.deuda_acumulada || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden text-zinc-800 font-sans animate-scale-up">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-red-950 via-zinc-950 to-zinc-900 text-white flex justify-between items-start relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(239,68,68,0.2),transparent_60%)] pointer-events-none" />
          <div className="relative z-10 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-base sm:text-lg text-white">
                  Revisión de Bajas de Turno Fijo (Día 10+)
                </h3>
                <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                  Acción Manual Admin
                </span>
              </div>
              <p className="text-zinc-300 text-xs mt-1">
                Alumnos con turnos fijos asignados sin abonar la cuota de <span className="font-semibold text-white capitalize">{mesNombre}</span>. Decidí individualmente si proceder a la baja o mantenerles la reserva.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR & SEARCH */}
        <div className="p-4 sm:p-5 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por socio, email o turno..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-sans focus:outline-hidden focus:border-red-500"
              />
            </div>
            {candidatosBaja.length > 0 && (
              <button
                onClick={handleToggleSelectAll}
                className="px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {selectedIds.length === filteredCandidatos.length && filteredCandidatos.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-red-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>Seleccionar ({selectedIds.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                onClose();
                onOpenEmailModal();
              }}
              className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5 text-amber-600" />
              <span>Enviar Reporte a Admins</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                onClick={() => setConfirmBulkOpen(true)}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Dar de baja seleccionados ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* LISTADO DE CANDIDATOS */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredCandidatos.length === 0 ? (
            <div className="text-center py-12 bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl p-6">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-sm text-zinc-800">¡Al día! No hay socios con turnos fijos pendientes de baja</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Todos los alumnos con turnos fijos tienen su cuota abonada o cuentan con excepciones registradas.
              </p>
            </div>
          ) : (
            filteredCandidatos.map(c => {
              const pl = planes.find(p => p.id === c.plan_id);
              const isSelected = selectedIds.includes(c.id);
              const tieneExencion = c.exencion_cobro && c.exencion_cobro !== 'NINGUNA';

              return (
                <div 
                  key={c.id} 
                  className={`bg-white border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-2xs hover:shadow-xs ${
                    isSelected ? 'border-red-400 ring-2 ring-red-500/15 bg-red-50/20' : 'border-zinc-200'
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      onClick={() => handleToggleSelectId(c.id)}
                      className="mt-1 text-zinc-400 hover:text-zinc-700 cursor-pointer border-none bg-transparent"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-red-600" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-300" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-950">{c.apellido}, {c.nombre}</span>
                        {c.codigo_socio && (
                          <span className="text-[10px] font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded font-semibold">
                            {c.codigo_socio}
                          </span>
                        )}
                        {tieneExencion && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded uppercase">
                            {c.exencion_cobro}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                        <span>Plan: <strong className="text-zinc-700">{pl?.nombre || 'Base'}</strong></span>
                        <span>·</span>
                        <span className="font-mono text-red-600 font-bold">Deuda: ${c.deuda_acumulada.toLocaleString('es-AR')}</span>
                        <span>·</span>
                        <span className="text-zinc-400 truncate">{c.email}</span>
                      </div>

                      {/* Turnos fijos chips */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] text-zinc-400 font-semibold uppercase font-mono">Turnos Fijos:</span>
                        {c.turnos_fijos.map(tf => (
                          <span 
                            key={tf}
                            className="bg-red-50 border border-red-200 text-red-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg"
                          >
                            {tf}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Acciones por fila */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100 justify-end">
                    {c.telefono && (
                      <a
                        href={`https://wa.me/${c.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${c.nombre}, te escribimos de KAHA GYM por la cuota de tu turno fijo.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer"
                        title="Escribir por WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}

                    {!tieneExencion ? (
                      <button
                        onClick={() => handleEximirOMantener(c, 'POSTERGADO')}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title="Mantener turno sin penalizaciones este mes"
                      >
                        Mantener / Prorrogar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEximirOMantener(c, 'NINGUNA' as any)}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        title="Quitar excepción"
                      >
                        Quitar Excepción
                      </button>
                    )}

                    <button
                      onClick={() => setConfirmClienteBaja(c)}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-2xs cursor-pointer border-none"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                      <span>Dar de Baja</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-zinc-500">
            Total en revisión: <strong className="text-zinc-900">{candidatosBaja.length} socios</strong> · Deuda: <strong className="font-mono text-red-600">${totalDeudaCandidatos.toLocaleString('es-AR')}</strong>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
          >
            Listo / Cerrar
          </button>
        </div>

      </div>

      {/* MODAL CONFIRMACIÓN BAJA INDIVIDUAL */}
      {confirmClienteBaja && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <UserMinus className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-base font-bold text-zinc-950">
                ¿Dar de baja turnos fijos a {confirmClienteBaja.nombre} {confirmClienteBaja.apellido}?
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Esta acción removerá al socio de sus <strong>{confirmClienteBaja.turnos_fijos.length} turno(s) fijo(s)</strong> ({confirmClienteBaja.turnos_fijos.join(', ')}). Los cupos quedarán inmediatamente disponibles y se promoverá la lista de espera si hubiere.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmClienteBaja(null)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border-none"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleConfirmBajaIndividual(confirmClienteBaja)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer border-none flex items-center justify-center gap-1.5"
              >
                {isProcessing ? 'Procesando...' : 'Confirmar Baja'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN BAJA MÚLTIPLE */}
      {confirmBulkOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="text-base font-bold text-zinc-950">
                ¿Confirmar baja masiva para {selectedIds.length} socio(s)?
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Se liberarán todos los turnos fijos asignados a los socios seleccionados y se reasignarán vacantes a las personas en lista de espera automáticamente.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmBulkOpen(false)}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border-none"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmBajaMultiple}
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm cursor-pointer border-none flex items-center justify-center gap-1.5"
              >
                {isProcessing ? 'Procesando...' : `Confirmar ${selectedIds.length} Bajas`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
