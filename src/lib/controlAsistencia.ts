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
  esReconstruidoParcial?: boolean;
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

// In-memory fallback for SSR/tests
let memoryStoreAsistencias: Record<string, RegistroAsistenciaClase> = {};

export function leerTodasLasAsistencias(): Record<string, RegistroAsistenciaClase> {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const data = window.localStorage.getItem(STORAGE_KEY_ASISTENCIAS);
      if (data) {
        const parsed = JSON.parse(data) as Record<string, RegistroAsistenciaClase>;
        // Filtrar datos ficticios de prueba iniciales ('c-1', 'c-2', etc.)
        let huboSeedsFicticios = false;
        const limpios: Record<string, RegistroAsistenciaClase> = {};
        for (const [key, reg] of Object.entries(parsed)) {
          const tieneIdFicticio = (reg.presentesIds || []).some(id => id.startsWith('c-') && id.length <= 4);
          if (tieneIdFicticio) {
            huboSeedsFicticios = true;
          } else {
            limpios[key] = reg;
          }
        }
        if (huboSeedsFicticios) {
          window.localStorage.setItem(STORAGE_KEY_ASISTENCIAS, JSON.stringify(limpios));
          return limpios;
        }
        return parsed;
      }
      return {};
    } catch {
      // Fallback
    }
  }
  return memoryStoreAsistencias;
}

function notificarCambioAsistencias(): void {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('kaha-asistencias-updated'));
    } catch {
      // Ignorar en entornos sin CustomEvent
    }
  }
}

export function reemplazarTodasLasAsistencias(todas: Record<string, RegistroAsistenciaClase>): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_ASISTENCIAS, JSON.stringify(todas));
    } catch {
      // Fallback
    }
  }
  memoryStoreAsistencias = todas;
  notificarCambioAsistencias();
}

export function guardarRegistroAsistencia(registro: RegistroAsistenciaClase): void {
  const todas = leerTodasLasAsistencias();
  todas[registro.id] = registro;
  reemplazarTodasLasAsistencias(todas);
}

export function eliminarRegistroAsistencia(id: string): void {
  const todas = leerTodasLasAsistencias();
  delete todas[id];
  reemplazarTodasLasAsistencias(todas);
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
      if (!id.startsWith('asistente-')) {
        conteoPorSocio.set(id, (conteoPorSocio.get(id) || 0) + 1);
      }
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

export interface AuditLogAsistenciaInput {
  id?: string;
  accion: string;
  detalles: any;
  creado_at: string;
  usuario_email?: string;
}

export interface ResultadoSincronizacionAsistencias {
  asistencias: Record<string, RegistroAsistenciaClase>;
  registrosParaBackfill: RegistroAsistenciaClase[];
}

/**
 * Reconstruye y sincroniza las planillas de presentes (`kaha_asistencias_v1`)
 * desde `logs_auditoria` de Supabase combinadas con las guardadas en `localStorage`.
 * - Si un dispositivo (ej: el celular) tiene planillas locales con `presentesIds` exactos que aún
 *   no están en Supabase con `presentesIds`, las marca en `registrosParaBackfill` para subirlas.
 * - Si un dispositivo (ej: la compu) recibe logs históricos que solo tenían contadores (`presentes`, `ausentes`),
 *   reconstruye la planilla a partir de los alumnos convocados de ese turno y fecha.
 */
export function sincronizarAsistenciasDesdeAuditLogs(params: {
  logs: AuditLogAsistenciaInput[];
  locales: Record<string, RegistroAsistenciaClase>;
  contexto?: {
    turnos: Turno[];
    clientes: Cliente[];
    recuperos: RecuperoTurno[];
    planes: Plan[];
    mesActual: string;
  };
}): ResultadoSincronizacionAsistencias {
  const { logs = [], locales = {}, contexto } = params;

  const logsOrdenados = [...logs].sort((a, b) =>
    String(a.creado_at || '').localeCompare(String(b.creado_at || ''))
  );

  const desdeLogs: Record<string, RegistroAsistenciaClase> = {};
  const keysConIdsExactosEnDb = new Set<string>();
  const keysEliminadasEnDb = new Set<string>();

  for (const log of logsOrdenados) {
    const det = log.detalles || {};
    if (log.accion === 'CONTROL_ASISTENCIA_ELIMINADA') {
      const key = det.id || (det.fecha && det.turno_id ? generarClaveAsistencia(det.fecha, det.turno_id) : null);
      if (key) {
        delete desdeLogs[key];
        keysConIdsExactosEnDb.delete(key);
        keysEliminadasEnDb.add(key);
      }
      continue;
    }

    if (log.accion !== 'CONTROL_ASISTENCIA_REGISTRADA') continue;

    const fecha = String(det.fecha || '').trim();
    const turnoId = String(det.turno_id || det.turnoId || '').trim();
    if (!fecha || !turnoId) continue;

    const key = generarClaveAsistencia(fecha, turnoId);
    keysEliminadasEnDb.delete(key);
    const turnoObj = contexto?.turnos.find(t => t.id === turnoId);
    const partesTurno = turnoId.split('-');
    const dia = det.dia || turnoObj?.dia || partesTurno[0] || '';
    const hora = det.hora || turnoObj?.hora || partesTurno[1] || '';
    const profesor = det.profesor ?? turnoObj?.profesor;

    if (Array.isArray(det.presentesIds)) {
      keysConIdsExactosEnDb.add(key);
      desdeLogs[key] = {
        id: key,
        fecha,
        turnoId,
        dia,
        hora,
        profesor,
        presentesIds: det.presentesIds.map(String),
        ausentesIds: Array.isArray(det.ausentesIds) ? det.ausentesIds.map(String) : [],
        walkins: Array.isArray(det.walkins) ? det.walkins : [],
        notas: det.notas || undefined,
        actualizadoAt: det.actualizadoAt || log.creado_at || new Date().toISOString(),
        guardadoPor: log.usuario_email || det.guardadoPor || 'admin',
        esReconstruidoParcial: false
      };
    } else if (!keysConIdsExactosEnDb.has(key)) {
      // Reconstrucción de planilla histórica que solo guardó los contadores (presentes / ausentes)
      const convocados =
        turnoObj && contexto
          ? obtenerAlumnosConvocados({
              turno: turnoObj,
              fecha,
              clientes: contexto.clientes,
              recuperos: contexto.recuperos,
              planes: contexto.planes,
              mesActual: contexto.mesActual
            })
          : [];

      const cantPresentes = Math.max(0, Number(det.presentes ?? 0));
      const cantAusentes = Math.max(0, Number(det.ausentes ?? 0));
      const idsConvocados = convocados.map(a => a.clienteId);

      const presentesIds = idsConvocados.slice(0, cantPresentes);
      // Si había más presentes que fijos actuales (ej: walk-in o cambio de turno), completar para preservar la métrica
      while (presentesIds.length < cantPresentes) {
        presentesIds.push(`asistente-${key}-${presentesIds.length + 1}`);
      }

      const restantesIds = idsConvocados.slice(cantPresentes);
      const ausentesIds = restantesIds.slice(0, cantAusentes);
      while (ausentesIds.length < cantAusentes) {
        ausentesIds.push(`ausente-${key}-${ausentesIds.length + 1}`);
      }

      desdeLogs[key] = {
        id: key,
        fecha,
        turnoId,
        dia,
        hora,
        profesor,
        presentesIds,
        ausentesIds,
        walkins: [],
        notas: det.notas || undefined,
        actualizadoAt: log.creado_at || new Date().toISOString(),
        guardadoPor: log.usuario_email || 'admin',
        esReconstruidoParcial: true
      };
    }
  }

  const combinadas: Record<string, RegistroAsistenciaClase> = { ...desdeLogs };
  const registrosParaBackfill: RegistroAsistenciaClase[] = [];

  for (const [key, localReg] of Object.entries(locales)) {
    if (!localReg || !localReg.fecha || !localReg.turnoId) continue;
    if (keysEliminadasEnDb.has(key)) continue;

    const tieneIdsRealesLocales =
      !localReg.esReconstruidoParcial &&
      (localReg.presentesIds || []).every(id => !id.startsWith('asistente-')) &&
      (localReg.ausentesIds || []).every(id => !id.startsWith('ausente-'));

    const remoto = combinadas[key];

    if (!remoto) {
      combinadas[key] = localReg;
      if (tieneIdsRealesLocales) {
        registrosParaBackfill.push(localReg);
      }
    } else if (tieneIdsRealesLocales && !keysConIdsExactosEnDb.has(key)) {
      // El dispositivo local (ej: celular) tiene los IDs reales exactos y la base solo tenía el resumen
      combinadas[key] = { ...localReg, esReconstruidoParcial: false };
      registrosParaBackfill.push(localReg);
    } else if (
      tieneIdsRealesLocales &&
      String(localReg.actualizadoAt || '') > String(remoto.actualizadoAt || '')
    ) {
      combinadas[key] = { ...localReg, esReconstruidoParcial: false };
      registrosParaBackfill.push(localReg);
    }
  }

  return {
    asistencias: combinadas,
    registrosParaBackfill
  };
}


