import { createHmac, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';

const COOKIE = 'kaha_receipt_session';
const EIGHT_HOURS = 8 * 60 * 60;

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function sessionCookieValue(email, secret, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ email, exp: Math.floor(now / 1000) + EIGHT_HOURS })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySession(value, secret, now = Date.now()) {
  if (!value || !secret || secret.length < 32) return null;
  const [payload, signature, extra] = value.split('.');
  if (!payload || !signature || extra) return null;
  const expected = Buffer.from(sign(payload, secret));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed.exp > Math.floor(now / 1000) && typeof parsed.email === 'string' ? parsed.email : null;
  } catch { return null; }
}

export function receiptAdminEmails(env) {
  return new Set((env.PAYMENT_RECEIPT_ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean));
}

export function createReceiptAuth({ env = process.env, verifyGoogle = async (token, clientId) => {
  const ticket = await new OAuth2Client().verifyIdToken({ idToken: token, audience: clientId });
  return ticket.getPayload();
} } = {}) {
  const configured = () => Boolean(env.GOOGLE_CLIENT_ID && env.PAYMENT_RECEIPT_SESSION_SECRET?.length >= 32 && receiptAdminEmails(env).size);
  const secure = req => req.secure || req.get('x-forwarded-proto') === 'https';
  const cookieOptions = req => `Path=/api; HttpOnly; SameSite=Strict; Max-Age=${EIGHT_HOURS}${secure(req) ? '; Secure' : ''}`;

  return {
    async login(req, res) {
      if (!configured()) return res.status(503).json({ error: 'auth_not_configured' });
      try {
        const payload = await verifyGoogle(req.body?.credential, env.GOOGLE_CLIENT_ID);
        const email = String(payload?.email || '').toLowerCase();
        if (!payload?.email_verified || !receiptAdminEmails(env).has(email)) return res.status(403).json({ error: 'not_admin' });
        res.set('Set-Cookie', `${COOKIE}=${sessionCookieValue(email, env.PAYMENT_RECEIPT_SESSION_SECRET)}; ${cookieOptions(req)}`);
        return res.status(200).json({ authenticated: true });
      } catch { return res.status(401).json({ error: 'invalid_google_token' }); }
    },
    logout(req, res) {
      res.set('Set-Cookie', `${COOKIE}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0${secure(req) ? '; Secure' : ''}`);
      return res.status(200).json({ authenticated: false });
    },
    requireAdmin(req, res, next) {
      if (!configured()) return res.status(503).json({ error: 'auth_not_configured' });
      const cookie = (req.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`));
      const email = verifySession(cookie?.slice(COOKIE.length + 1), env.PAYMENT_RECEIPT_SESSION_SECRET);
      if (!email || !receiptAdminEmails(env).has(email)) return res.status(401).json({ error: 'admin_session_required' });
      req.receiptAdminEmail = email;
      return next();
    }
  };
}
