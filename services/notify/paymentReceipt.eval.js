// Periodic, local contract eval: run before enabling the production webhook.
import assert from 'node:assert/strict';
import { paymentReceiptParameters, senderPhoneMatches } from './paymentReceipt.js';

const cases = [
  { payment: { monto: 1000, mes_correspondiente: '2026-09' }, client: { nombre: 'Ana' }, expected: ['Ana', '$1.000,00', '2026-09'] },
  { payment: { monto: 1234.5, mes_correspondiente: '2026-10' }, client: { nombre: ' Juan  Carlos ' }, expected: ['Juan Carlos', '$1.234,50', '2026-10'] }
];
for (const item of cases) assert.deepEqual(paymentReceiptParameters(item.payment, item.client), item.expected);
const senders = [
  { expected: '+54 9 11 7840-2722', actual: '+54 9 11 7840-2722', allowed: true },
  { expected: '+54 9 11 7840-2722', actual: '+54 11 7840 2722', allowed: true },
  { expected: '+54 9 11 7840-2722', actual: '+54 9 11 3691-2698', allowed: false },
  { expected: '+54 9 11 7840-2722', actual: undefined, allowed: false }
];
for (const item of senders) assert.equal(senderPhoneMatches(item.expected, item.actual), item.allowed);
console.log(`paymentReceipt eval: ${cases.length + senders.length}/${cases.length + senders.length} cases passed`);
