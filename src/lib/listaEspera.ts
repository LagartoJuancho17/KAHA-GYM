// src/lib/listaEspera.ts
// Orden de la lista de espera de un turno en una fecha.
//
// Regla del negocio:
//   1. Los socios PRIORITARIOS (VIP) de ese turno van primero.
//   2. Dentro de cada grupo manda el orden de llegada (el que se anotó antes).
//
// Ser VIP es por (socio, turno), no global: alguien puede tener prioridad en el
// JUEVES-19:00 y ser uno más en el resto de los horarios.
//
// Antes esto era FIFO puro (sort por creado_at) en GymContext.

import { WaitlistReserva } from '../types';

/** Clave estable para marcar a un socio como prioritario en un turno. */
export function clavePrioridad(clienteId: string, turnoId: string): string {
  return `${clienteId}::${turnoId}`;
}

export function esPrioritario(
  clienteId: string,
  turnoId: string,
  prioritarios: Set<string>
): boolean {
  return prioritarios.has(clavePrioridad(clienteId, turnoId));
}

/**
 * Ordena la espera: VIP primero, y dentro de cada grupo por orden de llegada.
 * No muta la lista original.
 *
 * `prioritarios` es un Set de claves `clienteId::turnoId` (ver clavePrioridad).
 */
export function ordenarListaEspera<T extends { cliente_id: string; turno_id: string; creado_at: string }>(
  entradas: T[],
  prioritarios: Set<string>
): T[] {
  return [...(entradas || [])].sort((a, b) => {
    const aVip = esPrioritario(a.cliente_id, a.turno_id, prioritarios);
    const bVip = esPrioritario(b.cliente_id, b.turno_id, prioritarios);
    if (aVip !== bVip) return aVip ? -1 : 1;

    // Mismo grupo: gana el que se anotó antes.
    const ta = new Date(a.creado_at).getTime();
    const tb = new Date(b.creado_at).getTime();
    if (ta !== tb) return ta - tb;

    // Empate exacto de fecha: desempate estable por id para que el orden no baile
    // entre renders. Sin esto dos anotaciones del mismo milisegundo se alternaban.
    const ia = (a as any).id || '';
    const ib = (b as any).id || '';
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
}

/** La espera de un turno y fecha concretos, ya ordenada. */
export function esperaDelTurno(
  todas: WaitlistReserva[],
  turnoId: string,
  fecha: string,
  prioritarios: Set<string>
): WaitlistReserva[] {
  const delTurno = (todas || []).filter(w => w.turno_id === turnoId && w.fecha === fecha);
  return ordenarListaEspera(delTurno, prioritarios);
}

/** El próximo en entrar cuando se libera un lugar, o null si no hay nadie. */
export function proximoEnEntrar(
  todas: WaitlistReserva[],
  turnoId: string,
  fecha: string,
  prioritarios: Set<string>
): WaitlistReserva | null {
  return esperaDelTurno(todas, turnoId, fecha, prioritarios)[0] || null;
}
