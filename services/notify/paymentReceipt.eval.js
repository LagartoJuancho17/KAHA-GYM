// Periodic, local contract eval: run before enabling the production webhook.
import assert from 'node:assert/strict';
import { paymentReceiptParameters } from './paymentReceipt.js';

const cases = [
  { payment: { monto: 1000, mes_correspondiente: '2026-09' }, client: { nombre: 'Ana' }, expected: ['Ana', '$1.000,00', '2026-09'] },
  { payment: { monto: 1234.5, mes_correspondiente: '2026-10' }, client: { nombre: ' Juan  Carlos ' }, expected: ['Juan Carlos', '$1.234,50', '2026-10'] }
];
for (const item of cases) assert.deepEqual(paymentReceiptParameters(item.payment, item.client), item.expected);
console.log(`paymentReceipt eval: ${cases.length}/${cases.length} cases passed`);
