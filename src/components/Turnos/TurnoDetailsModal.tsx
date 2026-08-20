// src/components/Turnos/TurnoDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { X, Clock, Trash2, ListOrdered, Plus, ShieldCheck, AlertTriangle, History } from 'lucide-react';
import { SearchableSelect } from '../Common/SearchableSelect';
import { TurnosHistorialModal } from './TurnosHistorialModal';

interface TurnoDetailsModalProps {
  turnoId: string;
  onClose: () => void;
}

const PROFE_PRESETS = ['Juanchi', 'Rulo', 'Lucas', 'Denise'];

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
  const [cellActionWaitlist, setCellActionWaitlist] = useState('');
  // Reservas puntuales de otros socios que quedarian sobre el cupo al asignar un fijo.
  const [conflictoCupo, setConflictoCupo] = useState<{
    mensaje: string;
    fechas: Array<{ fecha: string; ocupacionActual: number; ocupacionConElFijo: number; cupo: number }>;
  } | null>(null);
  const [flexCheckInClientId, setFlexCheckInClientId] = useState('');
  const [localProfesor, setLocalProfesor] = useState('');
  const [mostrarOtroProfeInput, setMostrarOtroProfeInput] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);

  const selectedTurno = useMemo(() => {
    return turnos.find(t => t.id === turnoId) || null;
  }, [turnos, turnoId]);

  useEffect(() => {
    if (selectedTurno) {
      setNuevoCupoMaximo(selectedTurno.cupo_maximo.toString());
      setLocalProfesor(selectedTurno.profesor || '');
    }
  }, [selectedTurno]);

  const clientesActivos = useMemo(() => clientes.filter(c => c.activo), [clientes]);

  const optionsClientToAssign = useMemo(() => {
    return clientesActivos
      .filter(c => !c.turnos_fijos.includes(turnoId))
      .map(cl => {
        const clPlan = planes.find(p => p.id === cl.plan_id);
        const limitText = clPlan ? `${cl.turnos_fijos.length}/${clPlan.dias_por_semana}` : `${cl.turnos_fijos.length}/5`;
        return {
          value: cl.id,
          label: `${cl.apellido}, ${cl.nombre} (${limitText} turnos max)`,
          searchString: `${cl.nombre} ${cl.apellido}`
        };
      });
  }, [clientesActivos, planes, turnoId]);

  if (!selectedTurno) return null;

  // Assign Fijo handler
  const handleAssignFijo = (e: React.FormEvent | null, forzar = false) => {
    if (e) e.preventDefault();
    setCellActionError('');
    setCellActionSuccess('');
    setCellActionWaitlist('');

    if (!selectedClientToAssignId) {
      setCellActionError('Selecciona un alumno para asignarlo.');
      return;
    }

    const res = asignarClienteFijo(selectedClientToAssignId, turnoId, { forzar });

    // Reservas puntuales de otros socios quedarian sobre el cupo: decide el admin.
    if (!res.success && res.requiereConfirmacion) {
      setConflictoCupo({ mensaje: res.message, fechas: res.conflictos || [] });
      return;
    }
    setConflictoCupo(null);

    if (res.success) {
      if (res.putInWaitlist) {
        setCellActionWaitlist(res.message);
        setSelectedClientToAssignId('');
        setTimeout(() => setCellActionWaitlist(''), 6000);
      } else {
        setCellActionSuccess(res.message);
        setSelectedClientToAssignId('');
        setTimeout(() => setCellActionSuccess(''), 2000);
      }
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistorial(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors cursor-pointer border border-zinc-700"
              title="Ver historial de movimientos de este turno"
            >
              <History className="w-3.5 h-3.5 text-lime-400" />
              <span className="hidden sm:inline">Historial</span>
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {cellActionError && (
            <div className="bg-red-50 text-red-700 p-2.5 rounded-lg font-medium border border-red-200 text-[11px]">
              {cellActionError}
            </div>
          )}

          {cellActionWaitlist && (
            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-300 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-amber-900">⏳ Turno completo — agregado a lista de espera</p>
                <p>{cellActionWaitlist}</p>
                <p className="text-[10px] text-amber-600 mt-1">Podés revisar la lista de espera en el detalle del turno y resolver manualmente cuando se libere un lugar.</p>
              </div>
            </div>
          )}

          {conflictoCupo && (
            <div className="bg-orange-50 border border-orange-300 p-3 rounded-lg space-y-2.5 text-[11px]">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-orange-900">Este turno quedaría por encima del cupo</p>
                  <p className="text-orange-800">Hay reservas puntuales de otros socios en estas fechas:</p>
                </div>
              </div>
              <ul className="space-y-1 pl-6">
                {conflictoCupo.fechas.map(f => (
                  <li key={f.fecha} className="text-orange-900 font-mono">
                    {f.fecha.slice(8, 10)}/{f.fecha.slice(5, 7)} — quedaría <strong>{f.ocupacionConElFijo}</strong> sobre un cupo de {f.cupo}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConflictoCupo(null)}
                  className="flex-1 bg-white border border-zinc-300 text-zinc-700 font-bold py-2 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleAssignFijo(null, true)}
                  className="flex-1 bg-orange-600 text-white font-bold py-2 rounded-lg hover:bg-orange-700 transition-colors cursor-pointer border-none"
                >
                  Asignar igual
                </button>
              </div>
            </div>
          )}

          {cellActionSuccess && (
            <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-medium border border-emerald-300 text-[11px]">
              {cellActionSuccess}
            </div>
          )}

          {/* 1. PROFESOR FIJO */}
          <form onSubmit={handleSaveProfesor} className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[10px] text-zinc-500 uppercase tracking-widest block font-sans">
                Profesor Fijo / Clase
              </label>
              {localProfesor && (
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Asignado: {localProfesor}
                </span>
              )}
            </div>

            {/* Presets: Juanchi, Rulo, Lucas, Denise + Otro */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-1.5">
                {PROFE_PRESETS.map((profName) => {
                  const isSelected = localProfesor === profName && !mostrarOtroProfeInput;
                  return (
                    <button
                      key={profName}
                      type="button"
                      onClick={() => {
                        setLocalProfesor(profName);
                        setMostrarOtroProfeInput(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-black text-white border-black shadow-xs'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      👤 {profName}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setMostrarOtroProfeInput(true);
                    if (PROFE_PRESETS.includes(localProfesor)) {
                      setLocalProfesor('');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    mostrarOtroProfeInput || (!PROFE_PRESETS.includes(localProfesor) && localProfesor !== '')
                      ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs'
                      : 'bg-white text-zinc-600 border-dashed border-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  + Agregar otro profe
                </button>
              </div>

              {/* Input si se selecciona "Agregar otro profe" o tiene un profesor personalizado */}
              {(mostrarOtroProfeInput || (!PROFE_PRESETS.includes(localProfesor) && localProfesor !== '')) && (
                <div className="pt-1">
                  <input
                    type="text"
                    placeholder="Escribí el nombre del profesor..."
                    value={localProfesor}
                    onChange={(e) => setLocalProfesor(e.target.value)}
                    className="w-full border border-zinc-300 rounded-lg p-2 bg-white outline-hidden text-xs font-medium"
                    id="input-custom-profesor-name"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-zinc-200/60">
              {localProfesor && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalProfesor('');
                    setMostrarOtroProfeInput(false);
                    asignarProfesorTurno(turnoId, '');
                    setCellActionSuccess('Profesor desasignado.');
                  }}
                  className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 rounded-lg text-xs font-semibold px-3 py-1.5 cursor-pointer border-none"
                >
                  Quitar Profesor
                </button>
              )}
              <button
                type="submit"
                className="bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold px-4 py-1.5 cursor-pointer transition-colors border-none shadow-xs"
              >
                Guardar Profesor
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
                        onClick={() => {
                          if (window.confirm(`¿Está seguro que desea eliminar a este cliente de sus turnos FIJOS?`)) {
                            removerAsignacionFija(cId, turnoId);
                          }
                        }}
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
              <label className="font-bold text-[10px] text-zinc-600 uppercase tracking-widest block font-sans">Reservar Horario Fijo</label>
              <div className="space-y-2">
                <SearchableSelect
                  options={optionsClientToAssign}
                  value={selectedClientToAssignId}
                  onChange={setSelectedClientToAssignId}
                  placeholder="-- Buscar y seleccionar socio --"
                  noOptionsText="No se encontraron socios disponibles"
                />

                {selectedClientToAssignId && (
                  <div className="bg-zinc-900 text-white p-3 rounded-xl border border-zinc-800 space-y-2 animate-scale-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium">Socio a Asignar:</span>
                      <strong className="text-lime-400">
                        {clientes.find(c => c.id === selectedClientToAssignId)?.apellido}, {clientes.find(c => c.id === selectedClientToAssignId)?.nombre}
                      </strong>
                    </div>

                    <div className={`p-2 rounded-lg text-[11px] leading-tight ${
                      selectedTurno.asignados_ids.length >= selectedTurno.cupo_maximo
                        ? 'bg-amber-950/70 border border-amber-500/50 text-amber-200'
                        : 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-200'
                    }`}>
                      {selectedTurno.asignados_ids.length >= selectedTurno.cupo_maximo
                        ? `⏳ Turno completo (${selectedTurno.asignados_ids.length}/${selectedTurno.cupo_maximo}). Se registrará en la Lista de Espera de este horario.`
                        : `🟢 Hay cupo (${selectedTurno.asignados_ids.length}/${selectedTurno.cupo_maximo}). Se asignará como turno semanal fijo.`}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedClientToAssignId('')}
                        className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-colors cursor-pointer border-none"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className={`flex-2 py-2 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none shadow-md ${
                          selectedTurno.asignados_ids.length >= selectedTurno.cupo_maximo
                            ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950'
                            : 'bg-lime-400 hover:bg-lime-300 text-zinc-950'
                        }`}
                        id="btn-confirmar-fijo"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Confirmar Asignación</span>
                      </button>
                    </div>
                  </div>
                )}
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

      {/* MODAL HISTORIAL DE MOVIMIENTOS PREFILTRADO */}
      <TurnosHistorialModal
        isOpen={showHistorial}
        onClose={() => setShowHistorial(false)}
        filtroTurnoIdInicial={turnoId}
      />
    </div>
  );
};
