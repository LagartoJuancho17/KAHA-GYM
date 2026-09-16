// src/lib/ordenSocios.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordenarSocios, alternarOrden, ORDEN_POR_DEFECTO } from './ordenSocios';
import { Cliente } from '../types';

const socio = (over: Partial<Cliente> = {}): Cliente => ({
  id: over.id || `c-${Math.random().toString(36).slice(2, 8)}`,
  nombre: 'Nombre',
  apellido: 'Apellido',
  email: 'x@x.com',
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

const nombres = (cs: Cliente[]) => cs.map(c => c.apellido);

test('ordena por apellido de la A a la Z', () => {
  const lista = [
    socio({ apellido: 'Zapata' }),
    socio({ apellido: 'Alvarez' }),
    socio({ apellido: 'Moreno' })
  ];
  const r = ordenarSocios(lista, { campo: 'APELLIDO', direccion: 'asc' });
  assert.deepEqual(nombres(r), ['Alvarez', 'Moreno', 'Zapata']);
});

test('los acentos y la ñ ordenan como en castellano, no por código ASCII', () => {
  const lista = [
    socio({ apellido: 'Nuñez' }),
    socio({ apellido: 'Alvarez' }),
    socio({ apellido: 'Álvarez' }),
    socio({ apellido: 'Nogues' })
  ];
  const r = ordenarSocios(lista, { campo: 'APELLIDO', direccion: 'asc' });
  // Álvarez y Alvarez quedan juntos al principio; Nogues antes que Nuñez.
  assert.deepEqual(nombres(r).slice(2), ['Nogues', 'Nuñez']);
  assert.ok(nombres(r).slice(0, 2).every(a => a.toLowerCase().endsWith('lvarez')));
});

test('ordena por nombre, no por apellido', () => {
  const lista = [
    socio({ nombre: 'Zoe', apellido: 'Aaa' }),
    socio({ nombre: 'Ana', apellido: 'Zzz' })
  ];
  const r = ordenarSocios(lista, { campo: 'NOMBRE', direccion: 'asc' });
  assert.deepEqual(r.map(c => c.nombre), ['Ana', 'Zoe']);
});

test('ordena por deuda de mayor a menor', () => {
  const lista = [
    socio({ apellido: 'Poca', deuda_acumulada: 1000 }),
    socio({ apellido: 'Mucha', deuda_acumulada: 90000 }),
    socio({ apellido: 'Cero', deuda_acumulada: 0 })
  ];
  const r = ordenarSocios(lista, { campo: 'DEUDA', direccion: 'desc' });
  assert.deepEqual(nombres(r), ['Mucha', 'Poca', 'Cero']);
});

test('una deuda ausente cuenta como cero y no rompe el orden', () => {
  const lista = [
    socio({ apellido: 'SinDato', deuda_acumulada: undefined as any }),
    socio({ apellido: 'Debe', deuda_acumulada: 500 })
  ];
  const r = ordenarSocios(lista, { campo: 'DEUDA', direccion: 'desc' });
  assert.deepEqual(nombres(r), ['Debe', 'SinDato']);
});

test('ordena por fecha de ingreso: el más nuevo primero', () => {
  const lista = [
    socio({ apellido: 'Viejo', creado_at: '2025-03-01T10:00:00.000Z' }),
    socio({ apellido: 'Nuevo', creado_at: '2026-09-01T10:00:00.000Z' }),
    socio({ apellido: 'Medio', creado_at: '2026-01-15T10:00:00.000Z' })
  ];
  const r = ordenarSocios(lista, { campo: 'INGRESO', direccion: 'desc' });
  assert.deepEqual(nombres(r), ['Nuevo', 'Medio', 'Viejo']);
});

test('una ficha sin fecha de ingreso se trata como la más vieja, no como alta de hoy', () => {
  const lista = [
    socio({ apellido: 'SinFecha', creado_at: '' }),
    socio({ apellido: 'Reciente', creado_at: '2026-09-01T10:00:00.000Z' })
  ];
  const r = ordenarSocios(lista, { campo: 'INGRESO', direccion: 'desc' });
  assert.deepEqual(nombres(r), ['Reciente', 'SinFecha']);
});

test('REGRESION: empate por deuda no deja el orden a merced del array original', () => {
  // Todos deben cero: sin desempate estable la tabla salta de lugar en cada recarga.
  const a = [
    socio({ id: 'b', apellido: 'Benitez', nombre: 'Luis', deuda_acumulada: 0 }),
    socio({ id: 'a', apellido: 'Acosta', nombre: 'Ana', deuda_acumulada: 0 }),
    socio({ id: 'c', apellido: 'Castro', nombre: 'Mia', deuda_acumulada: 0 })
  ];
  const b = [a[2], a[0], a[1]];

  const r1 = ordenarSocios(a, { campo: 'DEUDA', direccion: 'desc' });
  const r2 = ordenarSocios(b, { campo: 'DEUDA', direccion: 'desc' });
  assert.deepEqual(nombres(r1), nombres(r2));
  assert.deepEqual(nombres(r1), ['Acosta', 'Benitez', 'Castro']);
});

test('el desempate alfabético no se invierte al pedir orden descendente', () => {
  const lista = [
    socio({ id: 'x', apellido: 'Zeta', deuda_acumulada: 100 }),
    socio({ id: 'y', apellido: 'Alfa', deuda_acumulada: 100 })
  ];
  const asc = ordenarSocios(lista, { campo: 'DEUDA', direccion: 'asc' });
  const desc = ordenarSocios(lista, { campo: 'DEUDA', direccion: 'desc' });
  assert.deepEqual(nombres(asc), ['Alfa', 'Zeta']);
  assert.deepEqual(nombres(desc), ['Alfa', 'Zeta']);
});

test('no muta el array original', () => {
  const lista = [socio({ apellido: 'Zeta' }), socio({ apellido: 'Alfa' })];
  const copia = [...lista];
  ordenarSocios(lista, { campo: 'APELLIDO', direccion: 'asc' });
  assert.deepEqual(lista, copia);
});

test('tolera lista vacía, null y basura', () => {
  assert.deepEqual(ordenarSocios([]), []);
  assert.deepEqual(ordenarSocios(null as any), []);
  assert.deepEqual(ordenarSocios(undefined as any), []);
});

test('alternarOrden invierte el sentido si ya se ordena por ese campo', () => {
  const r = alternarOrden({ campo: 'DEUDA', direccion: 'desc' }, 'DEUDA');
  assert.deepEqual(r, { campo: 'DEUDA', direccion: 'asc' });
});

test('alternarOrden elige el sentido más útil al cambiar de campo', () => {
  // Fechas y montos se leen de mayor a menor; los nombres de la A a la Z.
  assert.deepEqual(alternarOrden(ORDEN_POR_DEFECTO, 'DEUDA'), { campo: 'DEUDA', direccion: 'desc' });
  assert.deepEqual(alternarOrden(ORDEN_POR_DEFECTO, 'APELLIDO'), { campo: 'APELLIDO', direccion: 'asc' });
  assert.deepEqual(alternarOrden(ORDEN_POR_DEFECTO, 'NOMBRE'), { campo: 'NOMBRE', direccion: 'asc' });
  assert.deepEqual(
    alternarOrden({ campo: 'APELLIDO', direccion: 'asc' }, 'INGRESO'),
    { campo: 'INGRESO', direccion: 'desc' }
  );
});

test('REGRESION: dos fichas sin fecha de ingreso no rompen el orden estable', () => {
  // ingresoDe devuelve -Infinity para una ficha sin creado_at, y
  // (-Infinity) - (-Infinity) da NaN. Un NaN nunca es distinto de 0, así que el
  // desempate no llegaba a aplicarse y el orden dependía del array de entrada.
  const a = socio({ id: 'b', apellido: 'Benitez', creado_at: '' });
  const b = socio({ id: 'a', apellido: 'Acosta', creado_at: '' });
  const c = socio({ id: 'c', apellido: 'Castro', creado_at: '' });

  const r1 = ordenarSocios([a, b, c], { campo: 'INGRESO', direccion: 'desc' });
  const r2 = ordenarSocios([c, a, b], { campo: 'INGRESO', direccion: 'desc' });

  assert.deepEqual(r1.map(x => x.apellido), r2.map(x => x.apellido));
  assert.deepEqual(r1.map(x => x.apellido), ['Acosta', 'Benitez', 'Castro']);
});
