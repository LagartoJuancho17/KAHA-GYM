// src/components/Turnos/TurnoRealtimeModal.tsx
import React, { useState } from 'react';
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
    crearReservaIndividual, cancelarReservaIndividual, suspenderClaseFija, addCliente
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
    const recs = recuperos.filter(r => r.estado === 'PENDIENTE' && r.turno_recupero_id === turno.id && r.fecha_recupero === fecha);

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
  
  // Candidates: active, don't have this as fijo, don't have booking on this date
  const candidateClients = clientes.filter(c => {
    return c.activo && 
      !c.turnos_fijos.includes(selectedSlot.id) && 
      !(c.reservas_individuales || []).some(r => r.fecha === selectedSlot.date);
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

  const handleRemoveRealtimeVariable = (clienteId: string, reservaId: string) => {
    setRealtimeError(null);
    setRealtimeSuccess(null);

    const res = cancelarReservaIndividual(clienteId, reservaId);
    if (res.success) {
      setRealtimeSuccess(res.message);
      setTimeout(() => setRealtimeSuccess(null), 3000);
    } else {
      setRealtimeError(res.message);
    }
  };

  const handleSuspendRealtimeFixed = (clienteId: string, turnoId: string, date: string) => {
    setRealtimeError(null);
    setRealtimeSuccess(null);

    const res = suspenderClaseFija(clienteId, turnoId, date);
    if (res.success) {
      setRealtimeSuccess(res.message);
      setTimeout(() => setRealtimeSuccess(null), 3000);
    } else {
      setRealtimeError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs" id="realtime-turno-modal">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden relative animate-scale-up max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5 animate-pulse">
              <Clock className="w-4 h-4 text-emerald-450" />
              Control Tiempo Real: {selectedSlot.id.split('-')[0]} — {selectedSlot.id.split('-')[1]} hs
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">Fecha de la clase: {selectedSlot.date}</p>
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
              <div className="text-[10px] text-zinc-450 uppercase tracking-widest font-bold font-sans">Estado de Ocupación</div>
              <div className="text-sm font-extrabold text-slate-800 font-mono mt-0.5">{rtData.total} Cupos Ocupados</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-zinc-455 uppercase tracking-widest font-bold font-sans">Profesor Fijo</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">👤 {rtData.profesor || 'No asignado'}</div>
            </div>
          </div>

          {realtimeError && (
            <div className="bg-red-50 text-red-750 p-2.5 rounded-lg font-medium border border-red-200 text-[11px]">
              {realtimeError}
            </div>
          )}

          {realtimeSuccess && (
            <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-medium border border-emerald-250 text-[11px]">
              {realtimeSuccess}
            </div>
          )}

          {/* Fijos Activos */}
          <div className="space-y-2">
            <h4 className="font-bold text-[10px] text-sky-800 uppercase tracking-widest font-sans border-b border-sky-50 pb-1 flex justify-between items-center">
              <span>Miembros Fijos Hoy ({rtData.fijosActivos.length})</span>
              <span className="text-[9px] text-zinc-405 normal-case font-normal">(con turno fijo permanente)</span>
            </h4>
            {rtData.fijosActivos.length === 0 ? (
              <p className="text-zinc-400 italic text-[11px] py-1">No asisten alumnos fijos a este turno hoy.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {rtData.fijosActivos.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-2 bg-sky-50/50 border border-sky-100 rounded-lg text-xs">
                    <span className="font-semibold text-sky-950">{c.apellido}, {c.nombre}</span>
                    <button
                      onClick={() => handleSuspendRealtimeFixed(c.id, selectedSlot.id, selectedSlot.date)}
                      className="text-rose-500 hover:text-rose-700 bg-rose-55 hover:bg-rose-100 p-1 rounded-md border border-rose-100 cursor-pointer text-[10px] font-bold px-2 border-none"
                      title="Avisar inasistencia y liberar cupo por hoy"
                    >
                      Avisar Falta
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fijos Suspendidos */}
          {rtData.suspendidos.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-[10px] text-rose-750 uppercase tracking-widest font-sans border-b border-rose-50 pb-1">
                Miembros con Falta Avisada Hoy ({rtData.suspendidos.length})
              </h4>
              <div className="space-y-1.5">
                {rtData.suspendidos.map(c => (
                  <div key={c.id} className="flex justify-between items-center p-2 bg-rose-50/30 border border-rose-100 rounded-lg text-xs">
                    <span className="font-semibold text-rose-800 line-through">{c.apellido}, {c.nombre}</span>
                    <span className="text-[9px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-extrabold uppercase">Ausente</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reservas Variables */}
          <div className="space-y-2">
            <h4 className="font-bold text-[10px] text-violet-800 uppercase tracking-widest font-sans border-b border-violet-50 pb-1">
              Reservas Variables / Individuales ({rtData.variables.length})
            </h4>
            {rtData.variables.length === 0 ? (
              <p className="text-zinc-400 italic text-[11px] py-1">No se registran reservas variables para este día.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {rtData.variables.map(c => {
                  const resObj = (c.reservas_individuales || []).find(r => r.turno_id === selectedSlot.id && r.fecha === selectedSlot.date);
                  return (
                    <div key={c.id} className="flex justify-between items-center p-2 bg-violet-50/50 border border-violet-100 rounded-lg text-xs">
                      <span className="font-semibold text-violet-955">{c.apellido}, {c.nombre}</span>
                      {resObj && (
                        <button
                          onClick={() => handleRemoveRealtimeVariable(c.id, resObj.id)}
                          className="text-rose-550 hover:text-rose-700 bg-rose-50 p-1.5 rounded-md border border-rose-100 cursor-pointer border-none"
                          title="Cancelar reserva variable"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recuperos */}
          <div className="space-y-2">
            <h4 className="font-bold text-[10px] text-amber-855 uppercase tracking-widest font-sans border-b border-amber-50 pb-1">
              Recuperos de Clase Programados ({rtData.recuperos.length})
            </h4>
            {rtData.recuperos.length === 0 ? (
              <p className="text-zinc-400 italic text-[11px] py-1">No hay alumnos recuperando clases en este turno hoy.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {rtData.recuperos.map(r => (
                  <div key={r.id} className="p-2 bg-amber-50/50 border border-amber-100 rounded-lg text-xs font-semibold text-amber-955">
                    {r.cliente_nombre} <span className="text-[9px] text-amber-600 font-normal">(Faltó el {r.fecha_inasistencia})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agendar Variable o Invitado Form */}
          <form onSubmit={handleAddRealtimeVariable} className="border-t border-zinc-150 pt-4 space-y-3">
            <label className="font-bold text-[10px] text-zinc-550 uppercase tracking-widest block font-sans">Agendar Alumno Variable o Invitado</label>
            
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-400 font-sans block">Socio Registrado:</span>
              <select
                value={realtimeCandidateClient}
                onChange={(e) => {
                  setRealtimeCandidateClient(e.target.value);
                  if (e.target.value) setGuestName('');
                }}
                className="w-full border border-zinc-250 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
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
                className="w-full border border-zinc-250 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={(!realtimeCandidateClient && !guestName.trim()) || isFull}
              className={`w-full font-bold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none ${
                (!realtimeCandidateClient && !guestName.trim()) || isFull
                  ? 'bg-zinc-100 text-zinc-450 border border-zinc-200 cursor-not-allowed'
                  : 'bg-slate-900 border border-slate-900 text-white hover:bg-slate-800 shadow-sm'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Reservar {guestName.trim() ? 'como Invitado' : ''}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-zinc-50 px-5 py-4 border-t border-zinc-150 flex justify-end font-sans">
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
