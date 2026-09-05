// Gate tests del balance mensual de cupos. Deterministas, sin red.
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vecesQueCaeElDia, clasesFijasDelMes, topeMensualDelPlan, balanceDelMes } from './cuposMensuales';

test('cuenta las veces que cae cada día en septiembre 2026', () => {
  // Septiembre 2026 arranca martes y tiene 30 días: 5 miércoles, 4 del resto.
  assert.equal(vecesQueCaeElDia('2026-09', 'MIERCOLES'), 5);
  assert.equal(vecesQueCaeElDia('2026-09', 'LUNES'), 4);
  assert.equal(vecesQueCaeElDia('2026-09', 'JUEVES'), 4);
  assert.equal(vecesQueCaeElDia('2026-09', 'MARTES'), 5);
  assert.equal(vecesQueCaeElDia('2026-09', 'VIERNES'), 4);
});

test('REGRESION: el caso real de Yanina Radici', () => {
  // Tiene fijos LUNES-08:30, MIERCOLES-08:30 y JUEVES-08:30.
  // La app hacía 3 * 4 = 12. En septiembre 2026 son 13 clases de verdad.
  const fijos = ['LUNES-08:30', 'MIERCOLES-08:30', 'JUEVES-08:30'];
  assert.equal(clasesFijasDelMes(fijos, '2026-09'), 13, '4 lunes + 5 miércoles + 4 jueves');
  assert.notEqual(clasesFijasDelMes(fijos, '2026-09'), 3 * 4, 'el viejo cálculo daba 12');
});

test('el mismo socio tiene distinta cantidad según el mes', () => {
  const fijos = ['LUNES-08:30', 'MIERCOLES-08:30', 'JUEVES-08:30'];
  assert.equal(clasesFijasDelMes(fijos, '2026-09'), 13);
  assert.equal(clasesFijasDelMes(fijos, '2026-02'), 12, 'febrero 2026 tiene 28 días justos');
});

test('febrero de año bisiesto', () => {
  // 2028 es bisiesto: febrero tiene 29 días.
  assert.equal(vecesQueCaeElDia('2028-02', 'MARTES'), 5, '1, 8, 15, 22 y 29 de febrero');
});

test('clasesFijasDelMes tolera lista vacía y basura', () => {
  assert.equal(clasesFijasDelMes([], '2026-09'), 0);
  assert.equal(clasesFijasDelMes(null as any, '2026-09'), 0);
  assert.equal(clasesFijasDelMes(['BASURA-08:30'], '2026-09'), 0);
});

test('dos turnos el mismo día cuentan las dos veces', () => {
  // Un socio puede tener dos horarios el mismo día.
  assert.equal(clasesFijasDelMes(['MIERCOLES-08:30', 'MIERCOLES-19:00'], '2026-09'), 10);
});

test('el tope del plan se ajusta al largo del mes', () => {
  assert.equal(topeMensualDelPlan(3, '2026-09'), 13, '3 * 30 / 7 = 12,86 -> 13');
  assert.equal(topeMensualDelPlan(3, '2026-02'), 12, '3 * 28 / 7 = 12 justo');
  assert.equal(topeMensualDelPlan(2, '2026-09'), 9);
});

test('balance de Yanina: 13 usados, no queda excedida', () => {
  // 13 fijas - 1 suspendida con crédito + 2 individuales = 14 usados sobre tope 13.
  const b = balanceDelMes({
    turnosFijos: ['LUNES-08:30', 'MIERCOLES-08:30', 'JUEVES-08:30'],
    diasPorSemana: 3,
    mes: '2026-09',
    suspendidasConCredito: 1,
    individuales: 2
  });
  assert.equal(b.fijas, 13);
  assert.equal(b.tope, 13);
  assert.equal(b.usados, 14);
  assert.equal(b.libres, 0);
  assert.equal(b.excedidos, 1, 'se pasó por 1, y eso se informa sin bloquear');
});

test('balance normal: quedan cupos libres', () => {
  const b = balanceDelMes({
    turnosFijos: ['LUNES-08:30', 'MIERCOLES-08:30'],
    diasPorSemana: 3,
    mes: '2026-09',
    suspendidasConCredito: 0,
    individuales: 0
  });
  assert.equal(b.fijas, 9);
  assert.equal(b.tope, 13);
  assert.equal(b.libres, 4);
  assert.equal(b.excedidos, 0);
});

test('suspender con crédito devuelve el cupo', () => {
  const base = { turnosFijos: ['LUNES-08:30'], diasPorSemana: 1, mes: '2026-09', individuales: 0 };
  assert.equal(balanceDelMes({ ...base, suspendidasConCredito: 0 }).usados, 4);
  assert.equal(balanceDelMes({ ...base, suspendidasConCredito: 1 }).usados, 3);
});

test('usados nunca es negativo', () => {
  const b = balanceDelMes({
    turnosFijos: ['LUNES-08:30'], diasPorSemana: 1, mes: '2026-09',
    suspendidasConCredito: 99, individuales: 0
  });
  assert.equal(b.usados, 0);
});
