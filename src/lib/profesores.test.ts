// src/lib/profesores.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PROFESORES,
  buscarProfesorActivoPorEmail,
  validarPasswordProfesor,
  reconstruirProfesoresDesdeAuditLogs
} from './profesores';

test('DEFAULT_PROFESORES incluye a Christian Martínez con acceso de profesor', () => {
  const christian = buscarProfesorActivoPorEmail('christian.martinez04@hotmail.com', DEFAULT_PROFESORES);
  assert.ok(christian);
  assert.equal(christian.nombre, 'Christian Martínez');
  assert.equal(validarPasswordProfesor('profe123', christian), true);
  assert.equal(validarPasswordProfesor('kaha1234', christian), true);
  assert.equal(validarPasswordProfesor('123456', christian), true);
  assert.equal(validarPasswordProfesor('clave-invalida', christian), false);
});

test('reconstruirProfesoresDesdeAuditLogs reconstruye altas, ediciones y bajas de profesores desde Supabase', () => {
  const res = reconstruirProfesoresDesdeAuditLogs({
    logs: [
      {
        id: 'log-prof-1',
        accion: 'PROFESOR_REGISTRADO',
        detalles: {
          id: 'prof-nuevo-1',
          nombre: 'Sofía Gómez',
          email: 'sofia.profe@hotmail.com',
          telefono: '11-5566-7788',
          valor_hora: 3000,
          password: 'miClaveProfe'
        },
        creado_at: '2026-11-17T15:00:00.000Z'
      }
    ]
  });

  const sofia = buscarProfesorActivoPorEmail('sofia.profe@hotmail.com', res.profesores);
  assert.ok(sofia);
  assert.equal(sofia.nombre, 'Sofía Gómez');
  assert.equal(sofia.valor_hora, 3000);
  assert.equal(validarPasswordProfesor('miClaveProfe', sofia), true);
  assert.equal(validarPasswordProfesor('1155667788', sofia), true);
});
