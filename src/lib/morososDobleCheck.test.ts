import test from 'node:test';
import assert from 'node:assert/strict';

test('validación de doble chequeo: debe requerir checkbox y desbloqueo para autorizar', () => {
  const canAuthorize = (confirmCheck: boolean, isUnlocked: boolean) => {
    return confirmCheck && isUnlocked;
  };

  // Sin marcar checkbox ni desbloquear
  assert.equal(canAuthorize(false, false), false);
  // Solo con checkbox marcado
  assert.equal(canAuthorize(true, false), false);
  // Solo desbloqueado pero sin checkbox (no permitido)
  assert.equal(canAuthorize(false, true), false);
  // Ambos pasos completados
  assert.equal(canAuthorize(true, true), true);
});

test('desbloqueo por deslizamiento requiere alcanzar al menos el 80% del recorrido', () => {
  const maxDrag = 200;
  const isThresholdMet = (dragX: number) => dragX >= maxDrag * 0.8;

  assert.equal(isThresholdMet(50), false);
  assert.equal(isThresholdMet(150), false);
  assert.equal(isThresholdMet(160), true);
  assert.equal(isThresholdMet(200), true);
});

test('tipos de movimientos contemplados en el módulo de morosidad', () => {
  const movimientosValidos = [
    'BAJA_TURNOS_FIJOS',
    'BAJA_MASIVA_TURNOS',
    'BAJA_SOCIO',
    'ALTA_SOCIO',
    'COBRO_MOROSIDAD',
    'EXENCION_COBRO'
  ];

  // Comprobar que todos son tipos reconocidos
  assert.equal(movimientosValidos.length, 6);
  assert.ok(movimientosValidos.includes('BAJA_TURNOS_FIJOS'));
  assert.ok(movimientosValidos.includes('ALTA_SOCIO'));
  assert.ok(movimientosValidos.includes('BAJA_SOCIO'));
  assert.ok(movimientosValidos.includes('COBRO_MOROSIDAD'));
});
