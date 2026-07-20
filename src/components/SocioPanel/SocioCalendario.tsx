// src/components/SocioPanel/SocioCalendario.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { ChevronLeft, ChevronRight, Info, Calendar, RefreshCw, X, Clock } from 'lucide-react';

interface SocioCalendarioProps {
  socio: Cliente;
  setSuccessMessage: (msg: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
}

export const SocioCalendario: React.FC<SocioCalendarioProps> = ({
  socio,
  setSuccessMessage,
  setErrorMessage
}) => {
  const {
    turnos, clientes, planes, waitlistReservas,
    crearReservaIndividual, cancelarReservaIndividual, suspenderClaseFija, agregarListaEsperaReserva, removerListaEsperaReserva
  } = useGym();

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [activeDays, setActiveDays] = useState<Set<'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES'>>(new Set(['LUNES']));
  const [bookingTurnId, setBookingTurnId] = useState<string | null>(null);
  const [reprogramTurnId, setReprogramTurnId] = useState<string | null>(null);

  const planSocio = useMemo(() => {
    return planes.find(p => p.id === socio.plan_id) || null;
  }, [planes, socio]);

  const paidMonth = useMemo(() => {
    return socio.ultimo_mes_pagado || new Date().toISOString().slice(0, 7);
  }, [socio]);

  const getWeekRange = (offset: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday + (offset * 7));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return { monday, sunday };
  };

  const isDateInSelectedWeek = (dateStr: string) => {
    const { monday, sunday } = getWeekRange(weekOffset);
    const date = new Date(dateStr + 'T12:00:00');
    return date >= monday && date <= sunday;
  };

  const getWeekRangeLabel = (offset: number) => {
    const { monday, sunday } = getWeekRange(offset);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    const startStr = monday.toLocaleDateString('es-AR', options);
    const endStr = sunday.toLocaleDateString('es-AR', options);
    return `${startStr} al ${endStr}`;
  };

  const getDatesOfWeekdayInMonth = (dayName: string, monthStr: string): string[] => {
    const daysMap = { 'DOMINGO': 0, 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3, 'JUEVES': 4, 'VIERNES': 5, 'SABADO': 6 };
    const targetDay = daysMap[dayName as keyof typeof daysMap] ?? 1;
    const [year, month] = monthStr.split('-').map(Number);
    
    const dates: string[] = [];
    const date = new Date(year, month - 1, 1);
    while (date.getMonth() === month - 1) {
      if (date.getDay() === targetDay) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
      }
      date.setDate(date.getDate() + 1);
    }
    return dates;
  };

  const getAvailableDatesForTurn = (dayName: string) => {
    const daysMap = { 'DOMINGO': 0, 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3, 'JUEVES': 4, 'VIERNES': 5, 'SABADO': 6 };
    const targetDay = daysMap[dayName as keyof typeof daysMap] ?? 1;
    const [year, month] = paidMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    const minDate = new Date(startOfMonth);
    minDate.setDate(minDate.getDate() - 15);
    const maxDate = new Date(endOfMonth);
    maxDate.setDate(maxDate.getDate() + 15);
    const dates: string[] = [];
    const current = new Date(minDate);
    while (current <= maxDate) {
      if (current.getDay() === targetDay) {
        const yyyy = current.getFullYear();
        const mm = String(current.getMonth() + 1).padStart(2, '0');
        const dd = String(current.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const getOccupiedCountOnDate = (turnoId: string, dateStr: string) => {
    const turn = turnos.find(t => t.id === turnoId);
    if (!turn) return 0;
    const fijosCount = turn.asignados_ids.length;
    const individualCount = clientes.reduce((acc, c) => {
      const bookingsOnDate = (c.reservas_individuales || []).filter(r => r.turno_id === turnoId && r.fecha === dateStr);
      return acc + bookingsOnDate.length;
    }, 0);
    return fijosCount + individualCount;
  };

  const turnosDelDia = useMemo(() => {
    const DIAS_ORDER = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
    const selected = activeDays.size > 0 ? activeDays : new Set(['LUNES']);
    return turnos
      .filter(t => selected.has(t.dia as any))
      .sort((a, b) => DIAS_ORDER.indexOf(a.dia) - DIAS_ORDER.indexOf(b.dia) || a.hora.localeCompare(b.hora));
  }, [turnos, activeDays]);

  const activeIndividualReservations = useMemo(() => {
    return (socio.reservas_individuales || []).filter(r => r.fecha.startsWith(paidMonth));
  }, [socio, paidMonth]);

  const suspendedClassesThisMonth = useMemo(() => {
    return (socio.clases_suspendidas || []).filter(s => s.fecha.startsWith(paidMonth));
  }, [socio, paidMonth]);

  const reintegratedSuspensionsCount = useMemo(() => {
    return suspendedClassesThisMonth.filter(s => s.reintegrado).length;
  }, [suspendedClassesThisMonth]);

  const totalMonthlySlots = useMemo(() => {
    if (!planSocio) return 12;
    return planSocio.dias_por_semana * 4;
  }, [planSocio]);

  const usedSlots = useMemo(() => {
    const totalFixedSlotsForMonth = socio.turnos_fijos.length * 4;
    return Math.max(0, totalFixedSlotsForMonth - reintegratedSuspensionsCount + activeIndividualReservations.length);
  }, [socio, reintegratedSuspensionsCount, activeIndividualReservations]);

  const availableSlots = useMemo(() => {
    return Math.max(0, totalMonthlySlots - usedSlots);
  }, [totalMonthlySlots, usedSlots]);

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6.5 lg:p-8 shadow-sm relative" id="socio-agenda-block">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_90%,rgba(16,185,129,0.01),transparent_40%)] pointer-events-none"></div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2 tracking-tight">
            <Calendar className="w-5.5 h-5.5 text-emerald-600" />
            INSCRIPCIONES Y HORARIOS DISPONIBLES
          </h2>
          <p className="text-slate-500 text-xs font-sans mt-1">
            Administra tus días de entrenamiento y reserva los cupos libres mensuales de tu plan.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 text-[10px] text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="w-2.5 h-2.5 bg-sky-200 border border-sky-400 rounded-full inline-block"></span> 
            <span className="text-slate-600 font-semibold">Tus Días Fijos</span>
          </span>
          <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="w-2.5 h-2.5 bg-emerald-200 border border-emerald-400 rounded-full inline-block"></span> 
            <span className="text-slate-600 font-semibold">Tus Reservas Individuales</span>
          </span>
        </div>
      </div>

      {/* MULTI-DAY SELECTION BANNER & SUMMARY */}
      <div className="mb-6 p-4 bg-sky-50/80 border border-sky-200 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-sky-600 text-white font-black text-[10px] flex items-center justify-center font-mono">
              {socio.turnos_fijos.length}
            </span>
            <h4 className="font-bold text-sky-950 text-xs uppercase tracking-wider font-mono">
              Selección Multi-Día de tu Plan ({socio.turnos_fijos.length} de {planSocio?.dias_por_semana || 5} días elegidos por semana)
            </h4>
          </div>
          <span className="text-[10px] font-mono font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-lg border border-sky-200">
            {planSocio?.nombre || 'Plan Estándar'}
          </span>
        </div>

        <p className="text-[11px] text-sky-900 font-sans leading-relaxed">
          Cada día que seleccionas de la grilla reserva automáticamente tu lugar fijo para todas las semanas del mes.
        </p>

        {socio.turnos_fijos.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1 border-t border-sky-200/60">
            <span className="text-[10px] text-sky-700 font-bold self-center font-mono">Días Semanales Confirmados:</span>
            {socio.turnos_fijos.map((tfId, idx) => {
              const turn = turnos.find(t => t.id === tfId);
              if (!turn) return null;
              return (
                <span key={tfId} className="text-[10px] font-mono font-bold text-sky-900 bg-white border border-sky-300 px-2.5 py-1 rounded-xl shadow-2xs flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 text-[9px] flex items-center justify-center font-black">{idx + 1}</span>
                  {turn.dia} {turn.hora.slice(0, 5)} hs
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* SUMMARY BOX */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-extrabold">1. Cupos Disponibles por Asignar este Mes</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${availableSlots > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <p className="text-lg font-black text-slate-800">
              {availableSlots} <span className="text-xs text-slate-500 font-medium">de {totalMonthlySlots} cupos totales</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-sans leading-normal">
            Puedes asignarlos libremente a cualquier horario con cupo en la grilla inferior.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-extrabold">2. Días Fijos Asignados</p>
          <div className="flex items-center gap-2">
            <p className="text-base font-black text-slate-800">
              {socio.turnos_fijos.length > 0 ? (
                <span>{socio.turnos_fijos.length} días fijos semanales <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded">({socio.turnos_fijos.length * 4}/{totalMonthlySlots} cupos)</span></span>
              ) : (
                <span className="text-slate-400 italic text-xs font-medium">No posees horarios fijos semanales (Flex)</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {socio.turnos_fijos.map(tfId => {
              const turn = turnos.find(t => t.id === tfId);
              if (!turn) return null;
              return (
                <span key={tfId} className="text-[9px] font-mono font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-3xs">
                  {turn.dia} {turn.hora.slice(0, 5)} hs
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ALL FIXED WARNING */}
      {availableSlots === 0 && usedSlots === totalMonthlySlots && (
        <div className="mb-8 p-4.5 bg-sky-50 border border-sky-100 rounded-2xl flex items-center gap-3">
          <Info className="w-5 h-5 text-sky-600 shrink-0" />
          <p className="text-[11px] text-sky-800 font-medium leading-relaxed font-sans">
            ¡Tienes todos tus cupos mensuales asignados de forma fija! Si deseas asistir en otro horario, puedes <strong>reprogramar</strong> tus sesiones haciendo click en "Reprogramar clase" en tus días fijos o desde el listado de sesiones en la pantalla de Inicio.
          </p>
        </div>
      )}

      {/* STICKY CONTAINER FOR WEEKLY NAVIGATION AND DAY TABS */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md -mx-6.5 px-6.5 lg:-mx-8 lg:px-8 pt-2 pb-5 border-b border-slate-100/85 space-y-4 mb-6 animate-fade-in" id="socio-sticky-header">
        {/* NAVEGACIÓN SEMANAL */}
        <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-2xl max-w-xl mx-auto" id="socio-week-navigation">
          <button
            onClick={() => {
              setWeekOffset(prev => prev - 1);
              setBookingTurnId(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Semana Anterior
          </button>
          <div className="text-center">
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest block font-mono">Semana Seleccionada</span>
            <span className="text-xs font-bold text-slate-800">
              {getWeekRangeLabel(weekOffset)}
            </span>
          </div>
          <button
            onClick={() => {
              setWeekOffset(prev => prev + 1);
              setBookingTurnId(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
          >
            Semana Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* DIAS CALENDARIO SELECTOR TAB BAR */}
        <div className="grid grid-cols-5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1 lg:max-w-xl mx-auto" id="socio-agenda-tabs">
          {(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const).map(dia => {
            const isActive = activeDays.has(dia);
            return (
              <button
                key={dia}
                onClick={() => {
                  setActiveDays(prev => {
                    const next = new Set(prev);
                    if (next.has(dia)) {
                      if (next.size > 1) next.delete(dia);
                    } else {
                      next.add(dia);
                    }
                    return next;
                  });
                  setBookingTurnId(null);
                  setReprogramTurnId(null);
                }}
                className={`py-3.5 text-center text-xs font-bold rounded-xl transition-all cursor-pointer select-none border ${
                  isActive 
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white border-transparent font-black scale-102 shadow-sm ring-2 ring-emerald-500/20' 
                    : 'text-slate-500 hover:text-slate-800 bg-transparent border-transparent hover:bg-white/50'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="font-mono uppercase text-[9px] tracking-wide">
                    {dia === 'MIERCOLES' ? 'MIÉ' : dia.slice(0, 3)}
                  </span>
                  <span className={`text-[7px] hidden md:inline tracking-wider mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>DIA</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {activeDays.size > 1 && (
        <div className="flex items-center justify-center mb-4">
          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            {activeDays.size} días seleccionados — tocá un día para deseleccionarlo
          </span>
        </div>
      )}

      {/* CONTENEDOR DE SLOTS */}
      <div className="space-y-8" id="socio-agenda-slots">
        {turnosDelDia.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 italic text-xs font-medium">No hay horarios configurados para los días seleccionados.</p>
          </div>
        ) : (
          (['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const)
            .filter(dia => activeDays.has(dia))
            .map(dia => {
              const turnosDelDiaFiltrado = turnosDelDia.filter(t => t.dia === dia);
              if (turnosDelDiaFiltrado.length === 0) return null;
              return (
                <div key={dia}>
                  {activeDays.size > 1 && (
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-px flex-1 bg-slate-200"></div>
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest font-mono bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        {dia === 'MIERCOLES' ? 'Miércoles' : dia.charAt(0) + dia.slice(1).toLowerCase()}
                      </span>
                      <div className="h-px flex-1 bg-slate-200"></div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {turnosDelDiaFiltrado.map(turno => {
                      const holdsMyFijo = socio.turnos_fijos.includes(turno.id);
                      const misReservasEnTurno = (socio.reservas_individuales || []).filter(r => r.turno_id === turno.id && isDateInSelectedWeek(r.fecha));
                      const holdsMyIndividual = misReservasEnTurno.length > 0;

                      return (
                        <div 
                          key={turno.id}
                          className={`p-3 sm:p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 sm:gap-4 select-none ${
                            holdsMyFijo 
                              ? 'bg-sky-50/40 border-sky-300 shadow-inner' 
                              : holdsMyIndividual 
                                ? 'bg-emerald-50/50 border-emerald-300 shadow-inner' 
                                : 'bg-slate-50/30 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className={`p-1.5 sm:p-2.5 rounded-xl border shrink-0 ${
                                holdsMyFijo 
                                  ? 'bg-sky-100 text-sky-700 border-sky-200' 
                                  : holdsMyIndividual 
                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                    : 'bg-white text-slate-500 border-slate-200'
                              }`}>
                                <Calendar className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                              </div>
                              <div>
                                <p className="text-sm sm:text-base font-black text-slate-800 tracking-tight">{turno.hora.slice(0, 5)} hs</p>
                                <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 sm:mt-1 font-medium leading-tight">
                                  Fijos: {turno.asignados_ids.length}
                                </p>
                                {holdsMyIndividual && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {misReservasEnTurno.map(res => (
                                      <span key={res.id} className="text-[8px] font-mono font-bold text-emerald-800 bg-emerald-100/50 border border-emerald-200 px-1.5 py-0.2 rounded">
                                        Reservado: {new Date(res.fecha + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {holdsMyFijo && (
                              <span className="text-[8px] bg-sky-100 text-sky-700 border border-sky-200 font-bold px-2 py-0.5 rounded-md uppercase tracking-widest font-mono shrink-0">
                                TU FIJO
                              </span>
                            )}
                            {holdsMyIndividual && !holdsMyFijo && (
                              <span className="text-[8px] bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-md uppercase tracking-widest font-mono shrink-0">
                                RESERVADO
                              </span>
                            )}
                          </div>

                          {/* Expandable Booking dates view */}
                          {bookingTurnId === turno.id && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 mt-2 animate-fade-in">
                              <p className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider">Fechas Disponibles:</p>
                              <div className="grid grid-cols-1 gap-2">
                                {getAvailableDatesForTurn(turno.dia).filter(isDateInSelectedWeek).map(dateStr => {
                                  const occupiedCount = getOccupiedCountOnDate(turno.id, dateStr);
                                  const isFullOnDate = occupiedCount >= turno.cupo_maximo;
                                  const inWaitlist = (waitlistReservas || []).some(
                                    w => w.cliente_id === socio.id && w.turno_id === turno.id && w.fecha === dateStr
                                  );
                                  
                                  const miReservaIndividualEnFecha = (socio.reservas_individuales || []).find(r => r.turno_id === turno.id && r.fecha === dateStr);

                                  const hasBooking = !!miReservaIndividualEnFecha ||
                                                     (socio.reservas_individuales || []).some(r => r.fecha === dateStr) ||
                                                     socio.turnos_fijos.some(tfId => {
                                                       const tfTurn = turnos.find(t => t.id === tfId);
                                                       if (!tfTurn) return false;
                                                       const dateObj = new Date(dateStr + 'T00:00:00');
                                                       const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
                                                       const dateDayName = days[dateObj.getDay()];
                                                       if (tfTurn.dia === dateDayName) {
                                                         const isSuspended = (socio.clases_suspendidas || []).some(s => s.turno_id === tfId && s.fecha === dateStr);
                                                         return !isSuspended;
                                                       }
                                                       return false;
                                                     });

                                  const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
                                    day: 'numeric',
                                    month: 'short'
                                  });

                                  return (
                                    <div key={dateStr} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-xs">
                                      <div>
                                        <span className="font-bold text-slate-700">{dateFormatted}</span>
                                        <span className="text-[9px] text-slate-500 font-mono ml-2">({occupiedCount} ocupados)</span>
                                      </div>

                                      {miReservaIndividualEnFecha ? (
                                        <button
                                          onClick={() => {
                                            if (window.confirm(`¿Confirmas cancelar la reserva del ${dateFormatted} a las ${turno.hora.slice(0, 5)} hs?`)) {
                                              const res = cancelarReservaIndividual(socio.id, miReservaIndividualEnFecha.id);
                                              if (res.success) {
                                                setSuccessMessage(res.message);
                                                setTimeout(() => setSuccessMessage(null), 4000);
                                              } else {
                                                setErrorMessage(res.message);
                                                setTimeout(() => setErrorMessage(null), 4000);
                                              }
                                            }
                                          }}
                                          className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                        >
                                          <X className="w-3 h-3" /> Cancelar
                                        </button>
                                      ) : hasBooking ? (
                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-sans">Ya tienes clase</span>
                                      ) : isFullOnDate ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded shrink-0">Lleno</span>
                                          {inWaitlist ? (
                                            <button
                                              onClick={() => {
                                                const res = removerListaEsperaReserva(socio.id, turno.id, dateStr);
                                                if (res.success) {
                                                  setSuccessMessage(res.message);
                                                  setTimeout(() => setSuccessMessage(null), 3500);
                                                } else {
                                                  setErrorMessage(res.message);
                                                  setTimeout(() => setErrorMessage(null), 3500);
                                                }
                                              }}
                                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1 rounded-lg text-[9px] transition-all cursor-pointer border border-slate-300 shadow-3xs"
                                            >
                                              Salir de Espera
                                            </button>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                const res = agregarListaEsperaReserva(socio.id, turno.id, dateStr);
                                                if (res.success) {
                                                  setSuccessMessage(res.message);
                                                  setTimeout(() => setSuccessMessage(null), 3500);
                                                } else {
                                                  setErrorMessage(res.message);
                                                  setTimeout(() => setErrorMessage(null), 3500);
                                                }
                                              }}
                                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-1 rounded-lg text-[9px] transition-all cursor-pointer shadow-3xs border border-amber-600"
                                            >
                                              Anotarse en Espera
                                            </button>
                                          )}
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            const res = crearReservaIndividual(socio.id, turno.id, dateStr);
                                            if (res.success) {
                                              setSuccessMessage(res.message);
                                              setTimeout(() => setSuccessMessage(null), 3500);
                                              setBookingTurnId(null);
                                            } else {
                                              setErrorMessage(res.message);
                                              setTimeout(() => setErrorMessage(null), 3550);
                                            }
                                          }}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-[9px] transition-all cursor-pointer shadow-3xs border border-emerald-700"
                                        >
                                          Confirmar
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Expandable Reprogram fixed date view */}
                          {reprogramTurnId === turno.id && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 mt-2 animate-fade-in">
                              <p className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-wider">Escoge qué sesión reprogramar:</p>
                              <div className="grid grid-cols-1 gap-2">
                                {getDatesOfWeekdayInMonth(turno.dia, paidMonth).map(dateStr => {
                                  const isSuspended = (socio.clases_suspendidas || []).some(s => s.turno_id === turno.id && s.fecha === dateStr);
                                  const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
                                    day: 'numeric',
                                    month: 'short'
                                  });

                                  return (
                                    <div key={dateStr} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 text-xs">
                                      <span className="font-bold text-slate-700">{dateFormatted}</span>

                                      {isSuspended ? (
                                        <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">Suspendida</span>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            if (window.confirm(`¿Confirmas suspender la sesión fija del ${dateFormatted} para reprogramarla?`)) {
                                              const res = suspenderClaseFija(socio.id, turno.id, dateStr);
                                              if (res.success) {
                                                setSuccessMessage(res.message);
                                                setTimeout(() => setSuccessMessage(null), 4000);
                                                setReprogramTurnId(null);
                                              } else {
                                                setErrorMessage(res.message);
                                                setTimeout(() => setErrorMessage(null), 4000);
                                              }
                                            }
                                          }}
                                          className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1 rounded-lg text-[9px] transition-all cursor-pointer shadow-3xs border-none"
                                        >
                                          Suspender
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs mt-1">
                            <div className="shrink-0 mr-1.5">
                              <span className={`inline-block w-2 h-2 rounded-full ${holdsMyFijo ? 'bg-sky-400 animate-pulse' : holdsMyIndividual ? 'bg-emerald-400' : 'bg-slate-200'}`}></span>
                            </div>

                            <div className="flex-1 text-right">
                              {holdsMyFijo && (
                                <button
                                  onClick={() => {
                                    setReprogramTurnId(reprogramTurnId === turno.id ? null : turno.id);
                                    setBookingTurnId(null);
                                  }}
                                  className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-100 px-2 sm:px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 font-sans w-full"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span className="truncate">Reprogramar</span>
                                </button>
                              )}

                              {!holdsMyFijo && (
                                <button
                                  onClick={() => {
                                    setBookingTurnId(bookingTurnId === turno.id ? null : turno.id);
                                    setReprogramTurnId(null);
                                  }}
                                  className={`px-2 sm:px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer font-sans border-none w-full text-center ${
                                    bookingTurnId === turno.id
                                      ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                  }`}
                                >
                                  <span className="truncate">{bookingTurnId === turno.id ? 'CERRAR' : 'RESERVAR'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
        )}
      </div>
    </section>
  );
};
