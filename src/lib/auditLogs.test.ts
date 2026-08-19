// Gate tests del historial de auditoría. Deterministas, sin red, <2s.
//   npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeLogs, logsFaltantesEnDb, parsearLogsGuardados, nuevoLogId, MAX_LOGS, esUuid, normalizarIdsLegacy } from './auditLogs';
import { AuditLog } from '../types';

const log = (id: string, creado_at: string, accion = 'TEST'): AuditLog => ({
  id, usuario_id: '', usuario_email: 'admin@kaha.com', accion, detalles: {}, creado_at
});

test('mergeLogs une dos fuentes sin duplicar por id', () => {
  const db = [log('a', '2026-08-19T10:00:00.000Z')];
  const local = [log('a', '2026-08-19T10:00:00.000Z'), log('b', '2026-08-19T11:00:00.000Z')];
  const out = mergeLogs(db, local);
  assert.equal(out.length, 2);
  assert.deepEqual(out.map(l => l.id), ['b', 'a']); // más nuevo primero
});

test('mergeLogs NO pierde los logs locales que no están en la base', () => {
  // Este es el bug reportado: la base tenía 2 filas y el refresh borraba el resto.
  const db = [log('db1', '2026-07-08T14:09:45.000Z'), log('db2', '2026-08-19T14:18:59.000Z')];
  const local = Array.from({ length: 20 }, (_, i) =>
    log(`local${i}`, `2026-08-1${(i % 9) + 1}T09:00:00.000Z`)
  );
  const out = mergeLogs(db, local);
  assert.equal(out.length, 22, 'deben sobrevivir los 2 de la base + los 20 locales');
  for (const l of local) {
    assert.ok(out.some(o => o.id === l.id), `se perdió ${l.id}`);
  }
});

test('mergeLogs ordena descendente por fecha', () => {
  const out = mergeLogs([
    log('viejo', '2026-01-01T00:00:00.000Z'),
    log('nuevo', '2026-12-31T00:00:00.000Z'),
    log('medio', '2026-06-15T00:00:00.000Z')
  ]);
  assert.deepEqual(out.map(l => l.id), ['nuevo', 'medio', 'viejo']);
});

test('mergeLogs corta en MAX_LOGS conservando los más nuevos', () => {
  const muchos = Array.from({ length: MAX_LOGS + 50 }, (_, i) =>
    log(`l${i}`, new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString())
  );
  const out = mergeLogs(muchos);
  assert.equal(out.length, MAX_LOGS);
  assert.equal(out[0].id, `l${MAX_LOGS + 49}`, 'el primero debe ser el más nuevo');
});

test('mergeLogs prioriza la primera fuente ante mismo id', () => {
  const db = [log('x', '2026-08-19T10:00:00.000Z', 'DESDE_DB')];
  const local = [log('x', '2026-08-19T10:00:00.000Z', 'DESDE_LOCAL')];
  assert.equal(mergeLogs(db, local)[0].accion, 'DESDE_DB');
});

test('mergeLogs tolera null, undefined y basura', () => {
  const out = mergeLogs(null, undefined, [log('a', '2026-08-19T10:00:00.000Z')], [null as any, { id: '' } as any]);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'a');
});

test('logsFaltantesEnDb detecta los que hay que subir', () => {
  const local = [log('a', '2026-08-19T10:00:00.000Z'), log('b', '2026-08-19T11:00:00.000Z')];
  const db = [log('a', '2026-08-19T10:00:00.000Z')];
  const faltan = logsFaltantesEnDb(local, db);
  assert.equal(faltan.length, 1);
  assert.equal(faltan[0].id, 'b');
});

test('logsFaltantesEnDb devuelve vacío si la base ya tiene todo', () => {
  const l = [log('a', '2026-08-19T10:00:00.000Z')];
  assert.deepEqual(logsFaltantesEnDb(l, l), []);
});

test('logsFaltantesEnDb con base vacía devuelve todo', () => {
  const local = [log('a', '2026-08-19T10:00:00.000Z'), log('b', '2026-08-19T11:00:00.000Z')];
  assert.equal(logsFaltantesEnDb(local, []).length, 2);
});

test('parsearLogsGuardados maneja JSON roto sin tirar', () => {
  assert.deepEqual(parsearLogsGuardados(null), []);
  assert.deepEqual(parsearLogsGuardados(''), []);
  assert.deepEqual(parsearLogsGuardados('{no es json'), []);
  assert.deepEqual(parsearLogsGuardados('{"a":1}'), []); // objeto, no array
});

test('parsearLogsGuardados filtra entradas inválidas', () => {
  const raw = JSON.stringify([log('a', '2026-08-19T10:00:00.000Z'), { nada: true }, null]);
  const out = parsearLogsGuardados(raw);
  assert.equal(out.length, 1);
  assert.equal(out[0].id, 'a');
});

test('nuevoLogId genera ids únicos con forma de UUID', () => {
  const ids = new Set(Array.from({ length: 500 }, () => nuevoLogId()));
  assert.equal(ids.size, 500, 'no debe repetir');
  for (const id of ids) {
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  }
});

test('esUuid distingue UUID de id legacy', () => {
  assert.equal(esUuid('66bd5261-f72b-4f6a-8e54-598718f56bed'), true);
  assert.equal(esUuid('log-1755612345678-a1b2c'), false);
  assert.equal(esUuid(''), false);
  assert.equal(esUuid(null), false);
});

test('normalizarIdsLegacy reemplaza ids viejos y conserva los UUID', () => {
  const uuidBueno = '66bd5261-f72b-4f6a-8e54-598718f56bed';
  const entrada = [
    log(uuidBueno, '2026-08-19T10:00:00.000Z'),
    log('log-1755612345678-a1b2c', '2026-08-19T11:00:00.000Z', 'VIEJO')
  ];
  const out = normalizarIdsLegacy(entrada);
  assert.equal(out[0].id, uuidBueno, 'el UUID válido no se toca');
  assert.ok(esUuid(out[1].id), 'el legacy debe quedar como UUID');
  assert.equal(out[1].accion, 'VIEJO', 'el resto del log se conserva');
  assert.equal(entrada[1].id, 'log-1755612345678-a1b2c', 'no debe mutar la entrada');
});

test('normalizarIdsLegacy deja todo listo para subir a una columna uuid', () => {
  const legacy = Array.from({ length: 10 }, (_, i) =>
    log(`log-17556123456${i}-x${i}`, `2026-08-19T1${i}:00:00.000Z`)
  );
  const out = normalizarIdsLegacy(legacy);
  assert.ok(out.every(l => esUuid(l.id)));
  assert.equal(new Set(out.map(l => l.id)).size, 10, 'los ids nuevos no se repiten');
});
