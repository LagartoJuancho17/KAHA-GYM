// Gate tests de hoyArgentina. Deterministas, sin red, sin mockear Date.
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hoyArgentina } from './fechas';

const epoch = (iso: string) => new Date(iso).getTime();

test('REGRESION: a las 22:00 hora Argentina, hoy sigue siendo hoy (no mañana)', () => {
  // 2026-09-07 22:00 en Argentina (UTC-3) = 2026-09-08 01:00 UTC.
  // toISOString().slice(0,10) sobre ese instante da "2026-09-08": un dia adelantado.
  const instanteUTC = epoch('2026-09-08T01:00:00.000Z');
  assert.equal(hoyArgentina(instanteUTC), '2026-09-07');
});

test('a las 10:00 hora Argentina coincide con la fecha UTC', () => {
  // 2026-09-07 10:00 ARG = 2026-09-07 13:00 UTC. Mismo dia en los dos husos.
  const instanteUTC = epoch('2026-09-07T13:00:00.000Z');
  assert.equal(hoyArgentina(instanteUTC), '2026-09-07');
});

test('justo en el limite: 20:59 ARG todavia es el dia de hoy, 21:00 ARG ya es el de mañana en UTC', () => {
  // 20:59:59 ARG = 23:59:59 UTC (mismo dia UTC)
  assert.equal(hoyArgentina(epoch('2026-09-07T23:59:59.000Z')), '2026-09-07');
  // 21:00:00 ARG = 00:00:00 UTC del dia siguiente (el bug viejo diria "08" aca tambien)
  assert.equal(hoyArgentina(epoch('2026-09-08T00:00:00.000Z')), '2026-09-07');
});

test('medianoche Argentina', () => {
  // 00:00:00 ARG = 03:00:00 UTC
  assert.equal(hoyArgentina(epoch('2026-09-07T03:00:00.000Z')), '2026-09-07');
});

test('cruce de mes', () => {
  // 2026-08-31 23:00 ARG = 2026-09-01 02:00 UTC
  assert.equal(hoyArgentina(epoch('2026-09-01T02:00:00.000Z')), '2026-08-31');
});

test('sin argumento usa el instante actual (no explota)', () => {
  const hoy = hoyArgentina();
  assert.match(hoy, /^\d{4}-\d{2}-\d{2}$/);
});

import { fechasFuturasDelTurno } from './fechas';

test('fechasFuturasDelTurno devuelve las próximas fechas del día del turno', () => {
  // 2026-09-11 es VIERNES
  const miercoles = fechasFuturasDelTurno('MIERCOLES-20:00', '2026-09-11', 3);
  assert.deepEqual(miercoles, ['2026-09-16', '2026-09-23', '2026-09-30']);

  const lunes = fechasFuturasDelTurno('LUNES-09:30', '2026-09-11', 2);
  assert.deepEqual(lunes, ['2026-09-14', '2026-09-21']);
});

test('fechasFuturasDelTurno tolera turno inválido o vacío', () => {
  assert.deepEqual(fechasFuturasDelTurno('', '2026-09-11'), []);
  assert.deepEqual(fechasFuturasDelTurno('INVALIDO-10:00', '2026-09-11'), []);
});
