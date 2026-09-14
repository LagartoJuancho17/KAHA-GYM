// src/lib/fechas.ts
// "Hoy" para el gimnasio significa hoy en Argentina, no en UTC.
//
// Por qué existe: `new Date().toISOString().slice(0, 10)` siempre da la fecha en
// UTC. Argentina es UTC-3 todo el año (sin horario de verano desde 2009), así que
// entre las 21:00 y las 23:59 hora local esa expresión ya devuelve la fecha de
// MAÑANA. Encontrado en producción: conflictosAlAgregarFijo, reservasPropiasDuplicadas
// y el calendario del socio (SocioReservas) usaban esta cuenta mal. Consecuencia
// concreta: después de las 21:00, la clase de HOY se trataba como si ya hubiera
// pasado (se excluía de "próximas sesiones" y de la limpieza de duplicados).

const OFFSET_ARGENTINA_MS = 3 * 60 * 60 * 1000; // UTC-3, fijo todo el año

/**
 * Fecha de hoy en Argentina, formato YYYY-MM-DD.
 * `epochMs` es el instante a convertir (por defecto ahora mismo); se puede pasar
 * explícito para que la función sea determinista y testeable sin mockear Date.
 */
export function hoyArgentina(epochMs: number = Date.now()): string {
  const local = new Date(epochMs - OFFSET_ARGENTINA_MS);
  return local.toISOString().slice(0, 10);
}

/**
 * Determina el offset inicial de semana para la Turnera (0 = semana en curso, 1 = semana siguiente).
 * 
 * Regla de negocio:
 * Desde el sábado al mediodía (>= 12:00 hs) en adelante y durante todo el domingo (hora Argentina),
 * la vista inicial de la Turnera se posiciona automáticamente en la semana siguiente (+1).
 * De lunes a viernes (y sábados antes de las 12:00 hs), inicia en la semana actual (0).
 */
export function semanaOffsetInicial(epochMs: number = Date.now()): number {
  const local = new Date(epochMs - OFFSET_ARGENTINA_MS);
  const day = local.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  const hour = local.getUTCHours(); // 0..23

  // Domingo completo: semana siguiente (+1)
  if (day === 0) {
    return 1;
  }
  // Sábado desde las 12:00 hs en adelante: semana siguiente (+1)
  if (day === 6 && hour >= 12) {
    return 1;
  }
  // Resto de la semana (Lunes a Viernes, o Sábado antes de las 12:00 hs): semana en curso (0)
  return 0;
}

/**
 * Devuelve un texto descriptivo de la semana visualizada en relación con el momento actual.
 * Ayuda a que el usuario identifique al instante si está viendo la semana por arrancar, la actual, etc.
 */
export function etiquetaSemanaRelativa(offset: number, epochMs: number = Date.now()): string {
  const local = new Date(epochMs - OFFSET_ARGENTINA_MS);
  const day = local.getUTCDay();
  const hour = local.getUTCHours();
  const esFinDeSemana = day === 0 || (day === 6 && hour >= 12);

  if (offset === 0) {
    return esFinDeSemana ? 'Semana que finalizó' : 'Semana en curso';
  }
  if (offset === 1) {
    return esFinDeSemana ? 'Semana por arrancar' : 'Próxima semana';
  }
  if (offset === -1) {
    return 'Semana anterior';
  }
  if (offset > 1) {
    return `+${offset} semanas`;
  }
  return `${offset} semanas`;
}

const DIAS_SEMANA: Record<string, number> = {
  DOMINGO: 0, LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6
};

/**
 * Devuelve las próximas `cantidadSemanas` fechas (formato YYYY-MM-DD) en que se
 * dicta un turno a partir de una fecha base (por defecto hoy en Argentina).
 */
export function fechasFuturasDelTurno(
  turnoId: string,
  desdeStr: string = hoyArgentina(),
  cantidadSemanas: number = 6
): string[] {
  const diaNombre = (turnoId || '').split('-')[0]?.toUpperCase();
  const targetDay = DIAS_SEMANA[diaNombre];
  if (targetDay === undefined) return [];

  const [y, m, d] = desdeStr.split('-').map(Number);
  if (!y || !m || !d) return [];

  const fechas: string[] = [];
  const cur = new Date(y, m - 1, d);

  for (let i = 0; i < 90 && fechas.length < cantidadSemanas; i++) {
    if (cur.getDay() === targetDay) {
      const yy = cur.getFullYear();
      const mm = String(cur.getMonth() + 1).padStart(2, '0');
      const dd = String(cur.getDate()).padStart(2, '0');
      fechas.push(`${yy}-${mm}-${dd}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return fechas;
}
