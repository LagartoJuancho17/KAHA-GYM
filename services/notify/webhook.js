export function verifyWebhookChallenge({ mode, token, challenge, expectedToken }) {
  if (mode === 'subscribe' && token && expectedToken && token === expectedToken) {
    return { ok: true, challenge: String(challenge == null ? '' : challenge) };
  }
  return { ok: false };
}
