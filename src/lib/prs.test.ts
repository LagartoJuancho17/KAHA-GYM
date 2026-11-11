// src/lib/prs.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EJERCICIOS_PR,
  DEFAULT_RUTINAS_PR,
  PORCENTAJES_PR,
  calcularTablaPorcentajes,
  formatearFechaCortaPR,
  aplicarActualizacionPR,
  obtenerPesoPorReps,
  parsearTiempoASegundos,
  formatearSegundosATiempo,
  formatearFechaRutinaPR,
  obtenerMejorTiempoSegundos
} from './prs';

test('incluye los 5 ejercicios base por defecto', () => {
  assert.equal(DEFAULT_EJERCICIOS_PR.length, 5);
  assert.deepEqual(
    DEFAULT_EJERCICIOS_PR.map(e => e.nombre),
    ['Clean', 'Snatch', 'Back Squat', 'Bench Press', 'Deadlift']
  );
});

test('calcula los 16 porcentajes desde 105% hasta 30% igual que la pantalla de referencia', () => {
  assert.equal(PORCENTAJES_PR.length, 16);
  assert.equal(PORCENTAJES_PR[0], 105);
  assert.equal(PORCENTAJES_PR[1], 100);
  assert.equal(PORCENTAJES_PR[15], 30);

  const tabla = calcularTablaPorcentajes(100);
  assert.equal(tabla[0].pesoFormateado, '105');
  assert.equal(tabla[1].pesoFormateado, '100');
  assert.equal(tabla[1].esCienPorciento, true);
  assert.equal(tabla[2].pesoFormateado, '95');
  assert.equal(tabla[15].pesoFormateado, '30');
});

test('devuelve "--" cuando el RM seleccionado aún no tiene peso cargado', () => {
  const tabla = calcularTablaPorcentajes(null);
  assert.ok(tabla.every(c => c.pesoFormateado === '--'));
});

test('aplicarActualizacionPR actualiza marcas y agrega entrada al historial automáticamente', () => {
  const reg1 = aplicarActualizacionPR({
    cliente_id: 'socio-1',
    ejercicio_id: 'pr-clean',
    rm_1: 100,
    fecha: '2026-10-13',
    registrado_por: 'socio@kaha.com'
  });

  assert.equal(reg1.rm_1, 100);
  assert.equal(reg1.rm_2, null);
  assert.equal(reg1.historial.length, 1);
  assert.equal(reg1.historial[0].reps, 1);
  assert.equal(reg1.historial[0].peso, 100);
  assert.equal(formatearFechaCortaPR(reg1.historial[0].fecha), 'oct 13');
  assert.equal(obtenerPesoPorReps(reg1, 1), 100);
  assert.equal(obtenerPesoPorReps(reg1, 2), null);
});

test('parsea y formatea tiempos de rutinas (BULGER 23:30) y detecta el menor tiempo como PR', () => {
  assert.equal(DEFAULT_RUTINAS_PR[0].titulo, 'BULGER');
  const segs = parsearTiempoASegundos('23:30');
  assert.equal(segs, 1410);
  assert.equal(formatearSegundosATiempo(segs!), '23:30');
  assert.equal(formatearFechaRutinaPR('2026-07-30'), '30 jul 2026');

  const mejor = obtenerMejorTiempoSegundos([
    {
      id: '1',
      rutina_id: 'rutina-bulger',
      cliente_id: 's1',
      tiempo_segundos: 1500,
      tiempo_texto: '25:00',
      fecha: '2026-07-01',
      creado_at: '2026-07-01T10:00:00Z'
    },
    {
      id: '2',
      rutina_id: 'rutina-bulger',
      cliente_id: 's1',
      tiempo_segundos: 1410,
      tiempo_texto: '23:30',
      fecha: '2026-07-30',
      nota: 'Vertical + Push up',
      creado_at: '2026-07-30T10:00:00Z'
    }
  ]);
  assert.equal(mejor, 1410);
});

