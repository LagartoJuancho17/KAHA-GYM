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

import { semanaOffsetInicial, etiquetaSemanaRelativa } from './fechas';

test('semanaOffsetInicial: sábado antes del mediodía muestra la semana actual (0)', () => {
  // Sábado 2026-09-12 11:59:00 ARG = 14:59:00 UTC
  const sabadoManiana = epoch('2026-09-12T14:59:00.000Z');
  assert.equal(semanaOffsetInicial(sabadoManiana), 0);
  assert.equal(etiquetaSemanaRelativa(0, sabadoManiana), 'Semana en curso');
});

test('semanaOffsetInicial: sábado desde las 12:00 hs muestra la semana por arrancar (+1)', () => {
  // Sábado 2026-09-12 12:00:00 ARG = 15:00:00 UTC
  const sabadoMediodia = epoch('2026-09-12T15:00:00.000Z');
  assert.equal(semanaOffsetInicial(sabadoMediodia), 1);
  assert.equal(etiquetaSemanaRelativa(1, sabadoMediodia), 'Semana por arrancar');

  // Sábado 2026-09-12 20:30:00 ARG = 23:30:00 UTC
  const sabadoNoche = epoch('2026-09-12T23:30:00.000Z');
  assert.equal(semanaOffsetInicial(sabadoNoche), 1);
});

test('semanaOffsetInicial: domingo durante todo el día muestra la semana por arrancar (+1)', () => {
  // Domingo 2026-09-13 01:00:00 ARG = 04:00:00 UTC
  const domingoMadrugada = epoch('2026-09-13T04:00:00.000Z');
  assert.equal(semanaOffsetInicial(domingoMadrugada), 1);

  // Domingo 2026-09-13 18:00:00 ARG = 21:00:00 UTC
  const domingoTarde = epoch('2026-09-13T21:00:00.000Z');
  assert.equal(semanaOffsetInicial(domingoTarde), 1);
  assert.equal(etiquetaSemanaRelativa(1, domingoTarde), 'Semana por arrancar');
  assert.equal(etiquetaSemanaRelativa(0, domingoTarde), 'Semana que finalizó');

  // Domingo 2026-09-13 23:59:00 ARG = 2026-09-14T02:59:00 UTC
  const domingoNoche = epoch('2026-09-14T02:59:00.000Z');
  assert.equal(semanaOffsetInicial(domingoNoche), 1);
});

test('semanaOffsetInicial: lunes a viernes muestra la semana en curso (0)', () => {
  // Lunes 2026-09-14 00:01:00 ARG = 03:01:00 UTC
  const lunesMadrugada = epoch('2026-09-14T03:01:00.000Z');
  assert.equal(semanaOffsetInicial(lunesMadrugada), 0);
  assert.equal(etiquetaSemanaRelativa(0, lunesMadrugada), 'Semana en curso');
  assert.equal(etiquetaSemanaRelativa(1, lunesMadrugada), 'Próxima semana');

  // Miércoles 2026-09-16 16:00:00 ARG = 19:00:00 UTC
  const miercoles = epoch('2026-09-16T19:00:00.000Z');
  assert.equal(semanaOffsetInicial(miercoles), 0);

  // Viernes 2026-09-11 20:00:00 ARG = 23:00:00 UTC
  const viernes = epoch('2026-09-11T23:00:00.000Z');
  assert.equal(semanaOffsetInicial(viernes), 0);
});

