// src/components/Turnos/TurnoRealtimeModal.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { X, Clock, Trash2, Plus } from 'lucide-react';

interface TurnoRealtimeModalProps {
  selectedSlot: { id: string; date: string };
  onClose: () => void;
}

export const TurnoRealtimeModal: React.FC<TurnoRealtimeModalProps> = ({ selectedSlot, onClose }) => {
  const { 
    turnos, clientes, recuperos,
    crearReservaIndividual, cancelarReservaIndividual, suspenderClaseFija, revertirSuspensionClaseFija,
    actualizarEstadoRecupero, addCliente
  } = useGym();

  const [realtimeCandidateClient, setRealtimeCandidateClient] = useState('');
  const [guestName, setGuestName] = useState('');
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [realtimeSuccess, setRealtimeSuccess] = useState<string | null>(null);

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
  
  // Candidates: active, don't have this as fijo, don't have booking on this exact shift and date
  const candidateClients = clientes.filter(c => {
    return c.activo && 
      !c.turnos_fijos.includes(selectedSlot.id) && 
      !(c.reservas_individuales || []).some(r => r.turno_id === selectedSlot.id && r.fecha === selectedSlot.date);
  });

  const handleAddRealtimeVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!realtimeCandidateClient && !guestName.trim()) return;

    setRealtimeError(null);
    setRealtimeSuccess(null);

    let targetClientId = realtimeCandidateClient;

    if (guestName.trim()) {
      const parts = guestName.trim().split(' ');
      const name = parts[0] || 'Invitado';
      const lastname = parts.slice(1).join(' ') || '(Invitado)';
      
      const newGuestResult = addCliente({
        nombre: name,
        apellido: lastname,
        email: `invitado-${Date.now()}@kaha.com`,
        telefono: '11-0000-0000',
        tipo: 'FLEXIBLE',
        plan_id: 'p-none',
        exencion_cobro: 'NINGUNA'
      });

      if (newGuestResult.success && (newGuestResult as any).id) {
        targetClientId = (newGuestResult as any).id;
      } else {
        setRealtimeError(newGuestResult.message || 'Error al registrar el socio invitado.');
        return;
      }
    }

    if (!targetClientId) {
      setRealtimeError('Debes elegir un alumno o escribir el nombre de un invitado.');
      return;
    }

    const res = crearReservaIndividual(targetClientId, selectedSlot.id, selectedSlot.date);
    if (res.success) {
      setRealtimeSuccess(res.message);
      setRealtimeCandidateClient('');
      setGuestName('');
      setTimeout(() => setRealtimeSuccess(null), 3000);
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

    // Variables
    rtData.variables.forEach(c => {
      items.push({
        id: c.id,
        clienteId: c.id,
        nombre: `${c.apellido}, ${c.nombre}`,
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
        info: `Recupera falta del ${r.fecha_inasistencia}`,
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
          setRealtimeSuccess(res.message);
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
            setRealtimeSuccess(res.message);
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
                {new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} ({selectedSlot.date})
              </strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
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
            <h4 className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest font-sans border-b border-zinc-200 pb-1.5 flex justify-between items-center">
              <span>Checklist de Asistencia</span>
              <span className="text-[9px] text-zinc-400 normal-case font-normal">({checklistItems.length} alumnos esperados)</span>
            </h4>
            
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

          {/* Agendar Variable o Invitado Form */}
          <form onSubmit={handleAddRealtimeVariable} className="border-t border-zinc-100 pt-4 space-y-3">
            <label className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block font-sans">Agendar Alumno Variable o Invitado</label>
            
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-400 font-sans block">Socio Registrado:</span>
              <select
                value={realtimeCandidateClient}
                onChange={(e) => {
                  setRealtimeCandidateClient(e.target.value);
                  if (e.target.value) setGuestName('');
                }}
                className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
              >
                <option value="">-- Selecciona socio --</option>
                {candidateClients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.apellido}, {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-zinc-300 text-[8px] font-bold uppercase tracking-wider justify-center my-1 select-none">
              <div className="h-px bg-zinc-200 flex-1"></div>
              <span>O BIEN</span>
              <div className="h-px bg-zinc-200 flex-1"></div>
            </div>

            <div className="space-y-1">
              <span className="text-[9px] text-zinc-400 font-sans block">Registrar Socio Invitado (Nombre y Apellido):</span>
              <input
                type="text"
                placeholder="Ej: Juan Pérez"
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  if (e.target.value) setRealtimeCandidateClient('');
                }}
                className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={(!realtimeCandidateClient && !guestName.trim()) || isFull}
              className={`w-full font-bold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${
                (!realtimeCandidateClient && !guestName.trim()) || isFull
                  ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
                  : 'bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 shadow-sm'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Reservar {guestName.trim() ? 'como Invitado' : ''}
            </button>
          </form>
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
    </div>
  );
};
