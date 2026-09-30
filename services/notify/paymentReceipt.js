import { normalizeArgPhone, isSendablePhone } from './phone.js';

export function paymentReceiptParameters(payment, client) {
  return [
    String(client.nombre || 'socio').replace(/\s+/g, ' ').trim(),
    `$${Number(payment.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    String(payment.mes_correspondiente || '').trim()
  ];
}

export function createPaymentReceiptHandler({ db, fetchImpl = fetch, env = process.env }) {
  return async (req, res) => {
    if (!db || !env.SUPABASE_SERVICE_ROLE_KEY || !env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      return res.status(503).json({ error: 'not_configured' });
    }
    const paymentId = req.body?.paymentId;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId || '')) {
      return res.status(400).json({ error: 'invalid_payment_id' });
    }

    // Read the committed row. Never trust amounts, names or numbers in browser JSON.
    const { data: payment, error: paymentError } = await db.from('pagos').select('id,cliente_id,monto,mes_correspondiente,es_externo').eq('id', paymentId).maybeSingle();
    if (paymentError) return res.status(503).json({ error: 'payment_lookup_failed' });
    if (!payment) return res.status(404).json({ error: 'payment_not_found' });
    if (payment.es_externo || !payment.cliente_id) return res.status(200).json({ status: 'external_skipped' });

    const { data: client, error: clientError } = await db.from('clientes').select('nombre,telefono,recibos_whatsapp_consentimiento').eq('id', payment.cliente_id).maybeSingle();
    if (clientError) return res.status(503).json({ error: 'client_lookup_failed' });
    if (!client?.recibos_whatsapp_consentimiento) return res.status(200).json({ status: 'no_consent' });
    const to = normalizeArgPhone(client.telefono);
    if (!isSendablePhone(to)) return res.status(200).json({ status: 'invalid_phone' });

    // pago_id is unique. A repeated request cannot send a second message, including when
    // Meta accepted the first request but the network response was lost.
    const { error: claimError } = await db.from('recibos_whatsapp').insert({ pago_id: paymentId, estado: 'ENVIANDO' });
    if (claimError?.code === '23505') return res.status(200).json({ status: 'already_processed' });
    if (claimError) return res.status(503).json({ error: 'claim_failed' });

    let result = { estado: 'INCIERTO', error_codigo: 'network_error' };
    try {
      const response = await fetchImpl(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION || 'v26.0'}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        signal: AbortSignal.timeout(8000),
        headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'template',
          template: {
            name: env.WHATSAPP_TEMPLATE_RECIBO || 'recibo_pago',
            language: { code: env.WHATSAPP_TEMPLATE_LANG || 'es_AR' },
            components: [{ type: 'body', parameters: paymentReceiptParameters(payment, client).map(text => ({ type: 'text', text })) }]
          }
        })
      });
      const body = await response.json().catch(() => ({}));
      result = response.ok && body.messages?.[0]?.id
        ? { estado: 'ACEPTADO', meta_message_id: body.messages[0].id, error_codigo: null }
        : { estado: 'FALLIDO', error_codigo: String(body.error?.code || response.status).slice(0, 80) };
    } catch (error) {
      console.error('[recibo-whatsapp] Resultado de Meta incierto:', error);
    }
    const { error: updateError } = await db.from('recibos_whatsapp').update(result).eq('pago_id', paymentId);
    if (updateError) {
      console.error('[recibo-whatsapp] No se pudo guardar el estado:', updateError);
      return res.status(503).json({ error: 'status_update_failed' });
    }
    return res.status(200).json({ status: result.estado });
  };
}
