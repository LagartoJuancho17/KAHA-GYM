// Gate tests del orden de la lista de espera. Deterministas, sin red.
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordenarListaEspera, esperaDelTurno, proximoEnEntrar, clavePrioridad, esPrioritario } from './listaEspera';
import { WaitlistReserva } from '../types';

const w = (id: string, cliente_id: string, creado_at: string, turno_id = 'JUEVES-19:00', fecha = '2026-09-10'): WaitlistReserva =>
  ({ id, cliente_id, turno_id, fecha, creado_at });

const vip = (...claves: Array<[string, string]>) =>
  new Set(claves.map(([c, t]) => clavePrioridad(c, t)));

test('sin VIP se respeta el orden de llegada', () => {
  const lista = [
    w('3', 'carlos', '2026-09-05T12:00:00Z'),
    w('1', 'ana',    '2026-09-05T10:00:00Z'),
    w('2', 'beto',   '2026-09-05T11:00:00Z')
  ];
  assert.deepEqual(ordenarListaEspera(lista, new Set()).map(x => x.cliente_id), ['ana', 'beto', 'carlos']);
});

test('REGRESION: el VIP pasa al frente aunque se haya anotado ultimo', () => {
  // Caso real: Juan Pablo Sabino es VIP del JUEVES-19:00.
  const lista = [
    w('1', 'ana',   '2026-09-05T10:00:00Z'),
    w('2', 'beto',  '2026-09-05T11:00:00Z'),
    w('3', 'juanpa', '2026-09-05T23:59:00Z')   // ultimo en anotarse
  ];
  const orden = ordenarListaEspera(lista, vip(['juanpa', 'JUEVES-19:00']));
  assert.equal(orden[0].cliente_id, 'juanpa', 'el VIP entra primero');
  assert.deepEqual(orden.map(x => x.cliente_id), ['juanpa', 'ana', 'beto']);
});

test('la prioridad es POR TURNO, no global', () => {
  // Juanpa es VIP del JUEVES-19:00 pero no del MARTES-10:00.
  const prioridades = vip(['juanpa', 'JUEVES-19:00']);
  const enMartes = [
    w('1', 'ana',    '2026-09-05T10:00:00Z', 'MARTES-10:00'),
    w('2', 'juanpa', '2026-09-05T11:00:00Z', 'MARTES-10:00')
  ];
  assert.deepEqual(
    ordenarListaEspera(enMartes, prioridades).map(x => x.cliente_id),
    ['ana', 'juanpa'],
    'en un turno donde no es VIP va por orden de llegada'
  );
});

test('entre dos VIP manda el orden de llegada', () => {
  const lista = [
    w('1', 'vip2', '2026-09-05T12:00:00Z'),
    w('2', 'vip1', '2026-09-05T09:00:00Z'),
    w('3', 'comun', '2026-09-05T08:00:00Z')
  ];
  const orden = ordenarListaEspera(lista, vip(['vip1', 'JUEVES-19:00'], ['vip2', 'JUEVES-19:00']));
  assert.deepEqual(orden.map(x => x.cliente_id), ['vip1', 'vip2', 'comun'],
    'los dos VIP arriba, y entre ellos el que llego antes');
});

test('empate exacto de fecha desempata estable por id', () => {
  const t = '2026-09-05T10:00:00Z';
  const a = ordenarListaEspera([w('b', 'x', t), w('a', 'y', t)], new Set()).map(x => x.id);
  const b = ordenarListaEspera([w('a', 'y', t), w('b', 'x', t)], new Set()).map(x => x.id);
  assert.deepEqual(a, b, 'el orden no cambia segun como venga la lista');
  assert.deepEqual(a, ['a', 'b']);
});

test('no muta la lista original', () => {
  const lista = [w('1', 'ana', '2026-09-05T12:00:00Z'), w('2', 'juanpa', '2026-09-05T10:00:00Z')];
  const copia = [...lista];
  ordenarListaEspera(lista, vip(['ana', 'JUEVES-19:00']));
  assert.deepEqual(lista, copia);
});

test('esperaDelTurno filtra por turno Y fecha', () => {
  const todas = [
    w('1', 'ana',   '2026-09-05T10:00:00Z', 'JUEVES-19:00', '2026-09-10'),
    w('2', 'beto',  '2026-09-05T10:00:00Z', 'JUEVES-19:00', '2026-09-17'), // otra fecha
    w('3', 'carlos','2026-09-05T10:00:00Z', 'MARTES-10:00', '2026-09-10')  // otro turno
  ];
  const r = esperaDelTurno(todas, 'JUEVES-19:00', '2026-09-10', new Set());
  assert.equal(r.length, 1);
  assert.equal(r[0].cliente_id, 'ana');
});

test('proximoEnEntrar devuelve el VIP', () => {
  const todas = [
    w('1', 'ana',    '2026-09-05T08:00:00Z'),
    w('2', 'juanpa', '2026-09-05T20:00:00Z')
  ];
  const p = proximoEnEntrar(todas, 'JUEVES-19:00', '2026-09-10', vip(['juanpa', 'JUEVES-19:00']));
  assert.equal(p?.cliente_id, 'juanpa');
});

test('proximoEnEntrar devuelve null con la espera vacia', () => {
  assert.equal(proximoEnEntrar([], 'JUEVES-19:00', '2026-09-10', new Set()), null);
  assert.equal(proximoEnEntrar(null as any, 'JUEVES-19:00', '2026-09-10', new Set()), null);
});

test('tolera listas vacias, null y sets vacios', () => {
  assert.deepEqual(ordenarListaEspera([], new Set()), []);
  assert.deepEqual(ordenarListaEspera(null as any, new Set()), []);
});

test('esPrioritario y clavePrioridad', () => {
  const s = vip(['juanpa', 'JUEVES-19:00']);
  assert.equal(esPrioritario('juanpa', 'JUEVES-19:00', s), true);
  assert.equal(esPrioritario('juanpa', 'MARTES-10:00', s), false);
  assert.equal(esPrioritario('ana', 'JUEVES-19:00', s), false);
  assert.equal(clavePrioridad('a', 'b'), 'a::b');
});
