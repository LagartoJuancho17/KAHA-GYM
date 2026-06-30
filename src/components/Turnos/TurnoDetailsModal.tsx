// src/components/Turnos/TurnoDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { X, Clock, Trash2, ListOrdered, Plus, ShieldCheck } from 'lucide-react';

interface TurnoDetailsModalProps {
  turnoId: string;
  onClose: () => void;
}

export const TurnoDetailsModal: React.FC<TurnoDetailsModalProps> = ({ turnoId, onClose }) => {
  const { 
    turnos, clientes, planes, profesores,
    asignarClienteFijo, removerAsignacionFija, checkInFlexible, 
    modificarPrecioOCupoTurno, asignarProfesorTurno
  } = useGym();

  const [selectedClientToAssignId, setSelectedClientToAssignId] = useState('');
  const [nuevoCupoMaximo, setNuevoCupoMaximo] = useState('');
  const [cellActionError, setCellActionError] = useState('');
  const [cellActionSuccess, setCellActionSuccess] = useState('');
  const [flexCheckInClientId, setFlexCheckInClientId] = useState('');
  const [localProfesor, setLocalProfesor] = useState('');

  const selectedTurno = useMemo(() => {
    return turnos.find(t => t.id === turnoId) || null;
  }, [turnos, turnoId]);

  useEffect(() => {
    if (selectedTurno) {
      setNuevoCupoMaximo(selectedTurno.cupo_maximo.toString());
      setLocalProfesor(selectedTurno.profesor || '');
    }
  }, [selectedTurno]);

  if (!selectedTurno) return null;

  const clientesActivos = clientes.filter(c => c.activo);

  // Assign Fijo handler
  const handleAssignFijo = (e: React.FormEvent) => {
    e.preventDefault();
    setCellActionError('');
    setCellActionSuccess('');

    if (!selectedClientToAssignId) {
      setCellActionError('Selecciona un alumno para asignarlo.');
      return;
    }

    const res = asignarClienteFijo(selectedClientToAssignId, turnoId);
    if (res.success) {
      setCellActionSuccess(res.message);
      setSelectedClientToAssignId('');
      setTimeout(() => setCellActionSuccess(''), 2000);
    } else {
      setCellActionError(res.message);
    }
  };

  // CheckIn Flexible helper
  const handleFlexCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    setCellActionError('');
    setCellActionSuccess('');

    if (!flexCheckInClientId) return;

    const res = checkInFlexible(flexCheckInClientId, turnoId);
    if (res.success) {
      setCellActionSuccess(res.message);
      setFlexCheckInClientId('');
      setTimeout(() => setCellActionSuccess(''), 2500);
    } else {
      setCellActionError(res.message);
    }
  };

  // Change Capacity Handler
  const handleSaveCupo = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCupo = parseInt(nuevoCupoMaximo);
    if (isNaN(parsedCupo) || parsedCupo <= 0) {
      setCellActionError('El cupo de asistencia debe ser una cantidad numérica mayor a 0.');
      return;
    }

    modificarPrecioOCupoTurno(turnoId, parsedCupo);
    setCellActionSuccess(`Capacidad máxima actualizada a ${parsedCupo} cupos.`);
    setTimeout(() => setCellActionSuccess(''), 1500);
  };

  // Save Professor Handler
  const handleSaveProfesor = (e: React.FormEvent) => {
    e.preventDefault();
    asignarProfesorTurno(turnoId, localProfesor);
    setCellActionSuccess('Profesor actualizado con éxito.');
    setTimeout(() => setCellActionSuccess(''), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs" id="grilla-turno-modal">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden relative animate-scale-up max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" />
              {selectedTurno.dia} — {selectedTurno.hora} hs
            </h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">Gestión de Turno Semanal Fijo</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {cellActionError && (
            <div className="bg-red-50 text-red-700 p-2.5 rounded-lg font-medium border border-red-200 text-[11px]">
              {cellActionError}
            </div>
          )}

          {cellActionSuccess && (
            <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-medium border border-emerald-300 text-[11px]">
              {cellActionSuccess}
            </div>
          )}

          {/* 1. PROFESOR FIJO */}
          <form onSubmit={handleSaveProfesor} className="bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 space-y-2">
            <label className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block font-sans">Profesor Fijo / Clase</label>
            <div className="flex gap-2">
              {profesores.filter(p => p.activo).length > 0 ? (
                <select
                  value={localProfesor}
                  onChange={(e) => setLocalProfesor(e.target.value)}
                  className="border border-zinc-300 rounded-lg p-2 flex-1 bg-white outline-hidden text-xs font-medium"
                >
                  <option value="">— Sin asignar —</option>
                  {profesores.filter(p => p.activo).map(p => (
                    <option key={p.id} value={p.nombre}>{p.nombre}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ej: Prof. Juan"
                  value={localProfesor}
                  onChange={(e) => setLocalProfesor(e.target.value)}
                  className="border border-zinc-300 rounded-lg p-2 flex-1 bg-white outline-hidden text-xs"
                />
              )}
              <button
                type="submit"
                className="bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold px-3 py-2 cursor-pointer transition-colors border-none"
              >
                Guardar
              </button>
            </div>
          </form>

          {/* 2. ALUMNOS FIJOS ASIGNADOS */}
          <div className="space-y-3">
            <h4 className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest font-sans border-b border-zinc-100 pb-1.5">Miembros Fijos Asignados ({selectedTurno.asignados_ids.length})</h4>
            
            {selectedTurno.asignados_ids.length === 0 ? (
              <p className="text-zinc-400 italic text-[11px] py-1">Este turno no registra alumnos fijos asignados aún.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {selectedTurno.asignados_ids.map(cId => {
                  const cl = clientes.find(c => c.id === cId);
                  if (!cl) return null;
                  return (
                    <div key={cl.id} className="flex justify-between items-center p-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                      <span className="font-semibold text-zinc-900">{cl.apellido}, {cl.nombre}</span>
                      <button
                        onClick={() => removerAsignacionFija(cId, turnoId)}
                        className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md border border-red-100 cursor-pointer border-none"
                        title="Remover asignación permanente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* LISTA DE ESPERA */}
            {selectedTurno.lista_espera_ids.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5 text-zinc-400" />
                  <h5 className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest font-sans">Lista de Espera ({selectedTurno.lista_espera_ids.length})</h5>
                </div>
                <div className="space-y-1.5">
                  {selectedTurno.lista_espera_ids.map((cId, idx) => {
                    const cl = clientes.find(c => c.id === cId);
                    if (!cl) return null;
                    return (
                      <div key={cl.id} className="flex justify-between items-center p-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                        <span className="font-mono text-[10px] bg-amber-100 text-amber-800 px-1 rounded-sm font-bold">P{idx + 1}</span>
                        <span className="font-semibold text-zinc-800 flex-1 ml-2">{cl.nombre} {cl.apellido}</span>
                        <button
                          onClick={() => removerAsignacionFija(cId, turnoId)}
                          className="text-zinc-400 hover:text-zinc-800 cursor-pointer border-none bg-transparent"
                          title="Retirar de waitlist"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ASIGNAR SOCIO FIJO PERMANENTE */}
            <form onSubmit={handleAssignFijo} className="pt-2.5 space-y-2">
              <label className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block font-sans">Reservar Horario Fijo</label>
              <div className="flex gap-2">
                <select
                  value={selectedClientToAssignId}
                  onChange={(e) => setSelectedClientToAssignId(e.target.value)}
                  className="flex-1 border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
                >
                  <option value="">-- Elige un socio --</option>
                  {clientesActivos
                    .filter(c => !c.turnos_fijos.includes(turnoId))
                    .map(cl => {
                      const clPlan = planes.find(p => p.id === cl.plan_id);
                      return (
                        <option key={cl.id} value={cl.id}>
                          {cl.apellido}, {cl.nombre} ({cl.turnos_fijos.length}/{clPlan?.dias_por_semana || 5} turnos max)
                        </option>
                      );
                    })}
                </select>
                <button
                  type="submit"
                  className="bg-black hover:bg-zinc-800 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm border-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Asignar
                </button>
              </div>
            </form>
          </div>

          {/* 3. CHECK-IN DIARIO ALUMNO FLEXIBLE */}
          <form onSubmit={handleFlexCheckIn} className="border-t border-zinc-100 pt-4 space-y-3">
            <div className="space-y-1">
              <label className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest block font-sans">Asistencia de Alumno (Check-In Diario)</label>
              <p className="text-[10px] text-zinc-400 leading-normal">Permite registrar una asistencia libre/check-in para el día de hoy si hay vacantes físicas en este turno.</p>
              <div className="flex gap-2">
                <select
                  value={flexCheckInClientId}
                  onChange={(e) => setFlexCheckInClientId(e.target.value)}
                  className="flex-1 border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
                >
                  <option value="">-- Elige alumno --</option>
                  {clientesActivos.map(cl => (
                    <option key={cl.id} value={cl.id}>
                      {cl.apellido}, {cl.nombre} ({planes.find(p => p.id === cl.plan_id)?.nombre})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-bold text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
                  Check-In
                </button>
              </div>
            </div>
          </form>

          {/* 4. CUPO MÁXIMO */}
          <form onSubmit={handleSaveCupo} className="border-t border-zinc-100 pt-4 space-y-2.5">
            <label className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest block font-sans">Capacidad Máxima del Turno</label>
            <p className="text-[10px] text-zinc-400 leading-normal">Establece el cupo límite de alumnos que pueden asistir simultáneamente a este horario.</p>
            <div className="flex gap-2">
              <input
                type="number"
                required
                min="1"
                value={nuevoCupoMaximo}
                onChange={(e) => setNuevoCupoMaximo(e.target.value)}
                className="border border-zinc-300 rounded-lg p-2 w-20 text-center font-mono font-bold bg-white outline-hidden text-xs"
              />
              <button
                type="submit"
                className="flex-1 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold py-2 cursor-pointer transition-colors border-none"
              >
                Actualizar Cupo
              </button>
            </div>
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
