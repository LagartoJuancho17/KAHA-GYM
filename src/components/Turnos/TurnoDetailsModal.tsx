// src/components/Turnos/TurnoDetailsModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { X, Clock, Trash2, ListOrdered, Plus, ShieldCheck, AlertTriangle, History, ArrowLeftRight, ChevronUp } from 'lucide-react';
import { SearchableSelect } from '../Common/SearchableSelect';
import { TurnosHistorialModal } from './TurnosHistorialModal';
import { ordenarEsperaSemanal, esPrioritario } from '../../lib/listaEspera';

interface TurnoDetailsModalProps {
  turnoId: string;
  onClose: () => void;
}

const PROFE_PRESETS = ['Juanchi', 'Rulo', 'Lucas', 'Denise'];

export const TurnoDetailsModal: React.FC<TurnoDetailsModalProps> = ({ turnoId, onClose }) => {
  const { 
    turnos, clientes, planes, profesores,
    asignarClienteFijo, removerAsignacionFija, checkInFlexible, updateCliente,
    modificarPrecioOCupoTurno, asignarProfesorTurno, sociosPrioritarios
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
  const [conflictoPlan, setConflictoPlan] = useState<{
    clienteId: string;
    clienteNombre: string;
    turnosFijosActuales: string[];
    maxDias: number;
    nuevoMaxDias: number;
    planActualId?: string;
  } | null>(null);
  const [selectedNuevoPlanId, setSelectedNuevoPlanId] = useState('');
  const [imputarDiferenciaDeuda, setImputarDiferenciaDeuda] = useState(true);
  const [reemplazarTurnoId, setReemplazarTurnoId] = useState('');
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

  const optionsCheckInClient = useMemo(() => {
    return clientesActivos.map(cl => {
      const pl = planes.find(p => p.id === cl.plan_id);
      return {
        value: cl.id,
        label: `${cl.apellido}, ${cl.nombre} (${pl ? pl.nombre : 'Sin plan'})`,
        searchString: `${cl.nombre} ${cl.apellido}`
      };
    });
  }, [clientesActivos, planes]);

  if (!selectedTurno) return null;

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

    // El plan del socio no permite más días: mostramos el popup modal de resolución.
    if (!res.success && res.excedePlan) {
      const socio = clientes.find(c => c.id === selectedClientToAssignId);
      const diasNecesarios = (res.maxDias || 0) + 1;
      const planSugerido = planes.find(p => p.id !== 'p-none' && p.dias_por_semana >= diasNecesarios) || planes.find(p => p.id !== 'p-none');
      setSelectedNuevoPlanId(planSugerido?.id || '');
      setImputarDiferenciaDeuda(true);
      setConflictoPlan({
        clienteId: selectedClientToAssignId,
        clienteNombre: res.clienteNombre || '',
        turnosFijosActuales: res.turnosFijosActuales || [],
        maxDias: res.maxDias || 0,
        nuevoMaxDias: diasNecesarios,
        planActualId: socio?.plan_id
      });
      setReemplazarTurnoId('');
      return;
    }
    setConflictoPlan(null);

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
        setTimeout(() => setCellActionSuccess(''), 3000);
      }
    } else {
      setCellActionError(res.message);
    }
  };

  /** Ampliar plan con nuevo plan y asignar directamente registrando la deuda */
  const handleConfirmarAmpliarPlan = () => {
    if (!conflictoPlan || !selectedNuevoPlanId) return;

    const res = asignarClienteFijo(conflictoPlan.clienteId, turnoId, {
      nuevoPlanId: selectedNuevoPlanId,
      imputarDiferenciaDeuda
    });

    setConflictoPlan(null);

    if (res.success && !res.putInWaitlist) {
      setCellActionSuccess(res.message);
      setSelectedClientToAssignId('');
      setTimeout(() => setCellActionSuccess(''), 4000);
    } else if (res.success && res.putInWaitlist) {
      setCellActionWaitlist(res.message);
      setSelectedClientToAssignId('');
      setTimeout(() => setCellActionWaitlist(''), 6000);
    } else {
      setCellActionError(res.message);
    }
  };

  /** Swap: reemplazar un fijo existente por el nuevo */
  const handleReemplazarTurno = () => {
    if (!conflictoPlan || !reemplazarTurnoId) return;
    const res = asignarClienteFijo(conflictoPlan.clienteId, turnoId, { reemplazarTurnoId });
    setConflictoPlan(null);
    setReemplazarTurnoId('');
    if (res.success && !res.putInWaitlist) {
      setCellActionSuccess(`Turno reemplazado y ${turnoId} asignado exitosamente.`);
      setSelectedClientToAssignId('');
      setTimeout(() => setCellActionSuccess(''), 3000);
    } else if (res.success && res.putInWaitlist) {
      setCellActionWaitlist(`El turno viejo NO se quitó: ${turnoId} está completo. ${res.message}`);
      setSelectedClientToAssignId('');
      setTimeout(() => setCellActionWaitlist(''), 6000);
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
                  {/* Mismo orden que usa la promocion automatica: VIP primero.
                      Si la pantalla mostrara otro orden, entraria alguien distinto
                      del que el admin ve arriba de todo. */}
                  {ordenarEsperaSemanal(selectedTurno.lista_espera_ids, turnoId, sociosPrioritarios).map((cId, idx) => {
                    const cl = clientes.find(c => c.id === cId);
                    if (!cl) return null;
                    const vip = esPrioritario(cId, turnoId, sociosPrioritarios);
                    return (
                      <div key={cl.id} className={`flex justify-between items-center p-2 rounded-lg ${vip ? 'bg-violet-50 border border-violet-300' : 'bg-amber-50/50 border border-amber-100'}`}>
                        <span className={`font-mono text-[10px] px-1 rounded-sm font-bold ${vip ? 'bg-violet-200 text-violet-900' : 'bg-amber-100 text-amber-800'}`}>P{idx + 1}</span>
                        <span className="font-semibold text-zinc-800 flex-1 ml-2">
                          {cl.nombre} {cl.apellido}
                          {vip && <span className="ml-1.5 text-[9px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full">PRIORIDAD</span>}
                        </span>
                        <div className="flex items-center gap-1">
                          {selectedTurno.asignados_ids.length < selectedTurno.cupo_maximo && (
                            <button
                              type="button"
                              onClick={() => {
                                asignarClienteFijo(cId, turnoId);
                              }}
                              className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs cursor-pointer border-none transition-all"
                              title="Asignar cupo fijo a este socio"
                            >
                              Promover
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Está seguro que desea retirar a ${cl.nombre} ${cl.apellido} de la lista de espera de este turno?`)) {
                                removerAsignacionFija(cId, turnoId);
                              }
                            }}
                            className="text-zinc-400 hover:text-red-600 p-1 hover:bg-amber-100/70 rounded transition-colors cursor-pointer border-none bg-transparent"
                            title="Retirar de la lista de espera"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

                    {(() => {
                      const socio = clientes.find(c => c.id === selectedClientToAssignId);
                      const pl = planes.find(p => p.id === socio?.plan_id);
                      const maxD = socio?.dias_personalizados ?? (pl ? pl.dias_por_semana : 2);
                      const diasU = new Set((socio?.turnos_fijos || []).map(tId => tId.split('-')[0]));
                      const esMismoD = selectedTurno.dia && diasU.has(selectedTurno.dia);
                      const excede = !esMismoD && diasU.size >= maxD;
                      if (!excede) return null;
                      return (
                        <div className="bg-violet-950/80 border border-violet-500/50 p-2.5 rounded-lg text-[11px] text-violet-200 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-violet-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Cupo semanal completo ({diasU.size}/{maxD} turnos)</span>
                          </div>
                          <p className="text-[10px] text-violet-300/90 leading-tight">
                            Al confirmar se abrirá la opción para ampliar a un plan de {diasU.size + 1} días e imputar la diferencia de deuda, o reemplazar un turno.
                          </p>
                        </div>
                      );
                    })()}

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
                <SearchableSelect
                  options={optionsCheckInClient}
                  value={flexCheckInClientId}
                  onChange={setFlexCheckInClientId}
                  placeholder="-- Buscar y seleccionar alumno --"
                  noOptionsText="No se encontraron socios"
                />
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

      {/* MODAL DIÁLOGO DE CONFLICTO DE PLAN (SUPERPUESTO CENTRADO) */}
      {conflictoPlan && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs animate-fade-in" id="modal-conflicto-plan">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden relative animate-scale-up max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="bg-zinc-950 text-white p-5 flex items-start justify-between border-b border-zinc-800">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white tracking-tight">Límite de Cupos Semanales Alcanzado</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Socia: <strong className="text-lime-400">{conflictoPlan.clienteNombre}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConflictoPlan(null)}
                className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-900 text-xs leading-relaxed">
                <p>
                  <strong>{conflictoPlan.clienteNombre}</strong> tiene actualmente contratado el <strong>{planes.find(p => p.id === conflictoPlan.planActualId)?.nombre || 'Plan de ' + conflictoPlan.maxDias + ' días'}</strong> ({conflictoPlan.maxDias} días por semana) y ya los tiene cubiertos.
                </p>
                <p className="mt-1 text-amber-800">
                  Al sumarla a este turno (<strong>{selectedTurno.dia} {selectedTurno.hora} hs</strong>), pasará a tener <strong>{conflictoPlan.nuevoMaxDias} turnos por semana</strong>.
                </p>
              </div>

              {/* OPCIÓN 1: Ampliar a nuevo plan con imputación de deuda */}
              {(() => {
                const planActual = planes.find(p => p.id === conflictoPlan.planActualId);
                const planNuevo = planes.find(p => p.id === selectedNuevoPlanId);
                const precioActual = planActual ? Number(planActual.precio) : 0;
                const precioNuevo = planNuevo ? Number(planNuevo.precio) : 0;
                const diferencia = Math.max(0, precioNuevo - precioActual);

                return (
                  <div className="border border-violet-200 bg-violet-50/60 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-violet-950 font-bold text-xs">
                      <ChevronUp className="w-4 h-4 text-violet-600" />
                      <span>Opción 1: Ampliar a un Plan de {conflictoPlan.nuevoMaxDias} días o más (Recomendado)</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-700 block">Seleccionar nuevo plan para la socia:</label>
                      <select
                        value={selectedNuevoPlanId}
                        onChange={e => setSelectedNuevoPlanId(e.target.value)}
                        className="w-full bg-white border border-violet-300 rounded-lg p-2 text-xs font-semibold text-zinc-900 focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        {planes.filter(p => p.id !== 'p-none').map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} ({p.dias_por_semana} días/sem) — ${p.precio.toLocaleString('es-AR')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Resumen de costos y diferencia de deuda */}
                    <div className="bg-white rounded-lg p-3 border border-violet-200 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-zinc-600">
                        <span>Plan actual ({planActual?.nombre || 'Actual'}):</span>
                        <span className="font-semibold">${precioActual.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="flex justify-between items-center text-zinc-600">
                        <span>Nuevo plan ({planNuevo?.nombre || 'Nuevo'}):</span>
                        <span className="font-semibold text-zinc-900">${precioNuevo.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="border-t border-zinc-100 pt-2 flex justify-between items-center font-bold text-violet-900">
                        <span>Diferencia a imputar como deuda:</span>
                        <span className="text-sm font-black text-violet-700">
                          {diferencia > 0 ? `+$${diferencia.toLocaleString('es-AR')}` : '$0'}
                        </span>
                      </div>

                      {diferencia > 0 && (
                        <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-[11px] text-zinc-700 font-medium">
                          <input
                            type="checkbox"
                            checked={imputarDiferenciaDeuda}
                            onChange={e => setImputarDiferenciaDeuda(e.target.checked)}
                            className="rounded text-violet-600 focus:ring-violet-500 w-4 h-4 cursor-pointer"
                          />
                          <span>Imputar automáticamente los <strong>${diferencia.toLocaleString('es-AR')}</strong> como deuda en su cuenta</span>
                        </label>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmarAmpliarPlan}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer border-none"
                    >
                      <Plus className="w-4 h-4" />
                      <span>
                        Confirmar Ampliación a {planNuevo?.nombre || 'Nuevo Plan'} {imputarDiferenciaDeuda && diferencia > 0 ? `(+$${diferencia.toLocaleString('es-AR')})` : ''} y Asignar
                      </span>
                    </button>
                  </div>
                );
              })()}

              {/* OPCIÓN 2: Reemplazar un turno existente (Swap) */}
              <div className="border border-zinc-200 bg-zinc-50 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs">
                  <ArrowLeftRight className="w-4 h-4 text-zinc-600" />
                  <span>Opción 2: Reemplazar un turno existente (Mantener {conflictoPlan.maxDias} días)</span>
                </div>
                <p className="text-zinc-500 text-[11px]">
                  Si no desea cambiar su plan ni pagar un adicional, podés quitarle uno de sus turnos actuales y poner este en su lugar:
                </p>

                <div className="space-y-1.5">
                  {conflictoPlan.turnosFijosActuales.map(tId => {
                    const t = turnos.find(x => x.id === tId);
                    const label = t ? `${t.dia} — ${t.hora} hs` : tId;
                    return (
                      <label
                        key={tId}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                          reemplazarTurnoId === tId
                            ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reemplazar-turno-modal"
                          value={tId}
                          checked={reemplazarTurnoId === tId}
                          onChange={() => setReemplazarTurnoId(tId)}
                          className="accent-lime-400"
                        />
                        <span className="text-xs">{label}</span>
                      </label>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={!reemplazarTurnoId}
                  onClick={handleReemplazarTurno}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Reemplazar Turno Seleccionado y Asignar</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-zinc-100 p-4 border-t border-zinc-200 flex justify-end">
              <button
                type="button"
                onClick={() => setConflictoPlan(null)}
                className="px-4 py-2 bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Cancelar y volver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE MOVIMIENTOS PREFILTRADO */}
      <TurnosHistorialModal
        isOpen={showHistorial}
        onClose={() => setShowHistorial(false)}
        filtroTurnoIdInicial={turnoId}
      />
    </div>
  );
};
