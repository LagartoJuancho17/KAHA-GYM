// src/lib/calculoDeuda.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularDeudaYEstadoCliente, formatearDeudaVisual, precioPlanSocio } from './calculoDeuda';
import { Cliente, Plan } from '../types';

const mockPlanes: Plan[] = [
  { id: 'p-2d', nombre: '2 días', dias_por_semana: 2, precio: 35000, creado_at: '' },
  { id: 'p-3d', nombre: '3 días', dias_por_semana: 3, precio: 45000, creado_at: '' }
];

const mockBaseCliente: Cliente = {
  id: 'c-1',
  nombre: 'Carlos',
  apellido: 'Gómez',
  email: 'carlos@example.com',
  telefono: '1131776907',
  tipo: 'FIJO',
  estado: 'ACTIVO',
  plan_id: 'p-3d',
  activo: true,
  deuda_acumulada: 0,
  ultimo_mes_pagado: '2026-08',
  turnos_fijos: ['LUNES-08:30'],
  creado_at: ''
};

test('precioPlanSocio devuelve precio_personalizado si existe', () => {
  const precio = precioPlanSocio({ plan_id: 'p-3d', precio_personalizado: 40000 }, mockPlanes);
  assert.equal(precio, 40000);
});

test('precioPlanSocio devuelve precio del plan si no hay personalizado', () => {
  const precio = precioPlanSocio({ plan_id: 'p-3d', precio_personalizado: undefined }, mockPlanes);
  assert.equal(precio, 45000);
});

test('desde el día 1 del mes (días 1 al 5), imputa la cuota del mes y pone estado CON_DEUDA si no pagó', () => {
  const res = calcularDeudaYEstadoCliente(
    { ...mockBaseCliente, deuda_acumulada: 0, ultimo_mes_pagado: '2026-08' },
    mockPlanes,
    '2026-09',
    1 // Día 1
  );

  assert.equal(res.deuda_acumulada, 45000);
  assert.equal(res.estado, 'CON_DEUDA');
  assert.equal(res.pagoEsteMes, false);
});

test('a partir del día 6 (ej. día 10), imputa la cuota del mes y pone estado MOROSO si no pagó', () => {
  const res = calcularDeudaYEstadoCliente(
    { ...mockBaseCliente, deuda_acumulada: 0, ultimo_mes_pagado: '2026-08' },
    mockPlanes,
    '2026-09',
    10 // Día 10
  );

  assert.equal(res.deuda_acumulada, 45000);
  assert.equal(res.estado, 'MOROSO');
  assert.equal(res.pagoEsteMes, false);
});

test('socio que pagó el mes actual queda con deuda 0 y estado ACTIVO', () => {
  const res = calcularDeudaYEstadoCliente(
    { ...mockBaseCliente, deuda_acumulada: 0, ultimo_mes_pagado: '2026-09' },
    mockPlanes,
    '2026-09',
    10
  );

  assert.equal(res.deuda_acumulada, 0);
  assert.equal(res.estado, 'ACTIVO');
  assert.equal(res.pagoEsteMes, true);
});

test('socio BECADO queda con deuda $0 y estado ACTIVO, conservando deuda_perdonada', () => {
  const res = calcularDeudaYEstadoCliente(
    { ...mockBaseCliente, deuda_acumulada: 50000, exencion_cobro: 'BECADO', ultimo_mes_pagado: '2026-08' },
    mockPlanes,
    '2026-09',
    10
  );

  assert.equal(res.deuda_acumulada, 0);
  assert.equal(res.estado, 'ACTIVO');
  assert.equal(res.esBecado, true);
  assert.equal(res.deuda_perdonada, 50000);
});

test('formatearDeudaVisual formatea correctamente socios normales y becados', () => {
  const normal = formatearDeudaVisual({ deuda_acumulada: 45000, exencion_cobro: 'NINGUNA' });
  assert.equal(normal.textoVisible, '$45.000');
  assert.equal(normal.textoTachado, null);
  assert.equal(normal.esBecado, false);

  const becado = formatearDeudaVisual({ deuda_acumulada: 0, exencion_cobro: 'BECADO', deuda_perdonada: 45000 });
  assert.equal(becado.textoVisible, '$0');
  assert.equal(becado.textoTachado, '$45.000');
  assert.equal(becado.esBecado, true);
  assert.equal(becado.labelCompleto, '$0 ($45.000 - Becado)');
});
