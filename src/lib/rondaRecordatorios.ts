// src/lib/rondaRecordatorios.ts
//
// "Ronda de recordatorios": la tanda de mensajes de cobranza que un admin manda
// a mano, uno por uno, desde su propio WhatsApp.
//
// Por que existe: automatizar el envio pide migrar el numero del gimnasio a la
// API de Meta (se pierde la app del celular) o usar un bot no oficial (riesgo de
// que baneen el numero que usan 185 socios). Mientras tanto, esto deja la tanda
// en un solo click por socio: la app arma la lista, elige el texto que
// corresponde al dia, y lleva la cuenta de a quien ya le escribiste.
//
// Lo unico que NO puede saber: si el admin apreto "enviar" dentro de WhatsApp.
// Abrir el chat es lo ultimo que controla la app. Por eso se registra
// "abierto", no "enviado", y se puede desmarcar.

import { Cliente, Pago, Plan, AuditLog } from '../types';
import { precioPlanSocio } from './calculoDeuda';
import { normalizarTelefonoWhatsApp } from './telefono';
import {
  destinatariosAvisoDeuda,
  generarAvisoVencimiento,
  generarMensajeWhatsAppRecordatorio,
  DIA_BAJA_RESERVA
} from './recordatorioDeuda';

export const ACCION_RONDA = 'RECORDATORIO_WHATSAPP_ABIERTO';
export const ACCION_RONDA_DESHECHA = `${ACCION_RONDA}_DESHECHO`;

export type MotivoMensaje = 'AVISO_VENCIMIENTO' | 'TURNO_LIBERADO';

/**
 * Que texto corresponde segun el dia del mes, siguiendo el calendario acordado:
 * hasta el 10 se avisa con la fecha limite por delante; del 11 en adelante el
 * turno ya quedo liberado y el mensaje es otro.
 *
 * Mandar el texto de "ya pasó la fecha" un dia 3 le avisa al socio que perdio el
 * lugar cuando todavia esta en plazo. Es el error que tenia el boton viejo.
 */
export function mensajeQueCorresponde(diaDelMes: number): MotivoMensaje {
  return diaDelMes >= DIA_BAJA_RESERVA ? 'TURNO_LIBERADO' : 'AVISO_VENCIMIENTO';
}

export function textoDelMensaje(motivo: MotivoMensaje, nombre: string): string {
  return motivo === 'TURNO_LIBERADO'
    ? generarMensajeWhatsAppRecordatorio(nombre)
    : generarAvisoVencimiento(nombre);
}

export interface ItemRonda {
  cliente_id: string;
  nombre: string;
  apellido: string;
  deuda: number;
  /** true = todavia no se imputo a deuda_acumulada, es la cuota del mes sin pagar */
  deudaEsCuotaDelMes: boolean;
  telefono: string;
  telefonoWhatsApp: string;
  mensaje: string;
  motivo: MotivoMensaje;
  urlWhatsApp: string;
  yaContactado: boolean;
}

export interface Ronda {
  motivo: MotivoMensaje;
  mes: string;            // 'YYYY-MM'
  pendientes: ItemRonda[];
  yaContactados: ItemRonda[];
  sinWhatsApp: Array<{ cliente_id: string; nombre: string; apellido: string; deuda: number; deudaEsCuotaDelMes: boolean; telefono: string }>;
  /** Activos sin plan y sin deuda: no hay nada que cobrarles, pero alguien tiene que asignarles plan. */
  sinPlan: Array<{ cliente_id: string; nombre: string; apellido: string }>;
  total: number;
}

/**
 * A quien ya se le abrio el chat este mes. Se lee del historial de auditoria,
 * que ya se sincroniza entre los dispositivos del gimnasio: si Juanchi arranca
 * la ronda en su compu, Rulo ve desde la suya por donde va.
 */
export function contactadosDelMes(logs: AuditLog[], mes: string): Set<string> {
  // Vale el ULTIMO evento de cada socio, no el primero: marcar y despues
  // deshacer tiene que dejarlo pendiente. Con solo buscar el "abierto" el
  // deshacer no hacia nada y el socio quedaba avisado para siempre.
  const ultimo = new Map<string, { at: number; contactado: boolean }>();

  for (const log of logs || []) {
    if (!log) continue;
    const esAlta = log.accion === ACCION_RONDA;
    const esBaja = log.accion === ACCION_RONDA_DESHECHA;
    if (!esAlta && !esBaja) continue;

    const d: any = log.detalles || {};
    if (d.mes !== mes || !d.cliente_id) continue;

    const id = String(d.cliente_id);
    const at = Date.parse(log.creado_at || '') || 0;
    const previo = ultimo.get(id);
    if (!previo || at >= previo.at) ultimo.set(id, { at, contactado: esAlta });
  }

  const ids = new Set<string>();
  for (const [id, v] of ultimo) if (v.contactado) ids.add(id);
  return ids;
}

/**
 * Arma la tanda del dia.
 *
 * Orden: primero los que faltan, de mayor a menor deuda, para que lo que mas
 * pesa salga primero si la ronda se corta por la mitad.
 *
 * Los socios sin telefono utilizable van a su propia lista en vez de
 * desaparecer: si no, un numero mal cargado saca a alguien de la cobranza y
 * nadie se entera nunca.
 */
export function armarRonda(params: {
  clientes: Cliente[];
  planes?: Plan[];
  pagos?: Pago[];
  logs?: AuditLog[];
  hoy?: Date;
}): Ronda {
  const hoy = params.hoy || new Date();
  const mes = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const motivo = mensajeQueCorresponde(hoy.getDate());

  const deudores = destinatariosAvisoDeuda(
    (params.clientes || []) as any[],
    (params.pagos || []).map(p => ({ cliente_id: p.cliente_id, mes_correspondiente: p.mes_correspondiente })),
    hoy
  ) as unknown as Cliente[];

  const yaFue = contactadosDelMes(params.logs || [], mes);

  const pendientes: ItemRonda[] = [];
  const yaContactados: ItemRonda[] = [];
  const sinWhatsApp: Ronda['sinWhatsApp'] = [];
  const sinPlan: Ronda['sinPlan'] = [];

  for (const c of deudores) {
    // Si todavia no se imputo nada a deuda_acumulada, lo que debe es la cuota
    // del mes que no pago. Mostrar "$0" en una lista de deudores hace pensar
    // que la lista esta rota y el admin se lo saltea.
    const acumulada = Number(c.deuda_acumulada || 0);
    const deudaEsCuotaDelMes = acumulada <= 0;
    const deuda = deudaEsCuotaDelMes ? precioPlanSocio(c, params.planes || []) : acumulada;

    // Sin plan asignado y sin deuda: la cuota es 0, no hay nada que cobrar.
    // Escribirle "no nos figura tu pago" a alguien que no debe nada queda mal y
    // hace ruido en la ronda. Igual no se esconde: un socio activo sin plan es
    // plata que el gimnasio no esta facturando.
    if (deuda <= 0) {
      sinPlan.push({ cliente_id: c.id, nombre: c.nombre, apellido: c.apellido });
      continue;
    }

    const wa = normalizarTelefonoWhatsApp(c.telefono);

    if (!wa) {
      sinWhatsApp.push({
        cliente_id: c.id, nombre: c.nombre, apellido: c.apellido,
        deuda, deudaEsCuotaDelMes, telefono: c.telefono || ''
      });
      continue;
    }

    const mensaje = textoDelMensaje(motivo, c.nombre);
    const item: ItemRonda = {
      cliente_id: c.id,
      nombre: c.nombre,
      apellido: c.apellido,
      deuda,
      deudaEsCuotaDelMes,
      telefono: c.telefono || '',
      telefonoWhatsApp: wa,
      mensaje,
      motivo,
      urlWhatsApp: `https://wa.me/${wa}?text=${encodeURIComponent(mensaje)}`,
      yaContactado: yaFue.has(c.id)
    };

    (item.yaContactado ? yaContactados : pendientes).push(item);
  }

  sinPlan.sort((a, b) => (a.apellido || '').localeCompare(b.apellido || '', 'es'));
  const porDeuda = (a: { deuda: number }, b: { deuda: number }) => b.deuda - a.deuda;
  pendientes.sort(porDeuda);
  yaContactados.sort(porDeuda);
  sinWhatsApp.sort(porDeuda);

  return {
    motivo,
    mes,
    pendientes,
    yaContactados,
    sinWhatsApp,
    sinPlan,
    total: pendientes.length + yaContactados.length + sinWhatsApp.length + sinPlan.length
  };
}
