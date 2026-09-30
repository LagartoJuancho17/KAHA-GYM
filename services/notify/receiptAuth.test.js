import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceiptAuth, sessionCookieValue, verifySession } from './receiptAuth.js';

const env = {
  GOOGLE_CLIENT_ID: 'client.apps.googleusercontent.com',
  PAYMENT_RECEIPT_ADMIN_EMAILS: 'admin@example.com',
  PAYMENT_RECEIPT_SESSION_SECRET: 'a-long-random-secret-with-more-than-32-characters'
};
function response() {
  return { statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; }, set(k, v) { this.headers[k] = v; return this; }, json(body) { this.body = body; return this; } };
}
function request(credential = 'token', cookie = '') {
  return { body: { credential }, secure: true, get: key => key === 'cookie' ? cookie : key === 'x-forwarded-proto' ? 'https' : undefined };
}

test('signed receipt session expires and rejects tampering', () => {
  const cookie = sessionCookieValue('admin@example.com', env.PAYMENT_RECEIPT_SESSION_SECRET, 0);
  assert.equal(verifySession(cookie, env.PAYMENT_RECEIPT_SESSION_SECRET, 1000), 'admin@example.com');
  assert.equal(verifySession(cookie, env.PAYMENT_RECEIPT_SESSION_SECRET, 9 * 60 * 60 * 1000), null);
  assert.equal(verifySession(cookie + 'x', env.PAYMENT_RECEIPT_SESSION_SECRET, 1000), null);
});

test('verified Google admin gets HttpOnly session and may send', async () => {
  const auth = createReceiptAuth({ env, verifyGoogle: async () => ({ email: 'admin@example.com', email_verified: true }) });
  const res = response();
  await auth.login(request(), res);
  assert.equal(res.statusCode, 200);
  assert.match(res.headers['Set-Cookie'], /HttpOnly; SameSite=Strict/);
  assert.match(res.headers['Set-Cookie'], /Secure/);
  const cookie = res.headers['Set-Cookie'].split(';')[0];
  let admitted = false;
  auth.requireAdmin(request('token', cookie), response(), () => { admitted = true; });
  assert.equal(admitted, true);
});

test('unknown account, unverified email and missing cookie cannot send', async () => {
  for (const claims of [
    { email: 'other@example.com', email_verified: true },
    { email: 'admin@example.com', email_verified: false }
  ]) {
    const auth = createReceiptAuth({ env, verifyGoogle: async () => claims });
    const res = response();
    await auth.login(request(), res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.headers['Set-Cookie'], undefined);
  }
  const auth = createReceiptAuth({ env });
  const res = response();
  auth.requireAdmin(request(), res, () => assert.fail('must not admit'));
  assert.equal(res.statusCode, 401);
});
