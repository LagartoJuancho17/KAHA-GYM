// src/lib/calculoDeuda.ts
// Lógica pura y centralizada para el cálculo de deuda mensual, estados de morosidad y formateo de becas.

import { Cliente, EstadoCliente, Plan } from '../types';

/**
 * Obtiene el precio mensual correspondiente a un socio según su plan o tarifa personalizada.
 */
export function precioPlanSocio(
  cliente: Pick<Cliente, 'plan_id' | 'precio_personalizado'>,
  planes: Pick<Plan, 'id' | 'precio'>[]
): number {
  if (cliente.precio_personalizado != null && !isNaN(Number(cliente.precio_personalizado))) {
    return Number(cliente.precio_personalizado);
  }
  const plan = planes.find(p => p.id === cliente.plan_id);
  return plan ? Number(plan.precio) : 0;
}

/**
 * Calcula la diferencia de costo entre el plan actual de un socio y un nuevo plan.
 * Devuelve un número >= 0 (o 0 si el nuevo plan es igual o más económico).
 */
export function calcularDiferenciaPlan(
  cliente: Pick<Cliente, 'plan_id' | 'precio_personalizado'>,
  nuevoPlanId: string,
  planes: Pick<Plan, 'id' | 'precio'>[],
  nuevoPrecioPersonalizado?: number | null
): { precioAnterior: number; precioNuevo: number; diferencia: number } {
  const precioAnterior = precioPlanSocio(cliente, planes);
  let precioNuevo = 0;
  if (nuevoPrecioPersonalizado != null && !isNaN(Number(nuevoPrecioPersonalizado))) {
    precioNuevo = Number(nuevoPrecioPersonalizado);
  } else {
    const pNuevo = planes.find(p => p.id === nuevoPlanId);
    precioNuevo = pNuevo ? Number(pNuevo.precio) : 0;
  }
  const diferencia = Math.max(0, precioNuevo - precioAnterior);
  return { precioAnterior, precioNuevo, diferencia };
}

export interface ResultadoCalculoDeuda {
  deuda_acumulada: number;
  estado: EstadoCliente;
  esBecado: boolean;
  deuda_perdonada?: number;
  pagoEsteMes: boolean;
  ultimo_mes_pagado?: string;
}

/**
 * Calcula la deuda y estado de un socio para el mes en curso:
 * - Si es BECADO o PERDONADO: deuda = $0, estado = 'ACTIVO', guarda monto becado.
 * - Desde el día 1 del mes: si no registra pago del mes actual, se imputa la cuota del mes a la deuda.
 *   - Días 1 a 5 (período de pago/gracia): estado = 'CON_DEUDA'.
 *   - Día 6 en adelante: estado = 'MOROSO'.
 * - Si tiene el mes al día y sin deuda: estado = 'ACTIVO'.
 */
export function calcularDeudaYEstadoCliente(
  cliente: Cliente,
  planes: Pick<Plan, 'id' | 'precio'>[],
  mesActual: string,
  diaDelMes: number
): ResultadoCalculoDeuda {
  // Socio en reposo: la cuenta está congelada a propósito. No se le imputa la
  // cuota del mes, si no vuelve a los 6 meses debiendo cuotas que nunca usó.
  // Va explícito y antes que todo lo demás: hoy el reposo además deja al socio
  // inactivo y caería igual en el chequeo de abajo, pero esa es una decisión que
  // puede cambiar, y la regla "en reposo no se cobra" no depende de aquélla.
  if (cliente.reposo?.desde) {
    return {
      deuda_acumulada: Number(cliente.deuda_acumulada || 0),
      estado: 'INACTIVO',
      esBecado: cliente.exencion_cobro === 'BECADO' || cliente.exencion_cobro === 'PERDONADO',
      deuda_perdonada: cliente.deuda_perdonada,
      pagoEsteMes: Boolean(cliente.ultimo_mes_pagado && cliente.ultimo_mes_pagado >= mesActual)
    };
  }

  // Si el cliente está inactivo (baja manual), se respeta
  if (!cliente.activo || cliente.estado === 'INACTIVO') {
    return {
      deuda_acumulada: Number(cliente.deuda_acumulada || 0),
      estado: 'INACTIVO',
      esBecado: cliente.exencion_cobro === 'BECADO' || cliente.exencion_cobro === 'PERDONADO',
      deuda_perdonada: cliente.deuda_perdonada,
      pagoEsteMes: Boolean(cliente.ultimo_mes_pagado && cliente.ultimo_mes_pagado >= mesActual)
    };
  }

  const cuotaMes = precioPlanSocio(cliente, planes);
  const pagoEsteMes = Boolean(cliente.ultimo_mes_pagado && cliente.ultimo_mes_pagado >= mesActual);
  const esBecado = cliente.exencion_cobro === 'BECADO' || cliente.exencion_cobro === 'PERDONADO';

  // 1. Socio Becado / Deuda Perdonada
  if (esBecado) {
    const deudaOriginal = cliente.deuda_perdonada || (cliente.deuda_acumulada > 0 ? cliente.deuda_acumulada : cuotaMes);
    return {
      deuda_acumulada: 0,
      estado: 'ACTIVO',
      esBecado: true,
      deuda_perdonada: deudaOriginal,
      pagoEsteMes: true,
      ultimo_mes_pagado: mesActual
    };
  }

  // 1b. Socio con exención de cobro POSTERGADO o SUSPENDIDO
  if (cliente.exencion_cobro === 'POSTERGADO' || cliente.exencion_cobro === 'SUSPENDIDO') {
    return {
      deuda_acumulada: Number(cliente.deuda_acumulada || 0),
      estado: 'ACTIVO',
      esBecado: false,
      pagoEsteMes: false
    };
  }

  // 2. Socio no pagó el mes actual
  if (!pagoEsteMes) {
    // Si la deuda acumulada guardada era 0, desde el día 1 se imputa la cuota del mes
    const deudaBase = Math.max(Number(cliente.deuda_acumulada || 0), cuotaMes);
    // Del día 1 al 5 está en plazo de pago -> CON_DEUDA; día 6+ -> MOROSO
    const nuevoEstado: EstadoCliente = diaDelMes > 5 ? 'MOROSO' : 'CON_DEUDA';
    return {
      deuda_acumulada: deudaBase,
      estado: nuevoEstado,
      esBecado: false,
      pagoEsteMes: false
    };
  }

  // 3. Socio pagó el mes actual
  const deudaRestante = Number(cliente.deuda_acumulada || 0);
  if (deudaRestante > 0) {
    return {
      deuda_acumulada: deudaRestante,
      estado: 'CON_DEUDA',
      esBecado: false,
      pagoEsteMes: true
    };
  }

  return {
    deuda_acumulada: 0,
    estado: 'ACTIVO',
    esBecado: false,
    pagoEsteMes: true
  };
}

export interface FormatoDeudaVisual {
  textoVisible: string;
  textoTachado: string | null;
  esBecado: boolean;
  labelCompleto: string;
}

/**
 * Genera la representación visual de la deuda para Admin y Socio:
 * Si es becado: '$0 (~$45.000~ - Becado)'.
 * De lo contrario: '$45.000'.
 */
export function formatearDeudaVisual(
  cliente: Pick<Cliente, 'deuda_acumulada' | 'exencion_cobro' | 'deuda_perdonada'>,
  cuotaEstimada: number = 0
): FormatoDeudaVisual {
  const esBecado = cliente.exencion_cobro === 'BECADO' || cliente.exencion_cobro === 'PERDONADO';

  if (esBecado) {
    const montoReal = cliente.deuda_perdonada || cuotaEstimada || 0;
    const montoRealStr = `$${Math.round(montoReal).toLocaleString('es-AR')}`;
    return {
      textoVisible: '$0',
      textoTachado: montoRealStr,
      esBecado: true,
      labelCompleto: `$0 (${montoRealStr} - Becado)`
    };
  }

  const montoActual = cliente.deuda_acumulada || 0;
  const montoStr = `$${Math.round(montoActual).toLocaleString('es-AR')}`;
  return {
    textoVisible: montoStr,
    textoTachado: null,
    esBecado: false,
    labelCompleto: montoStr
  };
}
