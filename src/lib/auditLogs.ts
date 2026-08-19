// src/lib/auditLogs.ts
// Lógica pura del historial de auditoría. Sin React, sin Supabase: entra data,
// sale data. Así se puede testear sin navegador ni base.
//
// El historial vive en tres lugares y tienen que converger:
//   1. React state  (lo que ve el usuario ahora)
//   2. localStorage (sobrevive al refresh sin red)
//   3. Supabase     (sobrevive al cambio de dispositivo/navegador)
//
// La regla: NUNCA reemplazar una fuente por otra. Siempre unir las tres y
// deduplicar por `id`. Por eso cada log nace con un UUID generado en el cliente
// y ese mismo id se guarda en Supabase: un log es el mismo log en los 3 lados.

import { AuditLog } from '../types';

export const MAX_LOGS = 500;

// UUID v4. crypto.randomUUID existe en todo navegador moderno sobre HTTPS y en
// localhost; el fallback cubre contextos inseguros (http en IP de la LAN).
export function nuevoLogId(): string {
  const c: any = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  if (c && typeof c.getRandomValues === 'function') {
    const b = c.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b, (x: number) => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  // Último recurso: no es un UUID criptográfico pero sirve como clave única local.
  const r = () => Math.random().toString(16).slice(2, 10);
  return `${r()}-${r().slice(0, 4)}-4${r().slice(0, 3)}-a${r().slice(0, 3)}-${r()}${r().slice(0, 4)}`;
}

// Ordena descendente por fecha (más nuevo primero). Empate: desempata por id
// para que el orden sea estable y no baile entre renders.
function porFechaDesc(a: AuditLog, b: AuditLog): number {
  if (a.creado_at !== b.creado_at) return a.creado_at < b.creado_at ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

/**
 * Une varias listas de logs en una sola, sin duplicados y ordenada.
 * Gana el primero que aparece para un mismo id, así que pasá primero la fuente
 * más confiable (Supabase) y después la local.
 */
export function mergeLogs(...listas: Array<AuditLog[] | null | undefined>): AuditLog[] {
  const porId = new Map<string, AuditLog>();
  for (const lista of listas) {
    if (!Array.isArray(lista)) continue;
    for (const log of lista) {
      if (!log || typeof log.id !== 'string' || !log.id) continue;
      if (!porId.has(log.id)) porId.set(log.id, log);
    }
  }
  return Array.from(porId.values()).sort(porFechaDesc).slice(0, MAX_LOGS);
}

/**
 * Logs que están en local pero todavía no en la base: hay que subirlos.
 * Sin esto, un insert que falló (sin red, error puntual) se pierde para siempre
 * en cuanto el refresh trae la versión de la base.
 */
export function logsFaltantesEnDb(locales: AuditLog[], enDb: AuditLog[]): AuditLog[] {
  const idsDb = new Set((enDb || []).map(l => l.id));
  return (locales || []).filter(l => l && typeof l.id === 'string' && l.id && !idsDb.has(l.id));
}

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esUuid(id: unknown): boolean {
  return typeof id === 'string' && RE_UUID.test(id);
}

/**
 * Los logs guardados por versiones viejas tenían id "log-<timestamp>-<random>",
 * que la columna uuid de Supabase rechaza. Sin esto el backfill fallaría entero
 * por un id inválido. Les asignamos un UUID estable para que puedan subir.
 * Devuelve una lista nueva; no muta la original.
 */
export function normalizarIdsLegacy(logs: AuditLog[]): AuditLog[] {
  return (logs || []).map(l => (esUuid(l.id) ? l : { ...l, id: nuevoLogId() }));
}

/** Parseo defensivo de localStorage: nunca tira, siempre devuelve un array. */
export function parsearLogsGuardados(raw: string | null): AuditLog[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(l => l && typeof l.id === 'string' && typeof l.accion === 'string');
  } catch {
    return [];
  }
}
