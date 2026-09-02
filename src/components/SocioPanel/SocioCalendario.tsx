// src/components/SocioPanel/SocioCalendario.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { ChevronLeft, ChevronRight, Info, Calendar, RefreshCw, X, Clock, MessageCircle, Check } from 'lucide-react';

interface SocioCalendarioProps {
  socio: Cliente;
  setSuccessMessage: (msg: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
}

const getTodayDayName = (): 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' => {
  const dayIndex = new Date().getDay(); // 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miercoles, 4 = Jueves, 5 = Viernes, 6 = Sabado
  const map: Record<number, 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES'> = {
    1: 'LUNES',
    2: 'MARTES',
    3: 'MIERCOLES',
    4: 'JUEVES',
    5: 'VIERNES',
  };
  return map[dayIndex] || 'LUNES'; // Si es fin de semana (sábado/domingo), inicia en LUNES
};

export const SocioCalendario: React.FC<SocioCalendarioProps> = ({
  socio,
  setSuccessMessage,
  setErrorMessage
}) => {
  const {
    turnos, clientes, planes, waitlistReservas, recuperos,
    crearReservaIndividual, cancelarReservaIndividual, suspenderClaseFija, revertirSuspensionClaseFija, agregarListaEsperaReserva, removerListaEsperaReserva
  } = useGym();

  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [activeDay, setActiveDay] = useState<'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES'>(() => getTodayDayName());
  const [bookingTurnId, setBookingTurnId] = useState<string | null>(null);
  const [reprogramTurnId, setReprogramTurnId] = useState<string | null>(null);
  // Fix 1: Inline confirm state for Reprogramar (replaces window.confirm)
  const [pendingSuspendDate, setPendingSuspendDate] = useState<string | null>(null);
  const [suspendSuccessDate, setSuspendSuccessDate] = useState<string | null>(null);

  const planSocio = useMemo(() => {
    return planes.find(p => p.id === socio.plan_id) || null;
  }, [planes, socio]);

  const currentCalendarMonth = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [curYear, curMonth] = currentCalendarMonth.split('-').map(Number);
  const nextMonthDate = new Date(curYear, curMonth, 1);
  const nextCalendarMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const mesActualNombre = new Date(curYear, curMonth - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const mesProximoNombre = nextMonthDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const selectedBookingTurno = useMemo(() => {
    if (!bookingTurnId) return null;
    return turnos.find(t => t.id === bookingTurnId) || null;
  }, [bookingTurnId, turnos]);

  const selectedReprogramTurno = useMemo(() => {
    if (!reprogramTurnId) return null;
    return turnos.find(t => t.id === reprogramTurnId) || null;
  }, [reprogramTurnId, turnos]);

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
    const [year, month] = currentCalendarMonth.split('-').map(Number);
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
    const fijos = (turn.asignados_ids || []).map(id => clientes.find(c => c.id === id)).filter(Boolean) as Cliente[];
    const suspendidosCount = fijos.filter(c => (c.clases_suspendidas || []).some(s => s.turno_id === turn.id && s.fecha === dateStr)).length;
    const fijosActivosCount = Math.max(0, fijos.length - suspendidosCount);

    const individualCount = clientes.reduce((acc, c) => {
      const bookingsOnDate = (c.reservas_individuales || []).filter(r => r.turno_id === turnoId && r.fecha === dateStr);
      return acc + bookingsOnDate.length;
    }, 0);

    // Los recuperos (clases a recuperar agendadas en este slot/fecha) también ocupan
    // un lugar físico. Contarlos evita que la ocupación mostrada al socio quede por
    // debajo de la real de la turnera y se sobre-reserve por encima del cupo.
    const recuperosCount = (recuperos || []).filter(
      r => r.estado === 'PENDIENTE' && r.turno_recupero_id === turnoId && r.fecha_recupero === dateStr
    ).length;

    return fijosActivosCount + individualCount + recuperosCount;
  };

  const turnosDelDia = useMemo(() => {
    return turnos
      .filter(t => t.dia === activeDay)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [turnos, activeDay]);

  const activeIndividualReservations = useMemo(() => {
    return (socio.reservas_individuales || []).filter(r => r.fecha.startsWith(currentCalendarMonth));
  }, [socio, currentCalendarMonth]);

  const suspendedClassesThisMonth = useMemo(() => {
    return (socio.clases_suspendidas || []).filter(s => s.fecha.startsWith(currentCalendarMonth));
  }, [socio, currentCalendarMonth]);

  const reintegratedSuspensionsCount = useMemo(() => {
    return suspendedClassesThisMonth.filter(s => s.reintegrado && socio.turnos_fijos.includes(s.turno_id)).length;
  }, [suspendedClassesThisMonth, socio.turnos_fijos]);

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





      {/* STICKY CONTAINER FOR WEEKLY NAVIGATION AND DAY TABS */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md -mx-6.5 px-6.5 lg:-mx-8 lg:px-8 pt-2 pb-5 border-b border-slate-100/85 space-y-4 mb-6 animate-fade-in" id="socio-sticky-header">
        {/* NAVEGACIÓN SEMANAL */}
        <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-2xl max-w-xl mx-auto" id="socio-week-navigation">
          <button
            onClick={() => {
              if (weekOffset > 0) {
                setWeekOffset(prev => prev - 1);
                setBookingTurnId(null);
              }
            }}
            disabled={weekOffset <= 0}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-[11px] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
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
              if (weekOffset < 12) {
                setWeekOffset(prev => prev + 1);
                setBookingTurnId(null);
              }
            }}
            disabled={weekOffset >= 12}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-[11px] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            Semana Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* DIAS CALENDARIO SELECTOR TAB BAR */}
        <div className="grid grid-cols-5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1 lg:max-w-xl mx-auto" id="socio-agenda-tabs">
          {(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const).map(dia => {
            const isActive = activeDay === dia;
            const datesInSelectedWeek = getAvailableDatesForTurn(dia).filter(isDateInSelectedWeek);
            const dateStr = datesInSelectedWeek[0] || '';
            const dayNumber = dateStr ? new Date(dateStr + 'T00:00:00').getDate() : null;
            const isToday = weekOffset === 0 && getTodayDayName() === dia;

            return (
              <button
                key={dia}
                onClick={() => {
                  setActiveDay(dia);
                  setBookingTurnId(null);
                  setReprogramTurnId(null);
                }}
                className={`py-2.5 sm:py-3 text-center text-xs font-bold rounded-xl transition-all cursor-pointer select-none border relative ${
                  isActive 
                    ? 'bg-gradient-to-tr from-emerald-600 to-teal-700 text-white border-transparent font-black scale-102 shadow-sm ring-2 ring-emerald-500/20' 
                    : 'text-slate-500 hover:text-slate-800 bg-transparent border-transparent hover:bg-white/50'
                }`}
              >
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1">
                    <span className="font-mono uppercase text-[10px] sm:text-xs tracking-wide">
                      {dia === 'MIERCOLES' ? 'MIÉ' : dia.slice(0, 3)}
                    </span>
                    {dayNumber && (
                      <span className={`text-[10px] font-mono ${isActive ? 'text-emerald-100 font-bold' : 'text-slate-400 font-semibold'}`}>
                        {dayNumber}
                      </span>
                    )}
                  </div>
                  {isToday ? (
                    <span className={`text-[7.5px] font-extrabold uppercase px-1.5 py-0.2 rounded-full tracking-wider mt-0.5 ${
                      isActive ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      HOY
                    </span>
                  ) : (
                    <span className={`text-[7px] hidden md:inline tracking-wider mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                      DÍA
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENEDOR DE SLOTS */}
      <div className="space-y-8" id="socio-agenda-slots">
        {turnosDelDia.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 border border-slate-100 rounded-2xl">
            <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-500 italic text-xs font-medium">No hay horarios configurados para el día seleccionado ({activeDay}).</p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {turnosDelDia.map(turno => {
                      const holdsMyFijo = socio.turnos_fijos.includes(turno.id);
                      const misReservasEnTurno = (socio.reservas_individuales || []).filter(r => r.turno_id === turno.id && isDateInSelectedWeek(r.fecha));
                      const holdsMyIndividual = misReservasEnTurno.length > 0;

                      const datesInSelectedWeek = getAvailableDatesForTurn(turno.dia).filter(isDateInSelectedWeek);
                      const slotDateStr = datesInSelectedWeek[0] || '';
                      const slotDateFormatted = slotDateStr
                        ? new Date(slotDateStr + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                        : null;
                      const realtimeOccupancyCount = slotDateStr ? getOccupiedCountOnDate(turno.id, slotDateStr) : turno.asignados_ids.length;
                      const isFull = realtimeOccupancyCount >= turno.cupo_maximo;

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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm sm:text-base font-black text-slate-800 tracking-tight">{turno.hora.slice(0, 5)} hs</p>
                                  {slotDateFormatted && (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-300 px-1.5 py-0.2 rounded font-mono capitalize">
                                      {slotDateFormatted}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9.5px] text-slate-600 font-mono font-semibold mt-0.5 sm:mt-1 leading-tight">
                                  Ocupación: <span className="font-bold text-slate-900 font-sans">{realtimeOccupancyCount} / {turno.cupo_maximo}</span>
                                </p>
                                <p className="text-[9.5px] text-slate-600 font-sans mt-0.5 font-semibold flex items-center gap-1">
                                  <span className="text-slate-400 font-normal">Profe:</span>
                                  <strong className="text-slate-800 font-bold">{turno.profesor || 'Por asignar'}</strong>
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

                          {/* Action Button Footer */}
                          <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between text-xs mt-1">
                            <div className="shrink-0 mr-1.5">
                              <span className={`inline-block w-2 h-2 rounded-full ${holdsMyFijo ? 'bg-sky-400 animate-pulse' : holdsMyIndividual ? 'bg-emerald-400' : 'bg-slate-200'}`}></span>
                            </div>

                            <div className="flex-1 text-right">
                              {holdsMyFijo ? (
                                <button
                                  onClick={() => {
                                    setReprogramTurnId(turno.id);
                                    setBookingTurnId(null);
                                  }}
                                  className="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-100 px-2 sm:px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 font-sans w-full"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span className="truncate">Reprogramar</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setBookingTurnId(turno.id);
                                    setReprogramTurnId(null);
                                  }}
                                  className={`px-2 sm:px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all cursor-pointer font-sans border w-full text-center shadow-xs ${
                                    isFull
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                                  }`}
                                  title={isFull ? 'Turno completo — anotate en la lista de espera' : 'Reservar este cupo'}
                                >
                                  <span className="truncate">{isFull ? 'Completo · Lista de espera' : 'RESERVAR'}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
          </div>
        )}
      </div>

      {/* SUMMARY BOX — POSITIONED BELOW THE CALENDAR GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8 p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-extrabold">1. Cupos Disponibles por Asignar este Mes</p>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${availableSlots > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <p className="text-lg font-black text-slate-800">
              {availableSlots} <span className="text-xs text-slate-500 font-medium">de {totalMonthlySlots} cupos totales</span>
            </p>
          </div>
          <p className="text-[10px] text-slate-500 font-sans leading-normal">
            Puedes asignarlos libremente a cualquier horario con cupo en la grilla superior.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-extrabold">2. Días Fijos Asignados</p>
          <div className="flex items-center gap-2">
            <p className="text-base font-black text-slate-800">
              {socio.turnos_fijos.length > 0 ? (
                <span>{socio.turnos_fijos.length} días fijos semanales <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded">({socio.turnos_fijos.length * 4}/{totalMonthlySlots} cupos)</span></span>
              ) : (
                <span className="text-slate-400 italic text-xs font-medium">No tenés horarios fijos semanales asignados</span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1">
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

          <div className="pt-2">
            <a
              href="https://wa.me/541178402722?text=Hola!%20Quisiera%20consultar%20para%20cambiar%20mis%20d%C3%ADas%20fijos."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-3.5 py-2 rounded-xl transition-all shadow-xs border border-emerald-700 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>¿Querés cambiar tus días fijos? Comunicarse al WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* ALL FIXED WARNING */}
      {availableSlots === 0 && usedSlots === totalMonthlySlots && (
        <div className="mt-4 p-4.5 bg-sky-50 border border-sky-100 rounded-2xl flex items-center gap-3">
          <Info className="w-5 h-5 text-sky-600 shrink-0" />
          <p className="text-[11px] text-sky-800 font-medium leading-relaxed font-sans">
            ¡Tienes todos tus cupos mensuales asignados de forma fija! Si deseas asistir en otro horario, puedes <strong>reprogramar</strong> tus sesiones haciendo click en "Reprogramar clase" en tus días fijos o desde el listado de sesiones en la pantalla de Inicio.
          </p>
        </div>
      )}

      {/* MODAL RESERVA INDIVIDUAL DE CUPO */}
      {selectedBookingTurno && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs animate-fade-in" id="booking-modal-overlay">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative animate-scale-up max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">Reserva de Cupo</span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight mt-1 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>{selectedBookingTurno.dia} — {selectedBookingTurno.hora.slice(0, 5)} hs</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 font-medium flex items-center gap-1">
                  <span>Profesor a cargo:</span>
                  <strong className="text-emerald-400 font-bold">{selectedBookingTurno.profesor || 'Por asignar'}</strong>
                </p>
              </div>
              <button
                onClick={() => setBookingTurnId(null)}
                className="text-slate-400 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors cursor-pointer border-none shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-mono font-bold text-emerald-900 uppercase tracking-wider block">
                  Fecha Seleccionada en la Semana:
                </span>

                {getAvailableDatesForTurn(selectedBookingTurno.dia).filter(isDateInSelectedWeek).map(dateStr => {
                  const occupiedCount = getOccupiedCountOnDate(selectedBookingTurno.id, dateStr);
                  const isFullOnDate = occupiedCount >= selectedBookingTurno.cupo_maximo;
                  const inWaitlist = (waitlistReservas || []).some(
                    w => w.cliente_id === socio.id && w.turno_id === selectedBookingTurno.id && w.fecha === dateStr
                  );

                  const isSuspendedOnDate = (socio.clases_suspendidas || []).some(s => s.turno_id === selectedBookingTurno.id && s.fecha === dateStr);
                  const miReservaIndividualEnFecha = (socio.reservas_individuales || []).find(r => r.turno_id === selectedBookingTurno.id && r.fecha === dateStr);

                  const hasOtherBookingOnDate = (socio.reservas_individuales || []).some(r => r.fecha === dateStr && r.turno_id !== selectedBookingTurno.id) ||
                                                socio.turnos_fijos.some(tfId => {
                                                  if (tfId === selectedBookingTurno.id) return false;
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
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long'
                  });

                  return (
                    <div key={dateStr} className="bg-white p-3.5 rounded-2xl border border-emerald-200 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-black text-slate-900 text-sm capitalize">{dateFormatted}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Ocupación: <strong className="text-slate-800">{occupiedCount}</strong> de {selectedBookingTurno.cupo_maximo} cupos
                          </p>
                        </div>
                        {isFullOnDate && !miReservaIndividualEnFecha && (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg">
                            Lleno
                          </span>
                        )}
                      </div>

                      {isSuspendedOnDate ? (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                            Clase Suspendida
                          </span>
                          <button
                            onClick={() => {
                              const isFijoTurn = socio.turnos_fijos.includes(selectedBookingTurno.id);

                              if (isFijoTurn) {
                                // Turno fijo: solo revertir la suspensión (el cupo ya está asegurado)
                                const res = revertirSuspensionClaseFija(socio.id, selectedBookingTurno.id, dateStr);
                                if (res.success) {
                                  setSuccessMessage('✅ Reserva restablecida. Volvés a tener tu lugar en este turno.');
                                  setBookingTurnId(null);
                                  setTimeout(() => setSuccessMessage(null), 4000);
                                } else {
                                  setErrorMessage(res.message);
                                  setTimeout(() => setErrorMessage(null), 4000);
                                }
                              } else {
                                // Turno variable: revertir suspensión + crear reserva confirmada
                                const revRes = revertirSuspensionClaseFija(socio.id, selectedBookingTurno.id, dateStr);
                                if (!revRes.success) {
                                  // Si no había suspensión registrada, igual intentamos crear la reserva
                                }
                                const res = crearReservaIndividual(socio.id, selectedBookingTurno.id, dateStr);
                                if (res.success) {
                                  setSuccessMessage('✅ Reserva confirmada. Tu lugar está asegurado.');
                                  setBookingTurnId(null);
                                  setTimeout(() => setSuccessMessage(null), 4000);
                                } else {
                                  setErrorMessage(res.message);
                                  setTimeout(() => setErrorMessage(null), 4000);
                                }
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs border-none flex items-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Retomar
                          </button>
                        </div>
                      ) : miReservaIndividualEnFecha ? (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg">
                            ✓ Ya tienes reserva activa
                          </span>
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Confirmas cancelar la reserva del ${dateFormatted}?`)) {
                                const res = cancelarReservaIndividual(socio.id, miReservaIndividualEnFecha.id);
                                if (res.success) {
                                  setSuccessMessage(res.message);
                                  setBookingTurnId(null);
                                  setTimeout(() => setSuccessMessage(null), 4000);
                                } else {
                                  setErrorMessage(res.message);
                                  setTimeout(() => setErrorMessage(null), 4000);
                                }
                              }
                            }}
                            className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <X className="w-3.5 h-3.5" /> Cancelar Reserva
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {hasOtherBookingOnDate && (
                            <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                ⚡ Ya tienes clase este dia
                              </span>
                              <span className="text-[9px] text-amber-700 font-semibold font-mono">Doble Turno</span>
                            </div>
                          )}

                          {isFullOnDate ? (
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                              <span className="text-[10px] text-slate-500 italic">Sin cupos disponibles.</span>
                              {inWaitlist ? (
                                <button
                                  onClick={() => {
                                    const res = removerListaEsperaReserva(socio.id, selectedBookingTurno.id, dateStr);
                                    if (res.success) {
                                      setSuccessMessage(res.message);
                                      setTimeout(() => setSuccessMessage(null), 3500);
                                    } else {
                                      setErrorMessage(res.message);
                                      setTimeout(() => setErrorMessage(null), 3500);
                                    }
                                  }}
                                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer border border-slate-300"
                                >
                                  Salir de Lista de Espera
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    const res = agregarListaEsperaReserva(socio.id, selectedBookingTurno.id, dateStr);
                                    if (res.success) {
                                      setSuccessMessage(res.message);
                                      setTimeout(() => setSuccessMessage(null), 3500);
                                    } else {
                                      setErrorMessage(res.message);
                                      setTimeout(() => setErrorMessage(null), 3500);
                                    }
                                  }}
                                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer border border-amber-600 shadow-xs"
                                >
                                  Anotarse en Espera
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                const res = crearReservaIndividual(socio.id, selectedBookingTurno.id, dateStr);
                                if (res.success) {
                                  setSuccessMessage(res.message);
                                  setBookingTurnId(null);
                                  setTimeout(() => setSuccessMessage(null), 3500);
                                } else {
                                  setErrorMessage(res.message);
                                  setTimeout(() => setErrorMessage(null), 3550);
                                }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-md border border-emerald-700 flex items-center justify-center gap-2 active:scale-98"
                            >
                              <Check className="w-4 h-4" />
                              <span>{hasOtherBookingOnDate ? 'Confirmar Doble Turno' : 'Confirmar Reserva de Cupo'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setBookingTurnId(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REPROGRAMAR CLASE FIJA */}
      {selectedReprogramTurno && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs animate-fade-in" id="reprogram-modal-overlay">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative animate-scale-up max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-sky-900 text-white p-5 flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-sky-300 animate-spin-slow" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-300">Reprogramar Sesión</span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight mt-1">
                  {selectedReprogramTurno.dia} — {selectedReprogramTurno.hora.slice(0, 5)} hs
                </h3>
                <p className="text-xs text-sky-200 mt-1 font-medium">
                  Selecciona la fecha que deseas suspender para liberar tu cupo.
                </p>
              </div>
              <button
                onClick={() => setReprogramTurnId(null)}
                className="text-sky-300 hover:text-white bg-sky-800 p-2 rounded-xl transition-colors cursor-pointer border-none shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Sesiones de este mes ({mesActualNombre}):
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {getDatesOfWeekdayInMonth(selectedReprogramTurno.dia, currentCalendarMonth).map(dateStr => {
                    const isSuspended = (socio.clases_suspendidas || []).some(s => s.turno_id === selectedReprogramTurno.id && s.fecha === dateStr);
                    const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    });

                    return (
                      <div key={dateStr} className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                        <div>
                          <span className="font-bold text-slate-800 capitalize block">{dateFormatted}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Turno Fijo Asignado</span>
                        </div>

                        {isSuspended ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                              Clase Suspendida
                            </span>
                            <button
                              onClick={() => {
                                const res = revertirSuspensionClaseFija(socio.id, selectedReprogramTurno.id, dateStr);
                                if (res.success) {
                                  setSuccessMessage(res.message);
                                  setReprogramTurnId(null);
                                  setTimeout(() => setSuccessMessage(null), 4000);
                                } else {
                                  setErrorMessage(res.message);
                                  setTimeout(() => setErrorMessage(null), 4000);
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs border-none flex items-center gap-1.5"
                              title="Volver a inscribirte en este turno si hay cupos disponibles"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Retomar
                            </button>
                          </div>
                        ) : pendingSuspendDate === dateStr ? (
                          /* Inline confirm step */
                          <div className="flex flex-col gap-2 items-end">
                            <p className="text-[10px] text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg text-right">
                              ¿Confirmar baja de esta sesión?
                            </p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setPendingSuspendDate(null)}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer border border-slate-200 bg-white"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => {
                                  const res = suspenderClaseFija(socio.id, selectedReprogramTurno.id, dateStr);
                                  setPendingSuspendDate(null);
                                  if (res.success) {
                                    setSuspendSuccessDate(dateStr);
                                  } else {
                                    setErrorMessage(res.message);
                                    setTimeout(() => setErrorMessage(null), 4000);
                                  }
                                }}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-2.5 py-1.5 rounded-xl text-[10px] transition-all cursor-pointer shadow-xs border-none"
                              >
                                Confirmar baja
                              </button>
                            </div>
                          </div>
                        ) : suspendSuccessDate === dateStr ? (
                          /* Success state for this date */
                          <div className="flex flex-col gap-1.5 items-end">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-right">
                              ✅ ¡Baja registrada! Cupo libre para recupero.
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPendingSuspendDate(dateStr)}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs border-none"
                          >
                            Suspender
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Next month sessions */}
              <div className="space-y-2 pt-3 border-t border-slate-200/80">
                <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  Sesiones del próximo mes ({mesProximoNombre}):
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {getDatesOfWeekdayInMonth(selectedReprogramTurno.dia, nextCalendarMonth).map(dateStr => {
                    const isSuspended = (socio.clases_suspendidas || []).some(s => s.turno_id === selectedReprogramTurno.id && s.fecha === dateStr);
                    const dateFormatted = new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long'
                    });

                    return (
                      <div key={dateStr} className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                        <div>
                          <span className="font-bold text-slate-800 capitalize block">{dateFormatted}</span>
                          <span className="text-[10px] text-slate-400 font-mono">Turno Fijo Asignado</span>
                        </div>

                        {isSuspended ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                              Clase Suspendida
                            </span>
                            <button
                              onClick={() => {
                                const res = revertirSuspensionClaseFija(socio.id, selectedReprogramTurno.id, dateStr);
                                if (res.success) {
                                  setSuccessMessage(res.message);
                                  setReprogramTurnId(null);
                                  setTimeout(() => setSuccessMessage(null), 4000);
                                } else {
                                  setErrorMessage(res.message);
                                  setTimeout(() => setErrorMessage(null), 4000);
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs border-none flex items-center gap-1.5"
                              title="Volver a inscribirte en este turno si hay cupos disponibles"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Retomar
                            </button>
                          </div>
                        ) : pendingSuspendDate === dateStr ? (
                          <div className="flex flex-col gap-2 items-end">
                            <p className="text-[10px] text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg text-right">
                              ¿Confirmar baja de esta sesión?
                            </p>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setPendingSuspendDate(null)}
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer border border-slate-200 bg-white"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => {
                                  const res = suspenderClaseFija(socio.id, selectedReprogramTurno.id, dateStr);
                                  setPendingSuspendDate(null);
                                  if (res.success) {
                                    setSuspendSuccessDate(dateStr);
                                  } else {
                                    setErrorMessage(res.message);
                                    setTimeout(() => setErrorMessage(null), 4000);
                                  }
                                }}
                                className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-2.5 py-1.5 rounded-xl text-[10px] transition-all cursor-pointer shadow-xs border-none"
                              >
                                Confirmar baja
                              </button>
                            </div>
                          </div>
                        ) : suspendSuccessDate === dateStr ? (
                          <div className="flex flex-col gap-1.5 items-end">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg text-right">
                              ✅ ¡Baja registrada! Cupo libre para recupero.
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPendingSuspendDate(dateStr)}
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer shadow-xs border-none"
                          >
                            Suspender
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center shrink-0 gap-3">
              {suspendSuccessDate ? (
                <button
                  onClick={() => {
                    setSuspendSuccessDate(null);
                    setReprogramTurnId(null);
                    // Show success banner and redirect to full calendar to pick a new slot
                    setSuccessMessage('✅ Clase dada de baja correctamente. Ahora tenés un cupo libre — elegí otro turno para recuperarla.');
                    setTimeout(() => setSuccessMessage(null), 6000);
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer border-none flex items-center justify-center gap-2 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Elegir otro turno para recuperarla
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => {
                  setSuspendSuccessDate(null);
                  setPendingSuspendDate(null);
                  setReprogramTurnId(null);
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
