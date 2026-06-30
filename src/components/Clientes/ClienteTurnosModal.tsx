// src/components/Clientes/ClienteTurnosModal.tsx
import React, { useState, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { X, AlertCircle, CheckCircle, Calendar, Plus } from 'lucide-react';

interface ClienteTurnosModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
}

export const ClienteTurnosModal: React.FC<ClienteTurnosModalProps> = ({
  isOpen,
  onClose,
  cliente
}) => {
  const { clientes, planes, turnos, asignarClienteFijo, removerAsignacionFija } = useGym();
  const [selectedTurnoToAssign, setSelectedTurnoToAssign] = useState<string>('');
  const [turnosModalError, setTurnosModalError] = useState<string>('');
  const [turnosModalSuccess, setTurnosModalSuccess] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTurnoToAssign('');
      setTurnosModalError('');
      setTurnosModalSuccess('');
    }
  }, [isOpen]);

  if (!isOpen || !cliente) return null;

  const activeClient = clientes.find(c => c.id === cliente.id) || cliente;
  const plan = planes.find(p => p.id === activeClient.plan_id);

  // Filter turnos to list only those NOT already assigned as fixed
  const turnosDisponibles = turnos.filter(t => !activeClient.turnos_fijos.includes(t.id));

  const handleAssignTurno = () => {
    setTurnosModalError('');
    setTurnosModalSuccess('');

    if (!selectedTurnoToAssign) {
      setTurnosModalError('Por favor selecciona un horario de la grilla.');
      return;
    }

    const res = asignarClienteFijo(activeClient.id, selectedTurnoToAssign);
    if (res.success) {
      setTurnosModalSuccess(res.message);
      setSelectedTurnoToAssign('');
      setTimeout(() => setTurnosModalSuccess(''), 2000);
    } else {
      setTurnosModalError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans" id="asignar-turnos-fijos-modal">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden relative animate-scale-in">
        
        {/* Header */}
        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold tracking-tight">Gestionar Turnos Fijos</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">Socio: {activeClient.nombre} {activeClient.apellido}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 text-xs font-sans">
          
          {turnosModalError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4" />
              <span>{turnosModalError}</span>
            </div>
          )}

          {turnosModalSuccess && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 border border-emerald-250">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{turnosModalSuccess}</span>
            </div>
          )}

          {/* Plan stats */}
          <div className="bg-zinc-50 border border-zinc-150 p-3 rounded-lg text-[11px] text-zinc-650 space-y-1">
            <span className="font-semibold text-zinc-850 block">Membresía actual: {plan ? plan.nombre : 'Plan base'}</span>
            <span>Permite un máximo de <strong className="text-zinc-900">{plan ? plan.dias_por_semana : 5}</strong> días fijos semanales.</span>
            <span className="block mt-1">Ocupados actualmente: <strong className="text-zinc-900">{activeClient.turnos_fijos.length}</strong></span>
          </div>

          {/* Turnos asignados fijos */}
          <div className="space-y-2">
            <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest block font-sans">Turnos fijos reservados</span>
            {activeClient.turnos_fijos.length === 0 ? (
              <p className="text-zinc-400 italic text-[11px] py-1">No tiene ningún turno semanal fijo reservado.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
                {activeClient.turnos_fijos.map(tFid => (
                  <div key={tFid} className="bg-zinc-50 border border-zinc-200 py-2 px-3 rounded-lg flex justify-between items-center text-zinc-900 text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{tFid.split('-')[0]} — {tFid.split('-')[1]} hs</span>
                    </span>
                    <button
                      onClick={() => {
                        removerAsignacionFija(activeClient.id, tFid);
                        setTurnosModalSuccess('Horario fijo removido con éxito.');
                        setTurnosModalError('');
                        setTimeout(() => setTurnosModalSuccess(''), 2000);
                      }}
                      className="text-red-500 hover:text-red-750 p-1.5 bg-red-55 hover:bg-red-100 rounded-md border border-red-100 transition-colors cursor-pointer text-[10px] font-bold"
                      title="Remover turno"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reservar Nuevo Turno */}
          {activeClient.tipo === 'FIJO' && (
            <div className="pt-4 border-t border-zinc-150 space-y-2">
              <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest block font-sans">Reservar Nuevo Horario Semanal</span>
              <div className="flex gap-2">
                <select
                  value={selectedTurnoToAssign}
                  onChange={(e) => setSelectedTurnoToAssign(e.target.value)}
                  className="flex-1 p-2 border border-zinc-200 rounded-lg text-xs outline-hidden bg-white cursor-pointer"
                >
                  <option value="">-- Selecciona día y horario --</option>
                  {turnosDisponibles.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.dia} - {t.hora.slice(0, 5)}hs ({t.asignados_ids.length}/{t.cupo_maximo} ocupados)
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssignTurno}
                  className="bg-black hover:bg-zinc-800 text-white px-3 py-2 rounded-lg font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Reservar</span>
                </button>
              </div>
            </div>
          )}

          {activeClient.tipo === 'FLEXIBLE' && (
            <div className="pt-2 border-t border-zinc-100">
              <p className="text-zinc-550 italic text-[11px] leading-relaxed">
                * Nota: El socio es de membresía **FLEXIBLE**. Los socios flexibles no poseen turnos semanales fijos, sino que reservan de forma individual cada clase según disponibilidad de la agenda general.
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
