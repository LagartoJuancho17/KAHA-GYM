// src/lib/ocupacion.ts
// Fuente UNICA de verdad para "cuánta gente hay en un turno un día dado".
//
// Por qué existe este archivo: la misma fórmula estaba copiada en 6 lugares y
// 3 de esas copias contaban distinto. La más grave, `asignarClienteFijo`, miraba
// sólo `asignados_ids.length` y era CIEGA A LA FECHA: no veía las reservas
// puntuales ya tomadas para los días futuros de ese turno. Por eso la matriz fija
// se veía prolija (8 de 8) y la turnera del día mostraba 9.
//
// Regla del negocio:
//   ocupación(turno, fecha) = fijosActivos + reservasIndividuales + recuperos
//   fijosActivos = asignados MENOS los que suspendieron esa clase ese día.
//
// Ojo con `clases_suspendidas[].reintegrado`: NO se filtra por ese campo. Sólo
// indica si al socio se le devolvió el crédito por avisar con más de 3 horas
// (ver types.ts). Igual falta, así que el lugar queda libre en los dos casos.
//
// Un turno está LLENO cuando ocupación >= cupo_maximo (>=, no >).

import { Cliente, Turno, RecuperoTurno } from '../types';

/** Un fijo cuenta salvo que haya suspendido esa clase ese día. */
export function estaSuspendido(cliente: Cliente | undefined, turnoId: string, fecha: string): boolean {
  if (!cliente) return false;
  return (cliente.clases_suspendidas || []).some(s => s.turno_id === turnoId && s.fecha === fecha);
}

export function contarFijosActivos(turno: Turno, clientes: Cliente[], fecha: string): number {
  return (turno.asignados_ids || []).filter(id => {
    const c = clientes.find(x => x.id === id);
    return !estaSuspendido(c, turno.id, fecha);
  }).length;
}

export function contarReservas(turnoId: string, clientes: Cliente[], fecha: string): number {
  return clientes.reduce((acc, c) => {
    // Un socio dado de baja no ocupa lugar.
    if (c.activo === false) return acc;
    return acc + (c.reservas_individuales || []).filter(r => r.turno_id === turnoId && r.fecha === fecha).length;
  }, 0);
}

// PENDIENTE y COMPLETADO ocupan lugar: COMPLETADO significa que ya le hicieron
// check-in, o sea que la persona está físicamente en la clase. Contar sólo
// PENDIENTE (como hacía crearReservaIndividual) dejaba un lugar fantasma libre
// apenas se marcaba la asistencia. EXPIRADO no ocupa: esa clase ya se perdió.
export function contarRecuperos(turnoId: string, recuperos: RecuperoTurno[], fecha: string): number {
  return (recuperos || []).filter(
    r => (r.estado === 'PENDIENTE' || r.estado === 'COMPLETADO') &&
         r.turno_recupero_id === turnoId && r.fecha_recupero === fecha
  ).length;
}

export interface Ocupacion {
  fijos: number;
  fijosActivos: number;
  suspendidos: number;
  reservas: number;
  recuperos: number;
  total: number;
  cupo: number;
  lleno: boolean;
  libres: number;
}

/** La función canónica. Todo el resto de la app debe usar ésta. */
export function calcularOcupacion(
  turno: Turno,
  fecha: string,
  clientes: Cliente[],
  recuperos: RecuperoTurno[] = []
): Ocupacion {
  const fijos = (turno.asignados_ids || []).length;
  const fijosActivos = contarFijosActivos(turno, clientes, fecha);
  const reservas = contarReservas(turno.id, clientes, fecha);
  const recs = contarRecuperos(turno.id, recuperos, fecha);
  const total = fijosActivos + reservas + recs;
  const cupo = turno.cupo_maximo;
  return {
    fijos,
    fijosActivos,
    suspendidos: fijos - fijosActivos,
    reservas,
    recuperos: recs,
    total,
    cupo,
    lleno: total >= cupo,
    libres: Math.max(0, cupo - total)
  };
}

// ---------------------------------------------------------------------------
// Asignación de un FIJO: no alcanza con mirar el día de hoy.
// Un fijo entra TODAS las semanas, así que hay que mirar cada fecha futura de
// ese turno donde ya haya reservas puntuales o recuperos. Si en alguna de esas
// fechas sumar un fijo más pasa el cupo, esa fecha queda en conflicto.
// ---------------------------------------------------------------------------

export interface ConflictoFecha {
  fecha: string;
  ocupacionActual: number;
  ocupacionConElFijo: number;
  cupo: number;
}

/**
 * Fechas futuras de este turno que quedarían por encima del cupo si se suma un
 * fijo más. Sólo mira fechas que ya tienen reservas o recuperos cargados: en las
 * demás el fijo entra sin problema porque los fijos ya están contados contra el cupo.
 *
 * `desde` es la fecha de hoy en formato YYYY-MM-DD (se pasa explícita para que
 * la función sea determinista y testeable).
 */
export function conflictosAlAgregarFijo(
  turno: Turno,
  clientes: Cliente[],
  recuperos: RecuperoTurno[],
  desde: string,
  clienteId?: string
): ConflictoFecha[] {
  // Fechas candidatas: las que tienen alguna reserva o recupero en este turno.
  const fechas = new Set<string>();
  for (const c of clientes) {
    if (c.activo === false) continue;
    for (const r of c.reservas_individuales || []) {
      if (r.turno_id === turno.id && r.fecha >= desde) fechas.add(r.fecha);
    }
  }
  for (const r of recuperos || []) {
    if (r.estado === 'PENDIENTE' && r.turno_recupero_id === turno.id && r.fecha_recupero >= desde) {
      fechas.add(r.fecha_recupero);
    }
  }

  // Las reservas del PROPIO socio que se está por hacer fijo no son gente extra:
  // son la misma persona y se limpian al asignarlo. No deben generar conflicto.
  const clientesParaContar = clienteId
    ? clientes.map(c => c.id === clienteId
        ? { ...c, reservas_individuales: (c.reservas_individuales || []).filter(r => r.turno_id !== turno.id) }
        : c)
    : clientes;

  const conflictos: ConflictoFecha[] = [];
  for (const fecha of Array.from(fechas).sort()) {
    const o = calcularOcupacion(turno, fecha, clientesParaContar, recuperos);
    // El fijo nuevo suma 1 salvo que ya estuviera suspendido ese día (no puede estarlo:
    // recién se lo asigna), así que la proyección es total + 1.
    const conElFijo = o.total + 1;
    if (conElFijo > o.cupo) {
      conflictos.push({ fecha, ocupacionActual: o.total, ocupacionConElFijo: conElFijo, cupo: o.cupo });
    }
  }
  return conflictos;
}

/**
 * Reservas sueltas que un socio tiene para ESTE MISMO turno en fechas futuras.
 *
 * Por qué importa: el flujo real del gimnasio es "primero prueba clases sueltas,
 * después se hace fijo". Al asignarlo como fijo, esas reservas viejas quedan y la
 * misma persona pasa a contarse DOS veces en cada una de esas fechas (una como
 * fijo, otra como reserva). Es un cuerpo, no dos: hay que limpiarlas.
 *
 * Verificado en producción: 10 de 10 socios con esta duplicación habían reservado
 * ANTES de que un admin los hiciera fijos.
 */
export function reservasPropiasDuplicadas(
  cliente: Cliente,
  turnoId: string,
  desde: string
): string[] {
  return (cliente.reservas_individuales || [])
    .filter(r => r.turno_id === turnoId && r.fecha >= desde)
    .map(r => r.fecha)
    .sort();
}

/**
 * Fechas futuras que quedarían por encima del cupo si se BAJA el cupo a `nuevoCupo`.
 * Evita que el admin achique un turno y deje gente de más sin enterarse.
 */
export function conflictosAlBajarCupo(
  turno: Turno,
  clientes: Cliente[],
  recuperos: RecuperoTurno[],
  nuevoCupo: number,
  desde: string
): ConflictoFecha[] {
  const fechas = new Set<string>();
  for (const c of clientes) {
    if (c.activo === false) continue;
    for (const r of c.reservas_individuales || []) {
      if (r.turno_id === turno.id && r.fecha >= desde) fechas.add(r.fecha);
    }
  }
  for (const r of recuperos || []) {
    if (r.estado === 'PENDIENTE' && r.turno_recupero_id === turno.id && r.fecha_recupero >= desde) {
      fechas.add(r.fecha_recupero);
    }
  }

  const conflictos: ConflictoFecha[] = [];
  // Aunque no haya reservas, los fijos solos ya pueden superar el cupo nuevo.
  const fijos = (turno.asignados_ids || []).length;
  if (fijos > nuevoCupo && fechas.size === 0) {
    conflictos.push({ fecha: '(todas las semanas)', ocupacionActual: fijos, ocupacionConElFijo: fijos, cupo: nuevoCupo });
    return conflictos;
  }
  for (const fecha of Array.from(fechas).sort()) {
    const o = calcularOcupacion(turno, fecha, clientes, recuperos);
    if (o.total > nuevoCupo) {
      conflictos.push({ fecha, ocupacionActual: o.total, ocupacionConElFijo: o.total, cupo: nuevoCupo });
    }
  }
  if (fijos > nuevoCupo && !conflictos.some(c => c.fecha === '(todas las semanas)')) {
    conflictos.unshift({ fecha: '(todas las semanas)', ocupacionActual: fijos, ocupacionConElFijo: fijos, cupo: nuevoCupo });
  }
  return conflictos;
}
