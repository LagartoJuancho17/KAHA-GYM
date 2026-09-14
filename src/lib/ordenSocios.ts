// src/lib/ordenSocios.ts
import { Cliente } from '../types';

export type CampoOrdenSocios = 'INGRESO' | 'APELLIDO' | 'NOMBRE' | 'DEUDA';
export type DireccionOrden = 'asc' | 'desc';

export interface OrdenSocios {
  campo: CampoOrdenSocios;
  direccion: DireccionOrden;
}

export const ORDEN_POR_DEFECTO: OrdenSocios = { campo: 'INGRESO', direccion: 'desc' };

export const ETIQUETAS_ORDEN: Record<CampoOrdenSocios, string> = {
  INGRESO: 'Fecha de ingreso',
  APELLIDO: 'Apellido',
  NOMBRE: 'Nombre',
  DEUDA: 'Deuda'
};

// 'es' con sensitivity 'base' para que Ángel caiga junto a Angel y la ñ después de la n.
const comparadorTexto = (a: string, b: string) =>
  (a || '').trim().localeCompare((b || '').trim(), 'es', { sensitivity: 'base' });

const deudaDe = (c: Cliente) => (typeof c.deuda_acumulada === 'number' ? c.deuda_acumulada : 0);

// Una ficha sin creado_at se trata como la más vieja: es data legacy, no un alta de hoy.
const ingresoDe = (c: Cliente) => {
  const t = Date.parse(c.creado_at || '');
  return Number.isNaN(t) ? -Infinity : t;
};

/**
 * Desempate estable: si el criterio elegido empata, el orden no puede quedar
 * a merced del array original, porque entonces la tabla salta de lugar cada
 * vez que se recarga. Apellido, nombre y por último id, que es único.
 */
const desempate = (a: Cliente, b: Cliente) =>
  comparadorTexto(a.apellido, b.apellido) ||
  comparadorTexto(a.nombre, b.nombre) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const comparadores: Record<CampoOrdenSocios, (a: Cliente, b: Cliente) => number> = {
  INGRESO: (a, b) => ingresoDe(a) - ingresoDe(b),
  APELLIDO: (a, b) => comparadorTexto(a.apellido, b.apellido) || comparadorTexto(a.nombre, b.nombre),
  NOMBRE: (a, b) => comparadorTexto(a.nombre, b.nombre) || comparadorTexto(a.apellido, b.apellido),
  DEUDA: (a, b) => deudaDe(a) - deudaDe(b)
};

/**
 * Ordena la lista de socios sin mutar la original.
 * `direccion` invierte el criterio principal, nunca el desempate: si dos fichas
 * empatan, se siguen leyendo alfabéticamente en los dos sentidos.
 */
export function ordenarSocios(
  clientes: Cliente[],
  orden: OrdenSocios = ORDEN_POR_DEFECTO
): Cliente[] {
  const lista = Array.isArray(clientes) ? [...clientes] : [];
  const comparar = comparadores[orden.campo] || comparadores.INGRESO;
  const signo = orden.direccion === 'desc' ? -1 : 1;

  return lista.sort((a, b) => {
    const principal = comparar(a, b);
    if (principal !== 0) return principal * signo;
    return desempate(a, b);
  });
}

/**
 * Click sobre una columna: si ya se ordenaba por ese campo, invierte el sentido;
 * si no, pasa a ese campo con su sentido más útil por defecto (las fechas y los
 * montos se leen de mayor a menor, los nombres de la A a la Z).
 */
export function alternarOrden(actual: OrdenSocios, campo: CampoOrdenSocios): OrdenSocios {
  if (actual.campo === campo) {
    return { campo, direccion: actual.direccion === 'asc' ? 'desc' : 'asc' };
  }
  const direccion: DireccionOrden = campo === 'INGRESO' || campo === 'DEUDA' ? 'desc' : 'asc';
  return { campo, direccion };
}
