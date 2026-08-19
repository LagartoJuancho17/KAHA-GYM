// src/components/Turnos/TurnoRealtimeModal.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { X, Clock, Trash2, Plus, MessageCircle, Send, Search, UserCheck, History, ListOrdered, Check, CheckCircle2, AlertTriangle } from 'lucide-react';
import { TurnosHistorialModal } from './TurnosHistorialModal';

interface TurnoRealtimeModalProps {
  selectedSlot: { id: string; date: string };
  onClose: () => void;
}

const formatWspPhone = (phone?: string) => {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (!clean) return '';
  if (clean.startsWith('549')) return clean;
  if (clean.startsWith('54')) return '549' + clean.slice(2);
  if (clean.startsWith('11') || clean.startsWith('15')) return '549' + clean;
  return '549' + clean;
};

export const TurnoRealtimeModal: React.FC<TurnoRealtimeModalProps> = ({ selectedSlot, onClose }) => {
  const {
    turnos, clientes, recuperos, waitlistReservas, removerListaEsperaReserva,
    crearReservaIndividual, cancelarReservaIndividual, suspenderClaseFija, revertirSuspensionClaseFija,
    actualizarEstadoRecupero, addCliente, notificarBajaClase
  } = useGym();

  const [realtimeCandidateClient, setRealtimeCandidateClient] = useState('');
  const [guestName, setGuestName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [realtimeSuccess, setRealtimeSuccess] = useState<string | null>(null);

  // Estado para el modal de WhatsApp Masivo
  const [showWspModal, setShowWspModal] = useState(false);
  const [motivoPreset, setMotivoPreset] = useState<'LLUVIA' | 'CORTE_LUZ' | 'RETRASO' | 'PROFESOR' | 'CUSTOM'>('LLUVIA');
  const [customMensaje, setCustomMensaje] = useState('');
  const [showHistorial, setShowHistorial] = useState(false);

  const getCellRealtimeData = (turnoId: string, fecha: string) => {
    const turno = turnos.find(t => t.id === turnoId);
    if (!turno) return { fijos: [], fijosActivos: [], suspendidos: [], variables: [], recuperos: [], total: 0, cupo: 0, profesor: '' };

    const fijos = (turno.asignados_ids || []).map(id => clientes.find(c => c.id === id)).filter(Boolean) as Cliente[];
    const suspendidos = fijos.filter(c => (c.clases_suspendidas || []).some(s => s.turno_id === turno.id && s.fecha === fecha));
    const fijosActivos = fijos.filter(c => !suspendidos.some(s => s.id === c.id));
    const vars = clientes.filter(c => c.activo && (c.reservas_individuales || []).some(r => r.turno_id === turno.id && r.fecha === fecha));
    const recs = recuperos.filter(r => (r.estado === 'PENDIENTE' || r.estado === 'COMPLETADO') && r.turno_recupero_id === turno.id && r.fecha_recupero === fecha);

    return {
      turno,
      fijos,
      suspendidos,
      fijosActivos,
      variables: vars,
      recuperos: recs,
      total: fijosActivos.length + vars.length + recs.length,
      cupo: turno.cupo_maximo,
      profesor: turno.profesor || ''
    };
  };

  const rtData = getCellRealtimeData(selectedSlot.id, selectedSlot.date);
  const isFull = rtData.total >= rtData.cupo;

  // Lista de espera para este turno y fecha
  const waitlistItems = useMemo(() => {
    return waitlistReservas
      .filter(w => w.turno_id === selectedSlot.id && w.fecha === selectedSlot.date)
      .map(w => {
        const cl = clientes.find(c => c.id === w.cliente_id);
        return {
          id: w.id,
          clienteId: w.cliente_id,
          nombre: cl ? `${cl.apellido}, ${cl.nombre}` : 'Socio',
          creado_at: w.creado_at
        };
      });
  }, [waitlistReservas, selectedSlot.id, selectedSlot.date, clientes]);
  
  // Candidates: active, don't have this as fijo, don't have booking on this exact shift and date, and not already in waitlist
  const candidateClients = useMemo(() => {
    return clientes.filter(c => {
      const alreadyInWaitlist = waitlistReservas.some(w => w.cliente_id === c.id && w.turno_id === selectedSlot.id && w.fecha === selectedSlot.date);
      return c.activo && 
        !c.turnos_fijos.includes(selectedSlot.id) && 
        !(c.reservas_individuales || []).some(r => r.turno_id === selectedSlot.id && r.fecha === selectedSlot.date) &&
        !alreadyInWaitlist;
    });
  }, [clientes, selectedSlot.id, selectedSlot.date, waitlistReservas]);

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidateClients;
    const q = searchQuery.toLowerCase().trim();
    return candidateClients.filter(c => 
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
      `${c.apellido} ${c.nombre}`.toLowerCase().includes(q)
    );
  }, [candidateClients, searchQuery]);

  const selectedCandidateObj = useMemo(() => {
    return clientes.find(c => c.id === realtimeCandidateClient);
  }, [clientes, realtimeCandidateClient]);

  const handleAddRealtimeVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!realtimeCandidateClient && !guestName.trim()) return;

    setRealtimeError(null);
    setRealtimeSuccess(null);

    if (guestName.trim()) {
      const fullGuestName = guestName.trim();
      const parts = fullGuestName.split(' ');
      const name = parts[0] || 'Invitado';
      const lastname = parts.length > 1 ? parts.slice(1).join(' ') + ' (Invitado)' : '(Invitado)';
      
      const newGuestResult = addCliente({
        nombre: name,
        apellido: lastname,
        email: `invitado-${Date.now()}@kaha.com`,
        telefono: '11-0000-0000',
        tipo: 'FIJO',
        plan_id: 'p-none',
        exencion_cobro: 'NINGUNA',
        allowDuplicate: true,
        // El alta y la anotación se resuelven en la misma llamada. Si se hiciera
        // en dos pasos (crear y después anotar), el segundo paso no encuentra al
        // socio: React todavía no actualizó `clientes` dentro de este handler.
        initialReservaIndividual: isFull ? undefined : {
          turno_id: selectedSlot.id,
          fecha: selectedSlot.date
        },
        initialWaitlistReserva: isFull ? {
          turno_id: selectedSlot.id,
          fecha: selectedSlot.date
        } : undefined
      });

      if (newGuestResult.success) {
        if (isFull) {
          setRealtimeSuccess(`✅ ¡Confirmado! Invitado "${fullGuestName}" registrado en la LISTA DE ESPERA.`);
        } else {
          setRealtimeSuccess(`✅ ¡Confirmado! Invitado "${fullGuestName}" agendado con éxito en la clase.`);
        }
        setGuestName('');
        setRealtimeCandidateClient('');
        setSearchQuery('');
        setIsDropdownOpen(false);
        setTimeout(() => setRealtimeSuccess(null), 5000);
      } else {
        setRealtimeError(newGuestResult.message || 'Error al agendar el socio invitado.');
      }
      return;
    }

    if (!realtimeCandidateClient) {
      setRealtimeError('Debes elegir un alumno de la lista o escribir el nombre de un invitado.');
      return;
    }

    const res = crearReservaIndividual(realtimeCandidateClient, selectedSlot.id, selectedSlot.date);
    if (res.success) {
      setRealtimeSuccess(`✅ ¡Confirmado! ${res.message}`);
      setRealtimeCandidateClient('');
      setGuestName('');
      setSearchQuery('');
      setIsDropdownOpen(false);
      setTimeout(() => setRealtimeSuccess(null), 5000);
    } else {
      setRealtimeError(res.message);
    }
  };

  const checklistItems = useMemo(() => {
    const items: Array<{
      id: string;
      clienteId: string;
      nombre: string;
      tipo: 'FIJO' | 'VARIABLE' | 'RECUPERO';
      presente: boolean;
      info?: string;
      key: string;
    }> = [];

    // Fijos (Activos + Suspendidos)
    rtData.fijos.forEach(c => {
      const esAusente = rtData.suspendidos.some(s => s.id === c.id);
      items.push({
        id: c.id,
        clienteId: c.id,
        nombre: `${c.apellido}, ${c.nombre}`,
        tipo: 'FIJO',
        presente: !esAusente,
        key: `fijo-${c.id}`
      });
    });

    // Variables / Invitados
    rtData.variables.forEach(c => {
      const isGuest = c.apellido.includes('Invitado') || c.email.includes('invitado-');
      const cleanLastname = c.apellido.replace('(Invitado)', '').trim();
      const displayName = isGuest
        ? (cleanLastname ? `${c.nombre} ${cleanLastname} (Invitado)` : `${c.nombre} (Invitado)`)
        : `${c.apellido}, ${c.nombre}`;

      items.push({
        id: c.id,
        clienteId: c.id,
        nombre: displayName,
        tipo: 'VARIABLE',
        presente: true,
        key: `var-${c.id}`
      });
    });

    // Recuperos
    rtData.recuperos.forEach(r => {
      items.push({
        id: r.id,
        clienteId: r.cliente_id,
        nombre: r.cliente_nombre,
        tipo: 'RECUPERO',
        presente: r.estado === 'COMPLETADO',
        info: `Recupera falta del ${(() => { const parts = r.fecha_inasistencia.split('-'); return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : r.fecha_inasistencia; })()}`,
        key: `rec-${r.id}`
      });
    });

    return items.sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rtData.fijos, rtData.suspendidos, rtData.variables, rtData.recuperos]);

  const handleToggleAttendance = (item: typeof checklistItems[0]) => {
    setRealtimeError(null);
    setRealtimeSuccess(null);

    if (item.tipo === 'FIJO') {
      if (item.presente) {
        const res = suspenderClaseFija(item.clienteId, selectedSlot.id, selectedSlot.date);
        if (res.success) {
          // Aviso al socio: baja de esta clase puntual (WhatsApp o email), con la fecha del día
          const avisado = notificarBajaClase(item.clienteId, selectedSlot.id, selectedSlot.date);
          setRealtimeSuccess(avisado ? `${res.message} Se le avisó al socio de la baja.` : res.message);
          setTimeout(() => setRealtimeSuccess(null), 3000);
        } else {
          setRealtimeError(res.message);
        }
      } else {
        const res = revertirSuspensionClaseFija(item.clienteId, selectedSlot.id, selectedSlot.date);
        if (res.success) {
          setRealtimeSuccess(res.message);
          setTimeout(() => setRealtimeSuccess(null), 3000);
        } else {
          setRealtimeError(res.message);
        }
      }
    } else if (item.tipo === 'VARIABLE') {
      if (item.presente) {
        const resObj = (clientes.find(c => c.id === item.clienteId)?.reservas_individuales || [])
          .find(r => r.turno_id === selectedSlot.id && r.fecha === selectedSlot.date);
        
        if (resObj) {
          const res = cancelarReservaIndividual(item.clienteId, resObj.id);
          if (res.success) {
            // Aviso al socio: baja de la reserva de esta clase puntual (WhatsApp o email)
            const avisado = notificarBajaClase(item.clienteId, selectedSlot.id, selectedSlot.date);
            setRealtimeSuccess(avisado ? `${res.message} Se le avisó al socio de la baja.` : res.message);
            setTimeout(() => setRealtimeSuccess(null), 3000);
          } else {
            setRealtimeError(res.message);
          }
        }
      }
    } else if (item.tipo === 'RECUPERO') {
      const nextEstado = item.presente ? 'PENDIENTE' : 'COMPLETADO';
      actualizarEstadoRecupero(item.id, nextEstado);
      setRealtimeSuccess(nextEstado === 'COMPLETADO' ? 'Asistencia registrada.' : 'Asistencia revertida.');
      setTimeout(() => setRealtimeSuccess(null), 3000);
    }
  };

  const handleOpenWspModal = () => {
    setShowWspModal(true);
    setMotivoPreset('LLUVIA');
    setCustomMensaje(`Hola {nombre}! Te avisamos que por cuestiones climáticas la clase de hoy ${selectedSlot.id.split('-')[0]} ${selectedSlot.id.split('-')[1]}hs en KAHA GYM queda suspendida. Se te reintegra la clase.`);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs" id="realtime-turno-modal">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden relative animate-scale-up max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5 animate-pulse">
              <Clock className="w-4 h-4 text-emerald-400" />
              Control Tiempo Real: {selectedSlot.id.split('-')[0]} — {selectedSlot.id.split('-')[1]} hs
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
              <span>Fecha de la clase:</span>
              <strong className="text-emerald-400 font-mono capitalize">
                {new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ({(() => { const p = selectedSlot.date.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : selectedSlot.date; })()})
              </strong>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistorial(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              title="Ver historial de movimientos de este turno y fecha"
            >
              <History className="w-3.5 h-3.5 text-lime-400" />
              <span className="hidden sm:inline">Historial</span>
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Status Overview */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold font-sans">Estado de Ocupación</div>
              <div className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">{rtData.total} Cupos Ocupados</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold font-sans">Profesor Fijo</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">👤 {rtData.profesor || 'No asignado'}</div>
            </div>
          </div>

          {realtimeError && (
            <div className="bg-red-50 text-red-700 p-2.5 rounded-lg font-medium border border-red-200 text-[11px]">
              {realtimeError}
            </div>
          )}

          {realtimeSuccess && (
            <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-medium border border-emerald-200 text-[11px]">
              {realtimeSuccess}
            </div>
          )}

          {/* Checklist de Asistencia */}
          <div className="space-y-2.5">
            <div className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest font-sans border-b border-zinc-200 pb-1.5 flex justify-between items-center">
              <span>Checklist de Asistencia ({checklistItems.length})</span>
              {checklistItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleOpenWspModal}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer border-none shadow-xs"
                  id="btn-wsp-broadcast-trigger"
                >
                  <MessageCircle className="w-3 h-3 text-emerald-100" />
                  <span>Aviso WhatsApp</span>
                </button>
              )}
            </div>
            
            {checklistItems.length === 0 ? (
              <p className="text-zinc-400 italic text-[11.5px] py-2 text-center bg-zinc-50 rounded-lg border border-zinc-150">No hay alumnos agendados para este turno hoy.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                {checklistItems.map((item) => {
                  return (
                    <div
                      key={item.key}
                      className={`flex justify-between items-center p-2 rounded-lg border transition-all text-xs ${
                        item.presente
                          ? 'bg-emerald-50/20 border-zinc-200 hover:bg-emerald-50/30'
                          : 'bg-zinc-50/50 border-zinc-200 opacity-80 hover:bg-zinc-50'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer select-none flex-1">
                        <input
                          type="checkbox"
                          checked={item.presente}
                          onChange={() => handleToggleAttendance(item)}
                          className="w-3.5 h-3.5 rounded-xs text-emerald-600 border-zinc-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex flex-col">
                          <span
                            className={`font-semibold ${
                              item.presente ? 'text-zinc-800' : 'text-zinc-400 line-through'
                            }`}
                          >
                            {item.nombre}
                          </span>
                          {item.info && (
                            <span className="text-[9px] text-zinc-400 mt-0.5">
                              {item.info}
                            </span>
                          )}
                        </div>
                      </label>
                      
                      <div className="shrink-0 pl-2">
                        {item.tipo === 'FIJO' && (
                          <span className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm bg-sky-50 text-sky-700 border border-sky-100">
                            Fijo
                          </span>
                        )}
                        {item.tipo === 'VARIABLE' && (
                          <span className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm bg-violet-50 text-violet-700 border border-violet-100">
                            Variable
                          </span>
                        )}
                        {item.tipo === 'RECUPERO' && (
                          <span className="text-[8.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-sm bg-amber-50 text-amber-800 border border-amber-100">
                            Recupero
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LISTA DE ESPERA PARA ESTA FECHA */}
          {waitlistItems.length > 0 && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <ListOrdered className="w-4 h-4 text-amber-600" />
                  <span>Lista de Espera ({waitlistItems.length})</span>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold">
                  Auto-promoción al liberarse un cupo
                </span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                {waitlistItems.map((wl, idx) => (
                  <div key={wl.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-amber-200/80 text-xs shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                        P{idx + 1}
                      </span>
                      <span className="font-semibold text-zinc-900">{wl.nombre}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        removerListaEsperaReserva(wl.clienteId, selectedSlot.id, selectedSlot.date);
                        setRealtimeSuccess('Socio retirado de la lista de espera.');
                        setTimeout(() => setRealtimeSuccess(null), 2500);
                      }}
                      className="text-zinc-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors cursor-pointer border-none bg-transparent"
                      title="Retirar de lista de espera"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agendar Variable o Invitado Form con Botón de Confirmación Explícito */}
          <div className="border-t border-zinc-200/80 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[10px] text-zinc-600 uppercase tracking-widest block font-sans">
                {isFull ? 'Anotar Alumno en Lista de Espera' : 'Agendar Alumno Variable o Invitado'}
              </label>
              <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                isFull 
                  ? 'text-amber-800 bg-amber-100 border border-amber-300 font-mono' 
                  : 'text-emerald-800 bg-emerald-100 border border-emerald-300 font-mono'
              }`}>
                {isFull ? `Turno Completo (${rtData.total}/${rtData.cupo})` : `Lugares Disponibles (${rtData.cupo - rtData.total})`}
              </span>
            </div>

            {/* SELECCIONAR SOCIO REGISTRADO O ESCRIBIR INVITADO */}
            {!selectedCandidateObj && !guestName.trim() ? (
              <div className="space-y-3 bg-zinc-50 p-3.5 rounded-xl border border-zinc-200">
                <div className="space-y-1 relative">
                  <span className="text-[10px] text-zinc-600 font-bold font-sans block">1. Elegir Socio Registrado:</span>
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Escribí nombre o apellido para buscar socio..."
                        value={searchQuery}
                        onFocus={() => setIsDropdownOpen(true)}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        className="w-full pl-8 pr-8 py-2.5 border border-zinc-300 rounded-lg text-xs bg-white outline-hidden font-medium focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition-colors shadow-2xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2 text-zinc-400 hover:text-zinc-600 text-xs font-bold border-none bg-transparent cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {isDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsDropdownOpen(false)}
                        />
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-2xl z-50 max-h-52 overflow-y-auto font-sans">
                          {filteredCandidates.length > 0 ? (
                            filteredCandidates.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setRealtimeCandidateClient(c.id);
                                  setGuestName('');
                                  setIsDropdownOpen(false);
                                  setSearchQuery('');
                                }}
                                className="w-full text-left px-3 py-2.5 text-xs text-zinc-800 hover:bg-lime-50 hover:text-zinc-950 border-b border-zinc-100 last:border-none cursor-pointer transition-colors flex items-center justify-between"
                              >
                                <span className="font-bold">{c.apellido}, {c.nombre}</span>
                                <span className="text-[9px] px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono font-semibold">{c.tipo}</span>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-xs text-zinc-400 text-center font-sans">
                              No se encontraron socios con &quot;{searchQuery}&quot;
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-zinc-400 text-[8.5px] font-bold uppercase tracking-wider justify-center select-none">
                  <div className="h-px bg-zinc-200 flex-1"></div>
                  <span>O BIEN</span>
                  <div className="h-px bg-zinc-200 flex-1"></div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-600 font-bold font-sans block">2. Registrar Socio Invitado puntual:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej: Juan Pérez (Invitado)"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="flex-1 border border-zinc-300 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* TARJETA DE CONFIRMACIÓN DESTACADA */
              <div className="bg-zinc-900 text-white p-4 rounded-xl border border-zinc-800 shadow-lg space-y-3 animate-scale-in">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-lime-400/20 text-lime-400 rounded-lg">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Alumno a Confirmar</div>
                      <div className="text-sm font-extrabold text-white">
                        {selectedCandidateObj ? `${selectedCandidateObj.apellido}, ${selectedCandidateObj.nombre}` : `${guestName.trim()} (Invitado)`}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRealtimeCandidateClient('');
                      setGuestName('');
                      setSearchQuery('');
                    }}
                    className="text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer border-none"
                  >
                    Cambiar
                  </button>
                </div>

                {/* DESTINO DE LA ASIGNACIÓN */}
                <div className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                  isFull 
                    ? 'bg-amber-950/70 border border-amber-500/50 text-amber-200' 
                    : 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200'
                }`}>
                  {isFull ? (
                    <>
                      <ListOrdered className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-[11.5px] leading-tight space-y-0.5">
                        <strong className="text-amber-300 font-bold block">Turno Completo ({rtData.total}/{rtData.cupo})</strong>
                        <span>Se registrará en la <strong>Lista de Espera (Prioridad P{waitlistItems.length + 1})</strong>. Cuando un alumno se dé de baja, se le asignará el lugar y se le enviará un correo automáticamente.</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div className="text-[11.5px] leading-tight space-y-0.5">
                        <strong className="text-emerald-300 font-bold block">Cupo Disponible ({rtData.total}/{rtData.cupo})</strong>
                        <span>Se confirmará la reserva individual directamente para esta fecha.</span>
                      </div>
                    </>
                  )}
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRealtimeCandidateClient('');
                      setGuestName('');
                      setSearchQuery('');
                    }}
                    className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-colors cursor-pointer border-none"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddRealtimeVariable}
                    className={`flex-2 py-2.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-md ${
                      isFull
                        ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-amber-500/20'
                        : 'bg-lime-400 hover:bg-lime-300 text-zinc-950 shadow-lime-500/20'
                    }`}
                    id="btn-confirmar-agregado-alumno"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Confirmar y {isFull ? 'Anotar en Espera' : 'Agendar'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-50 px-5 py-4 border-t border-zinc-100 flex justify-end font-sans">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
          >
            Cerrar
          </button>
        </div>

      </div>

      {/* MODAL / SUB-PANEL: AVISO MASIVO WHATSAPP */}
      {showWspModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[60] flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs" id="wsp-broadcast-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-emerald-950 text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-800 text-emerald-200 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-50">Enviar WhatsApp a Alumnos del Turno</h4>
                  <p className="text-[10px] text-emerald-300 font-mono">
                    {selectedSlot.id.split('-')[0]} {selectedSlot.id.split('-')[1]}hs — {checklistItems.length} alumno(s) esperados
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowWspModal(false)} 
                className="text-emerald-300 hover:text-white bg-emerald-900/60 p-1.5 rounded-lg border-none cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Motivo Selector */}
              <div className="space-y-1.5">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">Seleccionar Motivo o Plantilla</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMotivoPreset('LLUVIA');
                      setCustomMensaje(`Hola {nombre}! Te avisamos que por cuestiones climáticas la clase de hoy ${selectedSlot.id.split('-')[0]} ${selectedSlot.id.split('-')[1]}hs en KAHA GYM queda suspendida. Se te reintegra el cupo.`);
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer text-xs font-semibold transition-all ${
                      motivoPreset === 'LLUVIA' ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    🌧️ Lluvia / Mal Tiempo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMotivoPreset('CORTE_LUZ');
                      setCustomMensaje(`Hola {nombre}! Te informamos que por un corte de luz en la zona, la clase de hoy ${selectedSlot.id.split('-')[0]} ${selectedSlot.id.split('-')[1]}hs en KAHA GYM queda suspendida. Se te reintegra el cupo.`);
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer text-xs font-semibold transition-all ${
                      motivoPreset === 'CORTE_LUZ' ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    ⚡ Corte de Luz
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMotivoPreset('RETRASO');
                      setCustomMensaje(`Hola {nombre}! Te notificamos que la clase de hoy ${selectedSlot.id.split('-')[0]} ${selectedSlot.id.split('-')[1]}hs en KAHA GYM comenzará con unos minutos de demora. ¡Te esperamos!`);
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer text-xs font-semibold transition-all ${
                      motivoPreset === 'RETRASO' ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    ⏱️ Retraso de Clase
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMotivoPreset('PROFESOR');
                      setCustomMensaje(`Hola {nombre}! Te avisamos que la clase de hoy ${selectedSlot.id.split('-')[0]} ${selectedSlot.id.split('-')[1]}hs estará a cargo del profe ${rtData.profesor || 'un nuevo profesor'}. ¡Te esperamos!`);
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer text-xs font-semibold transition-all ${
                      motivoPreset === 'PROFESOR' ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    👤 Cambio de Profesor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMotivoPreset('CUSTOM');
                      setCustomMensaje(`Hola {nombre}! Te escribimos desde KAHA GYM con un aviso sobre la clase de hoy ${selectedSlot.id.split('-')[0]} ${selectedSlot.id.split('-')[1]}hs: `);
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer text-xs font-semibold transition-all ${
                      motivoPreset === 'CUSTOM' ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold shadow-2xs' : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    ✏️ Mensaje Personalizado
                  </button>
                </div>
              </div>

              {/* Textarea para personalizar */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">
                  Mensaje a Enviar (Usá <code className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded">{'{nombre}'}</code> para personalizar)
                </label>
                <textarea
                  rows={3}
                  value={customMensaje}
                  onChange={(e) => setCustomMensaje(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl p-3 text-xs bg-white focus:border-emerald-600 outline-hidden font-medium text-zinc-800"
                  placeholder="Escribí el motivo o mensaje para la clase..."
                />
              </div>

              {/* Lista de Alumnos */}
              <div className="space-y-2 pt-2 border-t border-zinc-100">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-zinc-700 text-xs">Alumnos a Notificar ({checklistItems.length})</span>
                  <span className="text-[10px] text-zinc-400">Clic en Enviar WA abre la app de WhatsApp</span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {checklistItems.map((item) => {
                    const clientObj = clientes.find(c => c.id === item.clienteId);
                    const rawPhone = clientObj?.telefono || '';
                    const formattedPhone = formatWspPhone(rawPhone);
                    const firstName = clientObj?.nombre || item.nombre.split(',')[1]?.trim() || item.nombre;
                    const personalizedMsg = customMensaje.replace(/{nombre}/g, firstName);
                    const wspLink = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(personalizedMsg)}` : null;

                    return (
                      <div key={item.key} className="flex items-center justify-between p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
                        <div>
                          <span className="font-bold text-zinc-900 block">{item.nombre}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {rawPhone ? `WSP: ${rawPhone}` : 'Sin teléfono registrado'}
                          </span>
                        </div>
                        {wspLink ? (
                          <a
                            href={wspLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all no-underline shadow-2xs cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Enviar WA
                          </a>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic px-2 py-1 bg-zinc-100 rounded-md">Sin teléfono</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 p-4 border-t border-zinc-100 flex justify-end font-sans">
              <button
                type="button"
                onClick={() => setShowWspModal(false)}
                className="px-5 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE MOVIMIENTOS PREFILTRADO */}
      <TurnosHistorialModal
        isOpen={showHistorial}
        onClose={() => setShowHistorial(false)}
        filtroTurnoIdInicial={selectedSlot.id}
        filtroFechaInicial={selectedSlot.date}
      />
    </div>
  );
};
