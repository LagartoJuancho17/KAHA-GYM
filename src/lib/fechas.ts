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
