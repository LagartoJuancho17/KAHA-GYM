// src/lib/reposo.ts
import { Cliente } from '../types';

/**
 * Reposo: la cuenta se congela en vez de borrarse.
 *
 * Caso real (Juanchi): gente que cambia de laburo y no puede sostener la cuota
 * unos meses. Darle de baja definitiva la borra como socio y cuando vuelve hay
 * que cargarla de cero. Reposo la saca de los turnos y deja de generarle deuda,
 * pero la ficha sigue existiendo por 6 meses por si vuelve.
 */
export const MESES_DE_REPOSO = 6;

export interface DatosReposo {
  desde: string;  // 'YYYY-MM-DD'
  hasta: string;  // 'YYYY-MM-DD'
  motivo?: string;
  turnos_liberados?: string[];
}

/**
 * Suma meses a una fecha 'YYYY-MM-DD' recortando al último día real del mes
 * destino. Sin este recorte, un reposo que arranca el 31 de agosto termina el
 * "31 de febrero" y el Date de JS lo empuja al 2 o 3 de marzo.
 */
export function sumarMeses(fecha: string, meses: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((fecha || '').trim());
  if (!m) return '';
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);

  const totalMeses = (anio * 12 + (mes - 1)) + meses;
  const anioDestino = Math.floor(totalMeses / 12);
  const mesDestino = (totalMeses % 12) + 1;

  // Día 0 del mes siguiente = último día del mes destino.
  const ultimoDia = new Date(Date.UTC(anioDestino, mesDestino, 0)).getUTCDate();
  const diaDestino = Math.min(dia, ultimoDia);

  return `${anioDestino}-${String(mesDestino).padStart(2, '0')}-${String(diaDestino).padStart(2, '0')}`;
}

export function calcularFinDeReposo(desde: string): string {
  return sumarMeses(desde, MESES_DE_REPOSO);
}

export function iniciarReposo(desde: string, motivo?: string, turnosLiberados: string[] = []): DatosReposo {
  return {
    desde,
    hasta: calcularFinDeReposo(desde),
    motivo: motivo?.trim() || undefined,
    turnos_liberados: turnosLiberados
  };
}

export function estaEnReposo(cliente: Pick<Cliente, 'reposo'>): boolean {
  return Boolean(cliente?.reposo?.desde);
}

/**
 * Pasaron los 6 meses y nadie volvió: la ficha queda para que un admin decida
 * si la borra o la reactiva. El sistema no borra a nadie solo.
 */
export function reposoVencido(cliente: Pick<Cliente, 'reposo'>, hoy: string): boolean {
  const hasta = cliente?.reposo?.hasta;
  if (!hasta) return false;
  return hoy > hasta;
}

export function diasRestantesDeReposo(cliente: Pick<Cliente, 'reposo'>, hoy: string): number {
  const hasta = cliente?.reposo?.hasta;
  if (!hasta) return 0;
  const msPorDia = 24 * 60 * 60 * 1000;
  const fin = Date.parse(`${hasta}T00:00:00Z`);
  const ahora = Date.parse(`${hoy}T00:00:00Z`);
  if (Number.isNaN(fin) || Number.isNaN(ahora)) return 0;
  return Math.max(0, Math.round((fin - ahora) / msPorDia));
}

/**
 * Un socio en reposo no debe plata: se le congeló la cuenta, no se le fue
 * acumulando la cuota mientras no venía. Si esto devolviera true el socio
 * aparecería como moroso al volver, que es justo lo que se quiere evitar.
 */
export function generaDeuda(cliente: Pick<Cliente, 'reposo'>): boolean {
  return !estaEnReposo(cliente);
}

export function sociosEnReposo(clientes: Cliente[]): Cliente[] {
  return (clientes || []).filter(c => estaEnReposo(c));
}

export function sociosConReposoVencido(clientes: Cliente[], hoy: string): Cliente[] {
  return (clientes || []).filter(c => estaEnReposo(c) && reposoVencido(c, hoy));
}

export function etiquetaReposo(cliente: Pick<Cliente, 'reposo'>, hoy: string): string {
  if (!estaEnReposo(cliente)) return '';
  if (reposoVencido(cliente, hoy)) return 'Reposo vencido';
  const dias = diasRestantesDeReposo(cliente, hoy);
  if (dias === 0) return 'Reposo: último día';
  if (dias === 1) return 'Reposo: 1 día restante';
  if (dias < 31) return `Reposo: ${dias} días restantes`;
  const meses = Math.floor(dias / 30);
  return `Reposo: ${meses} ${meses === 1 ? 'mes' : 'meses'} restantes`;
}
