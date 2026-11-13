// src/lib/prs.ts
import {
  EjercicioPR,
  RepMaxKey,
  SocioEjercicioPR,
  HistorialPRItem,
  RutinaTiempoPR,
  RegistroTiempoRutinaPR
} from '../types';

export const PORCENTAJES_PR: readonly number[] = [
  105, 100, 95, 90,
  85,  80,  75, 70,
  65,  60,  55, 50,
  45,  40,  35, 30
];

export const REP_MAX_KEYS: readonly RepMaxKey[] = [1, 2, 3, 5];

export const DEFAULT_EJERCICIOS_PR: EjercicioPR[] = [
  {
    id: 'pr-clean',
    nombre: 'Clean',
    categoria: 'Olímpico',
    instruccion_titulo: 'Squat Clean',
    instruccion_detalle: 'Despegue controlado desde el piso manteniendo la espalda neutra, triple extensión explosiva de cadera, rodillas y tobillos, recepción en sentadilla profunda con codos altos en posición de rack frontal y recuperación completa.',
    unidad: 'kg',
    orden: 1,
    activo: true,
    creado_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'pr-snatch',
    nombre: 'Snatch',
    categoria: 'Olímpico',
    instruccion_titulo: 'Squat Snatch',
    instruccion_detalle: 'Agarre ancho (hook grip), tirón cercano al cuerpo, extensión completa y entrada rápida debajo de la barra recibiéndola con brazos bloqueados sobre la cabeza en sentadilla profunda.',
    unidad: 'kg',
    orden: 2,
    activo: true,
    creado_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'pr-back-squat',
    nombre: 'Back Squat',
    categoria: 'Fuerza',
    instruccion_titulo: 'Sentadilla Trasera',
    instruccion_detalle: 'Barra apoyada sobre trapecios, core firme con presión intraabdominal, descenso controlado rompiendo el paralelo (cadera por debajo de la rodilla) y empuje firme manteniendo rodillas alineadas con la punta de los pies.',
    unidad: 'kg',
    orden: 3,
    activo: true,
    creado_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'pr-bench-press',
    nombre: 'Bench Press',
    categoria: 'Fuerza',
    instruccion_titulo: 'Press de Banca Plano',
    instruccion_detalle: 'Escápulas retraídas y deprimidas sobre el banco, pies firmes en el piso, descenso controlado hasta tocar el esternón con codos a ~45° y empuje hasta extensión completa de codos.',
    unidad: 'kg',
    orden: 4,
    activo: true,
    creado_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'pr-deadlift',
    nombre: 'Deadlift',
    categoria: 'Fuerza',
    instruccion_titulo: 'Peso Muerto Convencional',
    instruccion_detalle: 'Barra pegada a las tibias, dorsales activados ("romper la barra"), columna neutra, empuje inicial con las piernas y bloqueo final de cadera y rodillas sin hiperextender la zona lumbar.',
    unidad: 'kg',
    orden: 5,
    activo: true,
    creado_at: '2026-01-01T00:00:00.000Z'
  }
];

export interface CeldaPorcentajePR {
  porcentaje: number;
  peso: number | null;
  pesoFormateado: string;
  esCienPorciento: boolean;
}

export function obtenerPesoPorReps(
  registro: Pick<SocioEjercicioPR, 'rm_1' | 'rm_2' | 'rm_3' | 'rm_5'> | null | undefined,
  reps: RepMaxKey
): number | null {
  if (!registro) return null;
  const map: Record<RepMaxKey, number | null | undefined> = {
    1: registro.rm_1,
    2: registro.rm_2,
    3: registro.rm_3,
    5: registro.rm_5
  };
  const val = map[reps];
  return typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : null;
}

export function formatearPesoPR(peso: number | null | undefined): string {
  if (peso == null || !Number.isFinite(peso) || peso <= 0) return '--';
  const redondeado = Math.round(peso * 10) / 10;
  return Number.isInteger(redondeado) ? String(redondeado) : redondeado.toFixed(1).replace('.', ',');
}

export function calcularTablaPorcentajes(pesoBase: number | null | undefined): CeldaPorcentajePR[] {
  const baseValida = typeof pesoBase === 'number' && Number.isFinite(pesoBase) && pesoBase > 0 ? pesoBase : null;
  return PORCENTAJES_PR.map((porcentaje) => {
    if (baseValida === null) {
      return {
        porcentaje,
        peso: null,
        pesoFormateado: '--',
        esCienPorciento: porcentaje === 100
      };
    }
    const raw = (baseValida * porcentaje) / 100;
    const redondeado = Math.round(raw * 10) / 10;
    return {
      porcentaje,
      peso: redondeado,
      pesoFormateado: formatearPesoPR(redondeado),
      esCienPorciento: porcentaje === 100
    };
  });
}

const MESES_CORTOS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatearFechaCortaPR(fechaIso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(fechaIso || '').trim());
  if (!match) return fechaIso || '';
  const mesIdx = Number(match[2]) - 1;
  const dia = Number(match[3]);
  const mesTxt = MESES_CORTOS_ES[mesIdx] || match[2];
  return `${mesTxt} ${dia}`;
}

export function aplicarActualizacionPR(params: {
  actual?: SocioEjercicioPR | null;
  cliente_id: string;
  ejercicio_id: string;
  rm_1?: number | null;
  rm_2?: number | null;
  rm_3?: number | null;
  rm_5?: number | null;
  fecha?: string;
  nota?: string;
  registrado_por?: string;
}): SocioEjercicioPR {
  const {
    actual,
    cliente_id,
    ejercicio_id,
    fecha = new Date().toISOString().slice(0, 10),
    nota,
    registrado_por
  } = params;

  const sanitize = (v: number | null | undefined): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v * 10) / 10 : null;

  const nextRm1 = params.rm_1 !== undefined ? sanitize(params.rm_1) : sanitize(actual?.rm_1);
  const nextRm2 = params.rm_2 !== undefined ? sanitize(params.rm_2) : sanitize(actual?.rm_2);
  const nextRm3 = params.rm_3 !== undefined ? sanitize(params.rm_3) : sanitize(actual?.rm_3);
  const nextRm5 = params.rm_5 !== undefined ? sanitize(params.rm_5) : sanitize(actual?.rm_5);

  const prevMap: Record<RepMaxKey, number | null> = {
    1: sanitize(actual?.rm_1),
    2: sanitize(actual?.rm_2),
    3: sanitize(actual?.rm_3),
    5: sanitize(actual?.rm_5)
  };
  const nextMap: Record<RepMaxKey, number | null> = {
    1: nextRm1,
    2: nextRm2,
    3: nextRm3,
    5: nextRm5
  };

  const nowIso = new Date().toISOString();
  const nuevosItems: HistorialPRItem[] = [];

  for (const r of REP_MAX_KEYS) {
    const nuevoPeso = nextMap[r];
    if (nuevoPeso !== null && nuevoPeso !== prevMap[r]) {
      nuevosItems.push({
        id: `hist-${Date.now()}-${r}-${Math.random().toString(36).slice(2, 6)}`,
        fecha,
        reps: r,
        peso: nuevoPeso,
        nota: nota?.trim() || undefined,
        registrado_por,
        creado_at: nowIso
      });
    }
  }

  const historialPrevio = Array.isArray(actual?.historial) ? actual!.historial : [];

  return {
    id: `${cliente_id}__${ejercicio_id}`,
    cliente_id,
    ejercicio_id,
    rm_1: nextRm1,
    rm_2: nextRm2,
    rm_3: nextRm3,
    rm_5: nextRm5,
    historial: [...nuevosItems, ...historialPrevio],
    actualizado_at: nowIso
  };
}

export const DEFAULT_RUTINAS_PR: RutinaTiempoPR[] = [
  {
    id: 'rutina-bulger',
    titulo: 'BULGER',
    subtitulo: 'Ten rounds for time of:',
    items: [
      'Run 150 meters',
      '7 Chest to bar pull-ups',
      '135/95 pound Front squat, 7 reps',
      '7 Handstand push-ups'
    ],
    movimientos: [
      { id: 'mov-c2b', nombre: 'Chest-to-Bar Pull-up', videos_count: 2 },
      { id: 'mov-fs', nombre: 'Front Squat', videos_count: 1 },
      { id: 'mov-hspu', nombre: 'Handstand Push-Up', videos_count: 2 },
      { id: 'mov-run', nombre: 'Run', videos_count: 0 }
    ],
    asignado_todos: true,
    clientes_ids: [],
    activo: true,
    creado_at: '2026-07-30T12:00:00.000Z'
  }
];

/**
 * Parsea un string de tiempo (ej: "23:30", "1:05:20" o "23") a segundos totales.
 */
export function parsearTiempoASegundos(raw: string): number | null {
  const limpio = raw.trim();
  if (!limpio) return null;

  const partes = limpio.split(':').map(p => p.trim());
  if (partes.some(p => p === '' || !/^\d+$/.test(p))) {
    return null;
  }

  if (partes.length === 1) {
    const mins = Number(partes[0]);
    return mins > 0 ? mins * 60 : null;
  }

  if (partes.length === 2) {
    const mins = Number(partes[0]);
    const secs = Number(partes[1]);
    if (secs >= 60) return null;
    const total = mins * 60 + secs;
    return total > 0 ? total : null;
  }

  if (partes.length === 3) {
    const hrs = Number(partes[0]);
    const mins = Number(partes[1]);
    const secs = Number(partes[2]);
    if (mins >= 60 || secs >= 60) return null;
    const total = hrs * 3600 + mins * 60 + secs;
    return total > 0 ? total : null;
  }

  return null;
}

/**
 * Formatea segundos totales a "MM:SS" o "H:MM:SS" (ej: 1410 -> "23:30").
 */
export function formatearSegundosATiempo(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos <= 0) return '--:--';
  const total = Math.round(segundos);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const ss = String(secs).padStart(2, '0');
  if (hrs > 0) {
    const mm = String(mins).padStart(2, '0');
    return `${hrs}:${mm}:${ss}`;
  }
  return `${mins}:${ss}`;
}

/**
 * Formatea una fecha YYYY-MM-DD al formato de la captura ("30 jul 2026").
 */
export function formatearFechaRutinaPR(fechaIso: string): string {
  if (!fechaIso) return '';
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const partes = fechaIso.slice(0, 10).split('-');
  if (partes.length !== 3) return fechaIso;
  const anio = partes[0];
  const mesIdx = parseInt(partes[1], 10) - 1;
  const dia = parseInt(partes[2], 10);
  if (isNaN(mesIdx) || mesIdx < 0 || mesIdx > 11 || isNaN(dia)) return fechaIso;
  return `${dia} ${meses[mesIdx]} ${anio}`;
}

/**
 * Devuelve el menor tiempo (en segundos) de una lista de registros para marcar el PR.
 */
export function obtenerMejorTiempoSegundos(registros: RegistroTiempoRutinaPR[]): number | null {
  const validos = registros.filter(r => Number.isFinite(r.tiempo_segundos) && r.tiempo_segundos > 0);
  if (validos.length === 0) return null;
  return Math.min(...validos.map(r => r.tiempo_segundos));
}

export interface AuditLogPRInput {
  id?: string;
  accion: string;
  detalles: any;
  creado_at: string;
  usuario_email?: string;
}

export interface ResultadoReconstruccionPR {
  ejercicios: EjercicioPR[];
  registros: SocioEjercicioPR[];
  rutinas: RutinaTiempoPR[];
  registrosRutina: RegistroTiempoRutinaPR[];
  registrosParaBackfill: SocioEjercicioPR[];
}

/**
 * Reconstruye y sincroniza el catálogo de ejercicios, PRs de socios, WODs y tiempos
 * a partir de los logs de auditoría en Supabase (`logs_auditoria`) combinados con `localStorage`.
 */
export function reconstruirPRsDesdeAuditLogs(params: {
  logs: AuditLogPRInput[];
  ejerciciosLocales?: EjercicioPR[];
  registrosLocales?: SocioEjercicioPR[];
  rutinasLocales?: RutinaTiempoPR[];
  registrosRutinaLocales?: RegistroTiempoRutinaPR[];
}): ResultadoReconstruccionPR {
  const {
    logs = [],
    ejerciciosLocales = [],
    registrosLocales = [],
    rutinasLocales = [],
    registrosRutinaLocales = []
  } = params;

  const logsOrdenados = [...logs].sort((a, b) =>
    String(a.creado_at || '').localeCompare(String(b.creado_at || ''))
  );

  // 1. Catálogo de Ejercicios
  const ejerciciosMap = new Map<string, EjercicioPR>();
  DEFAULT_EJERCICIOS_PR.forEach(e => ejerciciosMap.set(e.id, { ...e }));
  ejerciciosLocales.forEach(e => {
    if (e && e.id) {
      ejerciciosMap.set(e.id, { ...e });
    }
  });

  const eliminadosEjercicios = new Set<string>();

  for (const log of logsOrdenados) {
    const det = log.detalles || {};
    if (log.accion === 'PR_EJERCICIO_AGREGADO') {
      const id = det.ejercicio?.id || det.id;
      const nombre = (det.ejercicio?.nombre || det.nombre || '').trim();
      if (!id || !nombre) continue;
      eliminadosEjercicios.delete(id);
      const maxOrden = Array.from(ejerciciosMap.values()).reduce((acc, e) => Math.max(acc, e.orden || 0), 0);
      const existente = ejerciciosMap.get(id);
      ejerciciosMap.set(id, {
        id,
        nombre,
        categoria: det.ejercicio?.categoria || det.categoria || existente?.categoria || 'Fuerza',
        instruccion_titulo: det.ejercicio?.instruccion_titulo || det.instruccion_titulo || existente?.instruccion_titulo || nombre,
        instruccion_detalle: det.ejercicio?.instruccion_detalle ?? det.instruccion_detalle ?? existente?.instruccion_detalle ?? '',
        unidad: (det.ejercicio?.unidad || det.unidad || existente?.unidad || 'kg') as 'kg' | 'lb',
        orden: det.ejercicio?.orden ?? det.orden ?? existente?.orden ?? (maxOrden + 1),
        activo: det.ejercicio?.activo !== false && det.activo !== false,
        creado_at: det.ejercicio?.creado_at || existente?.creado_at || log.creado_at || new Date().toISOString()
      });
    } else if (log.accion === 'PR_EJERCICIO_EDITADO') {
      const id = det.id;
      const updates = det.updates || det.ejercicio || {};
      if (id && ejerciciosMap.has(id)) {
        const actual = ejerciciosMap.get(id)!;
        ejerciciosMap.set(id, { ...actual, ...updates });
      }
    } else if (log.accion === 'PR_EJERCICIO_ELIMINADO') {
      const id = det.id;
      if (id) {
        eliminadosEjercicios.add(id);
        ejerciciosMap.delete(id);
      }
    }
  }

  const buscarOCrearEjercicioId = (ejercicioRef: string | undefined, ejercicioIdExplicit?: string): string | null => {
    if (ejercicioIdExplicit && ejerciciosMap.has(ejercicioIdExplicit)) {
      return ejercicioIdExplicit;
    }
    const ref = String(ejercicioRef || ejercicioIdExplicit || '').trim();
    if (!ref) return null;
    if (ejerciciosMap.has(ref)) return ref;

    const refLower = ref.toLowerCase();
    for (const ej of ejerciciosMap.values()) {
      if (ej.nombre.trim().toLowerCase() === refLower || ej.id.toLowerCase() === refLower) {
        return ej.id;
      }
    }

    // Si un log hace referencia a un ejercicio personalizado cuyo alta no estaba en el lote, lo creamos
    const slug = refLower.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const newId = ref.startsWith('pr-') ? ref : `pr-${slug || 'custom'}`;
    if (eliminadosEjercicios.has(newId)) return newId;
    if (!ejerciciosMap.has(newId)) {
      const maxOrden = Array.from(ejerciciosMap.values()).reduce((acc, e) => Math.max(acc, e.orden || 0), 0);
      ejerciciosMap.set(newId, {
        id: newId,
        nombre: ref,
        categoria: 'Fuerza',
        instruccion_titulo: ref,
        instruccion_detalle: '',
        unidad: 'kg',
        orden: maxOrden + 1,
        activo: true,
        creado_at: new Date().toISOString()
      });
    }
    return newId;
  };

  // 2. Registros de PRs de Socios (1/2/3/5 RM + Historial)
  const registrosDesdeLogs = new Map<string, SocioEjercicioPR>();

  for (const log of logsOrdenados) {
    const det = log.detalles || {};
    if (log.accion === 'PR_SOCIO_ACTUALIZADO') {
      const cliente_id = det.cliente_id || det.registro?.cliente_id;
      const ejercicio_id = buscarOCrearEjercicioId(det.ejercicio, det.ejercicio_id || det.registro?.ejercicio_id);
      if (!cliente_id || !ejercicio_id) continue;

      const recordId = `${cliente_id}__${ejercicio_id}`;
      const previo = registrosDesdeLogs.get(recordId) || null;
      const fechaLog = (det.fecha || String(log.creado_at || '').slice(0, 10)) || new Date().toISOString().slice(0, 10);

      const actualizado = aplicarActualizacionPR({
        actual: previo,
        cliente_id,
        ejercicio_id,
        rm_1: det.rm_1 !== undefined ? det.rm_1 : det.registro?.rm_1,
        rm_2: det.rm_2 !== undefined ? det.rm_2 : det.registro?.rm_2,
        rm_3: det.rm_3 !== undefined ? det.rm_3 : det.registro?.rm_3,
        rm_5: det.rm_5 !== undefined ? det.rm_5 : det.registro?.rm_5,
        fecha: fechaLog,
        nota: det.nota || det.registro?.nota,
        registrado_por: log.usuario_email || det.registrado_por || 'socio@kaha.fit'
      });

      // Estabilizar IDs de historial generados desde logs para que sean idempotentes
      const logKey = log.id || log.creado_at;
      const prevHistLen = previo?.historial?.length || 0;
      const nuevosCount = actualizado.historial.length - prevHistLen;
      const historialEstable = actualizado.historial.map((h, idx) => {
        if (idx < nuevosCount) {
          return {
            ...h,
            id: `hist-${logKey}-${h.reps}`,
            creado_at: log.creado_at || h.creado_at
          };
        }
        return h;
      });

      // Si el log nuevo ya traía historial explícito completo, combinar sin perder entradas
      if (Array.isArray(det.registro?.historial) && det.registro.historial.length > historialEstable.length) {
        registrosDesdeLogs.set(recordId, {
          ...actualizado,
          historial: det.registro.historial,
          actualizado_at: det.registro.actualizado_at || log.creado_at || actualizado.actualizado_at
        });
      } else {
        registrosDesdeLogs.set(recordId, {
          ...actualizado,
          historial: historialEstable,
          actualizado_at: log.creado_at || actualizado.actualizado_at
        });
      }
    } else if (log.accion === 'PR_HISTORIAL_ITEM_ELIMINADO') {
      const cliente_id = det.cliente_id;
      const ejercicio_id = buscarOCrearEjercicioId(det.ejercicio, det.ejercicio_id);
      const itemId = det.item_id;
      if (!cliente_id || !ejercicio_id || !itemId) continue;
      const recordId = `${cliente_id}__${ejercicio_id}`;
      const actual = registrosDesdeLogs.get(recordId);
      if (actual) {
        registrosDesdeLogs.set(recordId, {
          ...actual,
          historial: (actual.historial || []).filter(h => h.id !== itemId),
          actualizado_at: log.creado_at || actual.actualizado_at
        });
      }
    }
  }

  // Combinar registros reconstruidos desde Supabase con registros locales
  const registrosFinalesMap = new Map<string, SocioEjercicioPR>(registrosDesdeLogs);
  const registrosParaBackfill: SocioEjercicioPR[] = [];

  for (const localReg of registrosLocales) {
    if (!localReg || !localReg.cliente_id || !localReg.ejercicio_id) continue;
    const recordId = `${localReg.cliente_id}__${localReg.ejercicio_id}`;
    const enLogs = registrosFinalesMap.get(recordId);

    if (!enLogs) {
      registrosFinalesMap.set(recordId, { ...localReg, id: recordId });
      registrosParaBackfill.push({ ...localReg, id: recordId });
    } else {
      const mismosRMs =
        (enLogs.rm_1 ?? null) === (localReg.rm_1 ?? null) &&
        (enLogs.rm_2 ?? null) === (localReg.rm_2 ?? null) &&
        (enLogs.rm_3 ?? null) === (localReg.rm_3 ?? null) &&
        (enLogs.rm_5 ?? null) === (localReg.rm_5 ?? null);

      if (!mismosRMs && String(localReg.actualizado_at || '') > String(enLogs.actualizado_at || '')) {
        registrosFinalesMap.set(recordId, { ...localReg, id: recordId });
        registrosParaBackfill.push({ ...localReg, id: recordId });
      }
    }
  }

  // 3. WODs / Rutinas por Tiempo
  const rutinasMap = new Map<string, RutinaTiempoPR>();
  DEFAULT_RUTINAS_PR.forEach(r => rutinasMap.set(r.id, { ...r }));
  rutinasLocales.forEach(r => {
    if (r && r.id) {
      rutinasMap.set(r.id, { ...r });
    }
  });

  for (const log of logsOrdenados) {
    const det = log.detalles || {};
    if (log.accion === 'PR_RUTINA_CREADA') {
      if (det.rutina && det.rutina.id) {
        rutinasMap.set(det.rutina.id, { ...det.rutina });
      } else if (det.id && det.titulo) {
        const existente = rutinasMap.get(det.id);
        rutinasMap.set(det.id, {
          id: det.id,
          titulo: String(det.titulo).toUpperCase(),
          subtitulo: det.subtitulo || existente?.subtitulo || 'For time of:',
          items: Array.isArray(det.items) ? det.items : (existente?.items || []),
          movimientos: Array.isArray(det.movimientos) ? det.movimientos : (existente?.movimientos || []),
          asignado_todos: det.asignado_todos ?? existente?.asignado_todos ?? true,
          clientes_ids: Array.isArray(det.clientes_ids) ? det.clientes_ids : (existente?.clientes_ids || []),
          creado_por: log.usuario_email || existente?.creado_por || 'admin@kaha.fit',
          activo: det.activo !== false,
          creado_at: log.creado_at || existente?.creado_at || new Date().toISOString()
        });
      }
    } else if (log.accion === 'PR_RUTINA_EDITADA') {
      const id = det.id;
      const updates = det.updates || det.rutina || {};
      if (id) {
        const base = rutinasMap.get(id) || {
          id,
          titulo: String(updates.titulo || id).toUpperCase(),
          subtitulo: updates.subtitulo || 'For time of:',
          items: [],
          movimientos: [],
          asignado_todos: true,
          clientes_ids: [],
          activo: true,
          creado_at: log.creado_at || new Date().toISOString()
        };
        rutinasMap.set(id, { ...base, ...updates });
      }
    } else if (log.accion === 'PR_RUTINA_ELIMINADA') {
      const id = det.id;
      if (id) {
        rutinasMap.delete(id);
      }
    }
  }

  // 4. Tiempos de WODs
  const resolverRutinaId = (rutinaRef: string | undefined, rutinaIdExplicit?: string): string | null => {
    if (rutinaIdExplicit && rutinasMap.has(rutinaIdExplicit)) return rutinaIdExplicit;
    const ref = String(rutinaRef || rutinaIdExplicit || '').trim();
    if (!ref) return null;
    if (rutinasMap.has(ref)) return ref;
    const refLower = ref.toLowerCase();
    for (const r of rutinasMap.values()) {
      if (r.titulo.trim().toLowerCase() === refLower || r.id.toLowerCase() === refLower) {
        return r.id;
      }
    }
    return ref;
  };

  const tiemposEliminados = new Set<string>();
  const tiemposDesdeLogs: RegistroTiempoRutinaPR[] = [];

  for (const log of logsOrdenados) {
    const det = log.detalles || {};
    if (log.accion === 'PR_TIEMPO_RUTINA_ELIMINADO') {
      if (det.id) tiemposEliminados.add(String(det.id));
    } else if (log.accion === 'PR_TIEMPO_RUTINA_REGISTRADO') {
      const regExplicito = det.registro as RegistroTiempoRutinaPR | undefined;
      const cliente_id = regExplicito?.cliente_id || det.cliente_id;
      const rutina_id = resolverRutinaId(det.rutina, regExplicito?.rutina_id || det.rutina_id);
      const tiempoTextoRaw = regExplicito?.tiempo_texto || det.tiempo_texto || det.tiempo;
      const segundos = regExplicito?.tiempo_segundos ?? (tiempoTextoRaw ? parsearTiempoASegundos(String(tiempoTextoRaw)) : null);
      if (!cliente_id || !rutina_id || !segundos) continue;

      const id = regExplicito?.id || det.id || `reg-rut-${log.id || log.creado_at}`;
      tiemposDesdeLogs.push({
        id,
        rutina_id,
        cliente_id,
        tiempo_segundos: segundos,
        tiempo_texto: formatearSegundosATiempo(segundos),
        fecha: regExplicito?.fecha || det.fecha || String(log.creado_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
        nota: regExplicito?.nota || det.nota || undefined,
        registrado_por: regExplicito?.registrado_por || log.usuario_email || 'socio@kaha.fit',
        creado_at: regExplicito?.creado_at || log.creado_at || new Date().toISOString()
      });
    }
  }

  // Unir tiempos de logs y locales evitando duplicados
  const tiemposFinales: RegistroTiempoRutinaPR[] = [];
  const clavesVistas = new Set<string>();

  for (const t of [...registrosRutinaLocales, ...tiemposDesdeLogs]) {
    if (!t || tiemposEliminados.has(t.id)) continue;
    const firma = `${t.rutina_id}__${t.cliente_id}__${t.tiempo_segundos}__${t.fecha}__${t.nota || ''}__${t.creado_at.slice(0, 16)}`;
    if (clavesVistas.has(t.id) || clavesVistas.has(firma)) continue;
    clavesVistas.add(t.id);
    clavesVistas.add(firma);
    tiemposFinales.push(t);
  }

  tiemposFinales.sort((a, b) => String(b.creado_at || '').localeCompare(String(a.creado_at || '')));

  return {
    ejercicios: Array.from(ejerciciosMap.values()).sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    registros: Array.from(registrosFinalesMap.values()),
    rutinas: Array.from(rutinasMap.values()),
    registrosRutina: tiemposFinales,
    registrosParaBackfill
  };
}


