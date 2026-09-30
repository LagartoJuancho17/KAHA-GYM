// src/lib/rondaRecordatorios.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCION_RONDA_DESHECHA,
  mensajeQueCorresponde,
  textoDelMensaje,
  contactadosDelMes,
  armarRonda,
  ACCION_RONDA
} from './rondaRecordatorios';
import { Cliente, AuditLog } from '../types';

const socio = (over: Partial<Cliente> = {}): Cliente => ({
  id: over.id || 'c1',
  nombre: 'Ana',
  apellido: 'Perez',
  email: 'a@a.com',
  telefono: '11 7840-2722',
  tipo: 'FIJO',
  estado: 'ACTIVO',
  plan_id: 'p1',
  activo: true,
  deuda_acumulada: 65000,
  ultimo_mes_pagado: '2026-08',
  turnos_fijos: [],
  creado_at: '2026-01-01T00:00:00.000Z',
  ...over
});

const log = (cliente_id: string, mes: string): AuditLog => ({
  id: `l-${cliente_id}-${mes}`,
  accion: ACCION_RONDA,
  usuario_email: 'admin@kaha.com',
  detalles: { cliente_id, mes },
  creado_at: '2026-09-05T12:00:00.000Z'
} as AuditLog);

const planesTest: any[] = [{ id: 'p1', nombre: 'Plan 2 Dias', dias_por_semana: 2, precio: 65000, creado_at: '' }];

const dia = (d: number) => new Date(`2026-09-${String(d).padStart(2, '0')}T12:00:00Z`);

// --- Que mensaje corresponde ---

test('hasta el 9 se avisa con la fecha limite; del 10 en adelante el turno ya se libero', () => {
  assert.equal(mensajeQueCorresponde(1), 'AVISO_VENCIMIENTO');
  assert.equal(mensajeQueCorresponde(5), 'AVISO_VENCIMIENTO');
  assert.equal(mensajeQueCorresponde(9), 'AVISO_VENCIMIENTO');
  assert.equal(mensajeQueCorresponde(10), 'TURNO_LIBERADO');
  assert.equal(mensajeQueCorresponde(28), 'TURNO_LIBERADO');
});

test('REGRESION: un dia 3 NO manda el texto de "ya paso la fecha"', () => {
  // El boton viejo de MorososList mandaba siempre ese texto. Un socio en plazo
  // recibia que ya habia perdido el lugar.
  const texto = textoDelMensaje(mensajeQueCorresponde(3), 'Ana');
  assert.ok(!/Ya pasó la fecha/i.test(texto));
  assert.ok(/día 10/.test(texto), 'avisa la fecha limite');
});

test('un dia 12 si manda el texto de turno liberado', () => {
  const texto = textoDelMensaje(mensajeQueCorresponde(12), 'Ana');
  assert.ok(/Ya pasó la fecha/i.test(texto));
});

test('el mensaje saluda por el nombre', () => {
  assert.ok(textoDelMensaje('AVISO_VENCIMIENTO', 'Juanchi').includes('Juanchi'));
  assert.ok(textoDelMensaje('TURNO_LIBERADO', 'Juanchi').includes('Juanchi'));
});

// --- Quien ya fue contactado ---

test('contactadosDelMes lee del historial y separa por mes', () => {
  const logs = [log('a', '2026-09'), log('b', '2026-08')];
  const set = contactadosDelMes(logs, '2026-09');
  assert.deepEqual([...set], ['a']);
});

test('contactadosDelMes ignora otras acciones y tolera basura', () => {
  const otros: any[] = [
    { id: 'x', accion: 'PAGO_REGISTRADO', detalles: { cliente_id: 'a', mes: '2026-09' } },
    null,
    { id: 'y', accion: ACCION_RONDA, detalles: null }
  ];
  assert.equal(contactadosDelMes(otros, '2026-09').size, 0);
  assert.equal(contactadosDelMes(null as any, '2026-09').size, 0);
});

// --- La ronda ---

test('arma la tanda solo con los que deben', () => {
  const clientes = [
    socio({ id: 'debe', deuda_acumulada: 65000 }),
    socio({ id: 'aldia', deuda_acumulada: 0, ultimo_mes_pagado: '2026-09' })
  ];
  const r = armarRonda({ clientes, hoy: dia(5) });
  assert.deepEqual(r.pendientes.map(i => i.cliente_id), ['debe']);
  assert.equal(r.total, 1);
});

test('el socio en reposo no entra en la ronda', () => {
  const clientes = [
    socio({ id: 'reposo', deuda_acumulada: 65000, reposo: { desde: '2026-08-01', hasta: '2027-02-01' } })
  ];
  assert.equal(armarRonda({ clientes, hoy: dia(5) }).total, 0);
});

test('ordena por deuda de mayor a menor: lo que mas pesa sale primero', () => {
  const clientes = [
    socio({ id: 'poco', deuda_acumulada: 10000 }),
    socio({ id: 'mucho', deuda_acumulada: 130000 }),
    socio({ id: 'medio', deuda_acumulada: 65000 })
  ];
  const r = armarRonda({ clientes, hoy: dia(5) });
  assert.deepEqual(r.pendientes.map(i => i.cliente_id), ['mucho', 'medio', 'poco']);
});

test('separa a los que ya fueron contactados este mes', () => {
  const clientes = [socio({ id: 'a' }), socio({ id: 'b' })];
  const r = armarRonda({ clientes, logs: [log('a', '2026-09')], hoy: dia(5) });
  assert.deepEqual(r.pendientes.map(i => i.cliente_id), ['b']);
  assert.deepEqual(r.yaContactados.map(i => i.cliente_id), ['a']);
  assert.equal(r.total, 2, 'siguen contando en el total');
});

test('un contacto del mes pasado no cuenta para este mes', () => {
  const clientes = [socio({ id: 'a' })];
  const r = armarRonda({ clientes, logs: [log('a', '2026-08')], hoy: dia(5) });
  assert.equal(r.pendientes.length, 1);
});

test('REGRESION: un socio sin telefono usable no desaparece, va a su propia lista', () => {
  // Si se filtrara en silencio, un numero mal cargado lo saca de la cobranza
  // para siempre y nadie se entera.
  const clientes = [
    socio({ id: 'sintel', telefono: '', deuda_acumulada: 65000 }),
    socio({ id: 'basura', telefono: 'no tiene', deuda_acumulada: 30000 }),
    socio({ id: 'ok', telefono: '11 7840-2722', deuda_acumulada: 10000 })
  ];
  const r = armarRonda({ clientes, hoy: dia(5) });
  assert.deepEqual(r.pendientes.map(i => i.cliente_id), ['ok']);
  assert.deepEqual(r.sinWhatsApp.map(i => i.cliente_id), ['sintel', 'basura']);
  assert.equal(r.total, 3, 'los tres siguen contados');
});

test('la url de WhatsApp lleva el numero normalizado y el texto', () => {
  const r = armarRonda({ clientes: [socio({ nombre: 'Ana' })], hoy: dia(5) });
  const item = r.pendientes[0];
  assert.equal(item.telefonoWhatsApp, '5491178402722');
  assert.ok(item.urlWhatsApp.startsWith('https://wa.me/5491178402722?text='));
  assert.ok(decodeURIComponent(item.urlWhatsApp).includes('Ana'));
  assert.ok(decodeURIComponent(item.urlWhatsApp).includes('día 10'));
});

test('el motivo de la ronda cambia con el dia', () => {
  const clientes = [socio()];
  assert.equal(armarRonda({ clientes, hoy: dia(5) }).motivo, 'AVISO_VENCIMIENTO');
  assert.equal(armarRonda({ clientes, hoy: dia(15) }).motivo, 'TURNO_LIBERADO');
});

test('el que ya pago este mes queda afuera', () => {
  const clientes = [socio({ id: 'pago', deuda_acumulada: 0, ultimo_mes_pagado: '2026-08' })];
  const pagos: any[] = [{ cliente_id: 'pago', mes_correspondiente: '2026-09' }];
  assert.equal(armarRonda({ clientes, pagos, hoy: dia(15) }).total, 0);
});

test('tolera listas vacias y nulas', () => {
  assert.equal(armarRonda({ clientes: [] }).total, 0);
  assert.equal(armarRonda({ clientes: null as any }).total, 0);
});

// --- Cuanto debe, mostrado de forma util ---

test('REGRESION: el que no pago el mes muestra la cuota, no $0', () => {
  // Entra en la ronda porque no pago, pero todavia no se imputo a
  // deuda_acumulada. Mostrar "$0" en una lista de deudores hace pensar que la
  // lista esta rota y el admin se lo saltea.
  const planes: any[] = [{ id: 'p1', nombre: 'Plan 2 Dias', dias_por_semana: 2, precio: 65000, creado_at: '' }];
  const clientes = [socio({ id: 'sinpagar', deuda_acumulada: 0, ultimo_mes_pagado: '2026-08' })];

  const r = armarRonda({ clientes, planes, hoy: dia(15) });
  assert.equal(r.pendientes.length, 1);
  assert.equal(r.pendientes[0].deuda, 65000);
  assert.equal(r.pendientes[0].deudaEsCuotaDelMes, true);
});

test('el que ya tiene deuda acumulada muestra esa, no la cuota', () => {
  const planes: any[] = [{ id: 'p1', nombre: 'Plan 2 Dias', dias_por_semana: 2, precio: 65000, creado_at: '' }];
  const clientes = [socio({ id: 'acumulada', deuda_acumulada: 130000 })];

  const r = armarRonda({ clientes, planes, hoy: dia(15) });
  assert.equal(r.pendientes[0].deuda, 130000);
  assert.equal(r.pendientes[0].deudaEsCuotaDelMes, false);
});

test('el precio personalizado del socio gana sobre el del plan', () => {
  const planes: any[] = [{ id: 'p1', nombre: 'Plan 2 Dias', dias_por_semana: 2, precio: 65000, creado_at: '' }];
  const clientes = [socio({ id: 'especial', deuda_acumulada: 0, ultimo_mes_pagado: '2026-08', precio_personalizado: 40000 })];

  assert.equal(armarRonda({ clientes, planes, hoy: dia(15) }).pendientes[0].deuda, 40000);
});

test('sin planes cargados no explota: nadie queda con cuota, van todos a sinPlan', () => {
  const clientes = [socio({ id: 'x', deuda_acumulada: 0, ultimo_mes_pagado: '2026-08' })];
  const r = armarRonda({ clientes, hoy: dia(15) });
  assert.equal(r.pendientes.length, 0);
  assert.deepEqual(r.sinPlan.map(i => i.cliente_id), ['x']);
});

test('REGRESION: al socio sin plan y sin deuda no se le manda nada', () => {
  // Su cuota es $0: no debe plata. Escribirle "no nos figura tu pago" queda mal.
  // En produccion habia 13 asi, varios invitados.
  const planes: any[] = [{ id: 'p1', nombre: 'Plan 2 Dias', dias_por_semana: 2, precio: 65000, creado_at: '' }];
  const clientes = [
    socio({ id: 'sinplan', plan_id: 'no-existe', deuda_acumulada: 0, ultimo_mes_pagado: '2026-08' }),
    socio({ id: 'debe', deuda_acumulada: 65000 })
  ];

  const r = armarRonda({ clientes, planes, hoy: dia(15) });
  assert.deepEqual(r.pendientes.map(i => i.cliente_id), ['debe']);
  assert.deepEqual(r.sinPlan.map(i => i.cliente_id), ['sinplan'], 'no desaparece, se muestra aparte');
  assert.equal(r.total, 2);
});

test('sin plan PERO con deuda acumulada sí se le escribe', () => {
  // Le quitaron el plan pero quedo debiendo: eso se cobra igual.
  const planes: any[] = [{ id: 'p1', nombre: 'Plan 2 Dias', dias_por_semana: 2, precio: 65000, creado_at: '' }];
  const clientes = [socio({ id: 'debia', plan_id: 'no-existe', deuda_acumulada: 45000 })];

  const r = armarRonda({ clientes, planes, hoy: dia(15) });
  assert.deepEqual(r.pendientes.map(i => i.cliente_id), ['debia']);
  assert.equal(r.pendientes[0].deuda, 45000);
  assert.equal(r.sinPlan.length, 0);
});

test('REGRESION: deshacer devuelve al socio a la lista', () => {
  // Vale el ultimo evento, no el primero. Antes solo se buscaba el "abierto",
  // asi que apretar Deshacer no hacia nada y el socio quedaba avisado para
  // siempre. Encontrado probando en pantalla.
  const clientes = [socio({ id: 'a' })];
  const logs: any[] = [
    { id: 'l1', accion: ACCION_RONDA, detalles: { cliente_id: 'a', mes: '2026-09' }, creado_at: '2026-09-05T10:00:00.000Z' },
    { id: 'l2', accion: ACCION_RONDA_DESHECHA, detalles: { cliente_id: 'a', mes: '2026-09' }, creado_at: '2026-09-05T10:05:00.000Z' }
  ];

  const r = armarRonda({ clientes, planes: planesTest, logs, hoy: dia(15) });
  assert.deepEqual(r.pendientes.map(i => i.cliente_id), ['a']);
  assert.equal(r.yaContactados.length, 0);
});

test('volver a marcar despues de deshacer lo saca de la lista otra vez', () => {
  const clientes = [socio({ id: 'a' })];
  const logs: any[] = [
    { id: 'l1', accion: ACCION_RONDA, detalles: { cliente_id: 'a', mes: '2026-09' }, creado_at: '2026-09-05T10:00:00.000Z' },
    { id: 'l2', accion: ACCION_RONDA_DESHECHA, detalles: { cliente_id: 'a', mes: '2026-09' }, creado_at: '2026-09-05T10:05:00.000Z' },
    { id: 'l3', accion: ACCION_RONDA, detalles: { cliente_id: 'a', mes: '2026-09' }, creado_at: '2026-09-05T10:09:00.000Z' }
  ];

  const r = armarRonda({ clientes, planes: planesTest, logs, hoy: dia(15) });
  assert.equal(r.pendientes.length, 0);
  assert.deepEqual(r.yaContactados.map(i => i.cliente_id), ['a']);
});
