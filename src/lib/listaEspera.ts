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
  prioritarios: Set<string>,
  listaEsperaFija?: string[]
): boolean {
  if (prioritarios && prioritarios.has(clavePrioridad(clienteId, turnoId))) return true;
  if (listaEsperaFija && listaEsperaFija.includes(clienteId)) return true;
  return false;
}

/**
 * Ordena la espera: Matriz fija y VIPs primero, y dentro de cada grupo por orden de llegada/posición.
 * No muta la lista original.
 *
 * `prioritarios` es un Set de claves `clienteId::turnoId` (ver clavePrioridad).
 * `listaEsperaFija` es la lista de IDs de espera semanal de matriz fija (turno.lista_espera_ids).
 */
export function ordenarListaEspera<T extends { cliente_id: string; turno_id: string; creado_at: string }>(
  entradas: T[],
  prioritarios: Set<string>,
  listaEsperaFija?: string[]
): T[] {
  return [...(entradas || [])].sort((a, b) => {
    const aFijoIdx = listaEsperaFija ? listaEsperaFija.indexOf(a.cliente_id) : -1;
    const bFijoIdx = listaEsperaFija ? listaEsperaFija.indexOf(b.cliente_id) : -1;
    const aEsFijo = aFijoIdx !== -1 || Boolean((a as any).esMatrizFija);
    const bEsFijo = bFijoIdx !== -1 || Boolean((b as any).esMatrizFija);

    const aVip = esPrioritario(a.cliente_id, a.turno_id, prioritarios) || aEsFijo;
    const bVip = esPrioritario(b.cliente_id, b.turno_id, prioritarios) || bEsFijo;
    if (aVip !== bVip) return aVip ? -1 : 1;

    // Si ambos son prioritarios o de matriz fija:
    if (aVip && bVip) {
      // 1. Si ambos están en la lista fija, respetar su orden en la lista fija
      if (aFijoIdx !== -1 && bFijoIdx !== -1 && aFijoIdx !== bFijoIdx) {
        return aFijoIdx - bFijoIdx;
      }
      // 2. Alumnos de lista de espera de Matriz Fija van con prioridad máxima ante lista de espera puntual
      if (aEsFijo !== bEsFijo) {
        return aEsFijo ? -1 : 1;
      }
    }

    // Mismo grupo: gana el que se anotó antes.
    const ta = new Date(a.creado_at).getTime();
    const tb = new Date(b.creado_at).getTime();
    if (ta !== tb) return ta - tb;

    // Empate exacto de fecha: desempate estable por id
    const ia = (a as any).id || '';
    const ib = (b as any).id || '';
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });
}

export interface ClienteOpcionesEspera {
  id: string;
  activo?: boolean;
  turnos_fijos?: string[];
  reservas_individuales?: Array<{ turno_id: string; fecha: string }>;
  clases_suspendidas?: Array<{ turno_id: string; fecha: string }>;
}

export interface TurnoOpcionesEspera {
  id: string;
  lista_espera_ids?: string[];
}

/** La espera de un turno y fecha concretos, ya ordenada. */
export function esperaDelTurno(
  todas: WaitlistReserva[],
  turnoId: string,
  fecha: string,
  prioritarios: Set<string>,
  opciones?: {
    clientes?: ClienteOpcionesEspera[];
    turnos?: TurnoOpcionesEspera[];
    listaEsperaFija?: string[];
  }
): WaitlistReserva[] {
  const delTurno = [...(todas || []).filter(w => w.turno_id === turnoId && w.fecha === fecha)];

  // Lista de espera fija del turno (de la matriz fija semanal)
  const listaFija = opciones?.listaEsperaFija || (opciones?.turnos?.find(t => t.id === turnoId)?.lista_espera_ids) || [];

  // 1. Integrar automáticamente alumnos en Lista de Espera de Matriz Fija:
  // Mientras esperan un lugar fijo permanente, tienen prioridad en TODAS las semanas de la turnera.
  if (listaFija && listaFija.length > 0) {
    for (let i = 0; i < listaFija.length; i++) {
      const cid = listaFija[i];
      if (!cid) continue;

      // Si tenemos información de clientes, validar que califique para estar en espera hoy
      if (opciones?.clientes) {
        const cl = opciones.clientes.find(c => c.id === cid);
        if (cl) {
          if (cl.activo === false) continue;
          // Ya es fijo asignado de este turno
          if (cl.turnos_fijos?.includes(turnoId)) continue;
          // Ya tiene reserva confirmada en este turno y fecha
          if ((cl.reservas_individuales || []).some(r => r.turno_id === turnoId && r.fecha === fecha)) continue;
          // Tiene su clase suspendida ese día
          if ((cl.clases_suspendidas || []).some(s => s.turno_id === turnoId && s.fecha === fecha)) continue;
        }
      }

      const existingIndex = delTurno.findIndex(w => w.cliente_id === cid);
      if (existingIndex !== -1) {
        (delTurno[existingIndex] as any).esMatrizFija = true;
      } else {
        // Sintetizar entrada de espera garantizada para esta fecha con prioridad de matriz fija
        delTurno.push({
          id: `matriz-auto-${cid}-${turnoId}-${fecha}`,
          cliente_id: cid,
          turno_id: turnoId,
          fecha,
          creado_at: '1999-01-01T00:00:00.000Z',
          esMatrizFija: true
        } as any);
      }
    }
  }

  // 2. Socios con prioridad VIP en este turno: si no tienen ya fila en la espera para esta fecha,
  // y no tienen cupo/reserva tomada ni suspensión ese día, se integran automáticamente.
  if (prioritarios && prioritarios.size > 0) {
    const prefijo = `::${turnoId}`;
    for (const clave of prioritarios) {
      if (clave.endsWith(prefijo)) {
        const cid = clave.slice(0, clave.length - prefijo.length);
        if (!cid) continue;

        // Ya tiene fila explícita en la espera de esta fecha
        if (delTurno.some(w => w.cliente_id === cid)) continue;

        // Si tenemos información de clientes, validar que califique para estar en espera hoy
        if (opciones?.clientes) {
          const cl = opciones.clientes.find(c => c.id === cid);
          if (cl) {
            if (cl.activo === false) continue;
            // Ya es fijo asignado de este turno
            if (cl.turnos_fijos?.includes(turnoId)) continue;
            // Ya tiene reserva confirmada en este turno y fecha
            if ((cl.reservas_individuales || []).some(r => r.turno_id === turnoId && r.fecha === fecha)) continue;
            // Tiene su clase suspendida ese día
            if ((cl.clases_suspendidas || []).some(s => s.turno_id === turnoId && s.fecha === fecha)) continue;
          }
        }

        // Sintetizar entrada de espera garantizada para esta fecha
        delTurno.push({
          id: `vip-auto-${cid}-${turnoId}-${fecha}`,
          cliente_id: cid,
          turno_id: turnoId,
          fecha,
          creado_at: '2000-01-01T00:00:00.000Z'
        });
      }
    }
  }

  return ordenarListaEspera(delTurno, prioritarios, listaFija);
}

/** El próximo en entrar cuando se libera un lugar, o null si no hay nadie. */
export function proximoEnEntrar(
  todas: WaitlistReserva[],
  turnoId: string,
  fecha: string,
  prioritarios: Set<string>,
  opciones?: {
    clientes?: ClienteOpcionesEspera[];
    turnos?: TurnoOpcionesEspera[];
    listaEsperaFija?: string[];
  }
): WaitlistReserva | null {
  return esperaDelTurno(todas, turnoId, fecha, prioritarios, opciones)[0] || null;
}

// ---------------------------------------------------------------------------
// Lista de espera SEMANAL (turno.lista_espera_ids).
// Es otra lista, distinta de la de por fecha: esta define quien entra como FIJO
// cuando se libera un lugar del turno, y es la que le importa al socio que quiere
// sumarse al horario todas las semanas.
//
// Antes las dos promociones semanales tomaban lista_espera_ids[0], o sea orden de
// llegada puro, ignorando la prioridad. Un socio marcado como VIP quedaba igual
// atras: la marca no servia para nada en la lista que mas importa.
// ---------------------------------------------------------------------------

/**
 * Ordena la espera semanal de un turno: VIP primero, despues por orden de llegada.
 * `ids` es turno.lista_espera_ids, que ya viene en orden de llegada.
 * No muta el array original.
 */
export function ordenarEsperaSemanal(
  ids: string[],
  turnoId: string,
  prioritarios: Set<string>
): string[] {
  const conIndice = (ids || []).map((id, i) => ({ id, i }));
  conIndice.sort((a, b) => {
    const aVip = esPrioritario(a.id, turnoId, prioritarios);
    const bVip = esPrioritario(b.id, turnoId, prioritarios);
    if (aVip !== bVip) return aVip ? -1 : 1;
    return a.i - b.i; // orden de llegada dentro de cada grupo
  });
  return conIndice.map(x => x.id);
}

/** El proximo en entrar como fijo cuando se libera un lugar, o null si no hay nadie. */
export function proximoFijo(
  ids: string[],
  turnoId: string,
  prioritarios: Set<string>
): string | null {
  return ordenarEsperaSemanal(ids, turnoId, prioritarios)[0] || null;
}
