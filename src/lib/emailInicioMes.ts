// src/lib/emailInicioMes.ts
// Lógica y verificación de envío del correo mensual de inicio de mes a los socios.

export const ACCIONES_EMAIL_INICIO_MES = [
  'EMAIL_MENSUAL_ENVIADO',
  'EMAIL_MENSUAL_ABIERTO_CLIENTE',
  'EMAIL_MENSUAL_INICIO_MES_ENVIADO'
] as const;

export interface LogEmailMes {
  accion: string;
  detalles?: { mes?: string; [key: string]: any } | null;
  creado_at?: string;
}

/**
 * Determina si el email de inicio de mes ya fue enviado para el mes dado.
 * Revisa:
 * 1. Estado local en memoria (si acaba de enviarse en la sesión actual).
 * 2. LocalStorage (por clave de mes).
 * 3. Logs de auditoría (para soporte multi-dispositivo y persistencia Supabase).
 */
export function estaEmailInicioMesEnviado(params: {
  mes: string;
  enviadoLocal?: boolean;
  getItemStorage?: (key: string) => string | null;
  auditLogs?: LogEmailMes[];
}): boolean {
  if (params.enviadoLocal) return true;

  const getItem = params.getItemStorage || (typeof localStorage !== 'undefined' ? (k: string) => localStorage.getItem(k) : () => null);

  // 1. Chequeo en localStorage
  const key = `kaha-mail-inicio-mes-enviado-${params.mes}`;
  try {
    if (getItem(key)) return true;
  } catch {
    // Manejo seguro por si localStorage no está disponible
  }

  // 2. Chequeo en logs de auditoría (sincronizados entre dispositivos)
  if (params.auditLogs && params.auditLogs.length > 0) {
    const logEncontrado = params.auditLogs.some(log => {
      if (!ACCIONES_EMAIL_INICIO_MES.includes(log.accion as any)) return false;
      const mesLog = log.detalles?.mes || (log.creado_at ? log.creado_at.slice(0, 7) : '');
      return mesLog === params.mes;
    });
    if (logEncontrado) return true;
  }

  return false;
}
