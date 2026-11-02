// src/lib/reporteCierreMes.ts
// Lógica pura de cálculo y formateo para el reporte administrativo de cierre de mes en KAHA GYM.
// Consolida:
// 1. Socios a los que se les perdonó la deuda (exención o becas).
// 2. Socios pausados (en reposo de cuota y turnera liberada).
// 3. Socios con turnos fijos asignados que vinieron y no registraron pago del mes cerrado.

import { Cliente, Plan, AuditLog } from '../types';

export interface SocioPerdonado {
  id: string;
  nombre: string;
  monto: number;
  tipo: 'EXENCION' | 'BECADO';
  fecha?: string;
}

export interface SocioPausadoInfo {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  mesPausa: string;
  turnosFijos: string[];
}

export interface SocioSinPagarInfo {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  planNombre: string;
  cuota: number;
  ultimoMesPagado: string;
  turnosFijos: string[];
  exencionCobro?: string;
}

/**
 * Devuelve el mes cerrado a liquidar (formato YYYY-MM).
 * Por ejemplo, en los primeros días del mes (ej. 2 de noviembre), el mes cerrado es octubre (2026-10).
 */
export function obtenerMesCerrado(fechaRef?: Date | string): string {
  const d = fechaRef ? new Date(fechaRef) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 a 11. Para noviembre (10), restamos 1 y da octubre (9 => 2026-10).
  
  if (month === 0) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Devuelve el nombre en español del mes cerrado (ej: "Octubre 2026").
 */
export function nombreMesCerrado(mesKey: string): string {
  const [yStr, mStr] = mesKey.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m) return mesKey;
  const d = new Date(y, m - 1, 15);
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

/**
 * Filtra los socios con deuda perdonada durante el mes indicado según los logs de auditoría.
 */
export function obtenerSociosDeudaPerdonada(logs: AuditLog[], mesCerrado: string): SocioPerdonado[] {
  if (!logs || !Array.isArray(logs)) return [];

  const mapPerdonados = new Map<string, SocioPerdonado>();

  logs.forEach(log => {
    const accion = log.accion || '';
    const esPerdon = accion === 'DEUDA_PERDONADA' || accion === 'DEUDA_PERDONADA_BECADO';
    if (!esPerdon) return;

    const fechaLog = log.creado_at || '';
    const mesLog = fechaLog.slice(0, 7);
    const mesDetalle = log.detalles?.mes || '';

    // Coincide si el mes del log o el mes explícito del detalle es el mes buscado
    if (mesLog === mesCerrado || mesDetalle === mesCerrado) {
      const clienteId = log.detalles?.cliente_id || log.detalles?.id || log.id;
      const nombre = log.detalles?.cliente_nombre || log.detalles?.nombre || 'Socio';
      const monto = Number(log.detalles?.monto_perdonado ?? 0);
      const tipo: 'EXENCION' | 'BECADO' = accion === 'DEUDA_PERDONADA_BECADO' ? 'BECADO' : 'EXENCION';

      // Conservamos la entrada más reciente o de mayor monto
      if (!mapPerdonados.has(clienteId) || monto > 0) {
        mapPerdonados.set(clienteId, {
          id: clienteId,
          nombre,
          monto,
          tipo,
          fecha: fechaLog.slice(0, 10)
        });
      }
    }
  });

  return Array.from(mapPerdonados.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Filtra los socios que estuvieron en pausa durante el mes indicado.
 */
export function obtenerSociosPausados(clientes: Cliente[], mesCerrado: string): SocioPausadoInfo[] {
  if (!clientes || !Array.isArray(clientes)) return [];

  return clientes
    .filter(c => {
      if (c.activo === false) return false;
      const tieneNotaPausa = c.nota_plan_personalizado && c.nota_plan_personalizado.includes(`PAUSA:${mesCerrado}`);
      const esSuspendido = c.exencion_cobro === 'SUSPENDIDO';
      const tieneReposo = c.reposo != null;
      return tieneNotaPausa || (esSuspendido && c.ultimo_mes_pagado && c.ultimo_mes_pagado <= mesCerrado) || tieneReposo;
    })
    .map(c => ({
      id: c.id,
      nombre: `${c.nombre} ${c.apellido}`.trim(),
      email: c.email || '',
      telefono: c.telefono || '',
      mesPausa: mesCerrado,
      turnosFijos: c.turnos_fijos || []
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Filtra los socios activos con turnos fijos asignados que vinieron y no registraron pago del mes cerrado.
 * Excluye a los socios en pausa.
 */
export function obtenerSociosSinPagarConTurnos(
  clientes: Cliente[], 
  mesCerrado: string, 
  planes: Plan[] = []
): SocioSinPagarInfo[] {
  if (!clientes || !Array.isArray(clientes)) return [];

  return clientes
    .filter(c => {
      if (!c.activo) return false;
      const nombreCompleto = `${c.nombre} ${c.apellido}`.toLowerCase();
      if (nombreCompleto.includes('invitado') || nombreCompleto.includes('prueba')) return false;

      // Debe tener turnos fijos asignados
      const tieneTurnos = c.turnos_fijos && c.turnos_fijos.length > 0;
      if (!tieneTurnos) return false;

      // No debe estar en pausa durante este mes cerrado
      const enPausa = c.exencion_cobro === 'SUSPENDIDO' || (c.nota_plan_personalizado && c.nota_plan_personalizado.includes(`PAUSA:${mesCerrado}`));
      if (enPausa) return false;

      // No debe haber pagado el mes cerrado
      const noPagoMes = !c.ultimo_mes_pagado || c.ultimo_mes_pagado < mesCerrado;
      return noPagoMes;
    })
    .map(c => {
      const pl = planes.find(p => p.id === c.plan_id);
      const cuota = c.precio_personalizado != null ? Number(c.precio_personalizado) : (pl ? Number(pl.precio) : 0);
      return {
        id: c.id,
        nombre: `${c.nombre} ${c.apellido}`.trim(),
        email: c.email || '',
        telefono: c.telefono || '',
        planNombre: pl?.nombre || 'General',
        cuota,
        ultimoMesPagado: c.ultimo_mes_pagado || 'Sin pagos',
        turnosFijos: c.turnos_fijos || [],
        exencionCobro: c.exencion_cobro
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/**
 * Genera el cuerpo de texto plano para enviar por mail a los administradores.
 */
export function generarReporteCierreMesTexto({
  mesCerrado,
  deudasPerdonadas,
  sociosPausados,
  sociosSinPagar
}: {
  mesCerrado: string;
  deudasPerdonadas: SocioPerdonado[];
  sociosPausados: SocioPausadoInfo[];
  sociosSinPagar: SocioSinPagarInfo[];
}): string {
  const nombreMes = nombreMesCerrado(mesCerrado);
  const totalPerdonado = deudasPerdonadas.reduce((acc, s) => acc + s.monto, 0);
  const totalSinPagar = sociosSinPagar.reduce((acc, s) => acc + s.cuota, 0);

  const lineas: string[] = [
    `Hola Administradores de KAHA GYM,`,
    ``,
    `Les acercamos el Resumen Ejecutivo de Cierre correspondiente al mes finalizado de ${nombreMes}.`,
    `Este reporte pasa en limpio las 3 listas clave para comenzar el nuevo mes con las cuentas transparentes:`,
    ``,
    `═══════════════════════════════════════════════════`,
    `📊 RESUMEN GENERAL — ${nombreMes.toUpperCase()}`,
    `═══════════════════════════════════════════════════`,
    `• Socios con deuda perdonada / becas: ${deudasPerdonadas.length} (Total: $${totalPerdonado.toLocaleString('es-AR')})`,
    `• Socios con membresía pausada: ${sociosPausados.length}`,
    `• Socios con turnos fijos sin registrar pago: ${sociosSinPagar.length} (Total estimado: $${totalSinPagar.toLocaleString('es-AR')})`,
    ``,
    `───────────────────────────────────────────────────`,
    `1. 💚 SOCIOS A LOS QUE SE LES PERDONÓ LA DEUDA (${deudasPerdonadas.length})`,
    `───────────────────────────────────────────────────`
  ];

  if (deudasPerdonadas.length === 0) {
    lineas.push(`No se registraron exenciones ni deudas perdonadas en ${nombreMes}.`);
  } else {
    deudasPerdonadas.forEach((s, idx) => {
      const tipoStr = s.tipo === 'BECADO' ? '[Beca/Convenio]' : '[Exención]';
      const montoStr = s.monto > 0 ? `$${s.monto.toLocaleString('es-AR')}` : 'Sin costo';
      lineas.push(`${idx + 1}. ${s.nombre} — ${montoStr} ${tipoStr}`);
    });
  }

  lineas.push(
    ``,
    `───────────────────────────────────────────────────`,
    `2. ⏸️ SOCIOS EN PAUSA / REPOSO (${sociosPausados.length})`,
    `───────────────────────────────────────────────────`
  );

  if (sociosPausados.length === 0) {
    lineas.push(`No hubo socios en pausa durante ${nombreMes}.`);
  } else {
    sociosPausados.forEach((s, idx) => {
      const turnosStr = s.turnosFijos.length > 0 ? s.turnosFijos.join(', ') : 'Sin turnos asignados';
      lineas.push(
        `${idx + 1}. ${s.nombre} | Tel: ${s.telefono || 'Sin teléfono'}`,
        `   Turnos en Matriz: ${turnosStr}`
      );
    });
  }

  lineas.push(
    ``,
    `───────────────────────────────────────────────────`,
    `3. ⚠️ SOCIOS CON TURNOS FIJOS SIN REGISTRAR PAGO (${sociosSinPagar.length})`,
    `───────────────────────────────────────────────────`
  );

  if (sociosSinPagar.length === 0) {
    lineas.push(`¡Excelente! Todos los socios con turnos fijos registraron su pago.`);
  } else {
    sociosSinPagar.forEach((s, idx) => {
      const turnosStr = s.turnosFijos.join(', ');
      const notaEx = s.exencionCobro === 'POSTERGADO' ? ' [Tenía prórroga de 1 sem]' : '';
      lineas.push(
        `${idx + 1}. ${s.nombre} — Plan: ${s.planNombre} ($${s.cuota.toLocaleString('es-AR')})${notaEx}`,
        `   Último mes abonado: ${s.ultimoMesPagado} | Turnos: ${turnosStr}`,
        `   Email: ${s.email} | Tel: ${s.telefono || 'Sin teléfono'}`
      );
    });
  }

  lineas.push(
    ``,
    `───────────────────────────────────────────────────`,
    `💡 Acciones sugeridas:`,
    `• A los socios del grupo 3 se les puede solicitar el reenvío de comprobante si pagaron por medios digitales o consultar si requieren cobertura este mes.`,
    `• Para revisar o modificar turnos y estados, ingresen al Panel de Control de KAHA GYM.`,
    ``,
    `Equipo de Gestión KAHA GYM`
  );

  return lineas.join('\n');
}

/**
 * Genera el template HTML enriquecido para envío directo por correo electrónico.
 */
export function generarReporteCierreMesHtml({
  mesCerrado,
  deudasPerdonadas,
  sociosPausados,
  sociosSinPagar
}: {
  mesCerrado: string;
  deudasPerdonadas: SocioPerdonado[];
  sociosPausados: SocioPausadoInfo[];
  sociosSinPagar: SocioSinPagarInfo[];
}): string {
  const nombreMes = nombreMesCerrado(mesCerrado);
  const totalPerdonado = deudasPerdonadas.reduce((acc, s) => acc + s.monto, 0);
  const totalSinPagar = sociosSinPagar.reduce((acc, s) => acc + s.cuota, 0);

  const filasPerdonados = deudasPerdonadas.map((s, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb; font-size: 13px;">
      <td style="padding: 8px 10px; font-weight: 600; color: #111827;">${idx + 1}. ${s.nombre}</td>
      <td style="padding: 8px 10px; color: #047857; font-weight: bold; font-family: monospace;">$${s.monto.toLocaleString('es-AR')}</td>
      <td style="padding: 8px 10px; color: #4b5563; font-size: 12px;">${s.tipo === 'BECADO' ? 'Beca / Convenio' : 'Exención directa'}</td>
    </tr>
  `).join('');

  const filasPausados = sociosPausados.map((s, idx) => `
    <tr style="border-bottom: 1px solid #e5e7eb; font-size: 13px;">
      <td style="padding: 8px 10px; font-weight: 600; color: #111827;">${idx + 1}. ${s.nombre}</td>
      <td style="padding: 8px 10px; color: #4b5563;">${s.telefono || '-'}<br><span style="font-size: 11px; color: #9ca3af;">${s.email}</span></td>
      <td style="padding: 8px 10px; color: #374151; font-size: 12px;">${s.turnosFijos.join(', ') || 'Sin turnos'}</td>
    </tr>
  `).join('');

  const filasSinPagar = sociosSinPagar.map((s, idx) => `
    <tr style="border-bottom: 1px solid #fee2e2; font-size: 13px; background-color: #fffaf0;">
      <td style="padding: 8px 10px; font-weight: 600; color: #111827;">
        ${idx + 1}. ${s.nombre}
        ${s.exencionCobro === 'POSTERGADO' ? '<br><span style="font-size: 10px; background-color: #fef08a; color: #854d0e; padding: 2px 6px; border-radius: 4px; font-weight: bold;">Tenía prórroga 1 sem</span>' : ''}
      </td>
      <td style="padding: 8px 10px; color: #b91c1c; font-weight: bold; font-family: monospace;">$${s.cuota.toLocaleString('es-AR')}<br><span style="font-size: 11px; color: #6b7280; font-weight: normal;">${s.planNombre}</span></td>
      <td style="padding: 8px 10px; color: #374151; font-size: 12px;">${s.turnosFijos.join(', ')}</td>
      <td style="padding: 8px 10px; color: #4b5563; font-size: 11px;">${s.email}<br>${s.telefono || ''}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; padding: 24px; color: #1f2937; line-height: 1.5; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #10b981; padding-bottom: 16px;">
        <span style="display: inline-block; background-color: #ecfdf5; color: #047857; font-size: 11px; font-weight: bold; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; margin-bottom: 8px; border: 1px solid #a7f3d0;">
          KAHA GYM · ADMINISTRACIÓN
        </span>
        <h1 style="color: #064e3b; margin: 0; font-size: 22px; font-weight: 800;">Resumen Ejecutivo de Cierre: ${nombreMes}</h1>
        <p style="color: #6b7280; font-size: 13px; margin: 6px 0 0 0;">Reporte mensual consolidado de deudas perdonadas, socios en pausa y turnos fijos impagos</p>
      </div>

      <!-- TARJETAS DE TOTALES -->
      <div style="display: flex; gap: 12px; margin-bottom: 24px;">
        <div style="flex: 1; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #166534; font-weight: bold; text-transform: uppercase;">Perdonados</div>
          <div style="font-size: 20px; font-weight: 800; color: #15803d; margin: 4px 0;">${deudasPerdonadas.length}</div>
          <div style="font-size: 11px; color: #166534;">$${totalPerdonado.toLocaleString('es-AR')}</div>
        </div>
        <div style="flex: 1; background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #854d0e; font-weight: bold; text-transform: uppercase;">En Pausa</div>
          <div style="font-size: 20px; font-weight: 800; color: #a16207; margin: 4px 0;">${sociosPausados.length}</div>
          <div style="font-size: 11px; color: #854d0e;">Cupos liberados</div>
        </div>
        <div style="flex: 1; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 12px; text-align: center;">
          <div style="font-size: 11px; color: #991b1b; font-weight: bold; text-transform: uppercase;">Sin Abonar</div>
          <div style="font-size: 20px; font-weight: 800; color: #dc2626; margin: 4px 0;">${sociosSinPagar.length}</div>
          <div style="font-size: 11px; color: #991b1b;">$${totalSinPagar.toLocaleString('es-AR')}</div>
        </div>
      </div>

      <!-- SECCIÓN 1: PERDONADOS -->
      <div style="margin-bottom: 24px;">
        <h3 style="color: #065f46; font-size: 15px; margin: 0 0 10px 0; border-bottom: 1px solid #d1fae5; padding-bottom: 6px;">
          1. 💚 Socios con Deuda Perdonada / Becados (${deudasPerdonadas.length})
        </h3>
        ${deudasPerdonadas.length === 0 ? '<p style="font-size: 13px; color: #6b7280; font-style: italic;">No se registraron exenciones en este período.</p>' : `
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #f0fdf4; font-size: 11px; color: #166534; text-transform: uppercase;">
                <th style="padding: 6px 10px;">Socio</th>
                <th style="padding: 6px 10px;">Monto</th>
                <th style="padding: 6px 10px;">Concepto</th>
              </tr>
            </thead>
            <tbody>${filasPerdonados}</tbody>
          </table>
        `}
      </div>

      <!-- SECCIÓN 2: PAUSADOS -->
      <div style="margin-bottom: 24px;">
        <h3 style="color: #854d0e; font-size: 15px; margin: 0 0 10px 0; border-bottom: 1px solid #fef08a; padding-bottom: 6px;">
          2. ⏸️ Socios en Pausa / Reposo (${sociosPausados.length})
        </h3>
        ${sociosPausados.length === 0 ? '<p style="font-size: 13px; color: #6b7280; font-style: italic;">No hubo socios en pausa durante este mes.</p>' : `
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #fefce8; font-size: 11px; color: #854d0e; text-transform: uppercase;">
                <th style="padding: 6px 10px;">Socio</th>
                <th style="padding: 6px 10px;">Contacto</th>
                <th style="padding: 6px 10px;">Turnos en Matriz</th>
              </tr>
            </thead>
            <tbody>${filasPausados}</tbody>
          </table>
        `}
      </div>

      <!-- SECCIÓN 3: SIN PAGAR CON TURNOS -->
      <div style="margin-bottom: 24px;">
        <h3 style="color: #991b1b; font-size: 15px; margin: 0 0 10px 0; border-bottom: 1px solid #fecaca; padding-bottom: 6px;">
          3. ⚠️ Socios con Turnos Fijos sin Registrar Pago (${sociosSinPagar.length})
        </h3>
        ${sociosSinPagar.length === 0 ? '<p style="font-size: 13px; color: #166534; font-weight: bold;">¡Excelente! Todos los socios con turnos fijos tienen su pago al día.</p>' : `
          <table style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="background-color: #fef2f2; font-size: 11px; color: #991b1b; text-transform: uppercase;">
                <th style="padding: 6px 10px;">Socio</th>
                <th style="padding: 6px 10px;">Cuota / Plan</th>
                <th style="padding: 6px 10px;">Turnos Asignados</th>
                <th style="padding: 6px 10px;">Contacto</th>
              </tr>
            </thead>
            <tbody>${filasSinPagar}</tbody>
          </table>
        `}
      </div>

      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; font-size: 12px; color: #4b5563;">
        <strong>Sugerencia de seguimiento:</strong> Los socios del grupo 3 mantuvieron su lugar activo en la grilla. Se recomienda escribirles amablemente para consultar si abonaron por transferencia o en efectivo, o si requirieron cobertura este mes.
      </div>

      <div style="text-align: center; font-size: 11px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
        Generado automáticamente por el Sistema de Gestión KAHA GYM
      </div>
    </div>
  `;
}
