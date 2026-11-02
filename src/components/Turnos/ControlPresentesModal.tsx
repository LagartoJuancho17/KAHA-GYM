// src/components/Turnos/ControlPresentesModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGym } from '../../GymContext';
import { Turno, Cliente } from '../../types';
import {
  X, Check, UserCheck, Users, Search, Plus, AlertTriangle,
  Save, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, ShieldAlert, UserX, AlertCircle
} from 'lucide-react';
import { hoyArgentina } from '../../lib/fechas';
import {
  detectarTurnoActual,
  obtenerAlumnosConvocados,
  calcularMetricasAsistencia,
  guardarRegistroAsistencia,
  obtenerRegistroAsistencia,
  obtenerTurnosConAsistenciaDelDia,
  AlumnoClaseAsistencia,
  horaAMinutos
} from '../../lib/controlAsistencia';

interface ControlPresentesModalProps {
  isOpen: boolean;
  onClose: () => void;
  turnoIdInicial?: string;
  fechaInicial?: string;
}

const DIAS_SEMANA_MAP = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'] as const;

function obtenerDiaDeFecha(fechaStr: string): typeof DIAS_SEMANA_MAP[number] {
  if (!fechaStr) return 'LUNES';
  const [y, m, d] = fechaStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return DIAS_SEMANA_MAP[date.getDay()];
}

function formatearFechaLegible(fechaStr: string): string {
  if (!fechaStr) return '';
  const [y, m, d] = fechaStr.split('-').map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  return date.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export const ControlPresentesModal: React.FC<ControlPresentesModalProps> = ({
  isOpen,
  onClose,
  turnoIdInicial,
  fechaInicial
}) => {
  const {
    turnos,
    clientes,
    recuperos,
    planes,
    actualizarEstadoRecupero,
    addAuditLog,
    addToast,
    googleUser
  } = useGym();

  const hoyArg = hoyArgentina();
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(fechaInicial || hoyArg);
  const diaDeFecha = useMemo(() => obtenerDiaDeFecha(fechaSeleccionada), [fechaSeleccionada]);

  // Turnos del día seleccionado
  const turnosDelDia = useMemo(() => {
    return turnos
      .filter(t => t.dia === diaDeFecha)
      .sort((a, b) => horaAMinutos(a.hora) - horaAMinutos(b.hora));
  }, [turnos, diaDeFecha]);

  // Turno seleccionado actualmente
  const [turnoSeleccionadoId, setTurnoSeleccionadoId] = useState<string>('');

  // Estados de presentes (Set de IDs de clientes presentes)
  const [presentesSet, setPresentesSet] = useState<Set<string>>(new Set());

  // Alumnos walk-in agregados en el momento
  const [walkins, setWalkins] = useState<AlumnoClaseAsistencia[]>([]);

  // Buscador y modal de agregado de alumno espontáneo
  const [mostrarBuscadorWalkin, setMostrarBuscadorWalkin] = useState(false);
  const [busquedaWalkin, setBusquedaWalkin] = useState('');

  // Filtro de búsqueda rápida en la lista de alumnos
  const [filtroAlumnos, setFiltroAlumnos] = useState('');

  // Notas de la clase
  const [notasClase, setNotasClase] = useState('');

  // Timestamp de último guardado
  const [ultimoGuardadoHora, setUltimoGuardadoHora] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Turnos que ya tienen asistencia guardada hoy
  const turnosGuardadosSet = useMemo(() => {
    return obtenerTurnosConAsistenciaDelDia(fechaSeleccionada);
  }, [fechaSeleccionada, ultimoGuardadoHora]);

  // Inicializar o auto-detectar turno al abrir o cambiar de fecha
  useEffect(() => {
    if (!isOpen) return;

    if (turnoIdInicial && turnosDelDia.some(t => t.id === turnoIdInicial)) {
      setTurnoSeleccionadoId(turnoIdInicial);
      return;
    }

    // Si es hoy, auto-detectar según la hora actual
    if (fechaSeleccionada === hoyArg && turnosDelDia.length > 0) {
      const autoTurno = detectarTurnoActual(turnosDelDia);
      if (autoTurno) {
        setTurnoSeleccionadoId(autoTurno.id);
        return;
      }
    }

    // Por defecto, el primer turno del día
    if (turnosDelDia.length > 0) {
      setTurnoSeleccionadoId(turnosDelDia[0].id);
    } else {
      setTurnoSeleccionadoId('');
    }
  }, [isOpen, fechaSeleccionada, turnosDelDia, turnoIdInicial, hoyArg]);

  const turnoActual = useMemo(() => {
    return turnos.find(t => t.id === turnoSeleccionadoId) || null;
  }, [turnos, turnoSeleccionadoId]);

  // Mes actual para cálculos de morosidad
  const mesActual = fechaSeleccionada.slice(0, 7);

  // Alumnos convocados regulares (fijos, variables, recuperos)
  const convocadosRegulares = useMemo(() => {
    if (!turnoActual) return [];
    return obtenerAlumnosConvocados({
      turno: turnoActual,
      fecha: fechaSeleccionada,
      clientes,
      recuperos,
      planes,
      mesActual
    });
  }, [turnoActual, fechaSeleccionada, clientes, recuperos, planes, mesActual]);

  // Lista combinada (convocados + walkins)
  const todosLosAlumnos = useMemo(() => {
    return [...convocadosRegulares, ...walkins];
  }, [convocadosRegulares, walkins]);

  // Cargar registro de asistencia persistido cuando cambia turno o fecha
  useEffect(() => {
    if (!turnoActual || !isOpen) return;

    const registroGuardado = obtenerRegistroAsistencia(fechaSeleccionada, turnoActual.id);
    if (registroGuardado) {
      setPresentesSet(new Set(registroGuardado.presentesIds));
      setWalkins(registroGuardado.walkins || []);
      setNotasClase(registroGuardado.notas || '');
      const d = new Date(registroGuardado.actualizadoAt);
      setUltimoGuardadoHora(d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    } else {
      // Estado inicial vacío
      setPresentesSet(new Set());
      setWalkins([]);
      setNotasClase('');
      setUltimoGuardadoHora(null);
    }
  }, [fechaSeleccionada, turnoActual, isOpen]);

  // Métricas en tiempo real
  const metricas = useMemo(() => {
    const cupo = turnoActual ? turnoActual.cupo_maximo : 14;
    return calcularMetricasAsistencia(todosLosAlumnos, presentesSet, cupo);
  }, [todosLosAlumnos, presentesSet, turnoActual]);

  // Toggle de un alumno individual
  const togglePresente = (clienteId: string) => {
    setPresentesSet(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(clienteId)) {
        nuevo.delete(clienteId);
      } else {
        nuevo.add(clienteId);
      }
      return nuevo;
    });
  };

  // Marcar a todos los inscriptos como presentes
  const handleDarPresenteATodos = () => {
    const todosIds = new Set(todosLosAlumnos.map(a => a.clienteId));
    setPresentesSet(todosIds);
    addToast('success', `Se marcaron ${todosIds.size} alumnos como presentes.`);
  };

  // Limpiar presentes / todos ausentes
  const handleMarcarTodosAusentes = () => {
    setPresentesSet(new Set());
  };

  // Agregar un socio como Walk-in espontáneo
  const handleAgregarWalkin = (socio: Cliente) => {
    // Si ya está en la lista, no duplicar
    if (todosLosAlumnos.some(a => a.clienteId === socio.id)) {
      addToast('error', `${socio.nombre} ${socio.apellido} ya está en la lista de esta clase.`);
      return;
    }

    const planSocio = planes.find(p => p.id === socio.plan_id);
    const cuota = socio.precio_personalizado ?? planSocio?.precio ?? 0;
    const esExento = socio.exencion_cobro === 'PERDONADO' || socio.exencion_cobro === 'BECADO';
    const pagoMes = Boolean(socio.ultimo_mes_pagado && socio.ultimo_mes_pagado >= mesActual);
    const tieneDeuda = (socio.deuda_acumulada || 0) > 0;
    const alDia = esExento || (pagoMes && !tieneDeuda);

    const nuevoAlumno: AlumnoClaseAsistencia = {
      clienteId: socio.id,
      nombre: socio.nombre,
      apellido: socio.apellido,
      nombreCompleto: `${socio.nombre} ${socio.apellido}`,
      email: socio.email || '',
      telefono: socio.telefono || '',
      tipoInscripcion: 'WALKIN',
      planNombre: planSocio?.nombre || 'Espontáneo',
      cuota,
      alDia,
      debeMonto: alDia ? 0 : (tieneDeuda ? socio.deuda_acumulada : cuota),
      ultimoMesPagado: socio.ultimo_mes_pagado,
      exencionCobro: socio.exencion_cobro,
      presente: true
    };

    setWalkins(prev => [...prev, nuevoAlumno]);
    // Auto-marcarlo presente
    setPresentesSet(prev => new Set(prev).add(socio.id));
    setMostrarBuscadorWalkin(false);
    setBusquedaWalkin('');
    addToast('success', `${socio.nombre} ${socio.apellido} agregado como Alumno Espontáneo.`);
  };

  const handleRemoverWalkin = (clienteId: string) => {
    setWalkins(prev => prev.filter(w => w.clienteId !== clienteId));
    setPresentesSet(prev => {
      const nuevo = new Set(prev);
      nuevo.delete(clienteId);
      return nuevo;
    });
  };

  // Guardar la planilla de asistencia
  const handleGuardarAsistencia = () => {
    if (!turnoActual) return;
    setGuardando(true);

    try {
      const presentesArray = Array.from(presentesSet);
      const ausentesArray = todosLosAlumnos
        .filter(a => !presentesSet.has(a.clienteId))
        .map(a => a.clienteId);

      const registro = {
        id: `${fechaSeleccionada}_${turnoActual.id}`,
        fecha: fechaSeleccionada,
        turnoId: turnoActual.id,
        dia: turnoActual.dia,
        hora: turnoActual.hora,
        profesor: turnoActual.profesor,
        presentesIds: presentesArray,
        ausentesIds: ausentesArray,
        walkins,
        notas: notasClase.trim(),
        actualizadoAt: new Date().toISOString(),
        guardadoPor: googleUser?.email || 'admin'
      };

      guardarRegistroAsistencia(registro);

      // Si algún alumno presente tenía cupón de recupero asignado a este turno, completarlo
      let recuperosCompletadosCount = 0;
      todosLosAlumnos.forEach(a => {
        if (a.tipoInscripcion === 'RECUPERO' && a.recuperoId && presentesSet.has(a.clienteId)) {
          actualizarEstadoRecupero(a.recuperoId, 'COMPLETADO');
          recuperosCompletadosCount++;
        }
      });

      // Registrar auditoría en la base
      addAuditLog(
        'CONTROL_ASISTENCIA_REGISTRADA',
        {
          fecha: fechaSeleccionada,
          turno_id: turnoActual.id,
          hora: turnoActual.hora,
          presentes: metricas.totalPresentes,
          ausentes: metricas.totalAusentes,
          inscriptos: metricas.totalInscriptos,
          recuperos_completados: recuperosCompletadosCount,
          notas: notasClase.trim() || undefined
        },
        googleUser?.email
      );

      const horaStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      setUltimoGuardadoHora(horaStr);
      addToast(
        'success',
        `Planilla de ${turnoActual.hora} hs guardada: ${metricas.totalPresentes} presentes / ${metricas.totalAusentes} ausentes.`
      );
    } finally {
      setGuardando(false);
    }
  };

  // Filtrado de la lista para búsqueda rápida
  const alumnosFiltrados = useMemo(() => {
    if (!filtroAlumnos.trim()) return todosLosAlumnos;
    const q = filtroAlumnos.toLowerCase();
    return todosLosAlumnos.filter(
      a => a.nombreCompleto.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)
    );
  }, [todosLosAlumnos, filtroAlumnos]);

  // Lista de socios elegibles para Walk-in (activos que no estén ya en la clase)
  const sociosElegiblesWalkin = useMemo(() => {
    if (!mostrarBuscadorWalkin || !busquedaWalkin.trim()) return [];
    const q = busquedaWalkin.toLowerCase();
    const yaEnClase = new Set(todosLosAlumnos.map(a => a.clienteId));
    return clientes
      .filter(c => c.activo && !yaEnClase.has(c.id))
      .filter(c => `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 6);
  }, [mostrarBuscadorWalkin, busquedaWalkin, todosLosAlumnos, clientes]);

  // Estado temporal del turno (En curso, Próxima, Pasada)
  const estadoTemporal = useMemo(() => {
    if (!turnoActual || fechaSeleccionada !== hoyArg) return null;
    const ahoraMinutos = horaAMinutos(
      new Date().toLocaleTimeString('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      })
    );
    const tMin = horaAMinutos(turnoActual.hora);

    if (ahoraMinutos >= tMin - 15 && ahoraMinutos <= tMin + 45) {
      return { tipo: 'EN_CURSO', texto: 'EN CURSO', color: 'bg-emerald-500 text-white animate-pulse' };
    }
    if (ahoraMinutos < tMin - 15) {
      return { tipo: 'PROXIMA', texto: 'PRÓXIMA', color: 'bg-sky-500 text-white' };
    }
    return { tipo: 'FINALIZADA', texto: 'FINALIZADA', color: 'bg-slate-500 text-white' };
  }, [turnoActual, fechaSeleccionada, hoyArg]);

  // Modal accessibility: Escape key listener
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mostrarBuscadorWalkin) {
          setMostrarBuscadorWalkin(false);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mostrarBuscadorWalkin, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="presentes-modal-title"
      ref={modalRef}
    >
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* HEADER PRINCIPAL */}
        <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-800 text-white px-5 py-4 border-b border-zinc-700 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-400 text-zinc-950 flex items-center justify-center font-extrabold shadow-sm shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="presentes-modal-title" className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Control de Presentes
                </h3>
                {estadoTemporal && (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${estadoTemporal.color}`}>
                    {estadoTemporal.texto}
                  </span>
                )}
                {ultimoGuardadoHora && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-lime-300 font-semibold bg-zinc-800/80 px-2 py-0.5 rounded-md border border-zinc-700">
                    <CheckCircle2 className="w-3 h-3 text-lime-400" />
                    Guardado {ultimoGuardadoHora} hs
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Tomá lista en el inicio de cada horario y verificá el estado de cuenta de cada alumno
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-zinc-700"
            aria-label="Cerrar modal de control de presentes"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SELECTOR DE FECHA Y HORARIOS */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 shrink-0 space-y-3">
          {/* Fila: Selector de Fecha + Navegación */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    const [y, m, d] = fechaSeleccionada.split('-').map(Number);
                    const prev = new Date(y, m - 1, d - 1, 12, 0, 0);
                    setFechaSeleccionada(prev.toISOString().slice(0, 10));
                  }}
                  className="px-2 py-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer border-r border-slate-200"
                  title="Día anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  value={fechaSeleccionada}
                  onChange={e => e.target.value && setFechaSeleccionada(e.target.value)}
                  className="px-2 py-1 text-xs font-semibold text-slate-800 bg-transparent border-none outline-hidden cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => {
                    const [y, m, d] = fechaSeleccionada.split('-').map(Number);
                    const next = new Date(y, m - 1, d + 1, 12, 0, 0);
                    setFechaSeleccionada(next.toISOString().slice(0, 10));
                  }}
                  className="px-2 py-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer border-l border-slate-200"
                  title="Día siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {fechaSeleccionada !== hoyArg && (
                <button
                  type="button"
                  onClick={() => setFechaSeleccionada(hoyArg)}
                  className="text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                >
                  Volver a Hoy
                </button>
              )}

              <span className="text-xs font-medium text-slate-600 capitalize hidden md:inline">
                {formatearFechaLegible(fechaSeleccionada)}
              </span>
            </div>

            {/* Profesor a cargo */}
            {turnoActual?.profesor && (
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-medium">
                <span>Profesor a cargo:</span>
                <span className="font-bold">{turnoActual.profesor}</span>
              </div>
            )}
          </div>

          {/* Carrusel de Horarios del Día */}
          <div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {turnosDelDia.length === 0 ? (
                <div className="text-xs text-slate-500 py-1">
                  No hay clases programadas para este día ({diaDeFecha}).
                </div>
              ) : (
                turnosDelDia.map(t => {
                  const seleccionado = t.id === turnoSeleccionadoId;
                  const tieneGuardado = turnosGuardadosSet.has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTurnoSeleccionadoId(t.id)}
                      className={`
                        relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer
                        ${seleccionado
                          ? 'bg-zinc-900 text-white shadow-md border border-zinc-900 scale-102'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs'
                        }
                      `}
                    >
                      <Clock className={`w-3 h-3 ${seleccionado ? 'text-lime-400' : 'text-slate-400'}`} />
                      <span>{t.hora} hs</span>
                      {tieneGuardado && (
                        <span
                          className={`w-2 h-2 rounded-full ${seleccionado ? 'bg-lime-400' : 'bg-emerald-500'}`}
                          title="Asistencia registrada"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* MÉTRICAS & BARRA DE ACCIÓN */}
        {turnoActual ? (
          <>
            <div className="px-5 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
              {/* Contadores */}
              <div className="flex items-center gap-3 sm:gap-6 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Convocados</span>
                  <span className="font-extrabold text-slate-800 text-sm">
                    {metricas.totalInscriptos} / {metricas.cupoMaximo}
                  </span>
                </div>

                <div className="h-7 w-px bg-slate-200" />

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Presentes</span>
                  <span className="font-extrabold text-emerald-600 text-sm">
                    {metricas.totalPresentes} ({metricas.porcentajeAsistencia}%)
                  </span>
                </div>

                <div className="h-7 w-px bg-slate-200" />

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Ausentes</span>
                  <span className="font-extrabold text-slate-500 text-sm">
                    {metricas.totalAusentes}
                  </span>
                </div>

                <div className="h-7 w-px bg-slate-200" />

                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Vacantes</span>
                  <span className="font-extrabold text-sky-600 text-sm">
                    {metricas.lugaresLibres}
                  </span>
                </div>
              </div>

              {/* Botonera de acciones masivas */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDarPresenteATodos}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="Marcar como presente a todos los convocados"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Todos Presentes</span>
                  <span className="sm:hidden">Todos</span>
                </button>

                <button
                  type="button"
                  onClick={handleMarcarTodosAusentes}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all cursor-pointer"
                  title="Desmarcar todos"
                >
                  Limpiar
                </button>

                <button
                  type="button"
                  onClick={() => setMostrarBuscadorWalkin(prev => !prev)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  title="Agregar alumno espontáneo a esta clase"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>+ Espontáneo</span>
                </button>
              </div>
            </div>

            {/* BUSCADOR DE ALUMNO ESPONTÁNEO (WALK-IN) */}
            {mostrarBuscadorWalkin && (
              <div className="bg-indigo-50/60 border-b border-indigo-100 px-5 py-3 shrink-0 animate-fade-in">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Agregar Alumno Espontáneo (Walk-in) a la clase de las {turnoActual.hora} hs:
                  </span>
                  <button
                    onClick={() => {
                      setMostrarBuscadorWalkin(false);
                      setBusquedaWalkin('');
                    }}
                    className="text-xs text-indigo-500 hover:text-indigo-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="relative max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={busquedaWalkin}
                    onChange={e => setBusquedaWalkin(e.target.value)}
                    placeholder="Buscar socio por nombre o email..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs outline-hidden focus:border-indigo-500 shadow-2xs"
                    autoFocus
                  />
                </div>

                {sociosElegiblesWalkin.length > 0 && (
                  <div className="mt-2 bg-white border border-indigo-200 rounded-lg shadow-md divide-y divide-slate-100 overflow-hidden max-w-md">
                    {sociosElegiblesWalkin.map(socio => (
                      <div
                        key={socio.id}
                        onClick={() => handleAgregarWalkin(socio)}
                        className="px-3 py-2 hover:bg-indigo-50 flex items-center justify-between cursor-pointer transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{socio.nombre} {socio.apellido}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{socio.email || 'Sin email'}</p>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          Agregar
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {busquedaWalkin && sociosElegiblesWalkin.length === 0 && (
                  <p className="text-[11px] text-slate-500 mt-1.5 italic">
                    No se encontraron socios activos que coincidan con la búsqueda.
                  </p>
                )}
              </div>
            )}

            {/* FILTRO RÁPIDO DE ALUMNOS */}
            {todosLosAlumnos.length > 6 && (
              <div className="px-5 py-2 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={filtroAlumnos}
                  onChange={e => setFiltroAlumnos(e.target.value)}
                  placeholder="Filtrar por nombre en esta clase..."
                  className="bg-transparent text-xs text-slate-700 outline-hidden w-full placeholder:text-slate-400"
                />
                {filtroAlumnos && (
                  <button
                    onClick={() => setFiltroAlumnos('')}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* LISTA DE ALUMNOS (CARDS / ROWS) */}
            <div className="flex-1 overflow-y-auto px-4 py-3 divide-y divide-slate-100 min-h-[220px]">
              {alumnosFiltrados.length === 0 ? (
                <div className="text-center py-12 px-4 text-slate-400">
                  <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-600">
                    No hay alumnos convocados para este turno
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Podés agregar alumnos espontáneos con el botón "+ Espontáneo" si vino alguien a entrenar.
                  </p>
                </div>
              ) : (
                alumnosFiltrados.map((alumno, idx) => {
                  const esPresente = presentesSet.has(alumno.clienteId);

                  return (
                    <div
                      key={alumno.clienteId}
                      className={`
                        py-2.5 px-3 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3
                        ${esPresente
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/80 border border-emerald-200/60'
                          : 'hover:bg-slate-50 border border-transparent'
                        }
                      `}
                    >
                      {/* Información del socio */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-mono text-slate-400 w-5 shrink-0 text-right">
                          {idx + 1}.
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {alumno.apellido}, {alumno.nombre}
                            </span>

                            {/* Badge de tipo de inscripción */}
                            {alumno.tipoInscripcion === 'FIJO' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                Fijo
                              </span>
                            )}
                            {alumno.tipoInscripcion === 'VARIABLE' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                Reserva
                              </span>
                            )}
                            {alumno.tipoInscripcion === 'RECUPERO' && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200"
                                title={`Recupera falta del ${alumno.recuperoOrigen || ''}`}
                              >
                                Recupero
                              </span>
                            )}
                            {alumno.tipoInscripcion === 'WALKIN' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Walk-in
                              </span>
                            )}

                            {/* Alerta de Deuda / Cuota */}
                            {alumno.alDia ? (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                Al día
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full"
                                title={`Debe $${alumno.debeMonto.toLocaleString('es-AR')} (Último mes: ${alumno.ultimoMesPagado || 'Nunca'})`}
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                Debe ${alumno.debeMonto.toLocaleString('es-AR')}
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5 font-mono">
                            <span>{alumno.planNombre}</span>
                            {alumno.telefono && (
                              <>
                                <span>·</span>
                                <span>{alumno.telefono}</span>
                              </>
                            )}
                            {alumno.tipoInscripcion === 'RECUPERO' && alumno.recuperoOrigen && (
                              <span className="text-amber-700 font-sans text-[10px]">
                                (Origen: {alumno.recuperoOrigen})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción individual */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        {alumno.tipoInscripcion === 'WALKIN' && (
                          <button
                            type="button"
                            onClick={() => handleRemoverWalkin(alumno.clienteId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Quitar alumno espontáneo"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        {/* Switch de Asistencia (Mínimo 44x44px para cumplimiento de accesibilidad y pantalla táctil) */}
                        <button
                          type="button"
                          onClick={() => togglePresente(alumno.clienteId)}
                          aria-pressed={esPresente}
                          className={`
                            min-h-[44px] min-w-[130px] px-3 py-2 rounded-xl text-xs font-extrabold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer
                            outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2
                            ${esPresente
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus-visible:ring-emerald-500'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 focus-visible:ring-slate-400'
                            }
                          `}
                          id={`btn-asistencia-${alumno.clienteId}`}
                        >
                          {esPresente ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
                              <span>PRESENTE</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>AUSENTE</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* SECCIÓN NOTAS DE LA CLASE */}
            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 shrink-0">
              <input
                type="text"
                value={notasClase}
                onChange={e => setNotasClase(e.target.value)}
                placeholder="Observaciones de la clase (opcional, ej: aviso de llegada tarde, WOD especial, incidentes)..."
                className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-hidden focus:border-slate-400 shadow-2xs placeholder:text-slate-400"
              />
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
            <p className="text-sm font-semibold text-slate-700">Seleccioná un horario para tomar asistencia.</p>
          </div>
        )}

        {/* FOOTER GENERAL CON BOTÓN DE GUARDADO */}
        <div className="bg-white border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {turnoActual ? (
              <span>
                Clase <strong className="text-slate-800">{turnoActual.hora} hs</strong> ({turnoActual.dia}) · {metricas.totalPresentes} presente(s) marcados
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              disabled={guardando || !turnoActual}
              onClick={handleGuardarAsistencia}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              id="btn-guardar-asistencia-modal"
            >
              <Save className="w-4 h-4" />
              <span>{guardando ? 'Guardando...' : 'Guardar Asistencia'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
