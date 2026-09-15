// src/components/Clientes/ClienteTurnosModal.tsx
import React, { useState, useEffect } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { X, AlertCircle, CheckCircle, Calendar, Plus, AlertTriangle, ChevronUp, ArrowLeftRight } from 'lucide-react';
import { calcularDiferenciaPlan } from '../../lib/calculoDeuda';

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
  const [turnosModalWaitlist, setTurnosModalWaitlist] = useState<string>('');
  // Conflicto de cupo: reservas puntuales de otros socios que quedarian por encima
  // del limite si se asigna este fijo. El admin decide, no el sistema.
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
  const [selectedNuevoPlanId, setSelectedNuevoPlanId] = useState<string>('');
  const [imputarDiferenciaDeuda, setImputarDiferenciaDeuda] = useState<boolean>(true);
  const [reemplazarTurnoId, setReemplazarTurnoId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTurnoToAssign('');
      setTurnosModalError('');
      setTurnosModalSuccess('');
      setTurnosModalWaitlist('');
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

  const handleAssignTurno = (forzar = false) => {
    setTurnosModalError('');
    setTurnosModalSuccess('');
    setTurnosModalWaitlist('');

    if (!selectedTurnoToAssign) {
      setTurnosModalError('Por favor selecciona un horario de la grilla.');
      return;
    }

    const res = asignarClienteFijo(activeClient.id, selectedTurnoToAssign, { forzar });

    // Si excede el plan, abrir el modal interactivo de decisión
    if (!res.success && res.excedePlan) {
      const diasNecesarios = (res.maxDias || 0) + 1;
      const planSugerido = planes.find(p => p.id !== 'p-none' && p.dias_por_semana >= diasNecesarios) || planes.find(p => p.id !== 'p-none');
      setSelectedNuevoPlanId(planSugerido?.id || '');
      setImputarDiferenciaDeuda(true);
      setConflictoPlan({
        clienteId: activeClient.id,
        clienteNombre: res.clienteNombre || `${activeClient.nombre} ${activeClient.apellido}`,
        turnosFijosActuales: res.turnosFijosActuales || [],
        maxDias: res.maxDias || 0,
        nuevoMaxDias: diasNecesarios,
        planActualId: activeClient.plan_id
      });
      setReemplazarTurnoId('');
      return;
    }
    setConflictoPlan(null);

    // El turno tiene reservas puntuales de OTROS socios que quedarían sobre el cupo.
    // No se decide solo: se le muestra al admin y él elige.
    if (!res.success && res.requiereConfirmacion) {
      setConflictoCupo({ mensaje: res.message, fechas: res.conflictos || [] });
      return;
    }
    setConflictoCupo(null);

    if (res.success) {
      if (res.putInWaitlist) {
        setTurnosModalWaitlist(res.message);
        setSelectedTurnoToAssign('');
        setTimeout(() => setTurnosModalWaitlist(''), 8000);
      } else {
        setTurnosModalSuccess(res.message);
        setSelectedTurnoToAssign('');
        setTimeout(() => setTurnosModalSuccess(''), 2000);
      }
    } else {
      setTurnosModalError(res.message);
    }
  };

  const handleConfirmarAmpliarPlan = () => {
    if (!conflictoPlan || !selectedNuevoPlanId || !selectedTurnoToAssign) return;
    const res = asignarClienteFijo(conflictoPlan.clienteId, selectedTurnoToAssign, {
      nuevoPlanId: selectedNuevoPlanId,
      imputarDiferenciaDeuda
    });
    setConflictoPlan(null);
    if (res.success) {
      if (res.putInWaitlist) {
        setTurnosModalWaitlist(res.message);
      } else {
        setTurnosModalSuccess(res.message);
      }
      setSelectedTurnoToAssign('');
      setTimeout(() => { setTurnosModalSuccess(''); setTurnosModalWaitlist(''); }, 3500);
    } else {
      setTurnosModalError(res.message);
    }
  };

  const handleReemplazarTurno = () => {
    if (!conflictoPlan || !reemplazarTurnoId || !selectedTurnoToAssign) return;
    const res = asignarClienteFijo(conflictoPlan.clienteId, selectedTurnoToAssign, { reemplazarTurnoId });
    setConflictoPlan(null);
    setReemplazarTurnoId('');
    if (res.success) {
      if (res.putInWaitlist) {
        setTurnosModalWaitlist(res.message);
      } else {
        setTurnosModalSuccess(`Turno reemplazado y asignado exitosamente.`);
      }
      setSelectedTurnoToAssign('');
      setTimeout(() => { setTurnosModalSuccess(''); setTurnosModalWaitlist(''); }, 3000);
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

          {turnosModalWaitlist && (
            <div className="bg-amber-50 text-amber-800 p-3 rounded-lg border border-amber-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-amber-900 text-[11px]">⏳ Turno completo — agregado a lista de espera</p>
                <p className="text-[11px]">{turnosModalWaitlist}</p>
                <p className="text-[10px] text-amber-600">Revisá la lista de espera del turno en la Matriz Fija para resolver cuando se libere un lugar.</p>
              </div>
            </div>
          )}

          {turnosModalSuccess && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg flex items-center gap-2 border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{turnosModalSuccess}</span>
            </div>
          )}

          {/* Conflicto de cupo: el turno tiene reservas puntuales de otros socios.
              Se le muestra al admin con las fechas exactas y decide él. */}
          {conflictoCupo && (
            <div className="bg-orange-50 border border-orange-300 p-3 rounded-lg space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-orange-900 text-[11px]">Este turno quedaría por encima del cupo</p>
                  <p className="text-[11px] text-orange-800">
                    Hay reservas puntuales de otros socios en estas fechas:
                  </p>
                </div>
              </div>
              <ul className="space-y-1 pl-6">
                {conflictoCupo.fechas.map(f => (
                  <li key={f.fecha} className="text-[11px] text-orange-900 font-mono">
                    {f.fecha.slice(8, 10)}/{f.fecha.slice(5, 7)} — quedaría <strong>{f.ocupacionConElFijo}</strong> sobre un cupo de {f.cupo}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 pt-0.5">
                <button
                  onClick={() => setConflictoCupo(null)}
                  className="flex-1 bg-white border border-zinc-300 text-zinc-700 text-[11px] font-bold py-2 rounded-lg hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleAssignTurno(true)}
                  className="flex-1 bg-orange-600 text-white text-[11px] font-bold py-2 rounded-lg hover:bg-orange-700 transition-colors cursor-pointer border-none"
                >
                  Asignar igual
                </button>
              </div>
              <p className="text-[10px] text-orange-600 pl-6">
                Si asignás igual, esas fechas quedan sobre el cupo. Después podés cancelarle la reserva puntual al socio desde la Turnera de Tiempo Real.
              </p>
            </div>
          )}

          {/* Plan stats */}
          <div className="bg-zinc-50 border border-zinc-200/80 p-3 rounded-xl text-[11px] text-zinc-600 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-zinc-800">Plan: <strong className="text-zinc-950">{activeClient.dias_personalizados != null ? 'Personalizado' : (plan ? plan.nombre : 'Plan base')}</strong></span>
              <span className="bg-zinc-200 text-zinc-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                {activeClient.turnos_fijos.length} / {activeClient.dias_personalizados ?? (plan ? plan.dias_por_semana : 5)} asignados
              </span>
            </div>
            <p className="text-zinc-500 text-[10px] pt-0.5">
              Permite hasta {activeClient.dias_personalizados ?? (plan ? plan.dias_por_semana : 5)} días fijos semanales asignados.
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
                {[...activeClient.turnos_fijos]
                  .sort((a, b) => {
                    const diaA = DIAS_ORDEN.indexOf(a.split('-')[0]);
                    const diaB = DIAS_ORDEN.indexOf(b.split('-')[0]);
                    if (diaA !== diaB) return diaA - diaB;
                    return (a.split('-')[1] || '').localeCompare(b.split('-')[1] || '');
                  })
                  .map(tFid => (
                  <div key={tFid} className="bg-zinc-50 border border-zinc-200 py-2 px-3 rounded-lg flex justify-between items-center text-zinc-900 text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{tFid.split('-')[0]} — {tFid.split('-')[1]} hs</span>
                    </span>
                    <button
                      onClick={() => {
                        if (window.confirm(`¿Está seguro que desea eliminar a este cliente de sus turnos FIJOS?`)) {
                          removerAsignacionFija(activeClient.id, tFid);
                          setTurnosModalSuccess('Horario fijo removido con éxito.');
                          setTurnosModalError('');
                          setTimeout(() => setTurnosModalSuccess(''), 2000);
                        }
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
                onClick={() => handleAssignTurno(false)}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-3.5 py-2 rounded-lg font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors border border-transparent shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Asignar</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* MODAL DIÁLOGO DE CONFLICTO DE PLAN */}
      {conflictoPlan && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs animate-fade-in" id="cliente-conflicto-plan-modal">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden relative animate-scale-up max-h-[92vh] flex flex-col">
            <div className="bg-zinc-950 text-white p-5 flex items-start justify-between border-b border-zinc-800">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white tracking-tight">Límite de Cupos Semanales Alcanzado</h4>
                  <p className="text-xs text-zinc-400 mt-0.5">Socio: <strong className="text-lime-400">{conflictoPlan.clienteNombre}</strong></p>
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

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-900 text-xs leading-relaxed">
                <p>
                  <strong>{conflictoPlan.clienteNombre}</strong> tiene actualmente contratado el <strong>{planes.find(p => p.id === conflictoPlan.planActualId)?.nombre || 'Plan de ' + conflictoPlan.maxDias + ' días'}</strong> ({conflictoPlan.maxDias} días por semana) y ya los tiene cubiertos.
                </p>
                <p className="mt-1 text-amber-800">
                  Al asignarle este nuevo turno, pasará a tener <strong>{conflictoPlan.nuevoMaxDias} turnos por semana</strong>.
                </p>
              </div>

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
                      <span>Opción 1: Ampliar a Plan de {conflictoPlan.nuevoMaxDias} días o más (Recomendado)</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-700 block">Seleccionar nuevo plan:</label>
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

              <div className="border border-zinc-200 bg-zinc-50 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center gap-1.5 text-zinc-800 font-bold text-xs">
                  <ArrowLeftRight className="w-4 h-4 text-zinc-600" />
                  <span>Opción 2: Reemplazar un turno existente (Mantener {conflictoPlan.maxDias} días)</span>
                </div>
                <p className="text-zinc-500 text-[11px]">
                  Elegí cuál de sus turnos actuales quitar para reemplazarlo por el nuevo:
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
                          name="reemplazar-turno-modal-cliente"
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
    </div>
  );
};

