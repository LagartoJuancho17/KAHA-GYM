// src/lib/recordatorioDeuda.ts

/**
 * Constantes y lógica centralizada para el recordatorio a socios con deuda / morosos.
 * Requisito: Enviar/mostrar SOLAMENTE a los socios que están debiendo.
 */

export const TITULO_RECORDATORIO_DEUDA = '💚 Te dejamos un pequeño recordatorio';

export const MENSAJE_RECORDATORIO_DEUDA = `Ya pasó la fecha prevista para realizar el pago y, a partir de ahora, tu turno fijo queda disponible para ser ocupado por otra persona.

Si tuviste alguna dificultad o necesitás unos días más, escribinos cuando puedas. Podemos conversarlo y, si es posible, mantener reservado tu turno para que no lo pierdas. 🤝

¡Queremos que sigas siendo parte de KAHA!
Cualquier cosa, estamos acá para ayudarte. 💚`;

/**
 * Genera el mensaje para enviar por WhatsApp al socio moroso / con deuda.
 */
export const generarMensajeWhatsAppRecordatorio = (nombre: string): string => {
  return `Hola ${nombre}! 👋\n` +
    `${TITULO_RECORDATORIO_DEUDA}\n\n` +
    `${MENSAJE_RECORDATORIO_DEUDA}`;
};

export interface SocioCheckDeudaParams {
  deuda_acumulada?: number;
  estado?: string;
  ultimo_mes_pagado?: string;
  exencion_cobro?: string;
  pagos?: Array<{ mes_correspondiente: string; cliente_id: string }>;
  socioId?: string;
  fechaReferencia?: Date;
}

/**
 * Determina estrictamente si un socio "está debiendo" o no.
 * Devuelve true si y solo si:
 * - Tiene deuda acumulada mayor a 0 o estado CON_DEUDA / MOROSO, O
 * - Pasó la fecha prevista de pago (a partir del día 6) y no registra pago del mes actual.
 * Los socios con exención sin deuda y los socios al día devuelven false.
 */
export const socioEstaDebiendo = (params: SocioCheckDeudaParams): boolean => {
  const {
    deuda_acumulada = 0,
    estado,
    ultimo_mes_pagado,
    exencion_cobro,
    pagos = [],
    socioId,
    fechaReferencia = new Date()
  } = params;

  // Si tiene exención de cobro activa y no tiene deuda previa registrada, no debe
  if (exencion_cobro && exencion_cobro !== 'NINGUNA' && deuda_acumulada <= 0) {
    return false;
  }

  // 1. Deuda acumulada explícita o estado de mora
  if (deuda_acumulada > 0 || estado === 'CON_DEUDA' || estado === 'MOROSO') {
    return true;
  }

  // 2. Control de mes en curso: a partir del día 6 (el plazo es 1 al 5)
  const diaMes = fechaReferencia.getDate();
  const mesActual = `${fechaReferencia.getFullYear()}-${String(fechaReferencia.getMonth() + 1).padStart(2, '0')}`;

  const tienePagoMes = (ultimo_mes_pagado && ultimo_mes_pagado >= mesActual) ||
    (socioId ? pagos.some(p => p.cliente_id === socioId && p.mes_correspondiente === mesActual) : false);

  if (diaMes >= 6 && !tienePagoMes) {
    return true;
  }

  return false;
};
