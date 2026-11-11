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

