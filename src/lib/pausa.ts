// src/lib/pausa.ts
// Lógica pura y centralizada para la gestión de clientes en pausa:
// - Durante el mes de pausa: se le da de baja de la Turnera de tiempo real (no ocupa cupo diario).
// - Sigue figurando en la Matriz Fija Semanal con sus turnos fijos asignados (no pierde su lugar).
// - Al mes siguiente: se detectan automáticamente los socios pausados para su revisión (retomar, postergar o dar de baja).

import { Cliente } from '../types';

/**
 * Determina si un socio se encuentra en condición de pausa (suspensión momentánea de cuota/clases).
 */
export function estaPausado(cliente: Pick<Cliente, 'exencion_cobro'> | undefined | null): boolean {
  if (!cliente) return false;
  return cliente.exencion_cobro === 'SUSPENDIDO';
}

/**
 * Obtiene el mes (formato 'YYYY-MM') para el cual rige la pausa del socio.
 * 1. Prioriza la marca 'PAUSA:YYYY-MM' guardada en nota_plan_personalizado.
 * 2. Si no existe la marca, recurre a ultimo_mes_pagado o al fallbackMes (ej. mes actual).
 */
export function obtenerMesPausa(
  cliente: Pick<Cliente, 'exencion_cobro' | 'nota_plan_personalizado' | 'ultimo_mes_pagado' | 'creado_at'> | undefined | null,
  fallbackMes?: string
): string {
  if (!cliente) return fallbackMes || '';

  if (cliente.nota_plan_personalizado) {
    const match = /PAUSA:(\d{4}-\d{2})/.exec(cliente.nota_plan_personalizado);
    if (match && match[1]) return match[1];
  }

  // Si tiene ultimo_mes_pagado, suele ser el mes en que pausó o previo a pausar
  if (cliente.ultimo_mes_pagado && /^\d{4}-\d{2}$/.test(cliente.ultimo_mes_pagado)) {
    return cliente.ultimo_mes_pagado;
  }

  if (fallbackMes) return fallbackMes;

  if (cliente.creado_at) {
    return cliente.creado_at.slice(0, 7);
  }

  return '';
}

/**
 * Verifica si un socio está pausado para una fecha específica (o mes específico).
 * Durante todo el mes de la pausa, se considera ausente/de baja de la Turnera operativa.
 */
export function estaPausadoEnFecha(
  cliente: Pick<Cliente, 'exencion_cobro' | 'nota_plan_personalizado' | 'ultimo_mes_pagado' | 'creado_at'> | undefined | null,
  fecha: string
): boolean {
  if (!estaPausado(cliente) || !fecha) return false;
  const mesFecha = fecha.slice(0, 7);
  const mesPausa = obtenerMesPausa(cliente);
  // Está pausado si la fecha corresponde al mes de su pausa
  return mesFecha === mesPausa;
}

/**
 * Genera el string para nota_plan_personalizado incorporando la etiqueta de mes de pausa.
 */
export function generarNotaPausa(mes: string, notaExistente?: string | null): string {
  const sinPausa = (notaExistente || '')
    .replace(/PAUSA:\d{4}-\d{2}\s*\|?\s*/g, '')
    .trim();
  return sinPausa ? `PAUSA:${mes} | ${sinPausa}` : `PAUSA:${mes}`;
}

/**
 * Limpia la marca de pausa de nota_plan_personalizado cuando el socio retoma o cambia de estado.
 */
export function removerNotaPausa(notaExistente?: string | null): string | null {
  if (!notaExistente) return null;
  const limpia = notaExistente
    .replace(/PAUSA:\d{4}-\d{2}\s*\|?\s*/g, '')
    .trim();
  return limpia || null;
}

/**
 * Detecta qué socios pausados completaron su mes de pausa y requieren revisión en el mes en curso.
 * Por ejemplo: socio pausado en 2026-08, al llegar 2026-09 debe ser revisado.
 */
export function pausadosPendientesDeRevision(
  clientes: Cliente[],
  mesActual: string
): Cliente[] {
  return (clientes || []).filter(c => {
    if (!estaPausado(c) || c.activo === false) return false;
    const mesPausa = obtenerMesPausa(c);
    // Si el mes de la pausa es anterior al mes corriente, ya venció el período de pausa
    return Boolean(mesPausa && mesPausa < mesActual);
  });
}
