import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentReceiptHandler, paymentReceiptParameters } from './paymentReceipt.js';

const id = 'f6e9a01d-df5c-441c-bb37-0655afc0e227';
const payment = { id, cliente_id: 'a6e9a01d-df5c-441c-bb37-0655afc0e227', monto: 15000, mes_correspondiente: '2026-09', es_externo: false };
const client = { nombre: 'Ana', telefono: '11 3177-6907', recibos_whatsapp_consentimiento: true };
const env = { SUPABASE_SERVICE_ROLE_KEY: 'db-secret', WHATSAPP_TOKEN: 'meta-token', WHATSAPP_PHONE_NUMBER_ID: '123' };

function setup({ clientRow = client, paymentRow = payment, claimError = null, metaResponse = { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.1' }] }) } } = {}) {
  const writes = [];
  const db = {
    from(table) {
      return {
        select() { return { eq() { return { maybeSingle: async () => ({ data: table === 'pagos' ? paymentRow : clientRow, error: null }) }; } }; },
        async insert(row) { writes.push({ table, action: 'insert', row }); return { error: claimError }; },
        update(row) { writes.push({ table, action: 'update', row }); return { eq: async () => ({ error: null }) }; }
      };
    }
  };
  const requests = [];
  const fetchImpl = async (url, init) => { requests.push({ url, init }); return metaResponse; };
  const handler = createPaymentReceiptHandler({ db, fetchImpl, env });
  const run = async (body = { paymentId: id }) => {
    const req = { body };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    await handler(req, res);
    return res;
  };
  return { run, writes, requests };
}

test('committed payment sends one utility template with database values', async () => {
  const t = setup();
  const response = await t.run({ paymentId: id, monto: 1, telefono: 'attacker' });
  assert.equal(response.body.status, 'ACEPTADO');
  assert.equal(t.requests.length, 1);
  const sent = JSON.parse(t.requests[0].init.body);
  assert.equal(sent.to, '5491131776907');
  assert.equal(sent.template.name, 'recibo_pago');
  assert.deepEqual(sent.template.components[0].parameters, paymentReceiptParameters(payment, client).map(text => ({ type: 'text', text })));
  assert.deepEqual(t.writes.map(w => w.action), ['insert', 'update']);
});

test('no consent, phone or real client means no message', async () => {
  const scenarios = [
    { t: setup({ clientRow: { ...client, recibos_whatsapp_consentimiento: false } }), code: 200 },
    { t: setup({ clientRow: { ...client, telefono: '' } }), code: 200 },
    { t: setup({ paymentRow: { ...payment, es_externo: true } }), code: 200 }
  ];
  for (const { t, code } of scenarios) {
    const res = await t.run();
    assert.equal(res.statusCode, code);
    assert.equal(t.requests.length, 0);
  }
});

test('duplicate request does not send twice', async () => {
  const t = setup({ claimError: { code: '23505' } });
  assert.equal((await t.run()).body.status, 'already_processed');
  assert.equal(t.requests.length, 0);
});

test('Meta rejection is recorded as failed without a retry that might duplicate', async () => {
  const t = setup({ metaResponse: { ok: false, status: 400, json: async () => ({ error: { code: 132001 } }) } });
  assert.equal((await t.run()).body.status, 'FALLIDO');
  assert.equal(t.writes[1].row.error_codigo, '132001');
});

test('lost Meta response is marked uncertain and cannot be replayed', async () => {
  const t = setup({ metaResponse: null });
  const res = await t.run();
  assert.equal(res.body.status, 'INCIERTO');
  assert.equal(t.writes[1].row.error_codigo, 'network_error');
});

test('missing production credentials cannot claim or send a receipt', async () => {
  const t = setup();
  const handler = createPaymentReceiptHandler({ db: null, env: { PAYMENT_RECEIPT_WEBHOOK_SECRET: 'webhook-secret' } });
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  await handler({ body: { paymentId: id } }, res);
  assert.equal(res.statusCode, 503);
  assert.equal(t.requests.length, 0);
});

test('rejects invalid payment IDs', async () => {
  const t = setup();
  assert.equal((await t.run({ paymentId: 'not-a-uuid' })).statusCode, 400);
  assert.equal(t.requests.length, 0);
});
