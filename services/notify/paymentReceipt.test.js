import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentReceiptHandler, paymentReceiptParameters, senderPhoneMatches } from './paymentReceipt.js';

const id = 'f6e9a01d-df5c-441c-bb37-0655afc0e227';
const payment = { id, cliente_id: 'a6e9a01d-df5c-441c-bb37-0655afc0e227', monto: 15000, mes_correspondiente: '2026-09', es_externo: false };
const client = { nombre: 'Ana', telefono: '11 3177-6907', recibos_whatsapp_consentimiento: true };
const env = { SUPABASE_SERVICE_ROLE_KEY: 'db-secret', WHATSAPP_TOKEN: 'meta-token', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_EXPECTED_SENDER: '+54 9 11 7840-2722' };

function setup({ clientRow = client, paymentRow = payment, claimError = null, senderResponse = { ok: true, json: async () => ({ display_phone_number: '+54 9 11 7840-2722' }) }, metaResponse = { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.1' }] }) } } = {}) {
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
  const fetchImpl = async (url, init) => { requests.push({ url, init }); return init.method === 'GET' ? senderResponse : metaResponse; };
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
  assert.equal(t.requests.length, 2);
  assert.match(t.requests[0].url, /\/123\?fields=display_phone_number$/);
  const sent = JSON.parse(t.requests[1].init.body);
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
  assert.equal(t.requests.filter(request => request.init.method === 'POST').length, 0);
});

test('wrong Meta sender fails closed before claiming a payment', async () => {
  const t = setup({ senderResponse: { ok: true, json: async () => ({ display_phone_number: '+54 9 11 3691-2698' }) } });
  const response = await t.run();
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error, 'sender_mismatch');
  assert.equal(t.requests.length, 1);
  assert.equal(t.writes.length, 0);
});

test('unavailable Meta sender lookup fails closed before claiming a payment', async () => {
  const t = setup({ senderResponse: { ok: false, status: 403 } });
  const response = await t.run();
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.error, 'sender_lookup_failed');
  assert.equal(t.writes.length, 0);
});

test('sender comparison normalizes Argentina country and mobile prefixes', () => {
  assert.equal(senderPhoneMatches('+54 9 11 7840-2722', '+54 11 7840 2722'), true);
  assert.equal(senderPhoneMatches('+54 9 11 7840-2722', '+54 9 11 3691-2698'), false);
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
