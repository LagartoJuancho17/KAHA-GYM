// src/components/SocioPanel/SocioReservas.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente } from '../../types';
import { CalendarDays, Plus, Calendar, X, Clock, CalendarClock, Info, Phone, ExternalLink, Check } from 'lucide-react';

interface SocioReservasProps {
  socio: Cliente;
  setActiveTabSection: (tab: 'HOME' | 'PERFIL' | 'RESERVAS' | 'PAGOS' | 'NOVEDADES') => void;
  setSuccessMessage: (msg: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
}

export const SocioReservas: React.FC<SocioReservasProps> = ({
  socio,
  setActiveTabSection,
  setSuccessMessage,
  setErrorMessage
}) => {
  const { 
    turnos, clientes, planes, recuperos, waitlistReservas,
    suspenderClaseFija, cancelarReservaIndividual, removerListaEsperaReserva,
    programarRecuperoPendiente
  } = useGym();

  // --- RECOVERY PORTAL STATES ---
  const [canjeRecuperoId, setCanjeRecuperoId] = useState<string | null>(null);
  const [canjeTurnoId, setCanjeTurnoId] = useState<string>('');
  const [canjeFecha, setCanjeFecha] = useState<string>('');
  const [canjeSuccess, setCanjeSuccess] = useState<string | null>(null);
  const [canjeError, setCanjeError] = useState<string | null>(null);

  const planSocio = useMemo(() => {
    return planes.find(p => p.id === socio.plan_id) || null;
  }, [planes, socio]);

  const paidMonth = useMemo(() => {
    return socio.ultimo_mes_pagado || new Date().toISOString().slice(0, 7);
  }, [socio]);

  const isDateInPaidMonth = (dateStr: string) => {
    return dateStr.startsWith(paidMonth);
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

  const totalMonthlySlots = useMemo(() => {
    if (!planSocio) return 12;
    return planSocio.dias_por_semana * 4;
  }, [planSocio]);

  const fixedDaysCount = useMemo(() => {
    return socio.turnos_fijos.length;
  }, [socio]);

  const totalFixedSlotsForMonth = useMemo(() => {
    return fixedDaysCount * 4;
  }, [fixedDaysCount]);

  const activeIndividualReservations = useMemo(() => {
    return (socio.reservas_individuales || []).filter(r => isDateInPaidMonth(r.fecha));
  }, [socio, paidMonth]);

  const suspendedClassesThisMonth = useMemo(() => {
    return (socio.clases_suspendidas || []).filter(s => isDateInPaidMonth(s.fecha));
  }, [socio, paidMonth]);

  const reintegratedSuspensionsCount = useMemo(() => {
    return suspendedClassesThisMonth.filter(s => s.reintegrado).length;
  }, [suspendedClassesThisMonth]);

  const usedSlots = useMemo(() => {
    return Math.max(0, totalFixedSlotsForMonth - reintegratedSuspensionsCount + activeIndividualReservations.length);
  }, [totalFixedSlotsForMonth, reintegratedSuspensionsCount, activeIndividualReservations]);

  const availableSlots = useMemo(() => {
    return Math.max(0, totalMonthlySlots - usedSlots);
  }, [totalMonthlySlots, usedSlots]);

  // Unified sessions list
  const sesionesDelMes = useMemo(() => {
    interface SesionInfo {
      id: string;
      tipo: 'FIJO' | 'INDIVIDUAL';
      turnoId: string;
      diaNombre: string;
      hora: string;
      fecha: string;
      isSuspended: boolean;
      suspendedInfo?: any;
      originalReserva?: any;
    }

    let list: SesionInfo[] = [];

    // 1. Fixed days
    socio.turnos_fijos.forEach(tfId => {
      const turn = turnos.find(t => t.id === tfId);
      if (!turn) return;
      
      const dates = getDatesOfWeekdayInMonth(turn.dia, paidMonth);
      dates.forEach(date => {
        const susp = (socio.clases_suspendidas || []).find(s => s.turno_id === tfId && s.fecha === date);
        list.push({
          id: `fixed-${tfId}-${date}`,
          tipo: 'FIJO',
          turnoId: tfId,
          diaNombre: turn.dia,
          hora: turn.hora,
          fecha: date,
          isSuspended: !!susp,
          suspendedInfo: susp
        });
      });
    });

    // 2. Individual bookings
    (socio.reservas_individuales || []).forEach(r => {
      const hoyStr = new Date().toISOString().slice(0, 10);
      const belongsToMonth = isDateInPaidMonth(r.fecha);
      const isFuture = r.fecha >= hoyStr;
      if (!belongsToMonth && !isFuture) return;

      const turn = turnos.find(t => t.id === r.turno_id);
      if (!turn) return;

      list.push({
        id: `indiv-${r.id}`,
        tipo: 'INDIVIDUAL',
        turnoId: r.turno_id,
        diaNombre: turn.dia,
        hora: turn.hora,
        fecha: r.fecha,
        isSuspended: false,
        originalReserva: r
      });
    });

    list.sort((a, b) => {
      const dateDiff = a.fecha.localeCompare(b.fecha);
      if (dateDiff !== 0) return dateDiff;
      return a.hora.localeCompare(b.hora);
    });

    return list;
  }, [socio, turnos, paidMonth]);

  const misWaitlists = useMemo(() => {
    return (waitlistReservas || []).filter(w => w.cliente_id === socio.id);
  }, [waitlistReservas, socio]);

  const pendingRecuperos = useMemo(() => {
    return (recuperos || []).filter(
      r => r.cliente_id === socio.id && 
           r.turno_recupero_id === 'PENDIENTE_DEFINICION' && 
           r.estado === 'PENDIENTE'
    );
  }, [recuperos, socio]);

  const handleConfirmCanje = (recuperoId: string) => {
    if (!canjeTurnoId || !canjeFecha) {
      setCanjeError('Debes seleccionar un turno y una fecha.');
      return;
    }
    const result = programarRecuperoPendiente(recuperoId, canjeTurnoId, canjeFecha);
    if (result.success) {
      setCanjeSuccess(result.message);
      setCanjeError(null);
      setTimeout(() => {
        setCanjeRecuperoId(null);
        setCanjeTurnoId('');
        setCanjeFecha('');
        setCanjeSuccess(null);
      }, 2000);
    } else {
      setCanjeError(result.message);
      setCanjeSuccess(null);
    }
  };

  const handleCancelCanje = () => {
    setCanjeRecuperoId(null);
    setCanjeTurnoId('');
    setCanjeFecha('');
    setCanjeError(null);
    setCanjeSuccess(null);
  };

  const whatsappUrl = () => {
    const phone = "5491123456789"; 
    const textMessage = `Hola KAHA GYM, soy el socio ${socio.nombre} ${socio.apellido}. Me contacto desde mi portal de cliente para resolver una duda administrativa.`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(textMessage)}`;
  };

  return (
    <div className="space-y-6" id="socio-agenda-block">
      {/* 1. CONTROL DE CUPOS Y TURNOS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-md font-mono font-bold uppercase tracking-wider">
              Balance de Reservas
            </span>
            <h3 className="text-base font-black text-slate-800 tracking-tight mt-1.5 flex items-center gap-2">
              <CalendarDays className="w-5.5 h-5.5 text-emerald-600" />
              <span>CONTROL DE CUPOS Y TURNOS</span>
            </h3>
          </div>
          <button 
            onClick={() => setActiveTabSection('RESERVAS')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs border-none"
            id="home-go-to-reservations-shortcut"
          >
            <span>Reservar nuevo cupo</span>
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 p-4.5 rounded-2xl border border-slate-100 text-xs">
          <div className="space-y-1">
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Cupos Mensuales Plan</p>
            <p className="text-lg font-black text-slate-800">{totalMonthlySlots} <span className="text-xs text-slate-400 font-medium">clases</span></p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Cupos Asignados / Usados</p>
            <p className="text-lg font-black text-emerald-700">{usedSlots} / {totalMonthlySlots}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">Cupos Libres por Asignar</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${availableSlots > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
              <p className="text-lg font-black text-slate-800">{availableSlots}</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all" 
              style={{ width: `${Math.min((usedSlots / totalMonthlySlots) * 100, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Sessions list */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Mis Sesiones Programadas ({paidMonth})</h4>
            {sesionesDelMes.length > 0 && (
              <span className="text-[9px] font-bold text-slate-400 font-mono">{sesionesDelMes.length} sesión{sesionesDelMes.length !== 1 ? 'es' : ''}</span>
            )}
          </div>

          {sesionesDelMes.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <Calendar className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-xs text-slate-700">No tienes sesiones programadas para este mes</p>
              <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">
                Tus días fijos y reservas aparecerán aquí. Presiona "Reservar nuevo cupo" para agendar clases.
              </p>
            </div>
          ) : (
            /* Horizontal scroll-snap carousel — shows 2 cards on mobile, 4 on desktop */
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              style={{
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
              }}
            >
              {sesionesDelMes.map(sesion => {
                const dateFormatted = new Date(sesion.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long'
                });
                return (
                  <div
                    key={sesion.id}
                    className={`flex-none flex flex-col justify-between gap-2.5 p-3 sm:p-4 rounded-2xl border transition-all relative overflow-hidden ${
                      sesion.isSuspended
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : sesion.tipo === 'FIJO'
                          ? 'bg-sky-50/50 border-sky-200'
                          : 'bg-emerald-50/50 border-emerald-200'
                    }`}
                    style={{
                      /* 2 visible on mobile, 4 on desktop (accounting for gap) */
                      width: 'calc(50% - 6px)',
                      minWidth: '140px',
                      maxWidth: '220px',
                      scrollSnapAlign: 'start',
                    }}
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                        sesion.isSuspended
                          ? 'bg-slate-100 text-slate-400 border-slate-200'
                          : sesion.tipo === 'FIJO'
                            ? 'bg-sky-100 text-sky-700 border-sky-200'
                            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}>
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className={`text-[11px] font-black text-slate-800 leading-tight capitalize ${sesion.isSuspended ? 'line-through text-slate-400' : ''}`}>
                          {dateFormatted}
                        </p>
                        <p className={`text-[9px] text-slate-500 font-mono mt-0.5 ${sesion.isSuspended ? 'line-through' : ''}`}>
                          {sesion.hora.slice(0, 5)} hs
                        </p>
                      </div>
                      <span className={`text-[7px] font-bold tracking-wider px-1.5 py-0.5 rounded font-mono border self-start ${
                        sesion.isSuspended
                          ? (sesion.suspendedInfo?.reintegrado ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200')
                          : sesion.tipo === 'FIJO'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        {sesion.isSuspended
                          ? (sesion.suspendedInfo?.reintegrado ? 'SUSPENDIDA' : 'SIN REINTEGRO')
                          : sesion.tipo === 'FIJO' ? 'FIJO' : 'INDIVIDUAL'}
                      </span>
                    </div>

                    {!sesion.isSuspended && (
                      <div className="pt-2 border-t border-slate-100/80">
                        {sesion.tipo === 'FIJO' ? (
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Confirmas suspender la clase fija del ${dateFormatted} a las ${sesion.hora} hs?`)) {
                                const res = suspenderClaseFija(socio.id, sesion.turnoId, sesion.fecha);
                                if (res.success) { setSuccessMessage(res.message); setTimeout(() => setSuccessMessage(null), 4000); }
                                else { setErrorMessage(res.message); setTimeout(() => setErrorMessage(null), 4000); }
                              }
                            }}
                            className="text-[9px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 w-full justify-center border border-transparent hover:border-rose-200"
                          >
                            <X className="w-3 h-3" /> Suspender
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Confirmas cancelar la reserva del ${dateFormatted} a las ${sesion.hora} hs?`)) {
                                const res = cancelarReservaIndividual(socio.id, sesion.originalReserva.id);
                                if (res.success) { setSuccessMessage(res.message); setTimeout(() => setSuccessMessage(null), 4000); }
                                else { setErrorMessage(res.message); setTimeout(() => setErrorMessage(null), 4000); }
                              }
                            }}
                            className="text-[9px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 w-full justify-center border border-transparent hover:border-rose-200"
                          >
                            <X className="w-3 h-3" /> Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. MIS LISTAS DE ESPERA ACTIVAS */}
      {misWaitlists.length > 0 && (
        <div className="bg-teal-50/50 border border-teal-200 p-5 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5.5 h-5.5 text-teal-600 animate-pulse" />
            <h3 className="text-xs font-black uppercase text-teal-800 tracking-wider font-mono">
              Mis Reservas en Lista de Espera
            </h3>
          </div>
          <p className="text-[11px] text-teal-700 font-sans mb-4 leading-relaxed">
            Estás anotado en la lista de espera para los siguientes turnos. Si se libera un cupo por cancelación o suspensión de clase, serás promovido automáticamente y recibirás una notificación.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {misWaitlists.map(w => {
              const turn = turnos.find(t => t.id === w.turno_id);
              const dateFormatted = new Date(w.fecha + 'T00:00:00').toLocaleDateString('es-AR', {
                weekday: 'long',
                day: 'numeric',
                month: 'short'
              });
              return (
                <div key={w.id} className="bg-white border border-teal-100 rounded-xl p-2.5 sm:p-3.5 shadow-3xs flex justify-between items-center gap-1.5 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs font-bold text-slate-800 capitalize truncate">
                      {dateFormatted}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                      {turn ? `${turn.hora.slice(0, 5)} hs` : 'Turno'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const res = removerListaEsperaReserva(socio.id, w.turno_id, w.fecha);
                      if (res.success) {
                        setSuccessMessage(res.message);
                        setTimeout(() => setSuccessMessage(null), 3500);
                      } else {
                        setErrorMessage(res.message);
                        setTimeout(() => setErrorMessage(null), 3500);
                      }
                    }}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 font-bold px-2 py-1 rounded-lg text-[9px] transition-all cursor-pointer border border-rose-100 shrink-0"
                  >
                    Salir
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. RECUPEROS PENDIENTES */}
      {pendingRecuperos.length > 0 && (
        <div className="p-5 bg-amber-50/50 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-5.5 h-5.5 text-amber-600 animate-pulse" />
            <h3 className="text-xs font-black uppercase text-amber-800 tracking-wider font-mono">
              Mis Recuperos Pendientes de Reprogramación
            </h3>
          </div>
          <p className="text-[11px] text-amber-700 font-sans mb-4 leading-relaxed">
            Tienes inasistencias registradas (por aviso de falta o vacaciones) que aún no has reprogramado. Cada ticket de recupero es válido por 1 mes (30 días) a partir de la inasistencia. ¡Canjéalos antes de que expiren!
          </p>

          <div className="space-y-3">
            {pendingRecuperos.map(rec => {
              const originalTurn = turnos.find(t => t.id === rec.turno_original_id);
              const dateFormatted = new Date(rec.fecha_inasistencia + 'T00:00:00').toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });
              const limitDateFormatted = new Date(rec.fecha_limite + 'T00:00:00').toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div key={rec.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-3xs flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2.5 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-800">Inasistencia registrada: {dateFormatted}</span>
                      <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                        Turno original: {originalTurn ? `${originalTurn.hora.slice(0, 5)} hs (${originalTurn.dia})` : rec.turno_original_id}
                      </span>
                    </div>
                    <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold shrink-0 self-start sm:self-auto">
                      Vence el {limitDateFormatted}
                    </span>
                  </div>

                  {canjeRecuperoId !== rec.id ? (
                    <button
                      onClick={() => {
                        setCanjeRecuperoId(rec.id);
                        setCanjeTurnoId('');
                        setCanjeFecha('');
                        setCanjeError(null);
                        setCanjeSuccess(null);
                      }}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer border-none"
                    >
                      Reprogramar esta sesión ahora
                    </button>
                  ) : (
                    <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 space-y-3.5 animate-fade-in text-xs">
                      {canjeError && <p className="text-[10px] text-rose-600 font-bold bg-rose-50 p-2 rounded-lg border border-rose-100">{canjeError}</p>}
                      {canjeSuccess && <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">{canjeSuccess}</p>}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Escoge Horario de Grilla:</label>
                          <select
                            value={canjeTurnoId}
                            onChange={(e) => {
                              setCanjeTurnoId(e.target.value);
                              setCanjeFecha('');
                            }}
                            className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white outline-hidden cursor-pointer"
                          >
                            <option value="">-- Seleccionar Turno --</option>
                            {turnos.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.dia} a las {t.hora.slice(0, 5)} hs
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide block">Escoge Fecha Destino:</label>
                          {canjeTurnoId ? (
                            <select
                              value={canjeFecha}
                              onChange={(e) => setCanjeFecha(e.target.value)}
                              className="w-full text-xs p-2 border border-slate-200 rounded-xl bg-white outline-hidden cursor-pointer"
                            >
                              <option value="">-- Seleccionar Fecha --</option>
                              {getAvailableDatesForTurn(turnos.find(t => t.id === canjeTurnoId)!.dia)
                                .filter(d => {
                                  const dObj = new Date(d + 'T00:00:00');
                                  const limitObj = new Date(rec.fecha_limite + 'T23:59:59');
                                  return dObj <= limitObj && dObj >= new Date(new Date().setHours(0,0,0,0));
                                })
                                .map(d => {
                                  const formattedDate = new Date(d + 'T00:00:00').toLocaleDateString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    weekday: 'short'
                                  });
                                  return (
                                    <option key={d} value={d}>
                                      {formattedDate}
                                    </option>
                                  );
                                })}
                            </select>
                          ) : (
                            <input
                              type="text"
                              disabled
                              placeholder="Selecciona primero un turno"
                              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-100/50 text-slate-400 font-mono cursor-not-allowed"
                            />
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={handleCancelCanje}
                          className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border-none bg-transparent"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmCanje(rec.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors border-none"
                        >
                          <Check className="w-4 h-4" />
                          Confirmar Agendamiento
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. DYNAMIC WHATSAPP BOX */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6.5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6" id="socio-whatsapp-support">
        <div className="flex-1 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-mono text-[8px] uppercase tracking-wider">
            <Phone className="w-3 h-3 text-emerald-500" />
            Soporte KAHA GYM
          </div>
          <h3 className="text-base font-black text-slate-800 tracking-tight">¿Deseas cambiar un turno fijo asignado?</h3>
          <p className="text-slate-500 text-xs leading-relaxed max-w-2xl font-medium">
            Los turnos fijos semanales son permanentes y deben ser aprobados o modificados por un Operador / Profesor. Puedes iniciar un chat directo de WhatsApp con nuestro equipo administrativo haciendo click a la derecha.
          </p>
        </div>

        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noreferrer"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs animate-pulse hover:animate-none text-center"
        >
          <span>Conversar por WhatsApp</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};
