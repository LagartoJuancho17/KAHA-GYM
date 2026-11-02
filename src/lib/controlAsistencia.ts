// src/lib/controlAsistencia.ts
// Lógica pura para la gestión de asistencia y presentes en las clases de KAHA GYM.

import { Cliente, RecuperoTurno, Turno, Plan } from '../types';
import { estaSuspendido } from './ocupacion';
import { precioPlanSocio } from './calculoDeuda';

export type TipoInscripcionClase = 'FIJO' | 'VARIABLE' | 'RECUPERO' | 'WALKIN';

export interface AlumnoClaseAsistencia {
  clienteId: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  tipoInscripcion: TipoInscripcionClase;
  recuperoId?: string;
  recuperoOrigen?: string;
  planNombre: string;
  cuota: number;
  alDia: boolean;
  debeMonto: number;
  ultimoMesPagado?: string;
  exencionCobro?: string;
  presente: boolean;
  horaMarcado?: string;
}

export interface RegistroAsistenciaClase {
  id: string; // ej: "2026-11-02_LUNES-20:00"
  fecha: string; // "YYYY-MM-DD"
  turnoId: string; // "LUNES-20:00"
  dia: string;
  hora: string;
  profesor?: string;
  presentesIds: string[];
  ausentesIds: string[];
  walkins: AlumnoClaseAsistencia[];
  notas?: string;
  actualizadoAt: string;
  guardadoPor?: string;
}

/**
 * Genera la clave única de asistencia para una fecha y turno.
 */
export function generarClaveAsistencia(fecha: string, turnoId: string): string {
  return `${fecha}_${turnoId}`;
}

/**
 * Convierte un string de hora "HH:MM" a minutos desde medianoche para comparar fácilmente.
 */
export function horaAMinutos(horaStr: string): number {
  if (!horaStr) return 0;
  const parts = horaStr.split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
}

/**
 * Detecta el turno actual o más cercano según la hora actual en minutos.
 * Ventana activa: desde 15 minutos antes del inicio hasta 45 minutos después.
 */
export function detectarTurnoActual(turnosDelDia: Turno[], horaReferencia?: string): Turno | null {
  if (!turnosDelDia || turnosDelDia.length === 0) return null;

  let ahoraMinutos: number;
  if (horaReferencia) {
    ahoraMinutos = horaAMinutos(horaReferencia);
  } else {
    const d = new Date();
    // Soporte para horario de Argentina
    const arHoraStr = d.toLocaleTimeString('en-US', { timeZone: 'America/Argentina/Buenos_Aires', hour12: false, hour: '2-digit', minute: '2-digit' });
    ahoraMinutos = horaAMinutos(arHoraStr);
  }

  const ordenados = [...turnosDelDia].sort((a, b) => horaAMinutos(a.hora) - horaAMinutos(b.hora));

  // 1. Buscar si hay una clase en curso o a punto de empezar (ventana: -15 min a +45 min)
  const candidatos = ordenados.filter(t => {
    const tMin = horaAMinutos(t.hora);
    return ahoraMinutos >= tMin - 15 && ahoraMinutos <= tMin + 45;
  });

  if (candidatos.length > 0) {
    // Si hay candidatos en ventana, elegir el de menor distancia temporal al horario de inicio
    return candidatos.sort((a, b) => Math.abs(horaAMinutos(a.hora) - ahoraMinutos) - Math.abs(horaAMinutos(b.hora) - ahoraMinutos))[0];
  }

  // 2. Si no hay clase en curso, buscar la próxima clase futura
  const futuras = ordenados.filter(t => horaAMinutos(t.hora) > ahoraMinutos);
  if (futuras.length > 0) {
    return futuras[0];
  }

  // 3. Si ya pasaron todas las clases de hoy, devolver la última del día
  return ordenados[ordenados.length - 1];
}

/**
 * Obtiene la lista completa de alumnos convocados para una clase puntual (fecha + turno).
 * Consolida:
 * - Fijos regulares (que no suspendieron en esa fecha)
 * - Reservas individuales puntuales
 * - Recuperos asignados a esa fecha y turno
 */
export function obtenerAlumnosConvocados({
  turno,
  fecha,
  clientes,
  recuperos,
  planes,
  mesActual
}: {
  turno: Turno;
  fecha: string;
  clientes: Cliente[];
  recuperos: RecuperoTurno[];
  planes: Plan[];
  mesActual: string;
}): AlumnoClaseAsistencia[] {
  if (!turno || !clientes) return [];

  const resultado: AlumnoClaseAsistencia[] = [];
  const clientesMap = new Map<string, Cliente>();
  clientes.forEach(c => clientesMap.set(c.id, c));

  const buildAlumno = (
    c: Cliente, 
    tipo: TipoInscripcionClase, 
    extra?: { recuperoId?: string; recuperoOrigen?: string }
  ): AlumnoClaseAsistencia => {
    const pl = planes.find(p => p.id === c.plan_id);
    const cuota = precioPlanSocio(c, planes);
    
    // Un socio está al día si pagó el mes actual o si es becado/perdonado
    const esExento = c.exencion_cobro === 'PERDONADO' || c.exencion_cobro === 'BECADO';
    const pagoMes = Boolean(c.ultimo_mes_pagado && c.ultimo_mes_pagado >= mesActual);
    const tieneDeuda = (c.deuda_acumulada || 0) > 0;
    const alDia = esExento || (pagoMes && !tieneDeuda);
    const debeMonto = alDia ? 0 : (tieneDeuda ? c.deuda_acumulada : cuota);

    return {
      clienteId: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      nombreCompleto: `${c.nombre} ${c.apellido}`.trim(),
      email: c.email || '',
      telefono: c.telefono || '',
      tipoInscripcion: tipo,
      recuperoId: extra?.recuperoId,
      recuperoOrigen: extra?.recuperoOrigen,
      planNombre: pl?.nombre || 'General',
      cuota,
      alDia,
      debeMonto,
      ultimoMesPagado: c.ultimo_mes_pagado,
      exencionCobro: c.exencion_cobro,
      presente: false
    };
  };

  // 1. Fijos activos (asignados que no hayan suspendido esa fecha)
  const fijosIds = turno.asignados_ids || [];
  fijosIds.forEach(id => {
    const c = clientesMap.get(id);
    if (!c || !c.activo) return;
    if (estaSuspendido(c, turno.id, fecha)) return;
    resultado.push(buildAlumno(c, 'FIJO'));
  });

  const fijosSet = new Set(fijosIds);

  // 2. Reservas individuales (socios activos no fijos que reservaron este turno y fecha)
  clientes.forEach(c => {
    if (!c.activo || fijosSet.has(c.id)) return;
    const tieneReserva = (c.reservas_individuales || []).some(
      r => r.turno_id === turno.id && r.fecha === fecha
    );
    if (tieneReserva) {
      resultado.push(buildAlumno(c, 'VARIABLE'));
    }
  });

  // 3. Recuperos de turnos asignados a esta fecha y turno
  if (recuperos && Array.isArray(recuperos)) {
    recuperos.forEach(rec => {
      const coincideTurno = rec.turno_recupero_id === turno.id;
      const coincideFecha = rec.fecha_recupero === fecha;
      const estadoOcupa = rec.estado === 'PENDIENTE' || rec.estado === 'COMPLETADO';
      
      if (coincideTurno && coincideFecha && estadoOcupa) {
        const c = clientesMap.get(rec.cliente_id);
        if (!c || !c.activo) return;
        // Evitar duplicar si ya estaba por reserva puntual
        if (resultado.some(a => a.clienteId === c.id)) return;
        resultado.push(buildAlumno(c, 'RECUPERO', {
          recuperoId: rec.id,
          recuperoOrigen: `${rec.turno_original_id} (${rec.fecha_inasistencia})`
        }));
      }
    });
  }

  // Ordenar alfabéticamente por apellido y nombre
  return resultado.sort((a, b) => a.apellido.localeCompare(b.apellido));
}

/**
 * Calcula métricas de asistencia de una clase.
 */
export function calcularMetricasAsistencia(
  alumnos: AlumnoClaseAsistencia[],
  presentesIds: Set<string> | string[],
  cupoMaximo: number
): {
  totalInscriptos: number;
  totalPresentes: number;
  totalAusentes: number;
  cupoMaximo: number;
  lugaresLibres: number;
  porcentajeAsistencia: number;
} {
  const pSet = presentesIds instanceof Set ? presentesIds : new Set(presentesIds);
  const totalInscriptos = alumnos.length;
  let totalPresentes = 0;

  alumnos.forEach(a => {
    if (pSet.has(a.clienteId)) {
      totalPresentes++;
    }
  });

  const totalAusentes = Math.max(0, totalInscriptos - totalPresentes);
  const lugaresLibres = Math.max(0, cupoMaximo - totalInscriptos);
  const porcentajeAsistencia = totalInscriptos > 0 ? Math.round((totalPresentes / totalInscriptos) * 100) : 0;

  return {
    totalInscriptos,
    totalPresentes,
    totalAusentes,
    cupoMaximo,
    lugaresLibres,
    porcentajeAsistencia
  };
}

export const STORAGE_KEY_ASISTENCIAS = 'kaha_asistencias_v1';

export const SEED_ASISTENCIAS: Record<string, RegistroAsistenciaClase> = {
  '2026-10-30_VIERNES-08:30': {
    id: '2026-10-30_VIERNES-08:30',
    fecha: '2026-10-30',
    turnoId: 'VIERNES-08:30',
    dia: 'VIERNES',
    hora: '08:30',
    profesor: 'Juanchi',
    presentesIds: ['c-1', 'c-2', 'c-3', 'c-4', 'c-5'],
    ausentesIds: ['c-6'],
    walkins: [],
    notas: 'Clase técnica de levantamiento. Excelente ritmo.',
    actualizadoAt: '2026-10-30T09:30:00.000Z',
    guardadoPor: 'juanchi@kaha.fit'
  },
  '2026-10-30_VIERNES-19:00': {
    id: '2026-10-30_VIERNES-19:00',
    fecha: '2026-10-30',
    turnoId: 'VIERNES-19:00',
    dia: 'VIERNES',
    hora: '19:00',
    profesor: 'Rulo',
    presentesIds: ['c-7', 'c-8', 'c-9', 'c-10', 'c-11', 'c-12'],
    ausentesIds: ['c-13'],
    walkins: [],
    notas: 'WOD en parejas. Todos presentes a horario.',
    actualizadoAt: '2026-10-30T20:00:00.000Z',
    guardadoPor: 'rulo@kaha.fit'
  },
  '2026-11-02_LUNES-07:30': {
    id: '2026-11-02_LUNES-07:30',
    fecha: '2026-11-02',
    turnoId: 'LUNES-07:30',
    dia: 'LUNES',
    hora: '07:30',
    profesor: 'Juanchi',
    presentesIds: ['c-1', 'c-3', 'c-5', 'c-7', 'c-8'],
    ausentesIds: ['c-2'],
    walkins: [],
    notas: 'Arranque de semana con fuerza.',
    actualizadoAt: '2026-11-02T08:30:00.000Z',
    guardadoPor: 'juanchi@kaha.fit'
  }
};

// In-memory fallback for SSR/tests
let memoryStoreAsistencias: Record<string, RegistroAsistenciaClase> = { ...SEED_ASISTENCIAS };

export function leerTodasLasAsistencias(): Record<string, RegistroAsistenciaClase> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const data = window.localStorage.getItem(STORAGE_KEY_ASISTENCIAS);
      if (data) {
        return JSON.parse(data);
      }
      // Inicializar con semillas iniciales
      window.localStorage.setItem(STORAGE_KEY_ASISTENCIAS, JSON.stringify(SEED_ASISTENCIAS));
      return { ...SEED_ASISTENCIAS };
    } catch {
      // Fallback
    }
  }
  return memoryStoreAsistencias;
}

export function guardarRegistroAsistencia(registro: RegistroAsistenciaClase): void {
  const todas = leerTodasLasAsistencias();
  todas[registro.id] = registro;
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_ASISTENCIAS, JSON.stringify(todas));
    } catch {
      // Fallback
    }
  }
  memoryStoreAsistencias = todas;
}

export function eliminarRegistroAsistencia(id: string): void {
  const todas = leerTodasLasAsistencias();
  delete todas[id];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_ASISTENCIAS, JSON.stringify(todas));
    } catch {
      // Fallback
    }
  }
  memoryStoreAsistencias = todas;
}

export function obtenerRegistroAsistencia(fecha: string, turnoId: string): RegistroAsistenciaClase | null {
  const key = generarClaveAsistencia(fecha, turnoId);
  const todas = leerTodasLasAsistencias();
  return todas[key] || null;
}

export function obtenerTurnosConAsistenciaDelDia(fecha: string): Set<string> {
  const todas = leerTodasLasAsistencias();
  const res = new Set<string>();
  Object.values(todas).forEach(r => {
    if (r.fecha === fecha && (r.presentesIds.length > 0 || r.ausentesIds.length > 0)) {
      res.add(r.turnoId);
    }
  });
  return res;
}

export interface MetricasHistoricasAsistencia {
  totalClases: number;
  totalPresentes: number;
  totalAusentes: number;
  totalWalkins: number;
  promedioPresentesPorClase: number;
  porcentajeGlobal: number;
  rankingSocios: Array<{ clienteId: string; totalPresentes: number }>;
}

export function calcularMetricasHistoricas(
  registros: RegistroAsistenciaClase[]
): MetricasHistoricasAsistencia {
  if (!registros || registros.length === 0) {
    return {
      totalClases: 0,
      totalPresentes: 0,
      totalAusentes: 0,
      totalWalkins: 0,
      promedioPresentesPorClase: 0,
      porcentajeGlobal: 0,
      rankingSocios: []
    };
  }

  let totalPresentes = 0;
  let totalAusentes = 0;
  let totalWalkins = 0;
  const conteoPorSocio = new Map<string, number>();

  registros.forEach(r => {
    const presCount = (r.presentesIds || []).length;
    const ausCount = (r.ausentesIds || []).length;
    const walkCount = (r.walkins || []).length;

    totalPresentes += presCount;
    totalAusentes += ausCount;
    totalWalkins += walkCount;

    (r.presentesIds || []).forEach(id => {
      conteoPorSocio.set(id, (conteoPorSocio.get(id) || 0) + 1);
    });
  });

  const totalInscriptos = totalPresentes + totalAusentes;
  const promedioPresentesPorClase = registros.length > 0
    ? Math.round((totalPresentes / registros.length) * 10) / 10
    : 0;
  const porcentajeGlobal = totalInscriptos > 0
    ? Math.round((totalPresentes / totalInscriptos) * 100)
    : 0;

  const rankingSocios = Array.from(conteoPorSocio.entries())
    .map(([clienteId, totalPresentes]) => ({ clienteId, totalPresentes }))
    .sort((a, b) => b.totalPresentes - a.totalPresentes);

  return {
    totalClases: registros.length,
    totalPresentes,
    totalAusentes,
    totalWalkins,
    promedioPresentesPorClase,
    porcentajeGlobal,
    rankingSocios
  };
}

