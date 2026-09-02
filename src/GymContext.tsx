// src/GymContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Cliente, Plan, HistorialPrecioPlan, Turno, Pago, PagoEnRevision,
  RecuperoTurno, AuditLog, RolUsuario, TipoCliente, EstadoCliente, MedioPago, Novedad,
  ReservaIndividual, ClaseSuspendida, AlertaNotificacion, Gasto, Profesor, NovedadProfesor, WaitlistReserva,
  ToastMessage
} from './types';
import { 
  INITIAL_PLANES, INITIAL_HISTORIAL_PRECIOS, generarTurnosIniciales, 
  INITIAL_CLIENTES, INITIAL_PAGOS, INITIAL_AUDIT_LOGS, INITIAL_RECUPEROS, INITIAL_NOVEDADES, INITIAL_GASTOS
} from './initialMockData';
import { supabase } from './supabaseClient';
import { mergeLogs, logsFaltantesEnDb, parsearLogsGuardados, normalizarIdsLegacy, nuevoLogId, MAX_LOGS } from './lib/auditLogs';
import { calcularOcupacion, conflictosAlAgregarFijo, reservasPropiasDuplicadas } from './lib/ocupacion';

interface GymContextType {
  clientes: Cliente[];
  planes: Plan[];
  historialPrecios: HistorialPrecioPlan[];
  turnos: Turno[];
  pagos: Pago[];
  recuperos: RecuperoTurno[];
  auditLogs: AuditLog[];
  novedades: Novedad[];
  notificaciones: AlertaNotificacion[];
  gastos: Gasto[];
  profesores: Profesor[];
  novedadesProfesores: NovedadProfesor[];
  rolActivo: RolUsuario;
  setRolActivo: (rol: RolUsuario) => void;
  selectedSocioId: string | null;
  setSelectedSocioId: (id: string | null) => void;
  addNotificacion: (tipo: 'PAGO_REALIZADO' | 'SISTEMA' | 'DEUDA_VENCIDA', titulo: string, mensaje: string) => void;
  marcarNotificacionesLeidas: () => void;
  eliminarNotificacion: (id: string) => void;

  // Gastos, Profesores and Novedades
  registrarGasto: (gasto: Omit<Gasto, 'id' | 'creado_at'>) => { success: boolean; message: string };
  eliminarGasto: (id: string) => void;
  registrarProfesor: (profesor: Omit<Profesor, 'id' | 'activo'>) => { success: boolean; message: string };
  updateProfesor: (id: string, updates: Partial<Profesor>) => { success: boolean; message: string };
  eliminarProfesor: (id: string) => void;
  registrarNovedadProfesor: (novedad: Omit<NovedadProfesor, 'id' | 'creado_at'>) => { success: boolean; message: string };
  eliminarNovedadProfesor: (id: string) => void;
  
  // Google Authentication simulation states
  googleUser: { email: string; name: string; picture?: string; role: RolUsuario } | null;
  signInWithGoogle: (email: string, nameName: string, picture?: string) => Promise<void>;
  signInWithEmailAndPassword: (email: string, pass: string) => Promise<void>;
  signOutGoogle: () => void;
  pendingRegistrationUser: { email: string; name: string; picture?: string } | null;
  completeSocioRegistration: (nombre: string, apellido: string, telefono: string) => Promise<void>;
  
  // Waitlist Reservas
  waitlistReservas: WaitlistReserva[];
  agregarListaEsperaReserva: (clienteId: string, turnoId: string, fecha: string) => { success: boolean; message: string };
  removerListaEsperaReserva: (clienteId: string, turnoId: string, fecha: string) => { success: boolean; message: string };

  // Clientes Methods
  addCliente: (cliente: Omit<Cliente, 'id' | 'creado_at' | 'deuda_acumulada' | 'ultimo_mes_pagado' | 'estado' | 'turnos_fijos' | 'activo'> & { tipo?: TipoCliente; turnos_fijos?: string[]; deuda_acumulada?: number; allowDuplicate?: boolean; initialReservaIndividual?: { turno_id: string; fecha: string }; initialWaitlistReserva?: { turno_id: string; fecha: string } }) => { success: boolean; message: string; duplicate?: boolean; id?: string };
  updateCliente: (id: string, updates: Partial<Cliente>) => { success: boolean; message: string };
  autorizarCliente: (id: string, planId?: string, tipo?: TipoCliente) => { success: boolean; message: string };
  bajaLogicaCliente: (id: string) => void;
  altaCliente: (id: string) => void;
  eliminarCliente: (id: string) => void;
  bajaClasesSocio: (clienteId: string, clases: { turno_id: string; fecha: string }[], opciones?: { esBajaTemporal?: boolean; exencionCobro?: 'SUSPENDIDO' | 'POSTERGADO' | 'NINGUNA' }) => { success: boolean; message: string };
  importarClientesCSV: (clientesImportados: Array<{ nombre: string; apellido: string; email: string; telefono: string; tipo: TipoCliente; plan_nombre: string }>) => { procesados: number; insertados: number; errores: string[] };

  // Planes Methods
  updatePrecioPlan: (planId: string, nuevoPrecio: number, userEmail: string) => void;

  // Turnos Methods
  asignarClienteFijo: (clienteId: string, turnoId: string, opciones?: { forzar?: boolean; reemplazarTurnoId?: string }) => { success: boolean; message: string; putInWaitlist?: boolean; requiereConfirmacion?: boolean; conflictos?: Array<{ fecha: string; ocupacionActual: number; ocupacionConElFijo: number; cupo: number }>; excedePlan?: boolean; turnosFijosActuales?: string[]; maxDias?: number; clienteNombre?: string };
  removerAsignacionFija: (clienteId: string, turnoId: string) => void;
  darDeBajaTurnosFijosSocio: (clienteId: string, motivo?: string, userEmail?: string) => { success: boolean; message: string };
  darDeBajaTurnosFijosMultiple: (clienteIds: string[], motivo?: string, userEmail?: string) => { success: boolean; procesados: number };
  notificarBajaClase: (clienteId: string, turnoId: string, fecha?: string) => boolean;
  notificarAltaWaitlist: (clienteId: string, turnoId: string, fecha?: string) => boolean;
  asignarTurnoVariable: (clienteId: string, turnoId: string | null) => { success: boolean; message: string };
  checkInFlexible: (clienteId: string, turnoId: string) => { success: boolean; message: string };
  agregarRecupero: (recupero: Omit<RecuperoTurno, 'id' | 'estado' | 'fecha_limite'> & { fecha_limite?: string }) => { success: boolean; message: string };
  actualizarEstadoRecupero: (id: string, estado: 'PENDIENTE' | 'COMPLETADO' | 'EXPIRADO') => void;
  programarRecuperoPendiente: (recuperoId: string, turnoRecuperoId: string, fechaRecupero: string) => { success: boolean; message: string };
  modificarPrecioOCupoTurno: (turnoId: string, nuevoCupo: number) => void;
  asignarProfesorTurno: (turnoId: string, profesor: string) => void;
  registrarVacaciones: (clienteId: string, fechaInicio: string, fechaFin: string) => { success: boolean; message: string };
  crearReservaIndividual: (clienteId: string, turnoId: string, fecha: string) => { success: boolean; message: string };
  cancelarReservaIndividual: (clienteId: string, reservaId: string) => { success: boolean; message: string };
  suspenderClaseFija: (clienteId: string, turnoId: string, fecha: string) => { success: boolean; message: string };
  revertirSuspensionClaseFija: (clienteId: string, turnoId: string, fecha: string) => { success: boolean; message: string };

  // Pagos Methods
  registrarPago: (pago: Omit<Pago, 'id' | 'creado_at' | 'fecha_pago'>, userEmail: string) => { success: boolean; message: string };
  actualizarPago: (pagoId: string, updates: Partial<Pick<Pago, 'cliente_id' | 'monto' | 'medio_pago' | 'mes_correspondiente' | 'hash_transaccion' | 'destino_transferencia'>>, userEmail?: string) => { success: boolean; message: string };
  actualizarDestinoPago: (pagoId: string, destino: 'JUANCHI' | 'RULO' | 'EFECTIVO') => void;
  eliminarPago: (pagoId: string) => void;
  importarPagosCSV: (pagosImportados: Array<{ cliente_email: string; monto: number; fecha_pago: string; medio_pago: MedioPago; mes: string; hash: string }>, userEmail: string) => { procesados: number; insertados: number; duplicados: number; errores: string[] };

  // Transferencias en Revision
  pagosEnRevision: PagoEnRevision[];
  solicitarPagoTransferencia: (clienteId: string, monto?: number, mes?: string) => { success: boolean; message: string };
  aprobarPagoTransferencia: (revisionId: string, adminEmail: string, destinoTransferencia?: 'JUANCHI' | 'RULO' | string, montoOverride?: number) => { success: boolean; message: string };
  rechazarPagoTransferencia: (revisionId: string) => { success: boolean; message: string };
  
  // Novedades Methods
  addNovedad: (novedad: Omit<Novedad, 'id' | 'fecha'>) => { success: boolean; message: string; id?: string };
  updateNovedad: (id: string, updates: Partial<Novedad>) => { success: boolean; message: string };
  deleteNovedad: (id: string) => void;

  // Morosidad Simulation
  ejecutarCronMorosidad: (simularFecha: string) => { procesados: number; nuevosMorosos: number; deudaTotal: number; suspendidosSemanaCount: number; dadosBajaCount: number; logLineas: string[] };
  borrarHistorial: () => void;
  addAuditLog: (accion: string, detalles: any, userEmail?: string) => void;

  // Toasts / Feedback Methods
  toasts: ToastMessage[];
  addToast: (type: 'add' | 'delete' | 'success' | 'error', message: string) => void;
  removeToast: (id: string) => void;
  loading: boolean;
}

const GymContext = createContext<GymContextType | undefined>(undefined);

// Helper to synthesize a premium sound effect using the Web Audio API (no assets needed, works offline)
const playAudioTone = (type: 'add' | 'delete' | 'success' | 'error') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'add' || type === 'success') {
      // Ascending C5 -> E5 -> G5 chord (gentle and premium chime)
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      playNote(523.25, now, 0.25); // C5
      playNote(659.25, now + 0.07, 0.25); // E5
      playNote(783.99, now + 0.14, 0.35); // G5
    } else if (type === 'delete') {
      // Descending double beep / drop (G4 -> C4)
      const playNote = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      
      playNote(392.00, now, 0.12); // G4
      playNote(261.63, now + 0.08, 0.22); // C4
    } else if (type === 'error') {
      // Short buzzer
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {
    console.warn("Failed to play audio notification", e);
  }
};

// Helper to trigger haptic vibration feedback using the device haptics API
const triggerVibration = (type: 'add' | 'delete' | 'success' | 'error') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    if (type === 'add' || type === 'success') {
      navigator.vibrate(60); // Single quick pulse
    } else if (type === 'delete') {
      navigator.vibrate([100, 50, 100]); // Quick double pulse
    } else if (type === 'error') {
      navigator.vibrate([120, 60, 120]); // Triple buzzer pattern
    }
  }
};

export const GymProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [planes, setPlanes] = useState<Plan[]>([]);
  const [historialPrecios, setHistorialPrecios] = useState<HistorialPrecioPlan[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [pagosEnRevision, setPagosEnRevision] = useState<PagoEnRevision[]>(() => {
    try {
      const stored = localStorage.getItem('gym_pagos_revision');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [recuperos, setRecuperos] = useState<RecuperoTurno[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [notificaciones, setNotificaciones] = useState<AlertaNotificacion[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [novedadesProfesores, setNovedadesProfesores] = useState<NovedadProfesor[]>([]);
  const [waitlistReservas, setWaitlistReservas] = useState<WaitlistReserva[]>(() => {
    try {
      const stored = localStorage.getItem('gym_waitlist_reservas');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [googleUser, setGoogleUser] = useState<{ email: string; name: string; picture?: string; role: RolUsuario } | null>(() => {
    const local = localStorage.getItem('gym_google_user');
    return local ? JSON.parse(local) : null;
  });
  const [loading, setLoading] = useState(!!supabase);
  const [pendingRegistrationUser, setPendingRegistrationUser] = useState<{ email: string; name: string; picture?: string } | null>(null);
  const [rolActivo, setRolActivo] = useState<RolUsuario>(() => {
    const localUser = localStorage.getItem('gym_google_user');
    if (localUser) {
      try {
        return JSON.parse(localUser).role;
      } catch (e) {}
    }
    const localRol = localStorage.getItem('gym_rol_activo');
    return (localRol as RolUsuario) || 'ADMIN';
  });
  const [selectedSocioId, setSelectedSocioId] = useState<string | null>(() => {
    const localUser = localStorage.getItem('gym_google_user');
    if (localUser) {
      try {
        const u = JSON.parse(localUser);
        if (u.role === 'SOCIO') {
          // If logged in via Google as a socio, map them automatically
          const localClientes = localStorage.getItem('gym_clientes');
          const list: Cliente[] = localClientes ? JSON.parse(localClientes) : [];
          const matched = list.find(c => c.activo && c.email.toLowerCase().trim() === u.email.toLowerCase().trim());
          if (matched) return matched.id;
        }
      } catch (e) {}
    }
    return null;
  });

  // Auto-seleccionar primer socio activo si no hay ninguno seleccionado
  useEffect(() => {
    if (!selectedSocioId && clientes.length > 0) {
      const primerActivo = clientes.find(c => c.activo);
      if (primerActivo) {
        setSelectedSocioId(primerActivo.id);
      }
    }
  }, [clientes, selectedSocioId]);

  const loadSupabaseData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      // 1. Fetch Planes
      const { data: planesDb, error: planesErr } = await supabase.from('planes').select('*');
      if (planesErr) throw planesErr;

      // Seed default plan "Aún no sabe" if missing in DB
      let planesList = planesDb || [];
      const hasNonePlan = planesList.some(p => p.nombre === 'Aún no sabe');
      if (!hasNonePlan) {
        const { data: newPlan, error: insertErr } = await supabase.from('planes').insert({
          id: '00000000-0000-0000-0000-000000000000',
          nombre: 'Aún no sabe',
          dias_por_semana: 5,
          precio: 0
        }).select();
        if (!insertErr && newPlan) {
          planesList = [...planesList, ...newPlan];
        }
      }

      // 2. Fetch Clientes
      const { data: clientesDb, error: clientesErr } = await supabase
        .from('clientes')
        .select('*')
        .order('creado_at', { ascending: false });
      if (clientesErr) throw clientesErr;

      // 3. Fetch Turnos
      const { data: turnosDb, error: turnosErr } = await supabase.from('turnos').select('*');
      if (turnosErr) throw turnosErr;

      // Seed turnos if empty in Supabase (automatic setup!)
      let dbTurnos = turnosDb || [];
      if (dbTurnos.length === 0) {
        const seedTurnos = generarTurnosIniciales().map(t => {
          return {
            dia: t.dia,
            hora: `${t.hora}:00`,
            cupo_maximo: t.cupo_maximo
          };
        });
        const { data: newTurnos, error: turnosSeedErr } = await supabase.from('turnos').insert(seedTurnos).select();
        if (!turnosSeedErr && newTurnos) {
          dbTurnos = newTurnos;
        }
      }

      // 4. Fetch assignments and waitlist
      const { data: asignacionesDb, error: asigErr } = await supabase.from('asignaciones_turnos').select('*');
      if (asigErr) throw asigErr;

      const { data: waitlistDb, error: waitErr } = await supabase.from('lista_espera_turnos').select('*');
      if (waitErr) throw waitErr;

      // Lista de espera POR FECHA (dia puntual). Antes vivia solo en localStorage,
      // por eso los socios reportaban que no les quedaba guardada.
      const { data: esperaFechaDb, error: esperaFechaErr } = await supabase
        .from('lista_espera_reservas')
        .select('*')
        .order('creado_at', { ascending: true });
      if (esperaFechaErr) console.warn('No se pudo leer la lista de espera por fecha:', esperaFechaErr);

      // 5. Fetch Pagos
      const { data: pagosDb, error: pagosErr } = await supabase
        .from('pagos')
        .select('*')
        .order('creado_at', { ascending: false });
      if (pagosErr) throw pagosErr;

      // 6. Fetch Recuperos
      const { data: recuperosDb, error: recsErr } = await supabase.from('recupero_turnos').select('*');
      if (recsErr) throw recsErr;

      // 7. Fetch Audit Logs desde la base de datos Supabase
      const { data: logsDb, error: logsErr } = await supabase
        .from('logs_auditoria')
        .select('*')
        .order('creado_at', { ascending: false })
        .limit(500);
      if (logsErr) {
        console.warn('Nota sobre logs de auditoría en Supabase:', logsErr);
      }

      // Migración: los turnos de 11:00 de Lunes/Miércoles/Viernes/Jueves ya no existen (solo Martes 11:00).
      // generarTurnosIniciales dejó de crearlos, pero pueden quedar filas viejas
      // en la tabla `turnos` de Supabase. Las filtramos al cargar y las limpiamos de la base.
      const TURNOS_OBSOLETOS = ['LUNES-11:00', 'MIERCOLES-11:00', 'VIERNES-11:00', 'JUEVES-11:00'];
      const localIdDeTurno = (t: any) => `${t.dia}-${t.hora.substring(0, 5)}`;
      const turnosObsoletos = dbTurnos.filter(t => TURNOS_OBSOLETOS.includes(localIdDeTurno(t)));
      if (turnosObsoletos.length > 0) {
        const uuidsObsoletos = turnosObsoletos.map(t => t.id);
        // Limpieza best-effort en Supabase (hijos primero por FK). Si falla por
        // permisos, el filtro en memoria igual los oculta de inmediato.
        supabase.from('asignaciones_turnos').delete().in('turno_id', uuidsObsoletos).then(({ error }) => {
          if (error) console.error('Error al limpiar asignaciones de turnos obsoletos (11 LMV):', error);
        });
        supabase.from('lista_espera_turnos').delete().in('turno_id', uuidsObsoletos).then(({ error }) => {
          if (error) console.error('Error al limpiar lista de espera de turnos obsoletos (11 LMV):', error);
        });
        supabase.from('turnos').delete().in('id', uuidsObsoletos).then(({ error }) => {
          if (error) console.error('Error al eliminar turnos obsoletos (11 LMV) en Supabase:', error);
        });
        // Filtrado en memoria: no aparecen aunque la limpieza en la base falle.
        dbTurnos = dbTurnos.filter(t => !TURNOS_OBSOLETOS.includes(localIdDeTurno(t)));
      }

      // Mapping helpers
      const getTurnoIdFromUuid = (uuid: string): string => {
        const matched = dbTurnos.find(t => t.id === uuid);
        if (!matched) return '';
        const cleanHora = matched.hora.substring(0, 5); // "07:30:00" -> "07:30"
        return `${matched.dia}-${cleanHora}`;
      };

      // Map relation data to local Client structure — Supabase is the source of truth
      const clientList: Cliente[] = (clientesDb || []).map(c => {
        const fixedShifts = (asignacionesDb || [])
          .filter(a => a.cliente_id === c.id)
          .map(a => getTurnoIdFromUuid(a.turno_id))
          .filter(id => id !== '');

        return {
          id: c.id,
          nombre: c.nombre,
          apellido: c.apellido,
          email: c.email,
          telefono: c.telefono || '',
          tipo: c.tipo as TipoCliente,
          auto_return: 'approved',
          estado: c.estado as EstadoCliente,
          plan_id: c.plan_id || 'p-none',
          activo: c.activo,
          deuda_acumulada: Number(c.deuda_acumulada),
          ultimo_mes_pagado: c.ultimo_mes_pagado || '',
          turnos_fijos: fixedShifts,
          exencion_cobro: (c.exencion_cobro || 'NINGUNA') as any,
          autorizado: c.autorizado ?? true,
          reservas_individuales: c.reservas_individuales || [],
          clases_suspendidas: c.clases_suspendidas || [],
          creado_at: c.creado_at,
          precio_personalizado: c.precio_personalizado != null ? Number(c.precio_personalizado) : undefined,
          dias_personalizados: c.dias_personalizados != null ? Number(c.dias_personalizados) : undefined,
          nota_plan_personalizado: c.nota_plan_personalizado || undefined
        };
      });

      // Map relation data to local Turno structure
      const shiftList: Turno[] = dbTurnos.map(t => {
        const localId = `${t.dia}-${t.hora.substring(0, 5)}`;
        const assigned = (asignacionesDb || [])
          .filter(a => a.turno_id === t.id)
          .map(a => a.cliente_id);
        const waiting = (waitlistDb || [])
          .filter(w => w.turno_id === t.id)
          .map(w => w.cliente_id);

        return {
          id: localId,
          dia: t.dia as any,
          hora: t.hora.substring(0, 5),
          cupo_maximo: t.cupo_maximo,
          profesor: t.profesor || undefined,
          asignados_ids: assigned,
          lista_espera_ids: waiting,
          db_uuid: t.id
        };
      });

      // Sort turnos by day and time
      const orderDias = { 'LUNES': 1, 'MARTES': 2, 'MIERCOLES': 3, 'JUEVES': 4, 'VIERNES': 5 };
      shiftList.sort((a, b) => {
        const dDiff = (orderDias[a.dia] || 0) - (orderDias[b.dia] || 0);
        if (dDiff !== 0) return dDiff;
        return a.hora.localeCompare(b.hora);
      });

      const mappedPlanes: Plan[] = planesList.map(p => ({
        id: p.id,
        nombre: p.nombre,
        dias_por_semana: p.dias_por_semana,
        precio: Number(p.precio),
        creado_at: p.creado_at
      }));

      const mappedPagos: Pago[] = (pagosDb || []).map(p => {
        const c = clientList.find(cl => cl.id === p.cliente_id);
        return {
          id: p.id,
          cliente_id: p.cliente_id,
          cliente_nombre_completo: c ? `${c.nombre} ${c.apellido}` : 'Socio Desconocido',
          monto: Number(p.monto),
          medio_pago: p.medio_pago as MedioPago,
          mes_correspondiente: p.mes_correspondiente,
          hash_transaccion: p.hash_transaccion,
          destino_transferencia: p.destino_transferencia || undefined,
          registrado_por: p.registrado_por || 'admin@gimnasio.com.ar',
          fecha_pago: p.fecha_pago,
          creado_at: p.creado_at
        };
      });

      const mappedRecs: RecuperoTurno[] = (recuperosDb || []).map(r => {
        const c = clientList.find(cl => cl.id === r.cliente_id);
        return {
          id: r.id,
          cliente_id: r.cliente_id,
          cliente_nombre: c ? `${c.nombre} ${c.apellido}` : 'Socio Desconocido',
          turno_original_id: getTurnoIdFromUuid(r.turno_original_id),
          fecha_inasistencia: r.fecha_inasistencia,
          turno_recupero_id: r.turno_recupero_id ? getTurnoIdFromUuid(r.turno_recupero_id) : 'PENDIENTE_DEFINICION',
          fecha_recupero: r.fecha_recupero || '',
          estado: r.estado as any,
          fecha_limite: r.fecha_limite
        };
      });

      const mappedLogs: AuditLog[] = (logsDb || []).map(l => ({
        id: l.id,
        usuario_id: l.usuario_id || '',
        usuario_email: l.usuario_email || '',
        accion: l.accion,
        detalles: l.detalles,
        creado_at: l.creado_at
      }));

      setPlanes(mappedPlanes);
      setClientes(clientList);
      setTurnos(shiftList);
      setPagos(mappedPagos);
      setRecuperos(mappedRecs);

      // Lista de espera por fecha: la base manda. Se mapea el uuid del turno al id
      // local ("MARTES-21:00") que usa todo el front.
      const uuidToLocal = new Map<string, string>();
      dbTurnos.forEach(t => uuidToLocal.set(t.id, `${t.dia}-${t.hora.substring(0, 5)}`));
      const esperaFecha: WaitlistReserva[] = (esperaFechaDb || [])
        .map((w: any) => {
          const localId = uuidToLocal.get(w.turno_id);
          if (!localId) return null;
          return {
            id: w.id,
            cliente_id: w.cliente_id,
            turno_id: localId,
            fecha: typeof w.fecha === 'string' ? w.fecha.slice(0, 10) : w.fecha,
            creado_at: w.creado_at
          } as WaitlistReserva;
        })
        .filter(Boolean) as WaitlistReserva[];
      setWaitlistReservas(esperaFecha);
      localStorage.setItem('gym_waitlist_reservas', JSON.stringify(esperaFecha));
      // Historial: unir base + local, nunca reemplazar.
      // Antes, si la base traía aunque sea 1 fila, se pisaba localStorage entero y
      // todo lo que no había llegado a subir se perdía en el refresh. Ese era el bug.
      // normalizarIdsLegacy: los logs de versiones viejas tenían id "log-<ts>-<rnd>",
      // que la columna uuid rechaza y haría fallar el backfill entero.
      const logsLocales = normalizarIdsLegacy(parsearLogsGuardados(localStorage.getItem('gym_audit_logs')));
      const logsUnidos = mergeLogs(mappedLogs, logsLocales);
      setAuditLogs(logsUnidos);
      localStorage.setItem('gym_audit_logs', JSON.stringify(logsUnidos));

      // Backfill: subir lo que está local y todavía no en la base. Corre SIEMPRE
      // (antes solo corría con la base vacía), así los inserts que fallaron se
      // reintentan solos y el historial converge entre dispositivos.
      const faltantes = logsFaltantesEnDb(logsLocales, mappedLogs);
      if (faltantes.length > 0) {
        const aSubir = faltantes.slice(0, MAX_LOGS).map(l => ({
          id: l.id,
          usuario_email: l.usuario_email || 'admin@gimnasio.com.ar',
          accion: l.accion,
          detalles: l.detalles || {},
          creado_at: l.creado_at
        }));
        // upsert por id: si alguno ya estaba, no rompe con duplicate key.
        supabase.from('logs_auditoria').upsert(aSubir, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.error('Backfill de logs de auditoría falló:', error);
          else console.log(`✅ Historial: ${aSubir.length} log(s) locales subidos a Supabase`);
        });
      }

      // --- NOVEDADES: cargar de Supabase (con fallback a localStorage si la tabla no existe aún) ---
      try {
        const { data: novedadesDb, error: novedadesErr } = await supabase
          .from('novedades')
          .select('*')
          .order('creado_at', { ascending: false });

        if (novedadesErr) {
          // Tabla no existe todavía: cargar desde localStorage como fallback
          console.warn('[KAHA] Tabla novedades no encontrada en Supabase, usando localStorage:', novedadesErr.message);
          const localNov = localStorage.getItem('gym_novedades');
          const localNovedades: Novedad[] = localNov ? JSON.parse(localNov) : INITIAL_NOVEDADES;
          setNovedades(localNovedades);
          localStorage.setItem('gym_novedades', JSON.stringify(localNovedades));
        } else {
          const mappedNovedades: Novedad[] = (novedadesDb || []).map(n => ({
            id: n.id,
            titulo: n.titulo,
            contenido: n.contenido,
            fecha: n.fecha,
            categoria: n.categoria as Novedad['categoria'],
            creado_por: n.creado_por,
            destacado: n.destacado
          }));

          // Merge: si hay novedades locales que no están en la DB, subirlas
          const localNov = localStorage.getItem('gym_novedades');
          const localNovedades: Novedad[] = localNov ? JSON.parse(localNov) : [];
          const dbIds = new Set(mappedNovedades.map(n => n.id));
          const localFaltantes = localNovedades.filter(n => !dbIds.has(n.id));

          if (localFaltantes.length > 0) {
            const toUpsert = localFaltantes.map(n => ({
              id: n.id,
              titulo: n.titulo,
              contenido: n.contenido,
              fecha: n.fecha,
              categoria: n.categoria,
              creado_por: n.creado_por,
              destacado: n.destacado
            }));
            supabase.from('novedades').upsert(toUpsert, { onConflict: 'id' }).then(({ error }) => {
              if (error) console.warn('[KAHA] No se pudieron subir novedades locales a Supabase:', error.message);
              else console.log(`✅ Novedades: ${toUpsert.length} novedad(es) local(es) sincronizadas a Supabase`);
            });
          }

          const merged = [...localFaltantes, ...mappedNovedades];
          setNovedades(merged);
          localStorage.setItem('gym_novedades', JSON.stringify(merged));
        }
      } catch (novErr) {
        // Error inesperado: usar localStorage
        console.warn('[KAHA] Error al cargar novedades de Supabase:', novErr);
        const localNov = localStorage.getItem('gym_novedades');
        const fallback: Novedad[] = localNov ? JSON.parse(localNov) : INITIAL_NOVEDADES;
        setNovedades(fallback);
      }

      const localGoogleUser = localStorage.getItem('gym_google_user');
      if (localGoogleUser) {
        try {
          const parsed = JSON.parse(localGoogleUser);
          if (parsed.role === 'SOCIO') {
            const matched = clientList.find(c => c.activo && c.email.toLowerCase().trim() === parsed.email.toLowerCase().trim());
            if (matched) {
              setSelectedSocioId(matched.id);
            }
          }
        } catch (e) {}
      }

      console.log('✅ Sincronización exitosa desde Supabase completada');
    } catch (err) {
      console.error('❌ Error al inicializar/sincronizar Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial
  useEffect(() => {
    if (supabase) {
      loadSupabaseData();
    } else {
      const localClientes = localStorage.getItem('gym_clientes');
      const localPlanes = localStorage.getItem('gym_planes');
      const localHistorial = localStorage.getItem('gym_historial_precios');
      const localTurnos = localStorage.getItem('gym_turnos');
      const localPagos = localStorage.getItem('gym_pagos');
      const localRecuperos = localStorage.getItem('gym_recuperos');
      const localLogs = localStorage.getItem('gym_audit_logs');
      const localNovedades = localStorage.getItem('gym_novedades');
      const localNotificaciones = localStorage.getItem('gym_notificaciones');
      const localGastos = localStorage.getItem('gym_gastos');
      const localProfesores = localStorage.getItem('gym_profesores');
      const localNovedadesProfesores = localStorage.getItem('gym_novedades_profesores');

      if (localClientes) setClientes(JSON.parse(localClientes));
      else {
        setClientes(INITIAL_CLIENTES);
        localStorage.setItem('gym_clientes', JSON.stringify(INITIAL_CLIENTES));
      }

      if (localPlanes) {
        const parsedPlanes = JSON.parse(localPlanes);
        if (!parsedPlanes.some((p: any) => p.id === 'p-none')) {
          const updated = [{ id: 'p-none', nombre: 'Aún no sabe', dias_por_semana: 5, precio: 0.00, creado_at: '2026-01-10T10:00:00Z' }, ...parsedPlanes];
          setPlanes(updated);
          localStorage.setItem('gym_planes', JSON.stringify(updated));
        } else {
          setPlanes(parsedPlanes);
        }
      } else {
        setPlanes(INITIAL_PLANES);
        localStorage.setItem('gym_planes', JSON.stringify(INITIAL_PLANES));
      }

      if (localHistorial) setHistorialPrecios(JSON.parse(localHistorial));
      else {
        setHistorialPrecios(INITIAL_HISTORIAL_PRECIOS);
        localStorage.setItem('gym_historial_precios', JSON.stringify(INITIAL_HISTORIAL_PRECIOS));
      }

      if (localTurnos) {
        let parsedTurnos: Turno[] = JSON.parse(localTurnos);
        // Migración: eliminar turno 11:00 de Lunes, Miércoles, Viernes y Jueves
        const turnosA_Eliminar = ['LUNES-11:00', 'MIERCOLES-11:00', 'VIERNES-11:00', 'JUEVES-11:00'];
        const turnosFiltrados = parsedTurnos.filter(t => !turnosA_Eliminar.includes(t.id));
        if (turnosFiltrados.length !== parsedTurnos.length) {
          localStorage.setItem('gym_turnos', JSON.stringify(turnosFiltrados));
          parsedTurnos = turnosFiltrados;
        }
        setTurnos(parsedTurnos);
      } else {
        const baseTurnos = generarTurnosIniciales();
        INITIAL_CLIENTES.forEach(c => {
          if (c.activo && c.tipo === 'FIJO' && c.turnos_fijos) {
            c.turnos_fijos.forEach(tId => {
              const index = baseTurnos.findIndex(t => t.id === tId);
              if (index !== -1) {
                baseTurnos[index].asignados_ids.push(c.id);
              }
            });
          }
        });
        setTurnos(baseTurnos);
        localStorage.setItem('gym_turnos', JSON.stringify(baseTurnos));
      }

      if (localPagos) {
        const parsed = JSON.parse(localPagos);
        const hasJulData = parsed.some((p: any) => p.mes_correspondiente === '2026-07');
        if (hasJulData) {
          setPagos(parsed);
        } else {
          setPagos(INITIAL_PAGOS);
          localStorage.setItem('gym_pagos', JSON.stringify(INITIAL_PAGOS));
        }
      } else {
        setPagos(INITIAL_PAGOS);
        localStorage.setItem('gym_pagos', JSON.stringify(INITIAL_PAGOS));
      }

      if (localRecuperos) setRecuperos(JSON.parse(localRecuperos));
      else {
        setRecuperos(INITIAL_RECUPEROS);
        localStorage.setItem('gym_recuperos', JSON.stringify(INITIAL_RECUPEROS));
      }

      // Parseo defensivo: un JSON.parse crudo acá tiraba y cortaba toda la carga
      // de la app si el storage quedaba a medio escribir.
      const logsGuardados = parsearLogsGuardados(localLogs);
      if (logsGuardados.length > 0) {
        setAuditLogs(mergeLogs(logsGuardados));
      } else {
        setAuditLogs(INITIAL_AUDIT_LOGS);
        localStorage.setItem('gym_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
      }

      if (localNovedades) setNovedades(JSON.parse(localNovedades));
      else {
        setNovedades(INITIAL_NOVEDADES);
        localStorage.setItem('gym_novedades', JSON.stringify(INITIAL_NOVEDADES));
      }

      if (localNotificaciones) setNotificaciones(JSON.parse(localNotificaciones));
      else {
        setNotificaciones([]);
        localStorage.setItem('gym_notificaciones', JSON.stringify([]));
      }

      if (localGastos) {
        const parsedG = JSON.parse(localGastos);
        const hasJulG = parsedG.some((g: any) => g.fecha?.startsWith('2026-07'));
        if (hasJulG) {
          setGastos(parsedG);
        } else {
          setGastos(INITIAL_GASTOS as Gasto[]);
          localStorage.setItem('gym_gastos', JSON.stringify(INITIAL_GASTOS));
        }
      } else {
        setGastos(INITIAL_GASTOS as Gasto[]);
        localStorage.setItem('gym_gastos', JSON.stringify(INITIAL_GASTOS));
      }

      if (localProfesores) setProfesores(JSON.parse(localProfesores));
      else {
        const initProfesores = [
          { id: 'prof-1', nombre: 'Juanchi', email: 'juanchi@gimnasio.com.ar', telefono: '11-3803-2652', valor_hora: 2500, activo: true },
          { id: 'prof-2', nombre: 'Rulo', email: 'rulo@gimnasio.com.ar', telefono: '11-4455-6677', valor_hora: 2500, activo: true },
          { id: 'prof-3', nombre: 'Lucas', email: 'lucas@gimnasio.com.ar', telefono: '11-8899-0011', valor_hora: 2200, activo: true },
          { id: 'prof-4', nombre: 'Denise', email: 'denise@gimnasio.com.ar', telefono: '11-7788-9900', valor_hora: 2200, activo: true }
        ];
        setProfesores(initProfesores as Profesor[]);
        localStorage.setItem('gym_profesores', JSON.stringify(initProfesores));
      }

      if (localNovedadesProfesores) setNovedadesProfesores(JSON.parse(localNovedadesProfesores));
      else {
        const hoy = new Date().toISOString().slice(0, 10);
        const initNovedadesP = [
          { id: 'nov-p-1', profesor_id: 'prof-2', fecha: hoy, turno_id: 'LUNES-08:30', tipo: 'AUSENCIA', creado_at: new Date().toISOString() }
        ];
        setNovedadesProfesores(initNovedadesP as NovedadProfesor[]);
        localStorage.setItem('gym_novedades_profesores', JSON.stringify(initNovedadesP));
      }
    }

    const localClientes = localStorage.getItem('gym_clientes');
    const localGoogleUser = localStorage.getItem('gym_google_user');
    const localRol = localStorage.getItem('gym_rol_activo');

    if (localGoogleUser) {
      try {
        const parsed = JSON.parse(localGoogleUser);
        setGoogleUser(parsed);
        setRolActivo(parsed.role);
        
        if (parsed.role === 'SOCIO') {
          const list = localClientes ? JSON.parse(localClientes) : INITIAL_CLIENTES;
          const matched = list.find((c: any) => c.activo && c.email.toLowerCase().trim() === parsed.email.toLowerCase().trim());
          if (matched) {
            setSelectedSocioId(matched.id);
          }
        }
      } catch (e) {}
    } else if (localRol) {
      setRolActivo(localRol as RolUsuario);
    }
  }, []);

  // Listen for storage events from other tabs to keep state synchronized in real-time
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        const val = JSON.parse(e.newValue);
        switch (e.key) {
          case 'gym_clientes':
            setClientes(val);
            break;
          case 'gym_planes':
            setPlanes(val);
            break;
          case 'gym_historial_precios':
            setHistorialPrecios(val);
            break;
          case 'gym_turnos':
            setTurnos(val);
            break;
          case 'gym_pagos':
            setPagos(val);
            break;
          case 'gym_recuperos':
            setRecuperos(val);
            break;
          case 'gym_audit_logs':
            // Otra pestaña escribió logs: unir, no reemplazar. Si esta pestaña
            // tiene un log que la otra no vio todavía, no se pierde.
            setAuditLogs(prev => mergeLogs(Array.isArray(val) ? val : [], prev));
            break;
          case 'gym_novedades':
            setNovedades(val);
            break;
          case 'gym_notificaciones':
            setNotificaciones(val);
            break;
          case 'gym_gastos':
            setGastos(val);
            break;
          case 'gym_profesores':
            setProfesores(val);
            break;
          case 'gym_novedades_profesores':
            setNovedadesProfesores(val);
            break;
          case 'gym_google_user':
            setGoogleUser(val);
            break;
          case 'gym_rol_activo':
            setRolActivo(val);
            break;
          case 'gym_waitlist_reservas':
            setWaitlistReservas(val);
            break;
        }
      } catch (err) {
        console.error("Error parsing storage sync key:", e.key, err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sync helpers
  const saveState = (
    updatedClientes: Cliente[],
    updatedPlanes?: Plan[],
    updatedHistorial?: HistorialPrecioPlan[],
    updatedTurnos?: Turno[],
    updatedPagos?: Pago[],
    updatedRecuperos?: RecuperoTurno[],
    updatedLogs?: AuditLog[],
    updatedNovedades?: Novedad[]
  ) => {
    if (updatedClientes) {
      setClientes(updatedClientes);
      localStorage.setItem('gym_clientes', JSON.stringify(updatedClientes));
    }
    if (updatedPlanes) {
      setPlanes(updatedPlanes);
      localStorage.setItem('gym_planes', JSON.stringify(updatedPlanes));
    }
    if (updatedHistorial) {
      setHistorialPrecios(updatedHistorial);
      localStorage.setItem('gym_historial_precios', JSON.stringify(updatedHistorial));
    }
    if (updatedTurnos) {
      setTurnos(updatedTurnos);
      localStorage.setItem('gym_turnos', JSON.stringify(updatedTurnos));
    }
    if (updatedPagos) {
      setPagos(updatedPagos);
      localStorage.setItem('gym_pagos', JSON.stringify(updatedPagos));
    }
    if (updatedRecuperos) {
      setRecuperos(updatedRecuperos);
      localStorage.setItem('gym_recuperos', JSON.stringify(updatedRecuperos));
    }
    // OJO: `updatedLogs` se ignora a propósito. Los 31 call sites de saveState le
    // pasan el `auditLogs` del closure del render, que es una foto VIEJA: si en el
    // mismo handler ya corrió addAuditLog, escribir esa foto borraba el log recién
    // creado del state y de localStorage. addAuditLog es el único dueño del
    // historial (state + localStorage + Supabase); saveState no lo toca.
    void updatedLogs;
    if (updatedNovedades) {
      setNovedades(updatedNovedades);
      localStorage.setItem('gym_novedades', JSON.stringify(updatedNovedades));
    }
  };

  /**
   * Inserts new RecuperoTurno entries to Supabase.
   * newRecs: only the newly created recuperos (not the full list).
   * currentTurnos: the turnos array to resolve local IDs to db_uuids.
   */
  const syncRecuperosToSupabase = (newRecs: RecuperoTurno[], currentTurnos?: Turno[]) => {
    if (!supabase || !newRecs.length) return;
    const turnosList = currentTurnos || turnos;

    const getDbUuid = (localId: string): string | null => {
      if (!localId || localId === 'PENDIENTE_DEFINICION') return null;
      const t = turnosList.find(t => t.id === localId);
      return t?.db_uuid || null;
    };

    const rows = newRecs.map(r => ({
      id: r.id,
      cliente_id: r.cliente_id,
      turno_original_id: getDbUuid(r.turno_original_id),
      fecha_inasistencia: r.fecha_inasistencia,
      turno_recupero_id: getDbUuid(r.turno_recupero_id),
      fecha_recupero: r.fecha_recupero || null,
      estado: r.estado,
      fecha_limite: r.fecha_limite
    })).filter(r => r.turno_original_id !== null); // skip if we can't resolve the turno UUID

    if (rows.length === 0) return;

    supabase.from('recupero_turnos').upsert(rows, { onConflict: 'id' }).then(({ error }) => {
      if (error) console.error('Error al sincronizar recuperos en Supabase:', error);
    });
  };

  const addAuditLog = (accion: string, detalles: any, userEmail?: string) => {
    const emailToUse = userEmail || googleUser?.email || (rolActivo === 'ADMIN' ? 'admin@gimnasio.com.ar' : 'operador@gimnasio.com.ar');
    // El id se genera acá y es el MISMO en state, localStorage y Supabase.
    // Antes el id local era temporal ("log-...") y el de la base otro distinto,
    // así que al refrescar el mismo evento se veía duplicado o se perdía.
    const newLog: AuditLog = {
      id: nuevoLogId(),
      // googleUser no tiene `id` (es { email, name, picture?, role }), así que esto
      // siempre fue '' en runtime. La identidad del usuario va en usuario_email.
      usuario_id: '',
      usuario_email: emailToUse,
      accion,
      detalles: detalles || {},
      creado_at: new Date().toISOString()
    };

    // Fuente de verdad en memoria: siempre funcional, nunca desde un closure viejo.
    setAuditLogs(prev => mergeLogs([newLog], prev));

    // localStorage: se relee y se une, así no pisa lo que haya escrito otra pestaña.
    try {
      const guardados = parsearLogsGuardados(localStorage.getItem('gym_audit_logs'));
      localStorage.setItem('gym_audit_logs', JSON.stringify(mergeLogs([newLog], guardados)));
    } catch (e) { /* cuota llena o modo privado: el log igual vive en memoria y en la base */ }

    // Supabase: se manda el id y la fecha explícitos para que coincidan con lo local.
    // Si falla (sin red, error puntual), el log queda en localStorage y el próximo
    // arranque lo sube solo vía backfill. No se pierde.
    if (supabase) {
      supabase
        .from('logs_auditoria')
        .insert({
          id: newLog.id,
          usuario_email: emailToUse,
          accion,
          detalles: detalles || {},
          creado_at: newLog.creado_at
        })
        .then(({ error }) => {
          if (error) console.error('Log de auditoría no subió (se reintenta al recargar):', error);
        });
    }
  };

  const handleSetRolActivo = (rol: RolUsuario) => {
    setRolActivo(rol);
    localStorage.setItem('gym_rol_activo', rol);
    addAuditLog('SESION_ROL_CAMBIADO', { rol_anterior: rolActivo, rol_nuevo: rol });
  };

  // Fuzzy matching simple
  const isDuplicateFuzzy = (nombre: string, apellido: string, email: string, lista: Cliente[]) => {
    const cleanN = nombre.toLowerCase().trim();
    const cleanA = apellido.toLowerCase().trim();
    const cleanE = email.toLowerCase().trim();

    return lista.some(elem => {
      if (!elem.activo) return false;
      if (elem.email.toLowerCase().trim() === cleanE) return true;
      
      // Fuzzy simple por similitud de letras
      const nomSimil = elem.nombre.toLowerCase().trim() === cleanN && elem.apellido.toLowerCase().trim() === cleanA;
      return nomSimil;
    });
  };

  const getUuidFromTurnoId = (tId: string): string => {
    const matched = turnos.find(t => t.id === tId);
    return matched?.db_uuid || '';
  };

  const resolveTurnoUuid = async (tId: string): Promise<string | null> => {
    const matched = turnos.find(t => t.id === tId);
    if (matched?.db_uuid) return matched.db_uuid;

    if (supabase) {
      const parts = tId.split('-');
      const dia = parts[0];
      const hora = parts[1];
      if (dia && hora) {
        const horaFull = hora.length === 5 ? `${hora}:00` : hora;
        const { data } = await supabase
          .from('turnos')
          .select('id')
          .eq('dia', dia)
          .eq('hora', horaFull)
          .maybeSingle();
        if (data?.id) return data.id;
      }
    }
    return null;
  };

  // CLIENTS CRUD
  const addCliente = (clientData: Omit<Cliente, 'id' | 'creado_at' | 'deuda_acumulada' | 'ultimo_mes_pagado' | 'estado' | 'turnos_fijos' | 'activo'> & { 
    tipo?: TipoCliente;
    turnos_fijos?: string[];
    deuda_acumulada?: number;
    allowDuplicate?: boolean;
    initialReservaIndividual?: { turno_id: string; fecha: string };
    // Igual que initialReservaIndividual, pero para la lista de espera cuando el
    // turno esta lleno. Va aca adentro porque agregarListaEsperaReserva busca el
    // socio en el state `clientes`, y el recien creado todavia no esta ahi.
    initialWaitlistReserva?: { turno_id: string; fecha: string };
  }) => {
    // Validar duplicados (email o nombre+apellido idénticos) salvo que allowDuplicate sea true
    if (!clientData.allowDuplicate && isDuplicateFuzzy(clientData.nombre, clientData.apellido, clientData.email, clientes)) {
      return { 
        success: false, 
        message: 'Ya existe un cliente activo registrado con el mismo email o mismo nombre completo (Fuzzy Matching)',
        duplicate: true 
      };
    }

    const plan = planes.find(p => p.id === clientData.plan_id);
    const planPrecio = plan ? plan.precio : 0;

    const nextSeq = String(clientes.length + 1).padStart(3, '0');
    const customCode = clientData.codigo_socio?.trim() || `SOC-${nextSeq}`;

    const newClientId = crypto.randomUUID();
    const initialTurnosFijos = clientData.turnos_fijos || [];
    const initialDeuda = clientData.deuda_acumulada || 0;

    // Actualizar grilla de turnos para cada turno fijo asignado inicialmente
    let updatedTurnos = [...turnos];
    const actuallyAssignedTurnosFijos: string[] = [];
    const waitlistTurnosFijos: string[] = [];

    if (initialTurnosFijos.length > 0) {
      updatedTurnos = turnos.map(t => {
        if (initialTurnosFijos.includes(t.id)) {
          if (t.asignados_ids.length < t.cupo_maximo) {
            actuallyAssignedTurnosFijos.push(t.id);
            return { ...t, asignados_ids: [...t.asignados_ids.filter(id => id !== newClientId), newClientId] };
          } else {
            waitlistTurnosFijos.push(t.id);
            return { ...t, lista_espera_ids: [...t.lista_espera_ids.filter(id => id !== newClientId), newClientId] };
          }
        }
        return t;
      });
    }

    const initialReservas: ReservaIndividual[] = clientData.initialReservaIndividual ? [{
      id: `res-${Date.now()}`,
      turno_id: clientData.initialReservaIndividual.turno_id,
      fecha: clientData.initialReservaIndividual.fecha,
      creado_at: new Date().toISOString()
    }] : [];

    const newClient: Cliente = {
      ...clientData,
      codigo_socio: customCode,
      tipo: clientData.tipo || 'FIJO',
      exencion_cobro: clientData.exencion_cobro || 'NINGUNA',
      id: newClientId,
      estado: initialDeuda > 0 ? 'CON_DEUDA' : 'ACTIVO',
      deuda_acumulada: initialDeuda,
      ultimo_mes_pagado: new Date().toISOString().slice(0, 7), // Al día del mes de registro
      turnos_fijos: actuallyAssignedTurnosFijos,
      reservas_individuales: initialReservas,
      clases_suspendidas: [],
      activo: true,
      creado_at: new Date().toISOString(),
      autorizado: true
    };

    const updatedClientes = [newClient, ...clientes];
    saveState(updatedClientes, undefined, undefined, updatedTurnos);

    // Promesa del alta en la base. La lista de espera por fecha la espera antes de
    // insertarse, porque tiene FK a clientes.
    let esperarAltaDelSocio: Promise<unknown> = Promise.resolve();

    if (supabase) {
      const planUuid = newClient.plan_id === 'p-none' ? '00000000-0000-0000-0000-000000000000' : newClient.plan_id;
      // Persistencia ORDENADA: primero se inserta (y espera) el cliente, y solo
      // cuando su fila existe se insertan las asignaciones/lista de espera, que
      // referencian al cliente por FK. Hacerlo en paralelo (fire-and-forget)
      // provocaba que la asignación llegara antes que el cliente y la FK la
      // rechazara silenciosamente: el socio quedaba "perdido" en los turnos.
      esperarAltaDelSocio = (async () => {
        const { error: clienteError } = await supabase.from('clientes').insert({
          id: newClient.id,
          nombre: newClient.nombre,
          apellido: newClient.apellido,
          email: newClient.email,
          telefono: newClient.telefono,
          tipo: newClient.tipo,
          estado: newClient.estado,
          plan_id: planUuid,
          activo: newClient.activo,
          deuda_acumulada: newClient.deuda_acumulada,
          ultimo_mes_pagado: newClient.ultimo_mes_pagado,
          exencion_cobro: newClient.exencion_cobro,
          autorizado: newClient.autorizado,
          creado_at: newClient.creado_at,
          precio_personalizado: newClient.precio_personalizado ?? null,
          dias_personalizados: newClient.dias_personalizados ?? null,
          nota_plan_personalizado: newClient.nota_plan_personalizado ?? null,
          reservas_individuales: newClient.reservas_individuales || []
        });

        if (clienteError) {
          console.error("Error al insertar cliente en Supabase:", clienteError);
          addToast('error', 'El socio no se guardó en la base de datos. Revisá la conexión y volvé a registrarlo.');
          return; // sin cliente en la base, sus asignaciones violarían la FK
        }

        let syncFallo = false;

        // Asignaciones fijas exitosas (el cliente ya existe → sin race de FK)
        for (const tId of actuallyAssignedTurnosFijos) {
          const turnoUuid = await resolveTurnoUuid(tId);
          if (!turnoUuid) {
            syncFallo = true;
            console.warn(`No se pudo resolver el UUID del turno ${tId}; asignación no persistida en Supabase.`);
            continue;
          }
          const { error } = await supabase.from('asignaciones_turnos').insert({
            cliente_id: newClientId,
            turno_id: turnoUuid
          });
          if (error) {
            syncFallo = true;
            console.error("Error al insertar asignacion en Supabase:", error);
          }
        }

        // Turnos en lista de espera
        for (const tId of waitlistTurnosFijos) {
          const turnoUuid = await resolveTurnoUuid(tId);
          if (!turnoUuid) {
            syncFallo = true;
            console.warn(`No se pudo resolver el UUID del turno ${tId}; lista de espera no persistida en Supabase.`);
            continue;
          }
          const { error } = await supabase.from('lista_espera_turnos').insert({
            cliente_id: newClientId,
            turno_id: turnoUuid
          });
          if (error) {
            syncFallo = true;
            console.error("Error al insertar en lista de espera en Supabase:", error);
          }
        }

        if (syncFallo) {
          addToast('error', 'El socio se guardó, pero no se pudieron sincronizar todos sus turnos. Revisá y reasignalos desde "Gestionar Turnos".');
        }
      })().catch((err) => {
        console.error("Error inesperado al sincronizar el alta del socio con Supabase:", err);
        addToast('error', 'Ocurrió un error al guardar el socio en la base. Verificá que se haya registrado correctamente.');
      });
    }

    // Lista de espera para una fecha puntual (turno lleno). Se hace acá y no
    // llamando a agregarListaEsperaReserva desde afuera, porque esa función busca
    // al socio en el state `clientes` y el recién creado todavía no está: React no
    // actualizó el state dentro del mismo handler. Acá tenemos newClient a mano.
    if (clientData.initialWaitlistReserva) {
      const { turno_id, fecha } = clientData.initialWaitlistReserva;
      const nuevoEnEspera: WaitlistReserva = {
        id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        cliente_id: newClient.id,
        turno_id,
        fecha,
        creado_at: new Date().toISOString()
      };
      setWaitlistReservas(prev => {
        const yaEsta = prev.some(w => w.cliente_id === newClient.id && w.turno_id === turno_id && w.fecha === fecha);
        const next = yaEsta ? prev : [...prev, nuevoEnEspera];
        localStorage.setItem('gym_waitlist_reservas', JSON.stringify(next));
        return next;
      });
      // Se persiste DESPUES de que el socio exista en la base: lista_espera_reservas
      // tiene foreign key a clientes, y el alta del socio es asincrona. Sin esta
      // espera el insert fallaba por FK y la anotacion no quedaba guardada.
      esperarAltaDelSocio.then(() => {
        persistirEsperaEnSupabase('alta', newClient.id, turno_id, fecha);
      });
      addAuditLog('LISTA_ESPERA_RESERVA_AGREGADO', {
        cliente: `${newClient.nombre} ${newClient.apellido}`,
        turno_id,
        fecha
      });
    }

    addAuditLog('CLIENTE_CREADO', { id: newClient.id, nombre: `${newClient.nombre} ${newClient.apellido}`, tipo: newClient.tipo, turnos: actuallyAssignedTurnosFijos, lista_espera: waitlistTurnosFijos });
    if (waitlistTurnosFijos.length > 0) {
      addToast('add', `Socio registrado. Se agregó a lista de espera en ${waitlistTurnosFijos.length} turno(s) completo(s).`);
    } else {
      addToast('add', 'Socio registrado exitosamente.');
    }
    return { success: true, message: 'Cliente registrado exitosamente.', id: newClient.id };
  };

  const updateCliente = (id: string, updates: Partial<Cliente>) => {
    // Validar email único si se cambia
    if (updates.email) {
      const otroDuplicado = clientes.some(c => c.id !== id && c.activo && c.email.toLowerCase().trim() === updates.email?.toLowerCase().trim());
      if (otroDuplicado) {
        return { success: false, message: 'El correo electrónico ya se encuentra registrado por otro miembro.' };
      }
    }

    // Gestionar si cambia de plan
    let extraLog = '';
    const clientePrev = clientes.find(c => c.id === id);
    if (updates.plan_id && clientePrev && clientePrev.plan_id !== updates.plan_id) {
      const pAnterior = planes.find(p => p.id === clientePrev.plan_id)?.nombre || '';
      const pNuevo = planes.find(p => p.id === updates.plan_id)?.nombre || '';
      extraLog = `Cambió plan de [${pAnterior}] a [${pNuevo}]`;
      
      // Si cambia de plan y tenía turnos asignados fijos, comprobar límite de turnos si excede días por semana
      const planNuevo = planes.find(p => p.id === updates.plan_id);
      const maxDias = updates.dias_personalizados ?? clientePrev.dias_personalizados ?? (planNuevo ? planNuevo.dias_por_semana : 5);
      if (clientePrev.turnos_fijos.length > maxDias) {
        // Recortamos turnos excedentes
        updates.turnos_fijos = clientePrev.turnos_fijos.slice(0, maxDias);
        // Desasignar en los turnos
        const turnosAQuitar = clientePrev.turnos_fijos.slice(maxDias);
        const updatedTurnos = turnos.map(t => {
          if (turnosAQuitar.includes(t.id)) {
            return { ...t, asignados_ids: t.asignados_ids.filter(cid => cid !== id) };
          }
          return t;
        });
        saveState(clientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);
      }
    }

    const updated = clientes.map(c => {
      if (c.id === id) {
        return { ...c, ...updates };
      }
      return c;
    });

    saveState(updated);

    if (supabase) {
      const allowedColumns = [
        'nombre', 'apellido', 'email', 'telefono', 'tipo', 'estado',
        'plan_id', 'activo', 'deuda_acumulada', 'ultimo_mes_pagado',
        'exencion_cobro', 'autorizado',
        'precio_personalizado', 'dias_personalizados', 'nota_plan_personalizado'
      ];
      const payload: any = {};
      Object.keys(updates).forEach(key => {
        if (allowedColumns.includes(key)) {
          const val = (updates as any)[key];
          payload[key] = val === undefined ? null : val;
        }
      });
      if (payload.plan_id) {
        payload.plan_id = payload.plan_id === 'p-none' ? '00000000-0000-0000-0000-000000000000' : payload.plan_id;
      }
      if (Object.keys(payload).length > 0) {
        supabase.from('clientes').update(payload).eq('id', id).then(({ error }) => {
          if (error) {
            console.error("Error al actualizar cliente en Supabase:", error);
            // Si falta la columna en Supabase (error 42703), reintentar sin las columnas de plan personalizado para guardar el resto
            if (error.code === '42703' || error.message?.includes('precio_personalizado') || error.message?.includes('dias_personalizados')) {
              console.warn("Reintentando actualización de cliente sin campos personalizados...");
              const safePayload = { ...payload };
              delete safePayload.precio_personalizado;
              delete safePayload.dias_personalizados;
              delete safePayload.nota_plan_personalizado;
              if (Object.keys(safePayload).length > 0) {
                supabase.from('clientes').update(safePayload).eq('id', id);
              }
            }
          }
        });
      }
    }

    addAuditLog('CLIENTE_MODIFICADO', { id, cambiados: Object.keys(updates), nota: extraLog });
    return { success: true, message: 'Cliente actualizado exitosamente.' };
  };

  const bajaLogicaCliente = (id: string) => {
    const updatedClientes = clientes.map(c => {
      if (c.id === id) {
        // Cambiar estado a INACTIVO y poner activo = false
        return { ...c, activo: false, estado: 'INACTIVO' as EstadoCliente };
      }
      return c;
    });

    // Remover al cliente de todas sus asignaciones fijas de turno
    const updatedTurnos = turnos.map(t => {
      return {
        ...t,
        asignados_ids: t.asignados_ids.filter(cid => cid !== id),
        lista_espera_ids: t.lista_espera_ids.filter(cid => cid !== id),
      };
    });

    saveState(updatedClientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);

    if (supabase) {
      supabase.from('clientes').update({ activo: false, estado: 'INACTIVO' }).eq('id', id).then(({ error }) => {
        if (error) console.error("Error al dar de baja lógica en Supabase:", error);
      });
      supabase.from('asignaciones_turnos').delete().eq('cliente_id', id).then(({ error }) => {
        if (error) console.error("Error al remover asignaciones fijas en Supabase:", error);
      });
      supabase.from('lista_espera_turnos').delete().eq('cliente_id', id).then(({ error }) => {
        if (error) console.error("Error al remover lista de espera en Supabase:", error);
      });
    }

    const c = clientes.find(cl => cl.id === id);
    addAuditLog('CLIENTE_BAJA', { id, nombre: c ? `${c.nombre} ${c.apellido}` : '' });
    addToast('delete', 'Socio dado de baja exitosamente.');
  };

  const altaCliente = (id: string) => {
    const updatedClientes = clientes.map(c => {
      if (c.id === id) {
        return { ...c, activo: true, estado: 'ACTIVO' as EstadoCliente };
      }
      return c;
    });

    saveState(updatedClientes);

    if (supabase) {
      supabase.from('clientes').update({ activo: true, estado: 'ACTIVO' }).eq('id', id).then(({ error }) => {
        if (error) console.error("Error al dar de alta en Supabase:", error);
      });
    }

    const c = clientes.find(cl => cl.id === id);
    addAuditLog('CLIENTE_ALTA', { id, nombre: c ? `${c.nombre} ${c.apellido}` : '' });
    addToast('add', 'Socio dado de alta exitosamente.');
  };

  const bajaClasesSocio = (
    clienteId: string, 
    clases: { turno_id: string; fecha: string }[], 
    opciones?: { esBajaTemporal?: boolean; exencionCobro?: 'SUSPENDIDO' | 'POSTERGADO' | 'NINGUNA' }
  ) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente no encontrado.' };

    const nuevasSuspensiones: ClaseSuspendida[] = [];
    const localRecs = [...recuperos];
    const newlyCreatedRecs: RecuperoTurno[] = [];
    let canceladasCount = 0;

    clases.forEach(({ turno_id, fecha }) => {
      const alreadySuspended = (cliente.clases_suspendidas || []).some(s => s.turno_id === turno_id && s.fecha === fecha);
      if (!alreadySuspended) {
        nuevasSuspensiones.push({
          turno_id,
          fecha,
          reintegrado: true,
          creado_at: new Date().toISOString()
        });

        // Generar ticket de recupero
        const expDate = new Date(fecha);
        expDate.setDate(expDate.getDate() + 30);
        const expDateStr = expDate.toISOString().slice(0, 10);

        const newRec: RecuperoTurno = {
          id: `rec-${Date.now()}-${canceladasCount}`,
          cliente_id: clienteId,
          cliente_nombre: `${cliente.nombre} ${cliente.apellido}`,
          turno_original_id: turno_id,
          fecha_inasistencia: fecha,
          turno_recupero_id: 'PENDIENTE_DEFINICION',
          fecha_recupero: '',
          estado: 'PENDIENTE',
          fecha_limite: expDateStr
        };
        localRecs.push(newRec);
        newlyCreatedRecs.push(newRec);
        canceladasCount++;
      }
    });

    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId) {
        const canceledKeys = new Set(clases.map(cl => `${cl.turno_id}_${cl.fecha}`));
        const filteredReservas = (c.reservas_individuales || []).filter(
          r => !canceledKeys.has(`${r.turno_id}_${r.fecha}`)
        );

        return {
          ...c,
          exencion_cobro: opciones?.esBajaTemporal ? (opciones.exencionCobro || 'SUSPENDIDO') : c.exencion_cobro,
          reservas_individuales: filteredReservas,
          clases_suspendidas: [...(c.clases_suspendidas || []), ...nuevasSuspensiones]
        };
      }
      return c;
    });

    saveState(updatedClientes, planes, historialPrecios, turnos, pagos, localRecs, auditLogs, novedades);
    syncRecuperosToSupabase(newlyCreatedRecs);

    // Sync updated client to Supabase
    if (supabase) {
      const targetClient = updatedClientes.find(c => c.id === clienteId);
      if (targetClient) {
        supabase.from('clientes').update({
          reservas_individuales: targetClient.reservas_individuales || [],
          clases_suspendidas: targetClient.clases_suspendidas || []
        }).eq('id', clienteId).then(({ error }) => {
          if (error) console.error('Error al sincronizar baja clases en Supabase:', error);
        });
      }
    }

    addAuditLog('CLIENTE_BAJA_CLASES_MES', {
      cliente: `${cliente.nombre} ${cliente.apellido}`,
      clases_dadas_de_baja: canceladasCount,
      baja_temporal: !!opciones?.esBajaTemporal
    });
    addToast('delete', `Se dieron de baja ${canceladasCount} clase(s) del socio.`);

    return { 
      success: true, 
      message: `Se registraron de baja ${canceladasCount} clase(s) exitosamente${opciones?.esBajaTemporal ? ' y se aplicó suspensión temporal' : ''}.` 
    };
  };

  const autorizarCliente = (id: string, planId?: string, tipo?: TipoCliente) => {
    const matched = clientes.find(c => c.id === id);
    if (!matched) return { success: false, message: 'Cliente no encontrado.' };
    
    const finalPlanId = planId || matched.plan_id || 'p-none';
    const finalTipo = tipo || 'FIJO';

    const updatedClientes = clientes.map(c => {
      if (c.id === id) {
        return { ...c, autorizado: true, plan_id: finalPlanId, tipo: finalTipo };
      }
      return c;
    });

    saveState(updatedClientes, planes, historialPrecios, turnos, pagos, recuperos, auditLogs);

    if (supabase) {
      supabase.from('clientes').update({ 
        autorizado: true,
        plan_id: finalPlanId === 'p-none' ? '00000000-0000-0000-0000-000000000000' : finalPlanId,
        tipo: finalTipo
      }).eq('id', id).then(({ error }) => {
        if (error) console.error("Error al autorizar cliente en Supabase:", error);
      });
    }

    addAuditLog('CLIENTE_AUTORIZADO', { id, nombre: `${matched.nombre} ${matched.apellido}`, email: matched.email });
    addToast('success', 'Socio autorizado exitosamente.');
    return { success: true, message: 'Cliente autorizado exitosamente.' };
  };

  const eliminarCliente = (id: string) => {
    const updatedClientes = clientes.filter(c => c.id !== id);

    // Desasignar de todos los turnos fijos y variables
    const updatedTurnos = turnos.map(t => {
      return {
        ...t,
        asignados_ids: t.asignados_ids.filter(cid => cid !== id),
        lista_espera_ids: t.lista_espera_ids.filter(cid => cid !== id)
      };
    });

    saveState(updatedClientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);

    if (supabase) {
      supabase.from('clientes').delete().eq('id', id).then(({ error }) => {
        if (error) console.error("Error al eliminar cliente de Supabase:", error);
      });
    }

    const c = clientes.find(cl => cl.id === id);
    addAuditLog('CLIENTE_ELIMINADO_PERMANENTE', { id, nombre: c ? `${c.nombre} ${c.apellido}` : '' });
    addToast('delete', 'Socio eliminado permanentemente.');
  };

  // IMPORTACIÓN MASIVA CSV CLIENTES
  const importarClientesCSV = (clientesImportados: Array<{ nombre: string; apellido: string; email: string; telefono: string; tipo: TipoCliente; plan_nombre: string }>) => {
    let procesados = 0;
    let insertados = 0;
    const errores: string[] = [];
    const listadoClasificacion = [...clientes];

    const planesMapeados: { [key: string]: string } = {};
    planes.forEach(p => {
      planesMapeados[p.nombre.toLowerCase().trim()] = p.id;
    });

    const nuevosClientes: Cliente[] = [];

    clientesImportados.forEach((row, i) => {
      procesados++;
      const email = row.email?.trim();
      const nombre = row.nombre?.trim();
      const apellido = row.apellido?.trim();
      const tCliente = 'FIJO' as TipoCliente;
      
      const planId = planesMapeados[row.plan_nombre?.toLowerCase().trim()] || planes[0]?.id; // Default al primero si no machea

      if (!nombre || !apellido || !email) {
        errores.push(`Fila ${i + 1}: Datos obligatorios incompletos (Nombre, Apellido, Email).`);
        return;
      }

      // Validar duplicado en base actual o en esta misma tanda
      const duplicadoActual = listadoClasificacion.some(c => c.activo && c.email.toLowerCase().trim() === email.toLowerCase().trim());
      const duplicadoEnImportacion = nuevosClientes.some(c => c.email.toLowerCase().trim() === email.toLowerCase().trim());

      if (duplicadoActual || duplicadoEnImportacion) {
        errores.push(`Fila ${i + 1}: El email ${email} ya está registrado y activo.`);
        return;
      }

      const clientAdded: Cliente = {
        id: `c-imp-${Date.now()}-${i}`,
        nombre,
        apellido,
        email,
        telefono: row.telefono || '',
        tipo: tCliente,
        estado: 'ACTIVO',
        plan_id: planId,
        activo: true,
        deuda_acumulada: 0,
        ultimo_mes_pagado: new Date().toISOString().slice(0, 7),
        turnos_fijos: [],
        creado_at: new Date().toISOString(),
        autorizado: true
      };

      nuevosClientes.push(clientAdded);
      insertados++;
    });

    if (nuevosClientes.length > 0) {
      const finalClientes = [...nuevosClientes, ...clientes];
      saveState(finalClientes);
      addAuditLog('IMPORTACION_MASIVA_CSV_CLIENTES', { procesados, insertados, errores: errores.length });
    }

    return { procesados, insertados, errores };
  };

  // HISTORIAL PRECIO PLANES (no retroactivo)
  const updatePrecioPlan = (planId: string, nuevoPrecio: number, userEmail: string) => {
    const plan = planes.find(p => p.id === planId);
    if (!plan) return;

    const precioViejo = plan.precio;
    const updatedPlanes = planes.map(p => {
      if (p.id === planId) {
        return { ...p, precio: nuevoPrecio };
      }
      return p;
    });

    const newCambioHistorial: HistorialPrecioPlan = {
      id: `h-${Date.now()}`,
      plan_id: planId,
      nombre_plan: plan.nombre,
      precio_anterior: precioViejo,
      precio_nuevo: nuevoPrecio,
      fecha_cambio: new Date().toISOString(),
      cambiado_por: userEmail
    };

    const updatedHistorial = [newCambioHistorial, ...historialPrecios];

    saveState(clientes, updatedPlanes, updatedHistorial, turnos, pagos, recuperos, auditLogs);

    if (supabase) {
      // 1. Actualizar precio en la tabla planes
      supabase.from('planes').update({ 
        precio: nuevoPrecio, 
        actualizado_at: new Date().toISOString() 
      }).eq('id', planId).then(({ error }) => {
        if (error) console.error("Error al actualizar precio de plan en Supabase:", error);
      });

      // 2. Registrar el cambio en la tabla historial_precios_planes (deja ID automático)
      supabase.from('historial_precios_planes').insert({
        plan_id: planId,
        precio_anterior: precioViejo,
        precio_nuevo: nuevoPrecio,
        fecha_cambio: newCambioHistorial.fecha_cambio
      }).then(({ error }) => {
        if (error) console.error("Error al registrar historial de precio en Supabase:", error);
      });
    }

    addAuditLog('PRECIO_PLAN_MODIFICADO', { 
      plan: plan.nombre, 
      antes: precioViejo, 
      despues: nuevoPrecio,
      ejecutado_por: userEmail 
    });
  };

  // TURNOS
  const asignarClienteFijo = (clienteId: string, turnoId: string, opciones?: { forzar?: boolean; reemplazarTurnoId?: string }) => {
    const cliente = clientes.find(c => c.id === clienteId);
    const turno = turnos.find(t => t.id === turnoId);

    if (!cliente || !turno) {
      return { success: false, message: 'Turno o cliente no válido.' };
    }

    // Verificar si el cliente ya está asignado en este turno exacto o como variable
    if (cliente.turnos_fijos.includes(turnoId)) {
      return { success: false, message: 'El socio ya tiene asignado este turno fijo.' };
    }

    // Límite estricto de acuerdo al plan seleccionado para el socio.
    // Si viene reemplazarTurnoId se salta esta validación: el admin decidió hacer swap.
    const plan = planes.find(p => p.id === cliente.plan_id);
    const diasUnicos = new Set(cliente.turnos_fijos.map(tId => tId.split('-')[0]));
    const maxDias = cliente.dias_personalizados ?? (plan ? plan.dias_por_semana : 2);
    const esMismoDia = turno.dia && diasUnicos.has(turno.dia);
    if (!esMismoDia && diasUnicos.size >= maxDias && !opciones?.reemplazarTurnoId) {
      return {
        success: false,
        excedePlan: true,
        turnosFijosActuales: [...cliente.turnos_fijos],
        maxDias,
        clienteNombre: `${cliente.nombre} ${cliente.apellido}`,
        message: `Límite alcanzado: El plan del socio (${plan?.nombre || 'Sin Plan'}) permite como máximo ${maxDias} días distintos por semana.`
      };
    }

    // Un fijo entra TODAS las semanas, así que no alcanza con mirar cuántos fijos hay:
    // hay que mirar cada fecha futura de este turno que ya tenga reservas puntuales o
    // recuperos. Antes esto sólo miraba `asignados_ids.length` y era ciego a las fechas,
    // por eso la matriz fija se veía prolija (7 de 7) y la turnera del día mostraba 8.
    const hoyStr = new Date().toISOString().slice(0, 10);
    const conflictos = conflictosAlAgregarFijo(turno, clientes, recuperos, hoyStr, clienteId);
    if (conflictos.length > 0 && !opciones?.forzar) {
      const detalle = conflictos
        .map(c => `${c.fecha.slice(8, 10)}/${c.fecha.slice(5, 7)} (${c.ocupacionConElFijo}/${c.cupo})`)
        .join(', ');
      return {
        success: false,
        requiereConfirmacion: true,
        conflictos,
        message: `Este turno ya tiene reservas puntuales de otros socios que quedarían por encima del cupo: ${detalle}. Podés asignarlo igual y esas reservas pasarán a lista de espera.`
      };
    }

    // Verificar cupo máximo semanal (los fijos entre sí)
    const ocupadoActualmente = turno.asignados_ids.length;
    if (ocupadoActualmente >= turno.cupo_maximo) {
      // Mandar a lista de espera automática
      const actualWaitlist = turno.lista_espera_ids.includes(clienteId);
      if (actualWaitlist) {
        return { success: false, message: 'El turno está lleno y el cliente ya se encuentra en la lista de espera de este slot.' };
      }

      const updatedTurnos = turnos.map(t => {
        if (t.id === turnoId) {
          return { ...t, lista_espera_ids: [...t.lista_espera_ids, clienteId] };
        }
        return t;
      });

      saveState(clientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);

      if (supabase) {
        const turnoUuid = getUuidFromTurnoId(turnoId);
        supabase.from('lista_espera_turnos').insert({
          cliente_id: clienteId,
          turno_id: turnoUuid
        }).then(({ error }) => {
          if (error) console.error("Error al agregar a lista de espera en Supabase:", error);
        });
      }

      addAuditLog('TURNO_LISTA_ESPERA_AGREGADO', { cliente: `${cliente.nombre} ${cliente.apellido}`, turno: turnoId });
      addToast('add', 'Socio agregado a la lista de espera.');
      return { success: true, message: 'El horario está completo. El cliente ha sido registrado en la lista de espera.', putInWaitlist: true };
    }

    // Asignación limpia exitosa — quitar de lista de espera si ya estaba anotado ahí
    // El socio pasa a ser fijo de este turno: sus reservas SUELTAS futuras del MISMO
    // turno ya no tienen sentido y lo duplicarían (contaría como fijo y como reserva).
    // Es el flujo normal del gimnasio: prueba clases sueltas y después se hace fijo.
    // Verificado en producción: los 10 casos de duplicación venían de acá.
    const fechasDuplicadas = reservasPropiasDuplicadas(cliente, turnoId, hoyStr);

    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId) {
        // Si es un swap, quitar el turno viejo y agregar el nuevo
        const turnosFijosBase = opciones?.reemplazarTurnoId
          ? c.turnos_fijos.filter(tId => tId !== opciones.reemplazarTurnoId)
          : c.turnos_fijos;
        return {
          ...c,
          tipo: 'FIJO' as TipoCliente,
          turnos_fijos: [...turnosFijosBase, turnoId],
          turno_variable: c.turno_variable === turnoId ? undefined : c.turno_variable,
          reservas_individuales: (c.reservas_individuales || []).filter(
            r => !(r.turno_id === turnoId && r.fecha >= hoyStr)
          )
        };
      }
      return c;
    });

    const clienteYaEnEspera = turno.lista_espera_ids.includes(clienteId);

    const updatedTurnos = turnos.map(t => {
      // Si es un swap, quitar al cliente del turno viejo
      if (opciones?.reemplazarTurnoId && t.id === opciones.reemplazarTurnoId) {
        return {
          ...t,
          asignados_ids: t.asignados_ids.filter(id => id !== clienteId),
          lista_espera_ids: t.lista_espera_ids.filter(id => id !== clienteId)
        };
      }
      if (t.id === turnoId) {
        return {
          ...t,
          // Agrega a asignados (sin duplicados)
          asignados_ids: [...t.asignados_ids.filter(id => id !== clienteId), clienteId],
          // Remueve de lista de espera si estaba anotado ahí
          lista_espera_ids: t.lista_espera_ids.filter(id => id !== clienteId)
        };
      }
      return t;
    });

    // Si estaba en lista de espera en Supabase, eliminarlo de esa tabla también
    if (clienteYaEnEspera && supabase) {
      resolveTurnoUuid(turnoId).then((turnoUuid) => {
        if (turnoUuid) {
          supabase.from('lista_espera_turnos').delete()
            .eq('cliente_id', clienteId).eq('turno_id', turnoUuid)
            .then(({ error }) => {
              if (error) console.error("Error al remover de lista de espera al asignar:", error);
            });
        }
      });
    }

    saveState(updatedClientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);

    // Persistir la limpieza de las reservas duplicadas del propio socio.
    if (supabase && fechasDuplicadas.length > 0) {
      const target = updatedClientes.find(c => c.id === clienteId);
      if (target) {
        supabase.from('clientes')
          .update({ reservas_individuales: target.reservas_individuales || [] })
          .eq('id', clienteId)
          .then(({ error }) => {
            if (error) console.error('Error al limpiar reservas duplicadas al asignar fijo:', error);
          });
      }
      addAuditLog('RESERVAS_DUPLICADAS_LIMPIADAS', {
        cliente: `${cliente.nombre} ${cliente.apellido}`,
        turno_id: turnoId,
        fechas: fechasDuplicadas,
        motivo: 'El socio pasó a ser fijo de este turno; sus reservas sueltas lo duplicaban.'
      });
    }

    if (supabase) {
      resolveTurnoUuid(turnoId).then(async (turnoUuid) => {
        if (!turnoUuid) {
          console.warn(`No se pudo resolver el UUID del turno ${turnoId}; asignación no persistida en Supabase.`);
          addToast('error', 'La asignación no se sincronizó con la base (turno sin ID). Reintentá desde "Gestionar Turnos".');
          return;
        }
        const { error } = await supabase.from('asignaciones_turnos').insert({
          cliente_id: clienteId,
          turno_id: turnoUuid
        });
        if (error) {
          console.error("Error al asignar turno fijo en Supabase:", error);
          addToast('error', 'La asignación no se guardó en la base de datos. Reintentá la asignación.');
        }

        // Si es un swap, eliminar la asignación vieja de Supabase
        if (opciones?.reemplazarTurnoId) {
          const turnoViejoUuid = await resolveTurnoUuid(opciones.reemplazarTurnoId);
          if (turnoViejoUuid) {
            supabase.from('asignaciones_turnos')
              .delete()
              .eq('cliente_id', clienteId)
              .eq('turno_id', turnoViejoUuid)
              .then(({ error: errDel }) => {
                if (errDel) console.error('Error al eliminar asignación vieja en swap:', errDel);
              });
          }
        }
      });
    }

    addAuditLog('TURNO_ASIGNACION_FIJA', { cliente: `${cliente.nombre} ${cliente.apellido}`, turno: turnoId });
    addToast('add', 'Asignación directa de horario completada.');
    return { success: true, message: 'Asignación directa de horario completada exitosamente.' };
  };

  // Aviso por email al socio de una baja de clase (vía /api/notify-baja -> Resend).
  // fecha opcional: presente = baja de una clase puntual (turnera de tiempo real);
  // ausente = baja del horario fijo semanal. Fire-and-forget; devuelve true si se
  // disparó el aviso (socio con email real, no invitado).
  const notificarBajaClase = (clienteId: string, turnoId: string, fecha?: string): boolean => {
    const socio = clientes.find(c => c.id === clienteId);
    if (!socio) return false;
    const email = (socio.email || '').trim().toLowerCase();
    const esInvitado = email.startsWith('invitado-') && email.endsWith('@kaha.com');
    const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !esInvitado;
    // Teléfono con al menos 8 dígitos = candidato a WhatsApp (el server normaliza y valida).
    const tieneTelefono = (socio.telefono || '').replace(/\D/g, '').length >= 8;
    // Si no hay ni email válido ni teléfono, no hay a dónde avisar.
    if (!emailValido && !tieneTelefono) return false;
    const turno = turnos.find(t => t.id === turnoId);
    fetch('/api/notify-baja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: socio.email,
        telefono: socio.telefono || '',
        nombre: socio.nombre,
        apellido: socio.apellido,
        dia: turno?.dia || turnoId.split('-')[0] || '',
        hora: turno?.hora || turnoId.split('-')[1] || '',
        fecha: fecha || ''
      })
    }).catch(() => { /* en dev local /api no existe; se ignora silenciosamente */ });
    return true;
  };

  // Aviso por email y notificación al socio cuando es promovido de Lista de Espera a turno confirmado.
  const notificarAltaWaitlist = (clienteId: string, turnoId: string, fecha?: string): boolean => {
    const socio = clientes.find(c => c.id === clienteId);
    if (!socio) return false;
    const email = (socio.email || '').trim().toLowerCase();
    const esInvitado = email.startsWith('invitado-') && email.endsWith('@kaha.com');
    const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !esInvitado;
    const tieneTelefono = (socio.telefono || '').replace(/\D/g, '').length >= 8;
    const turno = turnos.find(t => t.id === turnoId);
    const dia = turno?.dia || turnoId.split('-')[0] || '';
    const hora = turno?.hora || turnoId.split('-')[1] || '';

    // 1. Guardar aviso en localStorage para el modal llamativo del socio cuando ingrese a la app
    try {
      const pendingKey = `kaha_waitlist_promocion_${socio.id}`;
      const existing = JSON.parse(localStorage.getItem(pendingKey) || '[]');
      const newPromo = {
        id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        clienteId: socio.id,
        nombre: socio.nombre,
        turnoId,
        dia,
        hora,
        fecha: fecha || '',
        timestamp: Date.now()
      };
      localStorage.setItem(pendingKey, JSON.stringify([newPromo, ...existing]));
    } catch(e) {
      console.error("Error al guardar aviso de promoción de lista de espera:", e);
    }

    // 2. Crear notificación en el buzón interno
    const notifText = fecha 
      ? `¡Se liberó tu lugar! Fuiste confirmado/a para el turno del ${dia} ${fecha} a las ${hora} hs.`
      : `¡Se liberó tu lugar fijo! Fuiste confirmado/a para el turno semanal de los ${dia} a las ${hora} hs.`;

    const newNotif: AlertaNotificacion = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tipo: 'WAITLIST_PROMOCION',
      titulo: '🎉 ¡Lugar Confirmado por Lista de Espera!',
      mensaje: notifText,
      fecha: new Date().toISOString(),
      leido: false,
      cliente_id: socio.id,
      metadata: { turno_id: turnoId, dia, hora, fecha_clase: fecha }
    };

    try {
      const storedNotifs = localStorage.getItem('gym_notificaciones');
      const parsedNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
      localStorage.setItem('gym_notificaciones', JSON.stringify([newNotif, ...parsedNotifs]));
      setNotificaciones([newNotif, ...parsedNotifs]);
    } catch(e) {}

    // 3. Enviar mail vía backend
    if (emailValido || tieneTelefono) {
      fetch('/api/notify-waitlist-alta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: socio.email,
          telefono: socio.telefono || '',
          nombre: socio.nombre,
          apellido: socio.apellido,
          dia,
          hora,
          fecha: fecha || ''
        })
      }).catch(() => {});
    }

    return true;
  };

  const removerAsignacionFija = (clienteId: string, turnoId: string) => {
    let waitlistClientLiberado: string | null = null;
    let waitlistClientNombre = '';
    let estabaEnAsignados = false;
    let estabaEnWaitlist = false;

    // Modificar el turno
    const updatedTurnos = turnos.map(t => {
      if (t.id === turnoId) {
        estabaEnAsignados = t.asignados_ids.includes(clienteId);
        estabaEnWaitlist = t.lista_espera_ids.includes(clienteId);

        // Si estaba en asignados, lo quitamos de asignados
        const filtradoAsignados = t.asignados_ids.filter(cid => cid !== clienteId);
        // Si estaba en waitlist, lo quitamos de waitlist
        let nuevaWaitlist = t.lista_espera_ids.filter(cid => cid !== clienteId);
        let nuevosAsignados = [...filtradoAsignados];

        // Promover de forma automática desde la lista de espera SOLO SI se liberó un lugar de un asignado fijo y hay cupo libre!
        if (estabaEnAsignados && nuevaWaitlist.length > 0 && nuevosAsignados.length < t.cupo_maximo) {
          const promovidoId = nuevaWaitlist[0];
          waitlistClientLiberado = promovidoId;
          nuevosAsignados.push(promovidoId);
          nuevaWaitlist = nuevaWaitlist.slice(1);
        }

        return { 
          ...t, 
          asignados_ids: nuevosAsignados,
          lista_espera_ids: nuevaWaitlist
        };
      }
      return t;
    });

    // Modificar clientes (Remover del saliente si era asignado fijo, e integrar al promovido de waitlist si hubiere)
    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId && estabaEnAsignados) {
        return { ...c, turnos_fijos: c.turnos_fijos.filter(tid => tid !== turnoId) };
      }
      if (waitlistClientLiberado && c.id === waitlistClientLiberado) {
        waitlistClientNombre = `${c.nombre} ${c.apellido}`;
        return { ...c, tipo: 'FIJO' as TipoCliente, turnos_fijos: [...c.turnos_fijos, turnoId] };
      }
      return c;
    });

    saveState(updatedClientes, planes, historialPrecios, updatedTurnos, pagos, recuperos, auditLogs);

    if (supabase) {
      resolveTurnoUuid(turnoId).then((turnoUuid) => {
        if (turnoUuid) {
          if (estabaEnAsignados) {
            supabase.from('asignaciones_turnos').delete().eq('cliente_id', clienteId).eq('turno_id', turnoUuid).then(({ error }) => {
              if (error) console.error("Error al remover asignación fija en Supabase:", error);
            });
          }
          if (estabaEnWaitlist) {
            supabase.from('lista_espera_turnos').delete().eq('cliente_id', clienteId).eq('turno_id', turnoUuid).then(({ error }) => {
              if (error) console.error("Error al remover de lista de espera en Supabase:", error);
            });
          }
          if (waitlistClientLiberado) {
            supabase.from('lista_espera_turnos').delete().eq('cliente_id', waitlistClientLiberado).eq('turno_id', turnoUuid).then(({ error }) => {
              if (error) console.error("Error al remover de lista de espera en Supabase:", error);
            });
            supabase.from('asignaciones_turnos').insert({
              cliente_id: waitlistClientLiberado,
              turno_id: turnoUuid
            }).then(({ error }) => {
              if (error) console.error("Error al promover de lista de espera en Supabase:", error);
            });
          }
        }
      });
    }

    addAuditLog(estabaEnAsignados ? 'TURNO_ASIGNACION_REMOCION' : 'TURNO_WAITLIST_REMOCION', {
      cliente_id: clienteId,
      turno_id: turnoId,
      tipo_remocion: estabaEnAsignados ? 'ASIGNADO_FIJO' : 'LISTA_DE_ESPERA',
      promocion_automatica: waitlistClientLiberado ? `Se promovió automáticamente de lista de espera a ${waitlistClientNombre}` : 'Ninguno'
    });

    if (estabaEnAsignados) {
      // Aviso automático al socio dado de baja de este horario fijo (WhatsApp o email).
      const avisado = notificarBajaClase(clienteId, turnoId);
      addToast('delete', avisado
        ? 'Asignación removida. Se le avisó al socio de la baja.'
        : 'Asignación de turno removida.');
    } else if (estabaEnWaitlist) {
      addToast('delete', 'Socio removido de la lista de espera.');
    } else {
      addToast('delete', 'Registro de turno actualizado.');
    }
    
    if (waitlistClientLiberado) {
      notificarAltaWaitlist(waitlistClientLiberado, turnoId);
      addToast('success', `¡Cupo liberado! Se promovió y notificó por email a ${waitlistClientNombre}.`);
    }
  };

  const darDeBajaTurnosFijosSocio = (clienteId: string, motivo: string = 'Falta de pago (Día 10)', userEmail?: string) => {
    const cli = clientes.find(c => c.id === clienteId);
    if (!cli) return { success: false, message: 'Cliente no encontrado' };

    const turnosAQuitar = [...cli.turnos_fijos];
    if (turnosAQuitar.length === 0) {
      return { success: true, message: 'El socio no posee turnos fijos asignados.' };
    }

    turnosAQuitar.forEach(tId => {
      removerAsignacionFija(clienteId, tId);
    });

    addAuditLog('CLIENTE_BAJA_TURNOS_FIJOS_MANUAL', {
      cliente_id: clienteId,
      cliente_nombre: `${cli.nombre} ${cli.apellido}`,
      turnos_dados_de_baja: turnosAQuitar,
      motivo,
      fecha: new Date().toISOString()
    }, userEmail);

    addToast('delete', `Turnos fijos de ${cli.nombre} ${cli.apellido} dados de baja correctamente (${turnosAQuitar.length} turno/s liberado/s).`);

    return { success: true, message: `Se dieron de baja ${turnosAQuitar.length} turno(s) fijo(s) de ${cli.nombre} ${cli.apellido}.` };
  };

  const darDeBajaTurnosFijosMultiple = (clienteIds: string[], motivo: string = 'Falta de pago (Día 10)', userEmail?: string) => {
    let procesados = 0;
    clienteIds.forEach(cid => {
      const res = darDeBajaTurnosFijosSocio(cid, motivo, userEmail);
      if (res.success) procesados++;
    });

    addToast('delete', `Se procesaron las bajas de turnos fijos para ${procesados} socio(s).`);
    return { success: true, procesados };
  };

  const asignarTurnoVariable = (clienteId: string, turnoId: string | null) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) {
      return { success: false, message: 'Socio no encontrado.' };
    }

    if (turnoId) {
      const turno = turnos.find(t => t.id === turnoId);
      if (!turno) {
        return { success: false, message: 'Turno no válido.' };
      }

      // Verificar si ya tiene este turno como fijo
      if (cliente.turnos_fijos.includes(turnoId)) {
        return { success: false, message: 'Ya tienes este horario asignado como TU TURNO FIJO.' };
      }

      // Calcular ocupación en tiempo real: asignados fijos + personas que tienen este turno_variable
      const fixedCount = turno.asignados_ids.length;
      const variableCount = clientes.filter(c => c.activo && c.id !== clienteId && c.turno_variable === turnoId).length;
      const totalOccupied = fixedCount + variableCount;

      if (totalOccupied >= turno.cupo_maximo) {
        return { success: false, message: `El horario en tiempo real está completo para este día (${totalOccupied}/${turno.cupo_maximo}).` };
      }
    }

    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId) {
        return { ...c, turno_variable: turnoId || undefined };
      }
      return c;
    });

    saveState(updatedClientes);
    addAuditLog('TURNO_VARIABLE_ESTADO', { 
      cliente: `${cliente.nombre} ${cliente.apellido}`, 
      turno_id: turnoId || 'Ninguno' 
    });

    return { success: true, message: turnoId ? 'Turno variable asignado con éxito.' : 'Turno variable liberado con éxito.' };
  };

  // Simular check-in Flexible del día a día (asistencia temporal)
  const checkInFlexible = (clienteId: string, turnoId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente no existente.' };
    
    // Validar estado de la cuota para permitir el acceso
    if (cliente.estado === 'MOROSO') {
      return { success: false, message: 'Acceso Denegado: El cliente es MOROSO con cuota impaga.' };
    }

    const turno = turnos.find(t => t.id === turnoId);
    if (!turno) return { success: false, message: 'Turno no encontrado.' };

    const totalActual = turno.asignados_ids.length; // Fijos toman lugar físico permanente
    if (totalActual >= turno.cupo_maximo) {
      return { success: false, message: `El turno está saturado (${totalActual}/${turno.cupo_maximo}). Intente ingresar en otro horario.` };
    }

    // Registra logística de visita como auditoría de asistencia
    addAuditLog('ASISTENCIA_FLEXIBLE_REGISTRADA', { cliente: `${cliente.nombre} ${cliente.apellido}`, turno: turnoId });
    return { success: true, message: `Asistencia aprobada para ${cliente.nombre} ${cliente.apellido} en el turno ${turno.dia} ${turno.hora}.` };
  };

  const agregarRecupero = (data: Omit<RecuperoTurno, 'id' | 'estado' | 'fecha_limite'> & { fecha_limite?: string }) => {
    const cli = clientes.find(c => c.id === data.cliente_id);
    if (!cli) return { success: false, message: 'Cliente inválido.' };

    if (data.turno_recupero_id !== 'PENDIENTE_DEFINICION') {
      const recTurno = turnos.find(t => t.id === data.turno_recupero_id);
      if (!recTurno) return { success: false, message: 'Turno de recupero inválido.' };

      // Validar cupos para la fecha destino con el mismo criterio que
      // programarRecuperoPendiente: fijos ACTIVOS (sin los suspendidos ese día) +
      // reservas individuales + otros recuperos ya agendados en esa fecha.
      const fechaDest = data.fecha_recupero;
      const fijosActivos = recTurno.asignados_ids.filter(fid => {
        const fc = clientes.find(c => c.id === fid);
        return !((fc?.clases_suspendidas || []).some(s => s.turno_id === recTurno.id && s.fecha === fechaDest));
      }).length;
      const individualCount = clientes.reduce((acc, c) =>
        acc + (c.reservas_individuales || []).filter(r => r.turno_id === recTurno.id && r.fecha === fechaDest).length, 0);
      const recuperosCount = recuperos.filter(r => r.estado === 'PENDIENTE' && r.turno_recupero_id === recTurno.id && r.fecha_recupero === fechaDest).length;
      const totalOccupied = fijosActivos + individualCount + recuperosCount;

      if (totalOccupied >= recTurno.cupo_maximo) {
        return { success: false, message: `El turno del recupero ya está completo para esa fecha (${totalOccupied}/${recTurno.cupo_maximo}).` };
      }
    }

    let limitStr = data.fecha_limite;
    if (!limitStr && data.fecha_inasistencia) {
      const inasDate = new Date(data.fecha_inasistencia + 'T00:00:00');
      inasDate.setDate(inasDate.getDate() + 30);
      const limitY = inasDate.getFullYear();
      const limitM = String(inasDate.getMonth() + 1).padStart(2, '0');
      const limitD = String(inasDate.getDate()).padStart(2, '0');
      limitStr = `${limitY}-${limitM}-${limitD}`;
    }

    const nuevoRec: RecuperoTurno = {
      ...data,
      id: `rec-${Date.now()}`,
      estado: 'PENDIENTE',
      fecha_limite: limitStr || ''
    };

    const updatedRecs = [nuevoRec, ...recuperos];
    saveState(clientes, planes, historialPrecios, turnos, pagos, updatedRecs, auditLogs);
    addAuditLog('RECUPERO_TURNO_PROGRAMADO', { cliente: data.cliente_nombre, para_fecha: data.fecha_recupero || 'Pendiente' });
    return { success: true, message: 'Recupero de turno agendado exitosamente.' };
  };

  const actualizarEstadoRecupero = (id: string, estado: 'PENDIENTE' | 'COMPLETADO' | 'EXPIRADO') => {
    const updated = recuperos.map(r => {
      if (r.id === id) {
        return { ...r, estado };
      }
      return r;
    });
    saveState(clientes, planes, historialPrecios, turnos, pagos, updated, auditLogs);
    addAuditLog('RECUPERO_TURNO_ESTADO_CAMBIADO', { id, nuevo_estado: estado });
  };

  const programarRecuperoPendiente = (recuperoId: string, turnoRecuperoId: string, fechaRecupero: string) => {
    const rec = recuperos.find(r => r.id === recuperoId);
    if (!rec) return { success: false, message: 'Ticket de recupero no encontrado.' };

    const recTurno = turnos.find(t => t.id === turnoRecuperoId);
    if (!recTurno) return { success: false, message: 'Turno de recupero inválido.' };

    // Validar cupos en el turno de recupero para la fecha destino
    const fijosCount = recTurno.asignados_ids.length;
    // Count fijos who suspended on this date
    const fijosSuspendedCount = clientes.reduce((acc, c) => {
      if (recTurno.asignados_ids.includes(c.id)) {
        const isSusp = (c.clases_suspendidas || []).some(s => s.turno_id === turnoRecuperoId && s.fecha === fechaRecupero);
        if (isSusp) return acc + 1;
      }
      return acc;
    }, 0);
    // Count individual/variable bookings on this date
    const individualCount = clientes.reduce((acc, c) => {
      const bookingsOnDate = (c.reservas_individuales || []).filter(r => r.turno_id === turnoRecuperoId && r.fecha === fechaRecupero);
      return acc + bookingsOnDate.length;
    }, 0);
    // Count other recuperos on this date
    const recuperosCount = recuperos.filter(r => r.id !== recuperoId && r.estado === 'PENDIENTE' && r.turno_recupero_id === turnoRecuperoId && r.fecha_recupero === fechaRecupero).length;

    const totalOccupied = fijosCount - fijosSuspendedCount + individualCount + recuperosCount;
    if (totalOccupied >= recTurno.cupo_maximo) {
      return { success: false, message: `El turno de recupero ya está completo para esa fecha (${totalOccupied}/${recTurno.cupo_maximo}).` };
    }

    const updated = recuperos.map(r => {
      if (r.id === recuperoId) {
        return {
          ...r,
          turno_recupero_id: turnoRecuperoId,
          fecha_recupero: fechaRecupero,
          estado: 'PENDIENTE' as const
        };
      }
      return r;
    });

    saveState(clientes, planes, historialPrecios, turnos, pagos, updated, auditLogs);
    addAuditLog('RECUPERO_PENDIENTE_PROGRAMADO', { 
      id: recuperoId, 
      turno_recupero_id: turnoRecuperoId, 
      fecha_recupero: fechaRecupero 
    });
    return { success: true, message: 'Recupero programado exitosamente.' };
  };

  const modificarPrecioOCupoTurno = (turnoId: string, nuevoCupo: number) => {
    let updatedClientes = [...clientes];

    const updated = turnos.map(t => {
      if (t.id !== turnoId) return t;

      let nuevosAsignados = [...t.asignados_ids];
      let nuevaWaitlist = [...t.lista_espera_ids];
      const promovidos: string[] = [];

      // Promover automáticamente desde lista de espera hasta cubrir el nuevo cupo
      while (nuevaWaitlist.length > 0 && nuevosAsignados.length < nuevoCupo) {
        const promovidoId = nuevaWaitlist.shift()!;
        nuevosAsignados.push(promovidoId);
        promovidos.push(promovidoId);
      }

      // Actualizar turnos_fijos de los clientes promovidos
      if (promovidos.length > 0) {
        updatedClientes = updatedClientes.map(c => {
          if (promovidos.includes(c.id) && !c.turnos_fijos.includes(turnoId)) {
            return { ...c, tipo: 'FIJO' as TipoCliente, turnos_fijos: [...c.turnos_fijos, turnoId] };
          }
          return c;
        });

        // Sincronizar en Supabase
        if (supabase) {
          resolveTurnoUuid(turnoId).then((turnoUuid) => {
            if (!turnoUuid) return;
            promovidos.forEach(promovidoId => {
              supabase.from('lista_espera_turnos').delete()
                .eq('cliente_id', promovidoId).eq('turno_id', turnoUuid)
                .then(({ error }) => { if (error) console.error('Error al remover de lista espera en Supabase:', error); });
              supabase.from('asignaciones_turnos').insert({ cliente_id: promovidoId, turno_id: turnoUuid })
                .then(({ error }) => { if (error) console.error('Error al promover a asignados en Supabase:', error); });
            });
          });
        }

        if (promovidos.length > 0) {
          addToast('add', `${promovidos.length} socio(s) promovido(s) automáticamente desde la lista de espera.`);
        }
      }

      return { ...t, cupo_maximo: nuevoCupo, asignados_ids: nuevosAsignados, lista_espera_ids: nuevaWaitlist };
    });

    // Update cupo in Supabase
    if (supabase) {
      resolveTurnoUuid(turnoId).then((turnoUuid) => {
        if (turnoUuid) {
          supabase.from('turnos').update({ cupo_maximo: nuevoCupo }).eq('id', turnoUuid)
            .then(({ error }) => { if (error) console.error('Error al actualizar cupo en Supabase:', error); });
        }
      });
    }

    saveState(updatedClientes, planes, historialPrecios, updated, pagos, recuperos, auditLogs);
    addAuditLog('CUPO_TURNO_EDITADO', { turno_id: turnoId, nuevo_cupo: nuevoCupo });
  };

  const crearReservaIndividual = (clienteId: string, turnoId: string, fecha: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente no encontrado.' };

    const turno = turnos.find(t => t.id === turnoId);
    if (!turno) return { success: false, message: 'Turno no encontrado.' };

    // Ocupación por la función canónica (src/lib/ocupacion.ts). Antes esta fórmula
    // estaba copiada acá y en otros 5 lugares, y 3 de esas copias contaban distinto.
    const totalOccupied = calcularOcupacion(turno, fecha, clientes, recuperos).total;

    // Check duplicate: cannot book the EXACT SAME shift twice on the same date
    const alreadyBookedThisShiftOnDate = (cliente.reservas_individuales || []).some(r => r.turno_id === turnoId && r.fecha === fecha) || 
                                         (cliente.turnos_fijos.some(tfId => {
                                           if (tfId !== turnoId) return false;
                                           const isSuspended = (cliente.clases_suspendidas || []).some(s => s.turno_id === tfId && s.fecha === fecha);
                                           return !isSuspended;
                                         }));

    if (alreadyBookedThisShiftOnDate) {
      return { success: false, message: `Ya tienes este turno reservado para el día ${fecha}.` };
    }

    // Si el turno está lleno, anotar automáticamente en la lista de espera para esta fecha
    if (totalOccupied >= turno.cupo_maximo) {
      const wlRes = agregarListaEsperaReserva(clienteId, turnoId, fecha);
      if (wlRes.success) {
        addToast('add', `Turno completo (${totalOccupied}/${turno.cupo_maximo}). ${cliente.nombre} anotado/a en lista de espera.`);
        return {
          success: true,
          message: `El turno está completo (${totalOccupied}/${turno.cupo_maximo}). ${cliente.nombre} ${cliente.apellido} ha sido anotado/a en la lista de espera. Si alguien se da de baja, ingresará automáticamente y se le enviará un correo de confirmación.`,
          putInWaitlist: true
        };
      }
      return wlRes;
    }

    const nuevaReserva: ReservaIndividual = {
      id: `res-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      turno_id: turnoId,
      fecha,
      creado_at: new Date().toISOString()
    };

    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId) {
        const reservas = [...(c.reservas_individuales || []), nuevaReserva];
        return {
          ...c,
          reservas_individuales: reservas
        };
      }
      return c;
    });

    saveState(updatedClientes, planes, historialPrecios, turnos, pagos, recuperos, auditLogs);

    if (supabase) {
      const targetClient = updatedClientes.find(c => c.id === clienteId);
      if (targetClient) {
        supabase.from('clientes').update({
          reservas_individuales: targetClient.reservas_individuales
        }).eq('id', clienteId).then(({ error }) => {
          if (error) console.error("Error al guardar reserva en Supabase:", error);
        });
      }
    }
    addAuditLog('RESERVA_INDIVIDUAL_CREADA', { 
      cliente: `${cliente.nombre} ${cliente.apellido}`, 
      turno_id: turnoId, 
      fecha 
    });

    return { success: true, message: 'Reserva agendada exitosamente.' };
  };

  /**
   * Sincroniza la lista de espera POR FECHA con Supabase (tabla lista_espera_reservas).
   * Es distinta de lista_espera_turnos, que es la lista semanal del turno.
   * Falla en silencio a propósito: el estado local ya se actualizó, así que un
   * problema de red no debe romperle la acción al socio. Al recargar se reconcilia.
   */
  const persistirEsperaEnSupabase = (
    accion: 'alta' | 'baja',
    clienteId: string,
    turnoId: string,
    fecha: string
  ) => {
    if (!supabase) return;
    resolveTurnoUuid(turnoId).then((turnoUuid) => {
      if (!turnoUuid) {
        console.warn(`Lista de espera: no se pudo resolver el UUID del turno ${turnoId}.`);
        return;
      }
      if (accion === 'alta') {
        supabase.from('lista_espera_reservas')
          .upsert({ cliente_id: clienteId, turno_id: turnoUuid, fecha }, { onConflict: 'turno_id,cliente_id,fecha' })
          .then(({ error }) => {
            if (error) console.error('Error al guardar la lista de espera en Supabase:', error);
          });
      } else {
        supabase.from('lista_espera_reservas')
          .delete()
          .eq('cliente_id', clienteId).eq('turno_id', turnoUuid).eq('fecha', fecha)
          .then(({ error }) => {
            if (error) console.error('Error al borrar de la lista de espera en Supabase:', error);
          });
      }
    });
  };

  const agregarListaEsperaReserva = (clienteId: string, turnoId: string, fecha: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente no encontrado.' };

    const alreadyWaiting = waitlistReservas.some(w => w.cliente_id === clienteId && w.turno_id === turnoId && w.fecha === fecha);
    if (alreadyWaiting) {
      return { success: false, message: 'Ya te encuentras en la lista de espera para este turno y fecha.' };
    }

    const nuevoEnEspera: WaitlistReserva = {
      id: `wl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      cliente_id: clienteId,
      turno_id: turnoId,
      fecha,
      creado_at: new Date().toISOString()
    };

    const updatedWl = [...waitlistReservas, nuevoEnEspera];
    setWaitlistReservas(updatedWl);
    localStorage.setItem('gym_waitlist_reservas', JSON.stringify(updatedWl));

    // Persistir en Supabase. Sin esto la espera vivía SOLO en el localStorage del
    // navegador que la creó: el admin no la veía, se perdía al cambiar de
    // dispositivo o limpiar el navegador. Era el bug de "no me quedan guardados".
    persistirEsperaEnSupabase('alta', clienteId, turnoId, fecha);

    addAuditLog('LISTA_ESPERA_RESERVA_AGREGADO', { 
      cliente: `${cliente.nombre} ${cliente.apellido}`, 
      turno_id: turnoId, 
      fecha 
    });

    return { success: true, message: 'Te has anotado en la lista de espera exitosamente.' };
  };

  const removerListaEsperaReserva = (clienteId: string, turnoId: string, fecha: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente no encontrado.' };

    const filtered = waitlistReservas.filter(w => !(w.cliente_id === clienteId && w.turno_id === turnoId && w.fecha === fecha));
    setWaitlistReservas(filtered);
    localStorage.setItem('gym_waitlist_reservas', JSON.stringify(filtered));
    persistirEsperaEnSupabase('baja', clienteId, turnoId, fecha);

    addAuditLog('LISTA_ESPERA_RESERVA_REMOVIDO', { 
      cliente: `${cliente.nombre} ${cliente.apellido}`, 
      turno_id: turnoId, 
      fecha 
    });

    return { success: true, message: 'Te has retirado de la lista de espera.' };
  };

  const procesarPromocionListaEspera = (turnoId: string, fecha: string, currentClientes: Cliente[]): Cliente[] => {
    const waitingList = waitlistReservas
      .filter(w => w.turno_id === turnoId && w.fecha === fecha)
      .sort((a, b) => new Date(a.creado_at).getTime() - new Date(b.creado_at).getTime());

    if (waitingList.length === 0) return currentClientes;

    const nextWaitlistEntry = waitingList[0];
    const candidateClient = currentClientes.find(c => c.id === nextWaitlistEntry.cliente_id && c.activo);
    if (!candidateClient) {
      // Clean up invalid waitlist entry and try again
      const newWl = waitlistReservas.filter(w => w.id !== nextWaitlistEntry.id);
      setWaitlistReservas(newWl);
      localStorage.setItem('gym_waitlist_reservas', JSON.stringify(newWl));
      persistirEsperaEnSupabase('baja', nextWaitlistEntry.cliente_id, turnoId, fecha);
      return procesarPromocionListaEspera(turnoId, fecha, currentClientes);
    }

    // Auto-promote candidate
    const nuevaReservaAuto: ReservaIndividual = {
      id: `res-auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      turno_id: turnoId,
      fecha,
      creado_at: new Date().toISOString()
    };

    const updatedList = currentClientes.map(c => {
      if (c.id === candidateClient.id) {
        return {
          ...c,
          reservas_individuales: [...(c.reservas_individuales || []), nuevaReservaAuto]
        };
      }
      return c;
    });

    // Remove from waitlist (local + Supabase: ya entro a la clase, no espera mas)
    const newWl = waitlistReservas.filter(w => w.id !== nextWaitlistEntry.id);
    setWaitlistReservas(newWl);
    localStorage.setItem('gym_waitlist_reservas', JSON.stringify(newWl));
    persistirEsperaEnSupabase('baja', nextWaitlistEntry.cliente_id, turnoId, fecha);

    // Send internal notification to nextClient
    const turno = turnos.find(t => t.id === turnoId);
    const horaClase = turno ? turno.hora : '00:00';
    const newNotif: AlertaNotificacion = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tipo: 'SISTEMA',
      titulo: '¡Cupo Asignado por Lista de Espera!',
      mensaje: `Se liberó un cupo y fuiste promovido al turno de las ${horaClase} hs el día ${fecha}.`,
      fecha: new Date().toISOString(),
      leido: false
    };

    try {
      const storedNotifs = localStorage.getItem('gym_notificaciones');
      const parsedNotifs = storedNotifs ? JSON.parse(storedNotifs) : [];
      localStorage.setItem('gym_notificaciones', JSON.stringify([newNotif, ...parsedNotifs]));
      setNotificaciones([newNotif, ...parsedNotifs]);
    } catch(e) {}

    addAuditLog('LISTA_ESPERA_PROMOCION_AUTO', {
      cliente: `${candidateClient.nombre} ${candidateClient.apellido}`,
      turno_id: turnoId,
      fecha
    });

    // Notificar al socio promovido (Email + Modal en App)
    notificarAltaWaitlist(candidateClient.id, turnoId, fecha);

    return updatedList;
  };

  const cancelarReservaIndividual = (clienteId: string, reservaId: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente no encontrado.' };

    const reserva = (cliente.reservas_individuales || []).find(r => r.id === reservaId);
    if (!reserva) return { success: false, message: 'Reserva no encontrada.' };

    const turno = turnos.find(t => t.id === reserva.turno_id);
    const horaClase = turno ? turno.hora : '00:00';
    
    // Check 3 hours notice
    const now = new Date();
    const classDateTime = new Date(`${reserva.fecha}T${horaClase}:00`);
    const diffHours = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const reintegrado = diffHours >= 3.0;

    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId) {
        const filtradas = (c.reservas_individuales || []).filter(r => r.id !== reservaId);
        
        const clasesSuspendidas = [...(c.clases_suspendidas || [])];
        if (!reintegrado) {
          clasesSuspendidas.push({
            turno_id: reserva.turno_id,
            fecha: reserva.fecha,
            reintegrado: false,
            creado_at: new Date().toISOString()
          });
        }

        return {
          ...c,
          reservas_individuales: filtradas,
          clases_suspendidas: clasesSuspendidas
        };
      }
      return c;
    });

    const finalClientes = procesarPromocionListaEspera(reserva.turno_id, reserva.fecha, updatedClientes);
    saveState(finalClientes, planes, historialPrecios, turnos, pagos, recuperos, auditLogs);

    if (supabase) {
      const targetClient = finalClientes.find(c => c.id === clienteId);
      if (targetClient) {
        supabase.from('clientes').update({
          reservas_individuales: targetClient.reservas_individuales || [],
          clases_suspendidas: targetClient.clases_suspendidas || []
        }).eq('id', clienteId).then(({ error }) => {
          if (error) console.error("Error al actualizar cancelacion en Supabase:", error);
        });
      }
    }
    addAuditLog('RESERVA_INDIVIDUAL_CANCELADA', { 
      cliente: `${cliente.nombre} ${cliente.apellido}`, 
      turno_id: reserva.turno_id, 
      fecha: reserva.fecha, 
      reintegrado 
    });

    if (reintegrado) {
      return { success: true, message: 'Reserva cancelada. Cupo reintegrado a tu balance mensual.' };
    } else {
      return { success: true, message: 'Reserva liberada para el gimnasio. El cupo no se reintegra por cancelarse con menos de 3 horas de anticipación.' };
    }
  };

  const suspenderClaseFija = (clienteId: string, turnoId: string, fecha: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente no encontrado.' };

    if (!cliente.turnos_fijos.includes(turnoId)) {
      return { success: false, message: 'No tienes este turno asignado como fijo.' };
    }

    const alreadySuspended = (cliente.clases_suspendidas || []).some(s => s.turno_id === turnoId && s.fecha === fecha);
    if (alreadySuspended) {
      return { success: false, message: 'Esta sesión ya ha sido suspendida para esta fecha.' };
    }

    const turno = turnos.find(t => t.id === turnoId);
    const horaClase = turno ? turno.hora : '00:00';

    // Check 3 hours notice
    const now = new Date();
    const classDateTime = new Date(`${fecha}T${horaClase}:00`);
    const diffHours = (classDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const reintegrado = diffHours >= 3.0;

    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId) {
        const clasesSuspendidas = [...(c.clases_suspendidas || [])];
        clasesSuspendidas.push({
          turno_id: turnoId,
          fecha,
          reintegrado,
          creado_at: new Date().toISOString()
        });

        return {
          ...c,
          clases_suspendidas: clasesSuspendidas
        };
      }
      return c;
    });

    const finalClientes = procesarPromocionListaEspera(turnoId, fecha, updatedClientes);
    saveState(finalClientes, planes, historialPrecios, turnos, pagos, recuperos, auditLogs);

    if (supabase) {
      const targetClient = finalClientes.find(c => c.id === clienteId);
      if (targetClient) {
        supabase.from('clientes').update({
          clases_suspendidas: targetClient.clases_suspendidas || []
        }).eq('id', clienteId).then(({ error }) => {
          if (error) console.error("Error al actualizar suspension en Supabase:", error);
        });
      }
    }
    addAuditLog('CLASE_FIJA_SUSPENDIDA', { 
      cliente: `${cliente.nombre} ${cliente.apellido}`, 
      turno_id: turnoId, 
      fecha, 
      reintegrado 
    });

    if (reintegrado) {
      return { success: true, message: 'Sesión suspendida. Cupo de recuperación acreditado en tus disponibles.' };
    } else {
      return { success: true, message: 'Sesión suspendida. El cupo no se acredita por suspender con menos de 3 horas de anticipación.' };
    }
  };

  const revertirSuspensionClaseFija = (clienteId: string, turnoId: string, fecha: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente no encontrado.' };

    const isSuspended = (cliente.clases_suspendidas || []).some(s => s.turno_id === turnoId && s.fecha === fecha);
    if (!isSuspended) {
      return { success: false, message: 'Esta sesión no está suspendida para esta fecha.' };
    }

    const turno = turnos.find(t => t.id === turnoId);
    if (turno) {
      // Este socio está suspendido ese día, así que hoy NO cuenta en la ocupación.
      // Retomar lo suma de nuevo: hay que ver si entra. Antes esta copia de la
      // fórmula se olvidaba de los recuperos y dejaba retomar por encima del cupo.
      const o = calcularOcupacion(turno, fecha, clientes, recuperos);
      if (o.total >= turno.cupo_maximo) {
        return { success: false, message: `El turno se encuentra completo para retomar en esta fecha (${o.total}/${turno.cupo_maximo}).` };
      }
    }

    const updatedClientes = clientes.map(c => {
      if (c.id === clienteId) {
        const clasesSuspendidas = (c.clases_suspendidas || []).filter(
          s => !(s.turno_id === turnoId && s.fecha === fecha)
        );
        return {
          ...c,
          clases_suspendidas: clasesSuspendidas
        };
      }
      return c;
    });

    saveState(updatedClientes, planes, historialPrecios, turnos, pagos, recuperos, auditLogs);

    if (supabase) {
      const targetClient = updatedClientes.find(c => c.id === clienteId);
      if (targetClient) {
        supabase.from('clientes').update({
          clases_suspendidas: targetClient.clases_suspendidas || []
        }).eq('id', clienteId).then(({ error }) => {
          if (error) console.error("Error al actualizar suspension en Supabase:", error);
        });
      }
    }

    addAuditLog('CLASE_FIJA_RESTABLECIDA', { 
      cliente: `${cliente.nombre} ${cliente.apellido}`, 
      turno_id: turnoId, 
      fecha 
    });

    return { success: true, message: 'Asistencia restablecida con éxito.' };
  };

  const asignarProfesorTurno = (turnoId: string, profesor: string) => {
    const updated = turnos.map(t => {
      if (t.id === turnoId) {
        return { ...t, profesor: profesor.trim() || undefined };
      }
      return t;
    });
    saveState(clientes, planes, historialPrecios, updated, pagos, recuperos, auditLogs);

    if (supabase) {
      const dbUuid = getUuidFromTurnoId(turnoId);
      if (dbUuid) {
        supabase.from('turnos').update({
          profesor: profesor.trim() || null
        }).eq('id', dbUuid).then(({ error }) => {
          if (error) console.error("Error al actualizar profesor del turno en Supabase:", error);
        });
      }
    }
    addAuditLog('PROFESOR_TURNO_ASIGNADO', { turno_id: turnoId, profesor });
  };

  const registrarVacaciones = (clienteId: string, fechaInicio: string, fechaFin: string) => {
    const cliente = clientes.find(c => c.id === clienteId);
    if (!cliente) return { success: false, message: 'Cliente no encontrado.' };

    const start = new Date(fechaInicio + 'T00:00:00');
    const end = new Date(fechaFin + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return { success: false, message: 'Rango de fechas inválido.' };
    }

    const localRecs = [...recuperos];
    const nuevasSuspensiones: { turno_id: string; fecha: string; reintegrado: boolean; creado_at: string }[] = [];
    const removedReservaIds = new Set<string>();
    const newlyCreatedRecs: RecuperoTurno[] = [];
    let inasistenciasRegistradas = 0;

    // Helper: generate recovery ticket
    const addRecupero = (turnoId: string, dateStr: string, idx: number) => {
      const expDate = new Date(dateStr + 'T00:00:00');
      expDate.setDate(expDate.getDate() + 30);
      const expDateStr = expDate.toISOString().slice(0, 10);
      const rec: RecuperoTurno = {
        id: `rec-${Date.now()}-${idx}`,
        cliente_id: clienteId,
        cliente_nombre: `${cliente.nombre} ${cliente.apellido}`,
        turno_original_id: turnoId,
        fecha_inasistencia: dateStr,
        turno_recupero_id: 'PENDIENTE_DEFINICION',
        fecha_recupero: '',
        estado: 'PENDIENTE',
        fecha_limite: expDateStr
      };
      localRecs.push(rec);
      newlyCreatedRecs.push(rec);
    };

    // Day-of-week index map
    const daysMap: Record<string, number> = {
      DOMINGO: 0, LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6
    };

    // --- 1. TURNOS FIJOS ---
    // For each fixed shift, iterate all dates in range that match its weekday
    (cliente.turnos_fijos || []).forEach(tfId => {
      const turno = turnos.find(t => t.id === tfId);
      if (!turno) return;
      const targetDow = daysMap[turno.dia];
      if (targetDow === undefined) return;

      const cur = new Date(start);
      while (cur <= end) {
        if (cur.getDay() === targetDow) {
          const dateStr = cur.toISOString().slice(0, 10);
          const alreadySuspended =
            (cliente.clases_suspendidas || []).some(s => s.turno_id === tfId && s.fecha === dateStr) ||
            nuevasSuspensiones.some(s => s.turno_id === tfId && s.fecha === dateStr);

          if (!alreadySuspended) {
            nuevasSuspensiones.push({ turno_id: tfId, fecha: dateStr, reintegrado: true, creado_at: new Date().toISOString() });
            addRecupero(tfId, dateStr, inasistenciasRegistradas);
            inasistenciasRegistradas++;
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    });

    // --- 2. TURNOS VARIABLES (reservas individuales) ---
    (cliente.reservas_individuales || []).forEach(res => {
      const resDate = new Date(res.fecha + 'T00:00:00');
      if (resDate >= start && resDate <= end && !removedReservaIds.has(res.id)) {
        removedReservaIds.add(res.id);

        const alreadySuspended =
          (cliente.clases_suspendidas || []).some(s => s.turno_id === res.turno_id && s.fecha === res.fecha) ||
          nuevasSuspensiones.some(s => s.turno_id === res.turno_id && s.fecha === res.fecha);

        if (!alreadySuspended) {
          nuevasSuspensiones.push({ turno_id: res.turno_id, fecha: res.fecha, reintegrado: true, creado_at: new Date().toISOString() });
          addRecupero(res.turno_id, res.fecha, inasistenciasRegistradas);
          inasistenciasRegistradas++;
        }
      }
    });

    // Track which (turnoId, fecha) combos from variable reservations need waitlist processing
    const cancelledVariableSlots: { turnoId: string; fecha: string }[] = [];

    if (inasistenciasRegistradas > 0) {
      let updatedClientes = clientes.map(c => {
        if (c.id === clienteId) {
          const filteredReservas = (c.reservas_individuales || []).filter(r => !removedReservaIds.has(r.id));
          return {
            ...c,
            reservas_individuales: filteredReservas,
            clases_suspendidas: [...(c.clases_suspendidas || []), ...nuevasSuspensiones]
          };
        }
        return c;
      });

      // Collect cancelled variable slots for waitlist processing
      (cliente.reservas_individuales || []).forEach(res => {
        if (removedReservaIds.has(res.id)) {
          cancelledVariableSlots.push({ turnoId: res.turno_id, fecha: res.fecha });
        }
      });

      // Process waitlist promotions for each freed variable slot
      for (const slot of cancelledVariableSlots) {
        updatedClientes = procesarPromocionListaEspera(slot.turnoId, slot.fecha, updatedClientes);
      }

      saveState(updatedClientes, planes, historialPrecios, turnos, pagos, localRecs, auditLogs, novedades);
      syncRecuperosToSupabase(newlyCreatedRecs);

      // Sync updated client to Supabase
      if (supabase) {
        const targetClient = updatedClientes.find(c => c.id === clienteId);
        if (targetClient) {
          supabase.from('clientes').update({
            reservas_individuales: targetClient.reservas_individuales || [],
            clases_suspendidas: targetClient.clases_suspendidas || []
          }).eq('id', clienteId).then(({ error }) => {
            if (error) console.error('Error al sincronizar vacaciones en Supabase:', error);
          });
        }
      }

      addAuditLog('CLIENTE_REGISTRO_VACACIONES', {
        cliente: `${cliente.nombre} ${cliente.apellido}`,
        desde: fechaInicio,
        hasta: fechaFin,
        dias_afectados: inasistenciasRegistradas
      });

      return { success: true, message: `Vacaciones / Viaje registrado. Se dieron de baja ${inasistenciasRegistradas} clase${inasistenciasRegistradas !== 1 ? 's' : ''} (fijas y/o variables) y se generaron sus cupones de recupero.` };
    }

    return { success: false, message: 'No se encontraron clases fijas ni reservas de cupos para este socio en el rango de fechas seleccionado.' };
  };

  // TRANSFERENCIAS EN REVISIÓN
  const solicitarPagoTransferencia = (clienteId: string, montoCustom?: number, mesCustom?: string): { success: boolean; message: string } => {
    const cli = clientes.find(c => c.id === clienteId);
    if (!cli) return { success: false, message: 'Cliente no encontrado.' };

    // Check if there's already a pending review for this client
    const yaExiste = pagosEnRevision.some(p => p.cliente_id === clienteId && p.estado === 'PENDIENTE');
    if (yaExiste) return { success: false, message: 'Ya existe una transferencia en revisión para este socio.' };

    const hasDebt = cli.deuda_acumulada > 0 || cli.estado === 'CON_DEUDA' || cli.estado === 'MOROSO';
    const planDelSocio = planes.find(p => p.id === cli.plan_id);
    const planPrecio = cli.precio_personalizado ?? (planDelSocio ? planDelSocio.precio : 0);
    const montoRevision = montoCustom !== undefined && montoCustom > 0 
      ? montoCustom 
      : (hasDebt ? cli.deuda_acumulada : planPrecio);

    const targetMes = mesCustom || new Date().toISOString().slice(0, 7);

    const nuevaRevision: PagoEnRevision = {
      id: `rev-${Date.now()}`,
      cliente_id: clienteId,
      cliente_nombre_completo: `${cli.nombre} ${cli.apellido}`,
      monto: montoRevision,
      mes_correspondiente: targetMes,
      solicitado_por_email: cli.email,
      solicitado_at: new Date().toISOString(),
      estado: 'PENDIENTE'
    };

    const updated = [nuevaRevision, ...pagosEnRevision];
    setPagosEnRevision(updated);
    localStorage.setItem('gym_pagos_revision', JSON.stringify(updated));
    return { success: true, message: '¡Transferencia enviada! El equipo de KAHA GYM la revisará y confirmará tu pago.' };
  };

  const aprobarPagoTransferencia = (revisionId: string, adminEmail: string, destinoTransferencia?: 'JUANCHI' | 'RULO' | string, montoOverride?: number): { success: boolean; message: string } => {
    const revision = pagosEnRevision.find(p => p.id === revisionId);
    if (!revision) return { success: false, message: 'Revisión no encontrada.' };

    const cli = clientes.find(c => c.id === revision.cliente_id);
    const planDelSocio = cli ? planes.find(p => p.id === cli.plan_id) : undefined;
    const planPrecio = cli?.precio_personalizado ?? (planDelSocio ? planDelSocio.precio : 0);
    const hasDebt = cli ? (cli.deuda_acumulada > 0 || cli.estado === 'CON_DEUDA' || cli.estado === 'MOROSO') : false;

    // Si la revisión tenía monto 0 o se pasa montoOverride, aseguramos el monto real
    const montoFinal = montoOverride !== undefined && montoOverride > 0
      ? montoOverride
      : revision.monto > 0
      ? revision.monto
      : (hasDebt ? (cli?.deuda_acumulada || planPrecio) : planPrecio);

    const destino = destinoTransferencia || 'JUANCHI';

    // Register the actual payment
    const res = registrarPago({
      cliente_id: revision.cliente_id,
      cliente_nombre_completo: revision.cliente_nombre_completo,
      monto: montoFinal,
      medio_pago: 'TRANSFERENCIA',
      mes_correspondiente: revision.mes_correspondiente,
      hash_transaccion: `TRF-APROBADO-${revisionId}`,
      destino_transferencia: destino,
      registrado_por: adminEmail
    }, adminEmail);

    if (!res.success) return res;

    // Mark as approved
    const updated = pagosEnRevision.map(p => p.id === revisionId ? { ...p, monto: montoFinal, estado: 'APROBADO' as const, destino_transferencia: destino } : p);
    setPagosEnRevision(updated);
    localStorage.setItem('gym_pagos_revision', JSON.stringify(updated));
    return { success: true, message: `Transferencia a ${destino} aprobada y pago de $${montoFinal.toLocaleString('es-AR')} registrado correctamente.` };
  };

  const rechazarPagoTransferencia = (revisionId: string): { success: boolean; message: string } => {
    const revision = pagosEnRevision.find(p => p.id === revisionId);
    if (!revision) return { success: false, message: 'Revisión no encontrada.' };

    const updated = pagosEnRevision.map(p => p.id === revisionId ? { ...p, estado: 'RECHAZADO' as const } : p);
    setPagosEnRevision(updated);
    localStorage.setItem('gym_pagos_revision', JSON.stringify(updated));
    return { success: true, message: 'Transferencia rechazada.' };
  };

  // CLIENT PAGOS OPERATIONS
  const registrarPago = (pagoData: Omit<Pago, 'id' | 'creado_at' | 'fecha_pago'>, userEmail: string) => {
    const cli = clientes.find(c => c.id === pagoData.cliente_id);
    if (!cli) return { success: false, message: 'Cliente no encontrado.' };

    const cleanHash = pagoData.hash_transaccion?.trim() || `TXN-${Date.now()}`;
    
    // Prevención de duplicados por hash
    if (pagoData.hash_transaccion) {
      const duplicado = pagos.some(p => p.hash_transaccion === pagoData.hash_transaccion);
      if (duplicado) {
        return { success: false, message: 'Este pago ya se encuentra registrado (Detección de hash duplicado).' };
      }
    }

    // Generar UUID real compatible con Supabase
    const pagoId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `pay-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const now = new Date().toISOString();

    const nuevoPago: Pago = {
      ...pagoData,
      id: pagoId,
      fecha_pago: now,
      hash_transaccion: cleanHash,
      creado_at: now
    };

    // Actualizar ficha del cliente (bajar deudas e indicar mes pagado)
    const updatedClientes = clientes.map(c => {
      if (c.id === pagoData.cliente_id) {
        const nuevaDeuda = Math.max(0, c.deuda_acumulada - pagoData.monto);
        let ultimoMes = c.ultimo_mes_pagado;
        if (!ultimoMes || pagoData.mes_correspondiente > ultimoMes) {
          ultimoMes = pagoData.mes_correspondiente;
        }
        let nuevoEstado = c.estado;
        if (nuevaDeuda === 0) {
          nuevoEstado = 'ACTIVO';
        } else if (nuevoEstado === 'MOROSO' && nuevaDeuda > 0) {
          nuevoEstado = 'CON_DEUDA';
        }
        return {
          ...c,
          deuda_acumulada: nuevaDeuda,
          ultimo_mes_pagado: ultimoMes,
          estado: nuevoEstado as EstadoCliente
        };
      }
      return c;
    });

    const updatedPagos = [nuevoPago, ...pagos];

    saveState(updatedClientes, planes, historialPrecios, turnos, updatedPagos, recuperos, auditLogs);

    if (supabase) {
      // 1. Insertar pago en Supabase
      // Nota: 'registrado_por' es FK a perfiles_usuario(id) UUID — se omite para evitar error de tipo
      // ya que solo tenemos el email del operador, no su UUID de perfil.
      const pagoInsertPayload: any = {
        id: pagoId,
        cliente_id: nuevoPago.cliente_id,
        monto: nuevoPago.monto,
        medio_pago: nuevoPago.medio_pago,
        mes_correspondiente: nuevoPago.mes_correspondiente,
        hash_transaccion: cleanHash,
        destino_transferencia: nuevoPago.destino_transferencia || null,
        fecha_pago: now,
        creado_at: now
      };

      supabase.from('pagos').insert(pagoInsertPayload).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Error al insertar pago:', error.message, error.details, error.hint);
          // Si el error es por columna inexistente (42703), reintentar sin destino_transferencia
          if (error.code === '42703' || error.message?.includes('destino_transferencia')) {
            const safePayload = { ...pagoInsertPayload };
            delete safePayload.destino_transferencia;
            supabase.from('pagos').insert(safePayload);
          }
        } else {
          console.log('[Supabase] Pago guardado correctamente:', pagoId);
        }
      });

      // 2. Actualizar deuda y estado del cliente en Supabase
      const targetClient = updatedClientes.find(c => c.id === pagoData.cliente_id);
      if (targetClient) {
        supabase.from('clientes').update({
          deuda_acumulada: targetClient.deuda_acumulada,
          ultimo_mes_pagado: targetClient.ultimo_mes_pagado,
          estado: targetClient.estado
        }).eq('id', pagoData.cliente_id).then(({ error }) => {
          if (error) console.error('[Supabase] Error al actualizar deuda del cliente:', error.message);
        });
      }
    }

    addAuditLog('PAGO_REGISTRADO', { 
      cliente: cli.nombre + ' ' + cli.apellido, 
      monto: pagoData.monto, 
      mes: pagoData.mes_correspondiente, 
      medio: pagoData.medio_pago,
      registrado_por: userEmail
    }, userEmail);

    addNotificacion(
      'PAGO_REALIZADO',
      'Pago Confirmado 💰',
      `El socio ${cli.nombre} ${cli.apellido} abonó $${pagoData.monto.toLocaleString('es-AR')} ARS por el mes de ${pagoData.mes_correspondiente} (${pagoData.medio_pago === 'MERCADO_PAGO' ? 'Mercado Pago' : pagoData.medio_pago}).`
    );

    // ── Novedad privada de agradecimiento para el socio ──────────────────────
    // Solo aparece en la cartelera del socio que pagó (gracias al campo socio_id)
    const GRACIAS_PAGO = `Ya lo registramos y tus turnos fijos se renovaron correctamente 🙌\n\nRecordá que, si algún día vas a ausentarte, podés avisarlo directamente desde la app. De esta manera liberamos ese lugar para que otra persona pueda aprovecharlo y facilitamos la organización de recuperaciones para todos.\n\nEntre todos hacemos que KAHA funcione cada vez mejor 🤝💚`;
    addNovedad({
      titulo: '💚 ¡Gracias por tu pago!',
      contenido: GRACIAS_PAGO,
      categoria: 'INFORMACION',
      destacado: false,
      creado_por: 'KAHA GYM',
      socio_id: cli.id
    });

    addToast('add', 'Pago registrado exitosamente.');

    return { success: true, message: 'Pago registrado exitosamente. Comprobante de cobertura generado.' };
  };

  // ACTUALIZAR PAGO EXISTENTE (MONTO, CLIENTE, MES, MEDIO, DESTINO, ETC)
  const actualizarPago = (
    pagoId: string,
    updates: Partial<Pick<Pago, 'cliente_id' | 'monto' | 'medio_pago' | 'mes_correspondiente' | 'hash_transaccion' | 'destino_transferencia'>>,
    userEmail: string = 'admin@gimnasio.com.ar'
  ) => {
    const prevPago = pagos.find(p => p.id === pagoId);
    if (!prevPago) return { success: false, message: 'Pago no encontrado.' };

    let clienteNombre = prevPago.cliente_nombre_completo;
    if (updates.cliente_id) {
      const cli = clientes.find(c => c.id === updates.cliente_id);
      if (cli) {
        clienteNombre = `${cli.nombre} ${cli.apellido}`;
      }
    }

    const updatedPagos = pagos.map(p =>
      p.id === pagoId ? { ...p, ...updates, cliente_nombre_completo: clienteNombre } : p
    );
    setPagos(updatedPagos);
    localStorage.setItem('gym_pagos', JSON.stringify(updatedPagos));

    if (supabase) {
      const payload: any = {};
      if (updates.cliente_id !== undefined) payload.cliente_id = updates.cliente_id;
      if (updates.monto !== undefined) payload.monto = updates.monto;
      if (updates.medio_pago !== undefined) payload.medio_pago = updates.medio_pago;
      if (updates.mes_correspondiente !== undefined) payload.mes_correspondiente = updates.mes_correspondiente;
      if (updates.hash_transaccion !== undefined) payload.hash_transaccion = updates.hash_transaccion;
      if (updates.destino_transferencia !== undefined) payload.destino_transferencia = updates.destino_transferencia;

      supabase.from('pagos').update(payload).eq('id', pagoId).then(({ error }) => {
        if (error) {
          console.error('[Supabase] Error al actualizar pago:', error.message);
          if (error.code === '42703' || error.message?.includes('destino_transferencia')) {
            const safe = { ...payload };
            delete safe.destino_transferencia;
            supabase.from('pagos').update(safe).eq('id', pagoId);
          }
        }
      });
    }

    addAuditLog('PAGO_MODIFICADO', {
      pago_id: pagoId,
      monto_anterior: prevPago.monto,
      monto_nuevo: updates.monto ?? prevPago.monto,
      mes_anterior: prevPago.mes_correspondiente,
      mes_nuevo: updates.mes_correspondiente ?? prevPago.mes_correspondiente,
      cliente_anterior: prevPago.cliente_id,
      cliente_nuevo: updates.cliente_id ?? prevPago.cliente_id,
      modificado_por: userEmail
    }, userEmail);

    addToast('success', 'Pago actualizado exitosamente.');
    return { success: true, message: 'Pago actualizado exitosamente.' };
  };

  // ACTUALIZAR DESTINO (JUANCHI / RULO) DE UN PAGO EXISTENTE
  const actualizarDestinoPago = (pagoId: string, destino: 'JUANCHI' | 'RULO' | 'EFECTIVO') => {
    actualizarPago(pagoId, { destino_transferencia: destino });
  };

  // ELIMINAR UN PAGO REGISTRADO
  const eliminarPago = (pagoId: string) => {
    const updatedPagos = pagos.filter(p => p.id !== pagoId);
    setPagos(updatedPagos);
    localStorage.setItem('gym_pagos', JSON.stringify(updatedPagos));
    if (supabase) {
      supabase.from('pagos').delete().eq('id', pagoId).then(({ error }) => {
        if (error) console.error("Error al eliminar pago de Supabase:", error);
      });
    }
    addToast('delete', 'Pago eliminado.');
  };

  // IMPORTACIÓN CSV EXTRACTO
  const importarPagosCSV = (pagosImportados: Array<{ cliente_email: string; monto: number; fecha_pago: string; medio_pago: MedioPago; mes: string; hash: string }>, userEmail: string) => {
    let procesados = 0;
    let insertados = 0;
    let duplicados = 0;
    const errores: string[] = [];
    
    const listadoPagos = [...pagos];
    const listadoClientes = [...clientes];

    const nuevosPagos: Pago[] = [];
    const hashUnicosNuevos = new Set<string>();

    pagosImportados.forEach((row, idx) => {
      procesados++;
      const email = row.cliente_email?.trim();
      const hash = row.hash?.trim();

      if (!email || !hash || !row.monto) {
        errores.push(`ID Fila ${idx + 1}: Información incompleta para procesar la transacción.`);
        return;
      }

      // Validar duplicado por hash de transacción
      const duplicadoHistorial = listadoPagos.some(p => p.hash_transaccion === hash);
      const enEstaTanda = hashUnicosNuevos.has(hash);

      if (duplicadoHistorial || enEstaTanda) {
        duplicados++;
        return;
      }

      // Asociar cliente por email
      const clienteEncontrado = listadoClientes.find(c => c.activo && c.email.toLowerCase().trim() === email.toLowerCase().trim());
      if (!clienteEncontrado) {
        errores.push(`ID Fila ${idx + 1}: Cliente con email [${email}] no está activo o registrado en el sistema.`);
        return;
      }

      const pagoCreado: Pago = {
        id: `pay-imp-${Date.now()}-${idx}`,
        cliente_id: clienteEncontrado.id,
        cliente_nombre_completo: `${clienteEncontrado.nombre} ${clienteEncontrado.apellido}`,
        monto: Number(row.monto),
        fecha_pago: row.fecha_pago || new Date().toISOString(),
        medio_pago: row.medio_pago || 'TRANSFERENCIA',
        mes_correspondiente: row.mes || new Date().toISOString().slice(0, 7),
        hash_transaccion: hash,
        registrado_por: userEmail,
        creado_at: new Date().toISOString()
      };

      hashUnicosNuevos.add(hash);
      nuevosPagos.push(pagoCreado);
      insertados++;

      // Descontar deuda del cliente en caliente
      clienteEncontrado.deuda_acumulada = Math.max(0, clienteEncontrado.deuda_acumulada - row.monto);
      if (clienteEncontrado.deuda_acumulada === 0) {
        clienteEncontrado.estado = 'ACTIVO';
      }
      if (!clienteEncontrado.ultimo_mes_pagado || row.mes > clienteEncontrado.ultimo_mes_pagado) {
        clienteEncontrado.ultimo_mes_pagado = row.mes;
      }
    });

    if (nuevosPagos.length > 0) {
      const finalPagos = [...nuevosPagos, ...pagos];
      saveState(listadoClientes, planes, historialPrecios, turnos, finalPagos, recuperos, auditLogs);
      addAuditLog('IMPORTACION_MASIVA_EXTRACTO_PAGOS', { procesados, insertados, duplicados, errores: errores.length });
    }

    return { procesados, insertados, duplicados, errores };
  };

  // CONTROL DE MOROSIDAD (Simulación del Cron de Supabase Edge Function interactivo desde el panel)
  const ejecutarCronMorosidad = (simularFecha: string) => {
    const simFechaObj = new Date(simularFecha);
    
    // Obtener día y mes simulated
    const diaDelMes = simFechaObj.getUTCDate(); // usar UTC para evitar desfases de timezone locales
    const deMesFormato = simularFecha.slice(0, 7); // "YYYY-MM"

    // Regla: si el día 5 a las 23:59 (hora Argentina) no hay pago del mes -> MOROSO
    const esFechaLimitePasada = diaDelMes > 5 || (diaDelMes === 5);

    let procesados = 0;
    let nuevosMorosos = 0;
    let deudaTotal = 0;
    let suspendidosSemanaCount = 0;
    let dadosBajaCount = 0;
    const logLineas: string[] = [];

    logLineas.push(`>> [Cron Server] Iniciando proceso de control de morosidad...`);
    logLineas.push(`>> Fecha Simulada: ${simularFecha} (Día ${diaDelMes} del mes)`);

    let listadoTurnos = [...turnos];
    let listadoClientesActualizado = clientes.map(c => ({ ...c }));

    listadoClientesActualizado = listadoClientesActualizado.map(cli => {
      if (!cli.activo) return cli;
      procesados++;

      const precioPlan = planes.find(p => p.id === cli.plan_id)?.precio || 0;
      let nuevoEstado = cli.estado;
      let deudaActualizada = cli.deuda_acumulada;

      const pagoEsteMes = cli.ultimo_mes_pagado >= deMesFormato;
      const tieneExencion = cli.exencion_cobro && cli.exencion_cobro !== 'NINGUNA';

      // 1. Cargar deuda y cambiar estado a MOROSO si venció el plazo
      if (!pagoEsteMes && esFechaLimitePasada) {
        nuevoEstado = 'MOROSO';
        if (deudaActualizada < precioPlan) {
          deudaActualizada = precioPlan; // cargar la cuota este mes
        }
      } else if (!pagoEsteMes && !esFechaLimitePasada && nuevoEstado === 'ACTIVO') {
        nuevoEstado = 'ACTIVO'; // Aún en periodo de gracia
      }

      if (deudaActualizada > 0) {
        deudaTotal += deudaActualizada;
        if (nuevoEstado !== 'MOROSO') {
          nuevoEstado = 'CON_DEUDA';
        }
      }

      if (nuevoEstado === 'MOROSO' && cli.estado !== 'MOROSO') {
        nuevosMorosos++;
      }

      // 2. Procesar reglas según el día del mes
      if (!pagoEsteMes) {
        if (tieneExencion) {
          logLineas.push(`>> [EXCEPCIÓN] Socio ${cli.nombre} ${cli.apellido} exceptuado de penalizaciones por estado: ${cli.exencion_cobro}.`);
        } else {
          // Regla Día 1: Recordatorio
          if (diaDelMes === 1) {
            logLineas.push(`>> [NOTIFICACIÓN - DÍA 1] Enviando recordatorio a ${cli.nombre} ${cli.apellido}: "iniciamos el mes...acordate que el pago se realiza del 1 al 5 por favor...con el abono del plan se renuevan automáticamente tus cupos fijos"`);
          }

          // Regla Día 5: Aviso
          if (diaDelMes === 5) {
            logLineas.push(`>> [NOTIFICACIÓN - DÍA 5] Enviando aviso a ${cli.nombre} ${cli.apellido}: "recordá que mañana vence la fecha para el pago...de no abonar la siguiente semana los turnos fijos se borran automáticamente..."`);
          }

          // Regla Día 6 (del 6 al 9 inclusive): Suspensión momentánea y recordatorio
          if (diaDelMes >= 6 && diaDelMes <= 9) {
            if (cli.turnos_fijos.length > 0) {
              const fechasSemana = [
                `${deMesFormato}-06`,
                `${deMesFormato}-07`,
                `${deMesFormato}-08`,
                `${deMesFormato}-09`
              ];

              const weekdaysMap = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

              let nuevasSuspensiones = [...(cli.clases_suspendidas || [])];
              let suspendidoParaSocio = false;

              fechasSemana.forEach(fechaStr => {
                const dateObj = new Date(fechaStr + 'T00:00:00');
                const dayName = weekdaysMap[dateObj.getDay()];

                cli.turnos_fijos.forEach(tfId => {
                  if (tfId.startsWith(dayName)) {
                    // Check if already suspended for this date
                    const yaSuspendido = nuevasSuspensiones.some(s => s.turno_id === tfId && s.fecha === fechaStr);
                    if (!yaSuspendido) {
                      nuevasSuspensiones.push({
                        turno_id: tfId,
                        fecha: fechaStr,
                        reintegrado: false,
                        creado_at: new Date().toISOString()
                      });
                      suspendidoParaSocio = true;
                      suspendidosSemanaCount++;
                      logLineas.push(`>> [ACCIÓN - DÍA 6] Suspendido turno ${tfId} para ${cli.nombre} ${cli.apellido} el día ${fechaStr}`);
                    }
                  }
                });
              });

              if (suspendidoParaSocio) {
                cli.clases_suspendidas = nuevasSuspensiones;
              }
            }
          }

          // Regla Día 10 (10 en adelante): Revisión manual del Admin (no se baja a ciegas)
          if (diaDelMes >= 10) {
            if (cli.turnos_fijos.length > 0) {
              logLineas.push(`>> [REVISIÓN REQUERIDA - DÍA 10+] Alumno ${cli.nombre} ${cli.apellido} (${cli.turnos_fijos.length} turnos fijos) no pagó la cuota. Requiere confirmación manual del Administrador para proceder con la baja.`);
            }
          }
        }
      }

      return {
        ...cli,
        estado: nuevoEstado as EstadoCliente,
        deuda_acumulada: deudaActualizada
      };
    });

    saveState(listadoClientesActualizado, planes, historialPrecios, listadoTurnos, pagos, recuperos, auditLogs);
    addAuditLog('CRON_DETECCION_MOROSIDAD_MANUAL', { 
      simulacion_mes: deMesFormato, 
      dia_mes: diaDelMes,
      fecha_limite_pasada: esFechaLimitePasada,
      total_analizados: procesados, 
      nuevos_morosos_detectados: nuevosMorosos,
      deuda_total_acumulada: deudaTotal,
      suspendidos_semana: suspendidosSemanaCount,
      bajas_oficiales: dadosBajaCount
    });

    logLineas.push(`>> [Cron Server] Control finalizado. Procesados: ${procesados} | Nuevos Morosos: ${nuevosMorosos} | Suspendidos Semana: ${suspendidosSemanaCount} | Bajas Oficiales: ${dadosBajaCount}`);

    return { procesados, nuevosMorosos, deudaTotal, suspendidosSemanaCount, dadosBajaCount, logLineas };
  };

  const signInWithGoogle = async (email: string, nameName: string, picture?: string) => {
    const cleanMail = email.trim().toLowerCase();
    let detectedRole: RolUsuario = 'SOCIO';
    let targetSocioId: string | null = null;

    if (
      cleanMail === 'tobiasarraiza17@gmail.com' ||
      cleanMail === 'totoarr17@gmail.com' ||
      cleanMail === 'jmferrariprofe@gmail.com' ||
      cleanMail === 'ianvelazquez97@gmail.com'
    ) {
      detectedRole = 'ADMIN';
    } else if (
      cleanMail === 'denisetomatis@gmail.com' ||
      cleanMail === 'lucasobueno@live.com'
    ) {
      detectedRole = 'PROFESOR';
    } else if (cleanMail === 'profe@gimnasio.com.ar' || cleanMail === 'profe@aresgym.com') {
      detectedRole = 'OPERADOR';
    } else {
      // Intentar buscar socio existente localmente
      let socioExistente = clientes.find(c => c.activo && c.email.toLowerCase().trim() === cleanMail);
      
      // Si no se encuentra localmente (por ejemplo, si aún se está cargando la base de datos),
      // buscar directamente en la base de datos de Supabase para evitar registrar de nuevo
      if (!socioExistente && supabase) {
        try {
          const { data: dbClient } = await supabase
            .from('clientes')
            .select('*')
            .eq('email', email.trim())
            .eq('activo', true)
            .maybeSingle();

          if (dbClient) {
            // Sincronizar estado local llamando a loadSupabaseData
            await loadSupabaseData();
            // Buscar nuevamente tras la recarga
            socioExistente = clientes.find(c => c.activo && c.email.toLowerCase().trim() === cleanMail) || {
              id: dbClient.id,
              nombre: dbClient.nombre,
              apellido: dbClient.apellido,
              email: dbClient.email,
              telefono: dbClient.telefono || '',
              tipo: dbClient.tipo as TipoCliente,
              estado: dbClient.estado as EstadoCliente,
              plan_id: dbClient.plan_id || 'p-none',
              activo: dbClient.activo,
              deuda_acumulada: Number(dbClient.deuda_acumulada),
              ultimo_mes_pagado: dbClient.ultimo_mes_pagado || '',
              turnos_fijos: [],
              exencion_cobro: (dbClient.exencion_cobro || 'NINGUNA') as any,
              autorizado: dbClient.autorizado ?? true,
              reservas_individuales: dbClient.reservas_individuales || [],
              clases_suspendidas: dbClient.clases_suspendidas || [],
              creado_at: dbClient.creado_at
            };
          }
        } catch (err) {
          console.error("Error al buscar socio en Supabase en inicio de sesión:", err);
        }
      }

      if (socioExistente) {
        detectedRole = 'SOCIO';
        targetSocioId = socioExistente.id;
      } else {
        // Redireccionar al formulario de registro para pedir celular
        setPendingRegistrationUser({ email: cleanMail, name: nameName, picture });
        return;
      }
    }

    const newUser = { email, name: nameName, picture, role: detectedRole };
    setGoogleUser(newUser);
    localStorage.setItem('gym_google_user', JSON.stringify(newUser));
    setRolActivo(detectedRole);
    localStorage.setItem('gym_rol_activo', detectedRole);
    
    if (targetSocioId) {
      setSelectedSocioId(targetSocioId);
    }
    
    addAuditLog('SESION_INICIO_GOOGLE', { email, rol: detectedRole, nombre: nameName });
  };

  const signInWithEmailAndPassword = async (email: string, pass: string) => {
    const cleanMail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (!cleanMail || !cleanMail.includes('@')) {
      throw new Error('Ingresá un correo electrónico válido.');
    }
    if (!cleanPass) {
      throw new Error('Por favor ingresá tu contraseña.');
    }

    let detectedRole: RolUsuario = 'SOCIO';
    let targetSocioId: string | null = null;
    let userName = cleanMail.split('@')[0];

    if (
      cleanMail === 'tobiasarraiza17@gmail.com' ||
      cleanMail === 'totoarr17@gmail.com' ||
      cleanMail === 'jmferrariprofe@gmail.com' ||
      cleanMail === 'ianvelazquez97@gmail.com'
    ) {
      if (cleanPass !== 'admin123' && cleanPass !== 'kaha2026' && cleanPass !== 'admin') {
        throw new Error('Contraseña de administrador incorrecta.');
      }
      detectedRole = 'ADMIN';
    } else if (
      cleanMail === 'denisetomatis@gmail.com' ||
      cleanMail === 'lucasobueno@live.com' ||
      cleanMail === 'profe@gimnasio.com.ar' ||
      cleanMail === 'profe@aresgym.com'
    ) {
      if (cleanPass !== 'profe123' && cleanPass !== 'kaha2026' && cleanPass !== 'profe') {
        throw new Error('Contraseña de operador/profesor incorrecta.');
      }
      detectedRole = cleanMail.includes('profe@') ? 'OPERADOR' : 'PROFESOR';
    } else {
      let socioExistente = clientes.find(c => c.activo && c.email.toLowerCase().trim() === cleanMail);

      if (!socioExistente && supabase) {
        try {
          const { data: dbClient } = await supabase
            .from('clientes')
            .select('*')
            .eq('email', email.trim())
            .eq('activo', true)
            .maybeSingle();

          if (dbClient) {
            await loadSupabaseData();
            socioExistente = clientes.find(c => c.activo && c.email.toLowerCase().trim() === cleanMail);
          }
        } catch (err) {
          console.error("Error al buscar socio en Supabase en login con clave:", err);
        }
      }

      if (socioExistente) {
        const cleanPhone = (socioExistente.telefono || '').replace(/\D/g, '');
        const passDigits = cleanPass.replace(/\D/g, '');

        const isPhoneMatch = cleanPhone.length > 0 && (cleanPhone === passDigits || cleanPhone.endsWith(passDigits) || passDigits.endsWith(cleanPhone));
        const isDefaultPass = cleanPass === 'kaha1234' || cleanPass === '123456' || cleanPass === '1234';

        if (!isPhoneMatch && !isDefaultPass && (socioExistente as any).password !== cleanPass) {
          throw new Error('Contraseña incorrecta. Recordá que tu contraseña por defecto es tu número de celular registrado.');
        }

        detectedRole = 'SOCIO';
        targetSocioId = socioExistente.id;
        userName = `${socioExistente.nombre} ${socioExistente.apellido}`;
      } else {
        throw new Error('No se encontró ninguna cuenta registrada con este correo electrónico.');
      }
    }

    const newUser = { email, name: userName, role: detectedRole };
    setGoogleUser(newUser);
    localStorage.setItem('gym_google_user', JSON.stringify(newUser));
    setRolActivo(detectedRole);
    localStorage.setItem('gym_rol_activo', detectedRole);

    if (targetSocioId) {
      setSelectedSocioId(targetSocioId);
    }

    addAuditLog('SESION_INICIO_CORREO', { email, rol: detectedRole, nombre: userName });
  };

  const completeSocioRegistration = async (nombre: string, apellido: string, telefono: string) => {
    if (!pendingRegistrationUser) return;
    const { email, picture } = pendingRegistrationUser;
    const cleanMail = email.trim().toLowerCase();

    // Doble verificación para evitar duplicados en registro asíncrono
    let socioExistente = clientes.find(c => c.activo && c.email.toLowerCase().trim() === cleanMail);
    if (!socioExistente && supabase) {
      try {
        const { data: dbClient } = await supabase
          .from('clientes')
          .select('*')
          .eq('email', email.trim())
          .eq('activo', true)
          .maybeSingle();

        if (dbClient) {
          await loadSupabaseData();
          socioExistente = clientes.find(c => c.activo && c.email.toLowerCase().trim() === cleanMail);
        }
      } catch (err) {
        console.error("Error al comprobar duplicado en registro:", err);
      }
    }

    if (socioExistente) {
      // Si ya existe, simplemente lo logueamos y evitamos duplicar la ficha
      const newUser = { email, name: `${socioExistente.nombre} ${socioExistente.apellido}`, picture, role: 'SOCIO' as RolUsuario };
      setGoogleUser(newUser);
      localStorage.setItem('gym_google_user', JSON.stringify(newUser));
      setRolActivo('SOCIO');
      localStorage.setItem('gym_rol_activo', 'SOCIO');
      setSelectedSocioId(socioExistente.id);
      setPendingRegistrationUser(null);
      addToast('success', 'Inicio de sesión exitoso (cuenta existente).');
      return;
    }
    
    const newSocioId = crypto.randomUUID();
    const nuevoCliente: Cliente = {
      id: newSocioId,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email,
      telefono: telefono.trim() || '11-0000-0000',
      tipo: 'FIJO',
      estado: 'ACTIVO',
      plan_id: 'p-none',
      activo: true,
      deuda_acumulada: 0,
      ultimo_mes_pagado: new Date().toISOString().slice(0, 7),
      turnos_fijos: [],
      exencion_cobro: 'NINGUNA',
      creado_at: new Date().toISOString(),
      autorizado: false
    };

    const updated = [nuevoCliente, ...clientes];
    saveState(updated, planes, historialPrecios, turnos, pagos, recuperos, auditLogs);

    if (supabase) {
      supabase.from('clientes').insert({
        id: nuevoCliente.id,
        nombre: nuevoCliente.nombre,
        apellido: nuevoCliente.apellido,
        email: nuevoCliente.email,
        telefono: nuevoCliente.telefono,
        tipo: nuevoCliente.tipo,
        estado: nuevoCliente.estado,
        plan_id: '00000000-0000-0000-0000-000000000000', // "Aún no sabe"
        activo: nuevoCliente.activo,
        deuda_acumulada: nuevoCliente.deuda_acumulada,
        ultimo_mes_pagado: nuevoCliente.ultimo_mes_pagado,
        exencion_cobro: nuevoCliente.exencion_cobro,
        autorizado: nuevoCliente.autorizado,
        creado_at: nuevoCliente.creado_at
      }).then(({ error }) => {
        if (error) console.error("Error al registrar nuevo socio en Supabase:", error);
      });
    }

    const newUser = { email, name: `${nombre} ${apellido}`, picture, role: 'SOCIO' as RolUsuario };
    setGoogleUser(newUser);
    localStorage.setItem('gym_google_user', JSON.stringify(newUser));
    setRolActivo('SOCIO');
    localStorage.setItem('gym_rol_activo', 'SOCIO');
    setSelectedSocioId(newSocioId);

    addAuditLog('CLIENTE_REGISTRADO_ONBOARDING', { email, nombre: `${nombre} ${apellido}` });
    addNotificacion(
      'SISTEMA',
      'Nuevo Registro Pendiente 👤',
      `El usuario ${nombre} ${apellido} se registró y espera autorización. Celular: ${telefono}`
    );

    setPendingRegistrationUser(null);
  };

  const signOutGoogle = () => {
    addAuditLog('SESION_CERRADA_GOOGLE', { email: googleUser?.email });
    setGoogleUser(null);
    setPendingRegistrationUser(null);
    localStorage.removeItem('gym_google_user');
    setRolActivo('SOCIO');
    localStorage.setItem('gym_rol_activo', 'SOCIO');
    setSelectedSocioId(null);
  };

  const addNotificacion = (tipo: 'PAGO_REALIZADO' | 'SISTEMA' | 'DEUDA_VENCIDA', titulo: string, mensaje: string) => {
    const newNotif: AlertaNotificacion = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      tipo,
      titulo,
      mensaje,
      fecha: new Date().toISOString(),
      leido: false
    };
    setNotificaciones(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem('gym_notificaciones', JSON.stringify(updated));
      return updated;
    });
  };

  const marcarNotificacionesLeidas = () => {
    setNotificaciones(prev => {
      const updated = prev.map(n => ({ ...n, leido: true }));
      localStorage.setItem('gym_notificaciones', JSON.stringify(updated));
      return updated;
    });
  };

  const eliminarNotificacion = (id: string) => {
    setNotificaciones(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem('gym_notificaciones', JSON.stringify(updated));
      return updated;
    });
  };

  const registrarGasto = (gastoData: Omit<Gasto, 'id' | 'creado_at'>) => {
    const nuevoGasto: Gasto = {
      ...gastoData,
      efectuado_por: gastoData.efectuado_por || 'EFECTIVO_CAJA',
      id: `gas-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      creado_at: new Date().toISOString()
    };
    setGastos(prev => {
      const updated = [nuevoGasto, ...prev];
      localStorage.setItem('gym_gastos', JSON.stringify(updated));
      return updated;
    });
    addAuditLog('GASTO_REGISTRADO', { 
      concepto: gastoData.concepto, 
      monto: gastoData.monto,
      efectuado_por: nuevoGasto.efectuado_por
    });
    addToast('add', 'Gasto registrado exitosamente.');
    return { success: true, message: 'Gasto registrado exitosamente.' };
  };

  const eliminarGasto = (id: string) => {
    setGastos(prev => {
      const updated = prev.filter(g => g.id !== id);
      localStorage.setItem('gym_gastos', JSON.stringify(updated));
      return updated;
    });
    addAuditLog('GASTO_ELIMINADO', { id });
    addToast('delete', 'Gasto eliminado exitosamente.');
  };

  const registrarProfesor = (profesorData: Omit<Profesor, 'id' | 'activo'>) => {
    const nuevoProfesor: Profesor = {
      ...profesorData,
      id: `prof-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      activo: true
    };
    setProfesores(prev => {
      const updated = [...prev, nuevoProfesor];
      localStorage.setItem('gym_profesores', JSON.stringify(updated));
      return updated;
    });
    addAuditLog('PROFESOR_REGISTRADO', { nombre: profesorData.nombre, valor_hora: profesorData.valor_hora });
    addToast('add', 'Profesor registrado exitosamente.');
    return { success: true, message: 'Profesor registrado exitosamente.' };
  };

  const updateProfesor = (id: string, updates: Partial<Profesor>) => {
    setProfesores(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, ...updates } : p);
      localStorage.setItem('gym_profesores', JSON.stringify(updated));
      return updated;
    });
    addAuditLog('PROFESOR_MODIFICADO', { id, cambiados: Object.keys(updates) });
    return { success: true, message: 'Profesor modificado exitosamente.' };
  };

  const eliminarProfesor = (id: string) => {
    setProfesores(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, activo: false } : p);
      localStorage.setItem('gym_profesores', JSON.stringify(updated));
      return updated;
    });
    addAuditLog('PROFESOR_ELIMINADO', { id });
    addToast('delete', 'Profesor eliminado permanentemente.');
  };

  const registrarNovedadProfesor = (novedadData: Omit<NovedadProfesor, 'id' | 'creado_at'>) => {
    const nuevaNovedad: NovedadProfesor = {
      ...novedadData,
      id: `nov-p-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      creado_at: new Date().toISOString()
    };
    setNovedadesProfesores(prev => {
      const updated = [nuevaNovedad, ...prev];
      localStorage.setItem('gym_novedades_profesores', JSON.stringify(updated));
      return updated;
    });
    addAuditLog('NOVEDAD_PROFESOR_REGISTRADA', { tipo: novedadData.tipo, fecha: novedadData.fecha });
    addToast('add', 'Novedad de profesor registrada.');
    return { success: true, message: 'Novedad de profesor registrada exitosamente.' };
  };

  const eliminarNovedadProfesor = (id: string) => {
    setNovedadesProfesores(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem('gym_novedades_profesores', JSON.stringify(updated));
      return updated;
    });
    addAuditLog('NOVEDAD_PROFESOR_ELIMINADA', { id });
    addToast('delete', 'Novedad de profesor eliminada.');
  };

  const addNovedad = (novData: Omit<Novedad, 'id' | 'fecha'>) => {
    const formatTime = () => {
      const d = new Date();
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const mi = String(d.getMinutes()).padStart(2, '0');
      return `${yr}-${mo}-${dy} ${hr}:${mi}`;
    };

    const newNov: Novedad = {
      ...novData,
      id: `nov-${Date.now()}`,
      fecha: formatTime()
    };

    const updated = [newNov, ...novedades];
    setNovedades(updated);
    localStorage.setItem('gym_novedades', JSON.stringify(updated));

    // Sincronizar a Supabase en paralelo
    if (supabase) {
      supabase.from('novedades').insert({
        id: newNov.id,
        titulo: newNov.titulo,
        contenido: newNov.contenido,
        fecha: newNov.fecha,
        categoria: newNov.categoria,
        creado_por: newNov.creado_por,
        destacado: newNov.destacado,
        ...(newNov.socio_id ? { socio_id: newNov.socio_id } : {})
      }).then(({ error }) => {
        if (error) console.warn('[KAHA] Error al subir novedad a Supabase:', error.message);
      });
    }

    addAuditLog('NOVEDAD_CREADA', { id: newNov.id, titulo: newNov.titulo, privada: !!newNov.socio_id });
    // No mostrar toast para novedades privadas (evitar ruido en el admin cuando se registra un pago)
    if (!newNov.socio_id) {
      addToast('add', 'Novedad publicada exitosamente.');
    }
    return { success: true, message: 'Novedad publicada exitosamente.', id: newNov.id };
  };

  const updateNovedad = (id: string, updates: Partial<Novedad>) => {
    const updated = novedades.map(n => n.id === id ? { ...n, ...updates } : n);
    setNovedades(updated);
    localStorage.setItem('gym_novedades', JSON.stringify(updated));

    // Sincronizar a Supabase en paralelo
    if (supabase) {
      supabase.from('novedades').update({
        titulo: updates.titulo,
        contenido: updates.contenido,
        categoria: updates.categoria,
        destacado: updates.destacado,
        creado_por: updates.creado_por
      }).eq('id', id).then(({ error }) => {
        if (error) console.warn('[KAHA] Error al actualizar novedad en Supabase:', error.message);
      });
    }

    addAuditLog('NOVEDAD_MODIFICADA', { id, titulo_nuevo: updates.titulo });
    return { success: true, message: 'Novedad modificada exitosamente.' };
  };

  const deleteNovedad = (id: string) => {
    const matched = novedades.find(n => n.id === id);
    const updated = novedades.filter(n => n.id !== id);
    setNovedades(updated);
    localStorage.setItem('gym_novedades', JSON.stringify(updated));

    // Sincronizar a Supabase en paralelo
    if (supabase) {
      supabase.from('novedades').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('[KAHA] Error al eliminar novedad en Supabase:', error.message);
      });
    }

    addAuditLog('NOVEDAD_ELIMINADA', { id, titulo: matched?.titulo });
    addToast('delete', 'Novedad eliminada exitosamente.');
  };

  const borrarHistorial = () => {
    localStorage.removeItem('gym_clientes');
    localStorage.removeItem('gym_planes');
    localStorage.removeItem('gym_historial_precios');
    localStorage.removeItem('gym_turnos');
    localStorage.removeItem('gym_pagos');
    localStorage.removeItem('gym_recuperos');
    localStorage.removeItem('gym_novedades');
    localStorage.removeItem('gym_notificaciones');
    localStorage.removeItem('gym_gastos');
    localStorage.removeItem('gym_profesores');
    localStorage.removeItem('gym_novedades_profesores');
    localStorage.removeItem('gym_audit_logs');
    localStorage.removeItem('gym_google_user');
    localStorage.removeItem('gym_rol_activo');
    localStorage.removeItem('gym_waitlist_reservas');
    window.location.reload();
  };

  const addToast = (type: 'add' | 'delete' | 'success' | 'error', message: string) => {
    if (rolActivo === 'ADMIN' || rolActivo === 'OPERADOR') {
      playAudioTone(type);
      triggerVibration(type);
    }

    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      message
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <GymContext.Provider value={{
      clientes, planes, historialPrecios, turnos, pagos, recuperos, auditLogs, novedades,
      notificaciones, gastos, profesores, novedadesProfesores, rolActivo,
      setRolActivo: handleSetRolActivo,
      selectedSocioId, setSelectedSocioId,
      googleUser, signInWithGoogle, signInWithEmailAndPassword, signOutGoogle,
      pendingRegistrationUser, completeSocioRegistration,
      waitlistReservas, agregarListaEsperaReserva, removerListaEsperaReserva,
      addCliente, updateCliente, autorizarCliente, bajaLogicaCliente, altaCliente, eliminarCliente, bajaClasesSocio, importarClientesCSV,
      updatePrecioPlan,
      asignarClienteFijo, removerAsignacionFija, darDeBajaTurnosFijosSocio, darDeBajaTurnosFijosMultiple, notificarBajaClase, notificarAltaWaitlist, asignarTurnoVariable, checkInFlexible, agregarRecupero, actualizarEstadoRecupero, programarRecuperoPendiente, modificarPrecioOCupoTurno,
      asignarProfesorTurno, registrarVacaciones,
      crearReservaIndividual, cancelarReservaIndividual, suspenderClaseFija, revertirSuspensionClaseFija,
      registrarPago, actualizarPago, actualizarDestinoPago, eliminarPago, importarPagosCSV,
      pagosEnRevision,
      solicitarPagoTransferencia,
      aprobarPagoTransferencia,
      rechazarPagoTransferencia,
      addNotificacion, marcarNotificacionesLeidas, eliminarNotificacion,
      registrarGasto, eliminarGasto, registrarProfesor, updateProfesor, eliminarProfesor, registrarNovedadProfesor, eliminarNovedadProfesor,
      addNovedad, updateNovedad, deleteNovedad,
      ejecutarCronMorosidad,
      borrarHistorial,
      addAuditLog,
      toasts,
      addToast,
      removeToast,
      loading
    }}>
      {children}
    </GymContext.Provider>
  );
};

export const useGym = () => {
  const context = useContext(GymContext);
  if (!context) throw new Error('useGym debe ser utilizado dentro de GymProvider');
  return context;
};
