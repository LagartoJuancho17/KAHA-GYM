import test from 'node:test';
import assert from 'node:assert/strict';

test('generación de hashes únicos para pagos múltiples con el mismo comprobante', () => {
  const baseHash = 'TRF-123456';
  const count = 4;
  const itemHashes = Array.from({ length: count }, (_, idx) => `${baseHash}#${idx + 1}`);

  // Todos los hashes deben ser diferentes para evitar la restricción UNIQUE de Supabase
  const uniqueSet = new Set(itemHashes);
  assert.equal(uniqueSet.size, 4);
  assert.equal(itemHashes[0], 'TRF-123456#1');
  assert.equal(itemHashes[3], 'TRF-123456#4');
});

test('reducción acumulativa de deuda en múltiples cuotas para el mismo socio', () => {
  let deuda = 100000;
  const pagos = [
    { monto: 25000, mes: '2026-06' },
    { monto: 25000, mes: '2026-07' },
    { monto: 25000, mes: '2026-08' },
    { monto: 25000, mes: '2026-09' },
  ];

  let ultimoMes = '2026-05';
  pagos.forEach(p => {
    deuda = Math.max(0, deuda - p.monto);
    if (p.mes > ultimoMes) {
      ultimoMes = p.mes;
    }
  });

  assert.equal(deuda, 0);
  assert.equal(ultimoMes, '2026-09');
});

test('sugerencia correlativa del siguiente mes cuando se agrega otra cuota', () => {
  const mesesAgregados = ['2026-09', '2026-10', '2026-11'];
  const ultimoMes = mesesAgregados[mesesAgregados.length - 1];
  const [yStr, mStr] = ultimoMes.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const siguienteMes = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;

  assert.equal(siguienteMes, '2026-12');
});
