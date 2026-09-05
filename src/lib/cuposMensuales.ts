// src/lib/cuposMensuales.ts
// Cuántas clases le tocan a un socio en un mes concreto.
//
// Por qué existe: antes se calculaba como `dias_por_semana * 4`. Los meses no
// tienen 4 semanas exactas, así que ese número está mal casi siempre.
// Ejemplo real: Yanina Radici tiene fijos LUNES, MIERCOLES y JUEVES. En
// septiembre de 2026 hay 4 lunes, 5 miércoles y 4 jueves = 13 clases, no 12.
// La app le mostraba 12 y por eso su panel decía "13 / 12".
//
// El tope es INFORMATIVO: no bloquea reservar. Decisión del dueño del gimnasio.

const DIAS: Record<string, number> = {
  DOMINGO: 0, LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5, SABADO: 6
};

/** Cuántas veces cae un día de la semana en un mes. `mes` es "YYYY-MM". */
export function vecesQueCaeElDia(mes: string, nombreDia: string): number {
  const dia = DIAS[nombreDia?.toUpperCase?.()];
  if (dia === undefined) return 0;
  const [anio, m] = mes.split('-').map(Number);
  if (!anio || !m || m < 1 || m > 12) return 0;

  // Día 0 del mes siguiente = último día de este mes.
  const diasDelMes = new Date(anio, m, 0).getDate();
  let veces = 0;
  for (let d = 1; d <= diasDelMes; d++) {
    if (new Date(anio, m - 1, d).getDay() === dia) veces++;
  }
  return veces;
}

/**
 * Clases fijas reales del socio en el mes: se cuenta cada turno fijo por las
 * veces que su día cae en ese mes. `turnosFijos` son ids locales tipo "LUNES-08:30".
 */
export function clasesFijasDelMes(turnosFijos: string[], mes: string): number {
  return (turnosFijos || []).reduce((acc, id) => {
    const dia = String(id || '').split('-')[0];
    return acc + vecesQueCaeElDia(mes, dia);
  }, 0);
}

/**
 * Tope mensual del plan, expresado en el mes concreto.
 * `diasPorSemana` sale del plan (o de dias_personalizados).
 * Se aproxima con el promedio real de semanas del mes en vez de un 4 fijo:
 * un mes de 30 días tiene 4,29 semanas, no 4.
 */
export function topeMensualDelPlan(diasPorSemana: number, mes: string): number {
  const [anio, m] = mes.split('-').map(Number);
  if (!anio || !m) return diasPorSemana * 4;
  const diasDelMes = new Date(anio, m, 0).getDate();
  return Math.round((diasPorSemana * diasDelMes) / 7);
}

export interface BalanceCupos {
  tope: number;
  fijas: number;
  suspendidasConCredito: number;
  individuales: number;
  usados: number;
  libres: number;
  excedidos: number;
}

/**
 * Balance del mes. `usados` puede pasar del tope a propósito: el socio puede
 * anotarse de más y eso NO se bloquea; se informa.
 */
export function balanceDelMes(params: {
  turnosFijos: string[];
  diasPorSemana: number;
  mes: string;
  suspendidasConCredito: number;
  individuales: number;
}): BalanceCupos {
  const { turnosFijos, diasPorSemana, mes, suspendidasConCredito, individuales } = params;
  const tope = topeMensualDelPlan(diasPorSemana, mes);
  const fijas = clasesFijasDelMes(turnosFijos, mes);
  const usados = Math.max(0, fijas - suspendidasConCredito + individuales);
  return {
    tope,
    fijas,
    suspendidasConCredito,
    individuales,
    usados,
    libres: Math.max(0, tope - usados),
    excedidos: Math.max(0, usados - tope)
  };
}
