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

const DIAS_ORDEN = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

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

  // Filter turnos to list only those NOT already assigned as fixed, sorted logically by day and time
  const turnosDisponibles = turnos
    .filter(t => !activeClient.turnos_fijos.includes(t.id))
    .sort((a, b) => {
      const diaA = DIAS_ORDEN.indexOf(a.dia);
      const diaB = DIAS_ORDEN.indexOf(b.dia);
      if (diaA !== diaB) return diaA - diaB;
      return a.hora.localeCompare(b.hora);
    });

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
            className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs font-sans">
          
          {turnosModalError && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{turnosModalError}</span>
            </div>
          )}

          {turnosModalSuccess && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{turnosModalSuccess}</span>
            </div>
          )}

          {/* Plan stats */}
          <div className="bg-zinc-50 border border-zinc-200/80 p-3 rounded-xl text-[11px] text-zinc-600 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-zinc-800">Plan: <strong className="text-zinc-950">{plan ? plan.nombre : 'Plan base'}</strong></span>
              <span className="bg-zinc-200 text-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {activeClient.turnos_fijos.length} / {plan ? plan.dias_por_semana : 5} asignados
              </span>
            </div>
            <p className="text-zinc-500 text-[10px] pt-0.5">
              Permite hasta {plan ? plan.dias_por_semana : 5} días fijos semanales asignados.
            </p>
          </div>

          {/* Turnos asignados fijos */}
          <div className="space-y-2">
            <span className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest block font-sans">Turnos fijos reservados</span>
            {activeClient.turnos_fijos.length === 0 ? (
              <p className="text-zinc-400 italic text-[11px] py-1 bg-zinc-50/50 p-2.5 rounded-lg border border-dashed border-zinc-200 text-center">
                Sin horarios semanales asignados actualmente.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-0.5">
                {activeClient.turnos_fijos.map(tFid => (
                  <div key={tFid} className="bg-zinc-50 border border-zinc-200 py-2 px-3 rounded-lg flex justify-between items-center text-zinc-900 text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{tFid.split('-')[0]} — {tFid.split('-')[1]} hs</span>
                    </span>
                    <button
                      onClick={() => {
                        removerAsignacionFija(activeClient.id, tFid);
                        setTurnosModalSuccess('Horario fijo removido con éxito.');
                        setTurnosModalError('');
                        setTimeout(() => setTurnosModalSuccess(''), 2000);
                      }}
                      className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 hover:bg-red-100 rounded-md border border-red-100 transition-colors cursor-pointer text-[10px] font-bold"
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
          <div className="pt-3 border-t border-zinc-100 space-y-2">
            <span className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block font-sans">Asignar Nuevo Horario Semanal</span>
            <p className="text-zinc-400 text-[10px] leading-snug">
              Dejá los turnos sin asignar si el socio prefiere ubicarlos manualmente cada semana.
            </p>
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
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-lg font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors border border-transparent shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Asignar</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

