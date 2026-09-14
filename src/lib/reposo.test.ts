// src/lib/reposo.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sumarMeses,
  calcularFinDeReposo,
  iniciarReposo,
  estaEnReposo,
  reposoVencido,
  diasRestantesDeReposo,
  generaDeuda,
  sociosEnReposo,
  sociosConReposoVencido,
  etiquetaReposo,
  MESES_DE_REPOSO
} from './reposo';
import { Cliente } from '../types';
import { calcularDeudaYEstadoCliente } from './calculoDeuda';

const socio = (over: Partial<Cliente> = {}): Cliente => ({
  id: over.id || 'c1',
  nombre: 'Ana',
  apellido: 'Perez',
  email: 'a@a.com',
  telefono: '11',
  tipo: 'FIJO',
  estado: 'ACTIVO',
  plan_id: 'p1',
  activo: true,
  deuda_acumulada: 0,
  ultimo_mes_pagado: '2026-09',
  turnos_fijos: [],
  creado_at: '2026-01-01T00:00:00.000Z',
  ...over
});

// --- Aritmética de meses ---

test('el reposo dura 6 meses', () => {
  assert.equal(MESES_DE_REPOSO, 6);
  assert.equal(calcularFinDeReposo('2026-09-14'), '2027-03-14');
});

test('REGRESION: arrancar un 31 no termina en un día que no existe', () => {
  // 31 de agosto + 6 meses = "31 de febrero". Sin recorte, JS lo empuja a marzo
  // y el socio se come días de reposo de regalo.
  assert.equal(sumarMeses('2026-08-31', 6), '2027-02-28');
  assert.equal(sumarMeses('2027-08-31', 6), '2028-02-29'); // 2028 es bisiesto
});

test('sumar meses cruza de año correctamente', () => {
  assert.equal(sumarMeses('2026-10-15', 6), '2027-04-15');
  assert.equal(sumarMeses('2026-12-01', 6), '2027-06-01');
});

test('el 30 de un mes largo cae bien en uno corto', () => {
  assert.equal(sumarMeses('2026-08-30', 6), '2027-02-28');
});

test('una fecha con formato inválido devuelve vacío en vez de una fecha falsa', () => {
  assert.equal(sumarMeses('14/09/2026', 6), '');
  assert.equal(sumarMeses('', 6), '');
  assert.equal(sumarMeses(null as any, 6), '');
});

// --- Ciclo de vida del reposo ---

test('iniciarReposo arma desde, hasta y guarda los turnos liberados', () => {
  const r = iniciarReposo('2026-09-14', '  cambio de laburo  ', ['LUNES-19:00', 'JUEVES-19:00']);
  assert.equal(r.desde, '2026-09-14');
  assert.equal(r.hasta, '2027-03-14');
  assert.equal(r.motivo, 'cambio de laburo');
  assert.deepEqual(r.turnos_liberados, ['LUNES-19:00', 'JUEVES-19:00']);
});

test('un motivo vacío no se guarda como string vacío', () => {
  assert.equal(iniciarReposo('2026-09-14', '   ').motivo, undefined);
  assert.equal(iniciarReposo('2026-09-14').motivo, undefined);
});

test('estaEnReposo distingue una ficha congelada de una normal', () => {
  assert.equal(estaEnReposo(socio()), false);
  assert.equal(estaEnReposo(socio({ reposo: iniciarReposo('2026-09-14') })), true);
  assert.equal(estaEnReposo(socio({ reposo: null })), false);
});

test('el reposo no está vencido mientras esté dentro de los 6 meses', () => {
  const c = socio({ reposo: iniciarReposo('2026-09-14') });
  assert.equal(reposoVencido(c, '2026-09-14'), false);
  assert.equal(reposoVencido(c, '2027-01-01'), false);
  assert.equal(reposoVencido(c, '2027-03-14'), false); // el último día todavía cuenta
});

test('al día siguiente del vencimiento sí queda vencido', () => {
  const c = socio({ reposo: iniciarReposo('2026-09-14') });
  assert.equal(reposoVencido(c, '2027-03-15'), true);
});

test('un socio sin reposo nunca figura como vencido', () => {
  assert.equal(reposoVencido(socio(), '2030-01-01'), false);
});

test('diasRestantesDeReposo cuenta los días que faltan', () => {
  const c = socio({ reposo: iniciarReposo('2026-09-14') });
  assert.equal(diasRestantesDeReposo(c, '2027-03-14'), 0);
  assert.equal(diasRestantesDeReposo(c, '2027-03-13'), 1);
  assert.equal(diasRestantesDeReposo(c, '2027-03-15'), 0); // vencido no da negativo
  assert.equal(diasRestantesDeReposo(socio(), '2026-09-14'), 0);
});

// --- Efecto sobre la deuda ---

test('REGRESION: un socio en reposo no genera deuda', () => {
  // Si generara deuda, volvería a los 6 meses debiendo 6 cuotas que nunca usó.
  assert.equal(generaDeuda(socio({ reposo: iniciarReposo('2026-09-14') })), false);
  assert.equal(generaDeuda(socio()), true);
});

// --- Listados ---

test('sociosEnReposo y sociosConReposoVencido separan los dos grupos', () => {
  const activo = socio({ id: 'a' });
  const enReposo = socio({ id: 'b', reposo: iniciarReposo('2026-09-01') });
  const vencido = socio({ id: 'c', reposo: iniciarReposo('2025-01-01') });

  const lista = [activo, enReposo, vencido];
  assert.deepEqual(sociosEnReposo(lista).map(c => c.id), ['b', 'c']);
  assert.deepEqual(sociosConReposoVencido(lista, '2026-09-14').map(c => c.id), ['c']);
});

test('los listados toleran null y lista vacía', () => {
  assert.deepEqual(sociosEnReposo(null as any), []);
  assert.deepEqual(sociosConReposoVencido(null as any, '2026-09-14'), []);
});

// --- Etiqueta para la UI ---

test('la etiqueta dice cuánto falta en criollo', () => {
  const c = socio({ reposo: iniciarReposo('2026-09-14') });
  assert.equal(etiquetaReposo(c, '2027-03-15'), 'Reposo vencido');
  assert.equal(etiquetaReposo(c, '2027-03-14'), 'Reposo: último día');
  assert.equal(etiquetaReposo(c, '2027-03-13'), 'Reposo: 1 día restante');
  assert.equal(etiquetaReposo(c, '2027-03-01'), 'Reposo: 13 días restantes');
  assert.match(etiquetaReposo(c, '2026-09-20'), /meses restantes/);
  assert.equal(etiquetaReposo(socio(), '2026-09-14'), '');
});

// --- Integración con el cálculo de deuda ---

test('REGRESION: al socio en reposo no se le imputa la cuota del mes', () => {
  // Si se le imputara, volvería a los 6 meses debiendo 6 cuotas que nunca usó.
  const planes = [{ id: 'p1', precio: 65000 }];
  const enReposo = socio({
    activo: true,           // a propósito: la regla no debe depender de activo
    estado: 'ACTIVO',
    deuda_acumulada: 0,
    ultimo_mes_pagado: '2026-03',
    reposo: iniciarReposo('2026-04-01')
  });

  const r = calcularDeudaYEstadoCliente(enReposo, planes, '2026-09', 15);
  assert.equal(r.deuda_acumulada, 0, 'no le suma la cuota');
  assert.equal(r.estado, 'INACTIVO');
});

test('un socio normal en la misma situación SÍ acumula la cuota', () => {
  const planes = [{ id: 'p1', precio: 65000 }];
  const normal = socio({
    activo: true,
    estado: 'ACTIVO',
    deuda_acumulada: 0,
    ultimo_mes_pagado: '2026-03'
  });

  const r = calcularDeudaYEstadoCliente(normal, planes, '2026-09', 15);
  assert.equal(r.deuda_acumulada, 65000);
  assert.equal(r.estado, 'MOROSO');
});

test('la deuda que tenía antes del reposo se conserva, no se perdona', () => {
  const planes = [{ id: 'p1', precio: 65000 }];
  const conDeuda = socio({
    deuda_acumulada: 45000,
    reposo: iniciarReposo('2026-09-01')
  });
  const r = calcularDeudaYEstadoCliente(conDeuda, planes, '2026-09', 15);
  assert.equal(r.deuda_acumulada, 45000);
});
