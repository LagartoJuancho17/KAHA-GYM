// src/lib/recordatorioDeuda.ts

/**
 * Constantes y lógica centralizada para el recordatorio a socios con deuda / morosos.
 * Requisito: Enviar/mostrar SOLAMENTE a los socios que están debiendo.
 */

export const TITULO_RECORDATORIO_DEUDA = '💚 Te dejamos un pequeño recordatorio';

/**
 * Calendario de cobranza acordado con Juanchi:
 *  - día 1: la cuota del mes ya figura como deuda (ver calculoDeuda.ts)
 *  - día 5: aviso al socio, con la fecha límite explícita
 *  - día 10: se da de baja la reserva y los admins reciben el reporte
 */
export const DIA_AVISO_VENCIMIENTO = 5;
export const DIA_BAJA_RESERVA = 10;

export const TITULO_AVISO_VENCIMIENTO = '💚 Recordatorio de tu cuota';

/**
 * Este mensaje va ANTES de la baja, no después. El otro mensaje de este archivo
 * (MENSAJE_RECORDATORIO_DEUDA) avisa que el turno YA quedó liberado, que es una
 * conversación distinta: cuando llega ese, el lugar ya se perdió.
 */
export const MENSAJE_AVISO_VENCIMIENTO =
  `Todavía no nos figura el pago de la cuota de este mes.\n\n` +
  `Si no llegamos a registrarlo antes del día ${DIA_BAJA_RESERVA}, tu turno fijo queda liberado ` +
  `para que lo tome otra persona.\n\n` +
  `Si tuviste alguna dificultad o necesitás unos días más, escribinos y lo vemos. ` +
  `Con que nos avises alcanza para que te lo guardemos. 🤝\n\n` +
  `¡Gracias por ser parte de KAHA! 💚`;

/**
 * Aviso del día 5 (WhatsApp o email), con la fecha límite bien clara.
 */
export const generarAvisoVencimiento = (nombre: string): string => {
  return `Hola ${nombre}! 👋\n` +
    `${TITULO_AVISO_VENCIMIENTO}\n\n` +
    `${MENSAJE_AVISO_VENCIMIENTO}`;
};

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
  reposo?: { desde: string; hasta: string } | null;
}

/**
 * Determina estrictamente si un socio "está debiendo" o no a efectos de recordatorios y cobros.
 * Devuelve true si y solo si:
 * - Tiene estado explícito MOROSO (plazo vencido de mes actual o previo), O
 * - Ya pagó el mes actual pero aún arrastra saldo deudor previo (> 0), O
 * - No pagó el mes actual y ya llegó o pasó el día de aviso (día 5 en adelante), O
 * - Está dentro de los primeros días (días 1 a 4) pero no pagó el mes anterior (arrastra mora).
 * 
 * Los socios al día, los socios dentro de los días 1 a 4 con mes previo pago,
 * los socios con exención sin deuda y los socios en reposo devuelven false.
 */
export const socioEstaDebiendo = (params: SocioCheckDeudaParams): boolean => {
  const {
    reposo,
    deuda_acumulada = 0,
    estado,
    ultimo_mes_pagado,
    exencion_cobro,
    pagos = [],
    socioId,
    fechaReferencia = new Date()
  } = params;

  // Un socio en reposo tiene la cuenta congelada a proposito: no se le reclama.
  // Va PRIMERO y en el nucleo, no en cada pantalla, porque si no cada pantalla
  // que llame a esta funcion se olvida de filtrarlo. Paso exactamente eso: el
  // panel del socio le mostraba "tu turno fijo queda disponible" a alguien en
  // reposo, contradiciendo el cartel que le promete lo contrario.
  if (reposo?.desde) return false;

  // Si tiene exención de cobro activa y no tiene deuda previa registrada, no debe
  if (exencion_cobro && exencion_cobro !== 'NINGUNA' && deuda_acumulada <= 0) {
    return false;
  }

  // 1. Estado explícito MOROSO siempre debe
  if (estado === 'MOROSO') {
    return true;
  }

  const diaMes = fechaReferencia.getDate();
  const yearRef = fechaReferencia.getFullYear();
  const monthRef = fechaReferencia.getMonth(); // 0-indexed (0 = Enero)
  const mesActual = `${yearRef}-${String(monthRef + 1).padStart(2, '0')}`;
  const mesAnterior = monthRef === 0
    ? `${yearRef - 1}-12`
    : `${yearRef}-${String(monthRef).padStart(2, '0')}`;

  const tienePagoMes = (ultimo_mes_pagado && ultimo_mes_pagado >= mesActual) ||
    (socioId ? pagos.some(p => p.cliente_id === socioId && p.mes_correspondiente === mesActual) : false);

  // 2. Si ya pagó el mes actual: solo debe si todavía arrastra deuda previa
  if (tienePagoMes) {
    return deuda_acumulada > 0;
  }

  // 3. No pagó el mes actual:
  // Si ya llegó o pasó la fecha de aviso de vencimiento (día 5 en adelante):
  if (diaMes >= DIA_AVISO_VENCIMIENTO) {
    return true;
  }

  // 4. Días 1 a 4 (inicio del mes en curso, plazo regular de gracia 1 al 5):
  // En GymContext, al inicio de mes a todos los socios se les imputa la cuota en
  // deuda_acumulada y pasan a CON_DEUDA. Pero un socio que pagó el mes anterior
  // está en su plazo regular de pago, NO está en mora.
  // Solo debe si NO pagó el mes anterior (arrastra mora de meses pasados).
  const tienePagoMesAnterior = Boolean(ultimo_mes_pagado && ultimo_mes_pagado >= mesAnterior);
  if (!tienePagoMesAnterior) {
    return true;
  }

  return false;
};

export interface SocioNotificable {
  id: string;
  nombre: string;
  apellido?: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
  estado?: string;
  deuda_acumulada?: number;
  ultimo_mes_pagado?: string;
  exencion_cobro?: string;
  reposo?: { desde: string; hasta: string } | null;
}

/**
 * A quién le toca el aviso del día 5 y a quién entra en el reporte del día 10.
 *
 * Deja afuera, además de los que están al día:
 *  - los dados de baja (activo === false), que ya no son socios;
 *  - los que están en reposo, porque su cuenta está congelada a propósito y
 *    mandarles intimación de pago es justo lo contrario de lo que se acordó.
 */
export function destinatariosAvisoDeuda<T extends SocioNotificable>(
  clientes: T[],
  pagos: Array<{ cliente_id: string; mes_correspondiente: string }> = [],
  fechaReferencia: Date = new Date()
): T[] {
  return (clientes || []).filter(c => {
    if (!c) return false;
    if (c.activo === false) return false;
    if (c.reposo?.desde) return false;

    return socioEstaDebiendo({
      deuda_acumulada: c.deuda_acumulada,
      estado: c.estado,
      ultimo_mes_pagado: c.ultimo_mes_pagado,
      exencion_cobro: c.exencion_cobro,
      pagos,
      socioId: c.id,
      fechaReferencia
    });
  });
}
