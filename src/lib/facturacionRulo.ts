// src/lib/facturacionRulo.ts
import { Pago, Cliente, Plan } from '../types';

export interface FilaFacturacionAFIP {
  fechaComprobante: string;
  productoServicio: string;
  precioUnitario: string;
  cantidad: number;
  total: string;
  tipo: string;
  facturadoDesde: string;
  facturadoHasta: string;
  condicionVenta: string;
  condicionIva: string;
  cuit: string;
  email: string;
}

export const DEFAULT_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyq_cHQcWflo5RKYg1OpWYpNs_LNce7VgkdcdI_DABfzML_-f1wJ4v2K_YM-bkfFhd6/exec';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1afcgosXC5CrGEj3KjP0gTOlKzX25GD0YCtrJUuRElU8/edit';

/**
 * Formatea un número al estilo de moneda de la plantilla AFIP: " $  65.000,00 "
 */
export function formatearMonedaAFIP(monto: number): string {
  const formatted = Math.abs(monto).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return ` $  ${formatted} `;
}

/**
 * Obtiene el rango de fechas 'DD/MM/YY' para el mes (ej: '2026-09' -> desde: '01/09/26', hasta: '30/09/26')
 */
export function obtenerRangoMesAFIP(mesStr: string): { desde: string; hasta: string } {
  const [yearStr, monthStr] = mesStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, '0');

  const ultimoDia = new Date(year, month, 0).getDate();
  const ddHasta = String(ultimoDia).padStart(2, '0');

  return {
    desde: `01/${mm}/${yy}`,
    hasta: `${ddHasta}/${mm}/${yy}`
  };
}

/**
 * Genera la descripción del ítem según el plan del socio o el concepto si es externo
 */
export function determinarDescripcionItem(
  pago: Pago,
  cliente?: Cliente,
  plan?: Plan
): string {
  if (pago.es_externo) {
    return pago.concepto || 'Alquiler consultorio / masajes';
  }

  if (plan?.dias_por_semana) {
    return `${plan.dias_por_semana} veces por semana`;
  }

  if (plan?.nombre) {
    const match = plan.nombre.match(/[2-5]/);
    if (match) {
      return `${match[0]} veces por semana`;
    }
    return plan.nombre;
  }

  return '2 veces por semana';
}

/**
 * Genera el array de filas de facturación para todos los pagos a RULO del mes especificado
 */
export function generarFilasFacturacionRulo(params: {
  mes: string;
  pagos: Pago[];
  clientes: Cliente[];
  planes: Plan[];
}): { filas: (string | number)[][]; objetos: FilaFacturacionAFIP[]; totalMonto: number; cantidadPagos: number } {
  const { mes, pagos, clientes, planes } = params;
  const { desde, hasta } = obtenerRangoMesAFIP(mes);

  // Filtrar pagos que correspondan al mes y cuyo destino sea RULO
  const pagosRulo = pagos.filter(p => {
    const coincideMes = p.mes_correspondiente ? p.mes_correspondiente === mes : (p.fecha_pago && p.fecha_pago.startsWith(mes));
    const esRulo = p.destino_transferencia === 'RULO' || (p.medio_pago === 'TRANSFERENCIA' && p.destino_transferencia === 'RULO');
    return coincideMes && esRulo;
  });

  const objetos: FilaFacturacionAFIP[] = [];
  const filas: (string | number)[][] = [];
  let totalMonto = 0;

  for (const pago of pagosRulo) {
    const cliente = clientes.find(c => c.id === pago.cliente_id);
    const plan = cliente ? planes.find(pl => pl.id === cliente.plan_id) : undefined;

    let fechaComp = hasta;
    if (pago.fecha_pago) {
      const partes = pago.fecha_pago.split('-');
      if (partes.length === 3) {
        const y = partes[0].slice(-2);
        const m = partes[1];
        const d = partes[2].slice(0, 2);
        fechaComp = `${d}/${m}/${y}`;
      }
    }

    const descripcion = determinarDescripcionItem(pago, cliente, plan);
    const monto = Number(pago.monto || 0);
    totalMonto += monto;
    const montoStr = formatearMonedaAFIP(monto);

    const filaObj: FilaFacturacionAFIP = {
      fechaComprobante: fechaComp,
      productoServicio: descripcion,
      precioUnitario: montoStr,
      cantidad: 1,
      total: montoStr,
      tipo: 'SERVICIO',
      facturadoDesde: desde,
      facturadoHasta: hasta,
      condicionVenta: 'TRANSFERENCIA',
      condicionIva: 'CONSUMIDOR FINAL',
      cuit: '',
      email: cliente?.email || ''
    };

    objetos.push(filaObj);

    filas.push([
      filaObj.fechaComprobante,
      filaObj.productoServicio,
      filaObj.precioUnitario,
      filaObj.cantidad,
      filaObj.total,
      filaObj.tipo,
      filaObj.facturadoDesde,
      filaObj.facturadoHasta,
      filaObj.condicionVenta,
      filaObj.condicionIva,
      filaObj.cuit,
      filaObj.email
    ]);
  }

  return { filas, objetos, totalMonto, cantidadPagos: pagosRulo.length };
}

/**
 * Convierte las filas a formato CSV compatible con la plantilla de AFIP
 */
export function generarCSVFacturacionRulo(filas: (string | number)[][]): string {
  const headers = [
    'Fecha Comprobante',
    'Producto / Servicio',
    'Precio Unitario',
    'Cantidad',
    'Total',
    'Tipo',
    'Facturado Desde',
    'Facturado Hasta',
    'Condicion de Venta',
    'Condicion de IVA',
    'CUIT o DNI (Opcional)',
    'Email (Opcional)'
  ];

  const escapeCSV = (val: string | number) => {
    const s = String(val);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvLines = [
    headers.join(','),
    ...filas.map(f => f.map(escapeCSV).join(','))
  ];

  return csvLines.join('\n');
}

/**
 * Envía las filas a la URL de Google Apps Script Webhook
 */
export async function enviarAGoogleSheets(webhookUrl: string, filas: (string | number)[][]): Promise<{ ok: boolean; message: string }> {
  try {
    // Si la URL no está definida o está vacía
    if (!webhookUrl || !webhookUrl.trim()) {
      return { ok: false, message: 'URL de Webhook no configurada.' };
    }

    // Enviamos como text/plain para evitar preflights CORS en Google Apps Script
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ rows: filas })
    });

    const text = await response.text();

    if (response.status === 401 || text.includes('No se pudo abrir el archivo') || text.includes('ServiceLogin')) {
      return {
        ok: false,
        message: 'Google Apps Script requiere autorizar los permisos ("Ejecutar" una vez en el editor de Apps Script).'
      };
    }

    if (!response.ok) {
      return { ok: false, message: `Error del servidor de Google (HTTP ${response.status})` };
    }

    return { ok: true, message: '¡Datos sincronizados correctamente con Google Sheets!' };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Error de red al conectar con Google Sheets.' };
  }
}
