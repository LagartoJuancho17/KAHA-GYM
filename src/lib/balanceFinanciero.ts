// src/lib/balanceFinanciero.ts
// Lógica pura de cálculo para el Balance Financiero de KAHA BOX.
// Determinista, sin dependencias de DOM ni React para pruebas unitarias fiables.

import { Pago, Gasto, Cliente, Plan, Profesor, Turno, NovedadProfesor, OrigenGasto } from '../types';
import { estaEnReposo } from './reposo';

export interface DesgloseCaja {
  ingresos: number;
  egresos: number;
  saldoNeto: number;
}

export interface CompensacionSocios {
  baseTotal: number;
  cuotaEquitativa: number;
  debeTransferir: 'JUANCHI' | 'RULO' | 'NINGUNO';
  montoTransferencia: number;
  mensaje: string;
  detalle: string;
}

export interface EstructuraCostoItem {
  categoria: string;
  label: string;
  monto: number;
  porcentaje: number;
  color: string;
}

export interface BalanceMensual {
  mes: string;
  // Ingresos
  totalIngresos: number;
  pagosCount: number;
  ticketPromedio: number;
  // Egresos
  totalEgresos: number;
  gastosCount: number;
  // Cajas individuales
  cajaJuanchi: DesgloseCaja;
  cajaRulo: DesgloseCaja;
  cajaEfectivo: DesgloseCaja;
  // Compensación
  compensacion: CompensacionSocios;
  // Ganancias
  gananciaReal: number;
  margenRealPorcentaje: number;
  // Proyecciones
  deudaPendienteCobro: number;
  sociosDeudoresCount: number;
  liquidacionesPendientes: number;
  gananciaProyectada: number;
  // Salud Financiera
  porcentajeCobrado: number;
  puntoEquilibrioMonto: number;
  puntoEquilibrioSocios: number;
  estructuraCostos: EstructuraCostoItem[];
}

// Días de la semana para cálculo de liquidaciones
const DIA_IDX: Record<string, number> = {
  LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5
};

function diasEnMes(diaSemana: number, yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number);
  if (!year || !month) return 0;
  const lastDay = new Date(year, month, 0).getDate();
  let count = 0;
  const jsDia = diaSemana === 7 ? 0 : diaSemana;
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === jsDia) count++;
  }
  return count;
}

export function calcularCompensacionSocios(
  saldoJuanchi: number,
  saldoRulo: number,
  saldoEfectivo: number,
  opciones?: { incluirEfectivo?: boolean; porcentajeJuanchi?: number }
): CompensacionSocios {
  const incluirEfvo = opciones?.incluirEfectivo ?? false;
  const pctJuanchi = (opciones?.porcentajeJuanchi ?? 50) / 100;
  const pctRulo = 1 - pctJuanchi;

  const baseTotal = saldoJuanchi + saldoRulo + (incluirEfvo ? saldoEfectivo : 0);
  const cuotaJuanchi = Math.round(baseTotal * pctJuanchi);
  const cuotaRulo = baseTotal - cuotaJuanchi;

  // Calculamos la diferencia de Juanchi respecto a lo que le corresponde
  const diferenciaJuanchi = saldoJuanchi - cuotaJuanchi;

  if (diferenciaJuanchi > 0) {
    // Juanchi tiene saldo mayor / absorbió menos gastos -> transfiere a Rulo
    const monto = Math.round(diferenciaJuanchi);
    const detalle = baseTotal < 0
      ? `El mes registra saldo neto deficitario (gastos mayores a cobros). Rulo absorbió $${Math.abs(saldoRulo - saldoJuanchi).toLocaleString('es-AR')} más en egresos netos que Juanchi. Para compensar los costos 50% / 50%, Juanchi transfiere $${monto.toLocaleString('es-AR')} a Rulo.`
      : `Juanchi tiene $${saldoJuanchi.toLocaleString('es-AR')} y Rulo tiene $${saldoRulo.toLocaleString('es-AR')}. Para equilibrar (${Math.round(pctJuanchi * 100)}% / ${Math.round(pctRulo * 100)}%), Juanchi transfiere $${monto.toLocaleString('es-AR')} a Rulo.`;
    return {
      baseTotal,
      cuotaEquitativa: cuotaJuanchi,
      debeTransferir: 'JUANCHI',
      montoTransferencia: monto,
      mensaje: `Juanchi debe transferir $${monto.toLocaleString('es-AR')} a Rulo`,
      detalle
    };
  } else if (diferenciaJuanchi < 0) {
    // Rulo tiene saldo mayor / absorbió menos gastos -> transfiere a Juanchi
    const monto = Math.round(Math.abs(diferenciaJuanchi));
    const detalle = baseTotal < 0
      ? `El mes registra saldo neto deficitario (gastos mayores a cobros). Juanchi absorbió $${Math.abs(saldoJuanchi - saldoRulo).toLocaleString('es-AR')} más en egresos netos que Rulo. Para compensar los costos 50% / 50%, Rulo transfiere $${monto.toLocaleString('es-AR')} a Juanchi.`
      : `Rulo tiene $${saldoRulo.toLocaleString('es-AR')} y Juanchi tiene $${saldoJuanchi.toLocaleString('es-AR')}. Para equilibrar (${Math.round(pctRulo * 100)}% / ${Math.round(pctJuanchi * 100)}%), Rulo transfiere $${monto.toLocaleString('es-AR')} a Juanchi.`;
    return {
      baseTotal,
      cuotaEquitativa: cuotaRulo,
      debeTransferir: 'RULO',
      montoTransferencia: monto,
      mensaje: `Rulo debe transferir $${monto.toLocaleString('es-AR')} a Juanchi`,
      detalle
    };
  }

  return {
    baseTotal,
    cuotaEquitativa: cuotaJuanchi,
    debeTransferir: 'NINGUNO',
    montoTransferencia: 0,
    mensaje: 'Cuentas perfectamente equilibradas',
    detalle: `Ambos socios tienen exactamente su parte correspondiente ($${cuotaJuanchi.toLocaleString('es-AR')} c/u).`
  };
}

export function calcularBalanceMes({
  mes,
  pagos,
  gastos,
  clientes,
  planes,
  profesores,
  turnos,
  novedadesProfesores,
  incluirEfectivoEnCompensacion = false,
  porcentajeJuanchi = 50
}: {
  mes: string;
  pagos: Pago[];
  gastos: Gasto[];
  clientes: Cliente[];
  planes: Plan[];
  profesores: Profesor[];
  turnos: Turno[];
  novedadesProfesores: NovedadProfesor[];
  incluirEfectivoEnCompensacion?: boolean;
  porcentajeJuanchi?: number;
}): BalanceMensual {
  // 1. Filtrar pagos del mes
  const pagosMes = (pagos || []).filter(p => p.mes_correspondiente === mes);
  const totalIngresos = pagosMes.reduce((s, p) => s + (p.monto || 0), 0);
  // Una cuota, no una fila. Desde que un cobro se puede partir en varios medios
  // (mitad efectivo, mitad transferencia) la misma cuota son DOS filas de pago,
  // y contar filas inflaba el numero de cuotas y partia al medio el ticket
  // promedio, que ademas alimenta el punto de equilibrio y el texto del WhatsApp.
  // Una cuota es un par (socio, mes): asi se cuenta igual antes y despues.
  const pagosCount = new Set(
    pagosMes.map(p => `${p.cliente_id}::${p.mes_correspondiente}`)
  ).size;
  const ticketPromedio = pagosCount > 0 ? Math.round(totalIngresos / pagosCount) : 0;

  // Ingresos por destino
  const ingresosJuanchi = pagosMes
    .filter(p => p.destino_transferencia === 'JUANCHI' || !p.destino_transferencia)
    .reduce((s, p) => s + (p.monto || 0), 0);
  const ingresosRulo = pagosMes
    .filter(p => p.destino_transferencia === 'RULO')
    .reduce((s, p) => s + (p.monto || 0), 0);
  const ingresosEfectivo = pagosMes
    .filter(p => p.destino_transferencia === 'EFECTIVO')
    .reduce((s, p) => s + (p.monto || 0), 0);

  // 2. Filtrar gastos del mes
  const gastosMes = (gastos || []).filter(g => (g.fecha || '').startsWith(mes));
  const totalEgresos = gastosMes.reduce((s, g) => s + (g.monto || 0), 0);
  const gastosCount = gastosMes.length;

  // Egresos por pagador
  const egresosJuanchi = gastosMes
    .filter(g => g.efectuado_por === 'JUANCHI_TRANSFERENCIA')
    .reduce((s, g) => s + (g.monto || 0), 0);
  const egresosRulo = gastosMes
    .filter(g => g.efectuado_por === 'RULO_TRANSFERENCIA')
    .reduce((s, g) => s + (g.monto || 0), 0);
  const egresosEfectivo = gastosMes
    .filter(g => (g.efectuado_por || 'EFECTIVO_CAJA') === 'EFECTIVO_CAJA')
    .reduce((s, g) => s + (g.monto || 0), 0);

  // 3. Desglose de Cajas
  const cajaJuanchi: DesgloseCaja = {
    ingresos: ingresosJuanchi,
    egresos: egresosJuanchi,
    saldoNeto: ingresosJuanchi - egresosJuanchi
  };

  const cajaRulo: DesgloseCaja = {
    ingresos: ingresosRulo,
    egresos: egresosRulo,
    saldoNeto: ingresosRulo - egresosRulo
  };

  const cajaEfectivo: DesgloseCaja = {
    ingresos: ingresosEfectivo,
    egresos: egresosEfectivo,
    saldoNeto: ingresosEfectivo - egresosEfectivo
  };

  // 4. Compensación de socios
  const compensacion = calcularCompensacionSocios(
    cajaJuanchi.saldoNeto,
    cajaRulo.saldoNeto,
    cajaEfectivo.saldoNeto,
    { incluirEfectivo: incluirEfectivoEnCompensacion, porcentajeJuanchi }
  );

  // 5. Ganancia Real y Margen
  const gananciaReal = totalIngresos - totalEgresos;
  const margenRealPorcentaje = totalIngresos > 0 ? Math.round((gananciaReal / totalIngresos) * 100) : 0;

  // 6. Deuda Pendiente de Cobro de Clientes Activos
  const clientesActivos = (clientes || []).filter(c => c.activo && !estaEnReposo(c));
  let deudaPendienteCobro = 0;
  let sociosDeudoresCount = 0;

  clientesActivos.forEach(c => {
    // Si fue creado después del mes analizado, no pertenecía a este período
    if (c.creado_at && c.creado_at.slice(0, 7) > mes) return;

    // Si ya tiene pago en este mes, no debe cuota de este mes
    const pagoEsteMes = pagosMes.some(p => p.cliente_id === c.id);
    if (pagoEsteMes || c.exencion_cobro === 'BECADO' || c.exencion_cobro === 'PERDONADO') return;

    const plan = (planes || []).find(p => p.id === c.plan_id);
    const montoCuota = c.precio_personalizado ?? plan?.precio ?? 0;
    // Si la cuota del socio es mayor a 0, la deuda del mes analizado corresponde al valor de dicha cuota.
    // Si no tiene plan o precio asignado, pero registra deuda acumulada, se toma la deuda acumulada.
    const deuda = montoCuota > 0 ? montoCuota : (c.deuda_acumulada && c.deuda_acumulada > 0 ? c.deuda_acumulada : 0);

    if (deuda > 0) {
      deudaPendienteCobro += deuda;
      sociosDeudoresCount++;
    }
  });

  // 7. Liquidaciones pendientes de profesores
  let liquidacionesPendientes = 0;
  (profesores || []).filter(p => p.activo).forEach(prof => {
    const yaLiquidado = gastosMes.some(g =>
      g.categoria === 'PROFESORES' && g.concepto.toLowerCase().includes(prof.nombre.toLowerCase())
    );
    if (!yaLiquidado) {
      const turnosProf = (turnos || []).filter(t => 
        (t.profesor && t.profesor.trim().toLowerCase() === prof.nombre.trim().toLowerCase()) || 
        t.profesor === prof.id
      );
      let clasesTeoricas = 0;
      turnosProf.forEach(t => {
        const diaIdx = DIA_IDX[t.dia] || 0;
        if (diaIdx > 0) clasesTeoricas += diasEnMes(diaIdx, mes);
      });
      const ausencias = (novedadesProfesores || []).filter(n =>
        n.profesor_id === prof.id && n.tipo === 'AUSENCIA' && n.fecha.startsWith(mes)
      ).length;
      const reemplazos = (novedadesProfesores || []).filter(n =>
        n.reemplazo_profesor_id === prof.id && n.tipo === 'REEMPLAZO' && n.fecha.startsWith(mes)
      ).length;
      const clasesNetas = Math.max(0, clasesTeoricas - ausencias + reemplazos);
      liquidacionesPendientes += clasesNetas * (prof.valor_hora || 0);
    }
  });

  // Ganancia Proyectada
  const gananciaProyectada = (totalIngresos + deudaPendienteCobro) - (totalEgresos + liquidacionesPendientes);

  // 8. Efectividad de cobranza
  const facturacionTotalEsperada = totalIngresos + deudaPendienteCobro;
  const porcentajeCobrado = facturacionTotalEsperada > 0
    ? Math.round((totalIngresos / facturacionTotalEsperada) * 100)
    : 100;

  // 9. Estructura de Costos
  const categoriasTotales: Record<string, number> = {
    ALQUILER: 0,
    SERVICIOS: 0,
    INSUMOS: 0,
    PROFESORES: 0,
    OTROS: 0
  };

  gastosMes.forEach(g => {
    const cat = g.categoria || 'OTROS';
    categoriasTotales[cat] = (categoriasTotales[cat] || 0) + g.monto;
  });

  const catMeta: Record<string, { label: string; color: string }> = {
    ALQUILER: { label: 'Alquiler', color: '#8b5cf6' },
    SERVICIOS: { label: 'Servicios (Luz/Gas/Net)', color: '#0284c7' },
    PROFESORES: { label: 'Profesores', color: '#10b981' },
    INSUMOS: { label: 'Insumos & Equipamiento', color: '#f59e0b' },
    OTROS: { label: 'Otros Gastos', color: '#71717a' }
  };

  const estructuraCostos: EstructuraCostoItem[] = Object.entries(categoriasTotales)
    .filter(([_, m]) => m > 0)
    .map(([cat, monto]) => ({
      categoria: cat,
      label: catMeta[cat]?.label || cat,
      monto,
      porcentaje: totalEgresos > 0 ? Math.round((monto / totalEgresos) * 100) : 0,
      color: catMeta[cat]?.color || '#71717a'
    }))
    .sort((a, b) => b.monto - a.monto);

  // 10. Punto de Equilibrio (Break-Even)
  // Costos fijos mínimos (Alquiler + Servicios + Profesores totales)
  const costosFijos = categoriasTotales['ALQUILER'] + categoriasTotales['SERVICIOS'] + categoriasTotales['PROFESORES'] + liquidacionesPendientes;
  const precioPlanPromedio = ticketPromedio > 0 ? ticketPromedio : 25000;
  const puntoEquilibrioSocios = precioPlanPromedio > 0 ? Math.ceil(costosFijos / precioPlanPromedio) : 0;

  return {
    mes,
    totalIngresos,
    pagosCount,
    ticketPromedio,
    totalEgresos,
    gastosCount,
    cajaJuanchi,
    cajaRulo,
    cajaEfectivo,
    compensacion,
    gananciaReal,
    margenRealPorcentaje,
    deudaPendienteCobro,
    sociosDeudoresCount,
    liquidacionesPendientes,
    gananciaProyectada,
    porcentajeCobrado,
    puntoEquilibrioMonto: costosFijos,
    puntoEquilibrioSocios,
    estructuraCostos
  };
}

/** Genera texto limpio con formato WhatsApp para copiar y enviar a los socios */
export function generarMensajeWhatsAppBalance(balance: BalanceMensual, nombreMes: string): string {
  const compensacionEmoji = balance.compensacion.debeTransferir === 'NINGUNO' ? '🤝' : '⚖️';

  return `📊 *BALANCE FINANCIERO — KAHA BOX*
📅 *Período:* ${nombreMes}
━━━━━━━━━━━━━━━━━━━━━
💰 *Ingresos Cobrados:* $${balance.totalIngresos.toLocaleString('es-AR')} (${balance.pagosCount} cuotas)
📉 *Egresos Pagados:* $${balance.totalEgresos.toLocaleString('es-AR')} (${balance.gastosCount} gastos)
💵 *GANANCIA NETA REAL:* $${balance.gananciaReal.toLocaleString('es-AR')} (${balance.margenRealPorcentaje}% margen)

🏛️ *ESTADO DE CAJAS:*
🟣 *Caja Juanchi:* $${balance.cajaJuanchi.saldoNeto.toLocaleString('es-AR')} (Cobró $${balance.cajaJuanchi.ingresos.toLocaleString('es-AR')} / Gastó $${balance.cajaJuanchi.egresos.toLocaleString('es-AR')})
🟡 *Caja Rulo:* $${balance.cajaRulo.saldoNeto.toLocaleString('es-AR')} (Cobró $${balance.cajaRulo.ingresos.toLocaleString('es-AR')} / Gastó $${balance.cajaRulo.egresos.toLocaleString('es-AR')})
💵 *Caja Efectivo:* $${balance.cajaEfectivo.saldoNeto.toLocaleString('es-AR')} (Cobró $${balance.cajaEfectivo.ingresos.toLocaleString('es-AR')} / Gastó $${balance.cajaEfectivo.egresos.toLocaleString('es-AR')})

${compensacionEmoji} *COMPENSACIÓN SOCIOS (50/50):*
👉 *${balance.compensacion.mensaje}*
ℹ️ _${balance.compensacion.detalle}_

━━━━━━━━━━━━━━━━━━━━━
⏳ *Pendiente de Cobro:* $${balance.deudaPendienteCobro.toLocaleString('es-AR')} (${balance.sociosDeudoresCount} alumnos)
🎯 *Ganancia Proyectada al Cierre:* $${balance.gananciaProyectada.toLocaleString('es-AR')}
📈 *Efectividad Cobranza:* ${balance.porcentajeCobrado}% cobrado`.trim();
}

export interface OpcionesInformeIA {
  balance: BalanceMensual;
  nombreMes: string;
  pagosMes?: Pago[];
  gastosMes?: Gasto[];
  totalSociosActivos?: number;
  comparativaMesAnterior?: {
    variacionGanancia: number;
    variacionPorcentual: number;
  };
}

/** Genera un informe financiero y operativo exhaustivo optimizado como prompt para Inteligencia Artificial */
export function generarInformeAnalisisIA({
  balance,
  nombreMes,
  pagosMes = [],
  gastosMes = [],
  totalSociosActivos = 0,
  comparativaMesAnterior
}: OpcionesInformeIA): string {
  // Desglose de ingresos entre alumnos y pagadores externos
  const pagosExternos = pagosMes.filter(p => p.es_externo || (p.cliente_id && p.cliente_id.startsWith('ext-')));
  const pagosAlumnos = pagosMes.filter(p => !p.es_externo && (!p.cliente_id || !p.cliente_id.startsWith('ext-')));

  const montoExternos = pagosExternos.reduce((s, p) => s + (p.monto || 0), 0);
  const montoAlumnos = pagosAlumnos.reduce((s, p) => s + (p.monto || 0), 0);

  // Desglose por medio de pago
  const montoTransferencia = pagosMes
    .filter(p => p.medio_pago === 'TRANSFERENCIA')
    .reduce((s, p) => s + (p.monto || 0), 0);
  const montoEfectivo = pagosMes
    .filter(p => p.medio_pago === 'EFECTIVO')
    .reduce((s, p) => s + (p.monto || 0), 0);

  // Detalle de pagadores externos
  let detalleExternos = '';
  if (pagosExternos.length > 0) {
    detalleExternos = pagosExternos
      .map(p => `  - ${p.cliente_nombre_completo || 'Tercero'}${p.concepto ? ` (${p.concepto})` : ''}: $${(p.monto || 0).toLocaleString('es-AR')}`)
      .join('\n');
  } else {
    detalleExternos = '  - Sin ingresos externos registrados en el período.';
  }

  // Top gastos del mes
  const topGastos = [...gastosMes]
    .sort((a, b) => (b.monto || 0) - (a.monto || 0))
    .slice(0, 7)
    .map(g => `  - [${g.categoria || 'OTROS'}] ${g.concepto}: $${(g.monto || 0).toLocaleString('es-AR')}`)
    .join('\n');

  // Variación respecto al mes anterior
  const textoComparativa = comparativaMesAnterior
    ? `- **Variación vs Mes Anterior:** ${comparativaMesAnterior.variacionGanancia >= 0 ? '+' : ''}$${comparativaMesAnterior.variacionGanancia.toLocaleString('es-AR')} (${comparativaMesAnterior.variacionPorcentual >= 0 ? '+' : ''}${comparativaMesAnterior.variacionPorcentual}% en ganancia)`
    : '- **Variación vs Mes Anterior:** Sin datos previos para comparar';

  const superavitBreakEven = balance.pagosCount - balance.puntoEquilibrioSocios;

  return `# 📊 INFORME FINANCIERO Y OPERATIVO — KAHA BOX
**Período:** ${nombreMes} (${balance.mes})
**Gimnasio / Box:** KAHA BOX (Entrenamiento Funcional, Argentina)

---
> 🤖 **INSTRUCCIÓN PARA LA IA:**
> Actuá como un consultor financiero y estratega de negocios senior con amplia experiencia en gimnasios y boxes de entrenamiento funcional en Argentina.
> Analizá minuciosamente las métricas reales provistas abajo y elaborá:
> 1. **Diagnóstico Ejecutivo:** Salud de la caja, rentabilidad real y sostenibilidad del negocio.
> 2. **Detección de Fugas e Ineficiencias:** Gastos desmedidos, riesgos de concentración o fallas en el flujo de cobranzas.
> 3. **Análisis de Punto de Equilibrio y Precios:** ¿El ticket promedio ($${balance.ticketPromedio.toLocaleString('es-AR')}) cubre la estructura ante la inflación? ¿Es viable aumentar cuotas o sumar más alquileres a profesionales?
> 4. **Plan Táctico en 3 Pasos:** Las 3 medidas prioritarias que los socios administradores (Juanchi y Rulo) deben ejecutar el próximo mes.

---
### 1. RESUMEN GENERAL Y RENTABILIDAD
- **Ingresos Cobrados Totales:** $${balance.totalIngresos.toLocaleString('es-AR')}
- **Egresos Totales Pagados:** $${balance.totalEgresos.toLocaleString('es-AR')}
- **Ganancia Neta Real (Caja):** $${balance.gananciaReal.toLocaleString('es-AR')}
- **Margen Neto Operativo:** ${balance.margenRealPorcentaje}%
${textoComparativa}
- **Ticket Promedio por Cuota:** $${balance.ticketPromedio.toLocaleString('es-AR')}
- **Volumen de Cuotas Cobradas:** ${balance.pagosCount} cuotas

---
### 2. COMPOSICIÓN DE INGRESOS
- **Cuotas de Alumnos del Gimnasio:** $${montoAlumnos.toLocaleString('es-AR')} (${pagosAlumnos.length} transacciones)
- **Ingresos de Pagadores Externos / Alquileres:** $${montoExternos.toLocaleString('es-AR')} (${pagosExternos.length} transacciones)
*Detalle de ingresos externos:*
${detalleExternos}
- **Vía de Cobro:**
  - Transferencias: $${montoTransferencia.toLocaleString('es-AR')} (${balance.totalIngresos > 0 ? Math.round((montoTransferencia / balance.totalIngresos) * 100) : 0}%)
  - Efectivo: $${montoEfectivo.toLocaleString('es-AR')} (${balance.totalIngresos > 0 ? Math.round((montoEfectivo / balance.totalIngresos) * 100) : 0}%)

---
### 3. ESTADO DE CAJAS Y CUENTAS BANCARIAS
- **Cuenta Juanchi:** Cobró $${balance.cajaJuanchi.ingresos.toLocaleString('es-AR')} | Pagó $${balance.cajaJuanchi.egresos.toLocaleString('es-AR')} | Saldo Neto: $${balance.cajaJuanchi.saldoNeto.toLocaleString('es-AR')}
- **Cuenta Rulo:** Cobró $${balance.cajaRulo.ingresos.toLocaleString('es-AR')} | Pagó $${balance.cajaRulo.egresos.toLocaleString('es-AR')} | Saldo Neto: $${balance.cajaRulo.saldoNeto.toLocaleString('es-AR')}
- **Caja Efectivo Local:** Cobró $${balance.cajaEfectivo.ingresos.toLocaleString('es-AR')} | Pagó $${balance.cajaEfectivo.egresos.toLocaleString('es-AR')} | Saldo Neto: $${balance.cajaEfectivo.saldoNeto.toLocaleString('es-AR')}
- **Compensación entre Socios (50/50):**
  - Situación: ${balance.compensacion.mensaje}
  - Detalle: ${balance.compensacion.detalle}

---
### 4. ESTRUCTURA DE COSTOS Y GASTOS OPERATIVOS
- **Total de Gastos:** $${balance.totalEgresos.toLocaleString('es-AR')} (${balance.gastosCount} registros)
- **Distribución por Categorías:**
${balance.estructuraCostos.map(c => `  - **${c.label}:** $${c.monto.toLocaleString('es-AR')} (${c.porcentaje}% del gasto total)`).join('\n')}
${topGastos ? `*Mayores Egresos Registrados en el Período:*\n${topGastos}` : ''}

---
### 5. PUNTO DE EQUILIBRIO (BREAK-EVEN)
- **Costos Fijos Operativos Base:** $${balance.puntoEquilibrioMonto.toLocaleString('es-AR')} (Alquiler + Servicios + Honorarios docentes)
- **Cuotas Mínimas Requeridas:** ${balance.puntoEquilibrioSocios} alumnos
- **Cuotas Cobradas Reales:** ${balance.pagosCount} alumnos
- **Margen de Seguridad:** ${superavitBreakEven >= 0 ? `+${superavitBreakEven} cuotas sobre el punto de equilibrio (Superávit)` : `${superavitBreakEven} cuotas por debajo del punto de equilibrio (Déficit)`}

---
### 6. CARTERA DE SOCIOS, MOROSIDAD Y PROYECCIÓN
${totalSociosActivos > 0 ? `- **Alumnos Activos Registrados:** ${totalSociosActivos}` : ''}
- **Efectividad de Cobranza:** ${balance.porcentajeCobrado}% cobrado del total facturable
- **Deuda Pendiente de Cobro:** $${balance.deudaPendienteCobro.toLocaleString('es-AR')}
- **Alumnos Deudores / Sin Abonar:** ${balance.sociosDeudoresCount} personas
- **Liquidaciones Docentes Estimadas Pendientes:** $${balance.liquidacionesPendientes.toLocaleString('es-AR')}
- **Ganancia Neta Proyectada al Cierre:** $${balance.gananciaProyectada.toLocaleString('es-AR')}
`.trim();
}
