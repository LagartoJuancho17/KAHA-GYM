import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyWebhookChallenge } from './webhook.js';

test('WhatsApp Webhook verification', async (t) => {
  await t.test('acepta modo subscribe y token exacto devolviendo el challenge como string', () => {
    const res = verifyWebhookChallenge({
      mode: 'subscribe',
      token: 'mi_secreto_123',
      challenge: '1158201444',
      expectedToken: 'mi_secreto_123'
    });
    assert.equal(res.ok, true);
    assert.equal(res.challenge, '1158201444');
  });

  await t.test('rechaza si el token no coincide', () => {
    const res = verifyWebhookChallenge({
      mode: 'subscribe',
      token: 'token_incorrecto',
      challenge: '1158201444',
      expectedToken: 'mi_secreto_123'
    });
    assert.equal(res.ok, false);
  });

  await t.test('rechaza si el modo no es subscribe', () => {
    const res = verifyWebhookChallenge({
      mode: 'other_mode',
      token: 'mi_secreto_123',
      challenge: '1158201444',
      expectedToken: 'mi_secreto_123'
    });
    assert.equal(res.ok, false);
  });

  await t.test('rechaza si falta el expectedToken', () => {
    const res = verifyWebhookChallenge({
      mode: 'subscribe',
      token: 'mi_secreto_123',
      challenge: '1158201444',
      expectedToken: ''
    });
    assert.equal(res.ok, false);
  });
});
