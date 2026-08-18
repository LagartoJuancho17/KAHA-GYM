import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { normalizeArgPhone, isSendablePhone } from './services/notify/phone.js';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

// Expose the secure API endpoint for Mercado Pago Checkout Pro
app.post('/api/create-preference', async (req, res) => {
  try {
    const { amount, title, clientId } = req.body;
    const token = process.env.MP_ACCESS_TOKEN;

    if (!token) {
      return res.status(500).json({ error: 'Mercado Pago Access Token not configured on server.' });
    }

    // Determine the base origin of the client to redirect back and force HTTPS
    const origin = req.headers.referer || req.headers.origin || `http://localhost:${port}`;
    const urlObj = new URL(origin);
    const baseOrigin = urlObj.origin.replace(/^http:/, 'https:');

    console.log('>> [API server.js] Creando preferencia:', {
      amount,
      title,
      clientId,
      origin,
      baseOrigin,
      successUrl: `${baseOrigin}/?mp_status=success&clientId=${clientId}&amount=${amount}`
    });

    // Call Mercado Pago API securely using official SDK
    const client = new MercadoPagoConfig({ accessToken: token });
    const preferenceBuilder = new Preference(client);

    const result = await preferenceBuilder.create({
      body: {
        items: [
          {
            id: 'cuota-kaha',
            title: title || 'Pago de Cuota - KAHA GYM',
            unit_price: Number(amount),
            quantity: 1,
            currency_id: 'ARS'
          }
        ],
        back_urls: {
          success: `${baseOrigin}/?mp_status=success&clientId=${clientId}&amount=${amount}`,
          pending: `${baseOrigin}/?mp_status=pending&clientId=${clientId}`,
          failure: `${baseOrigin}/?mp_status=failure&clientId=${clientId}`
        },
        auto_return: 'approved',
        notification_url: `${baseOrigin}/api/webhooks/mercadopago`,
        external_reference: clientId,
        metadata: {
          client_id: clientId,
          amount: Number(amount)
        }
      }
    });

    return res.status(201).json(result);
  } catch (err) {
    console.error('Error creating Mercado Pago preference:', err);
    return res.status(500).json({ error: err.message || 'Error processing request' });
  }
});

// Webhook endpoint to receive asynchronous updates from Mercado Pago
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const payload = req.body;
    console.log('>> [Webhook] Recibida notificación de Mercado Pago:', payload);

    const token = process.env.MP_ACCESS_TOKEN;
    if (payload.type === 'payment' && payload.data && payload.data.id) {
      const paymentId = payload.data.id;
      console.log(`>> [Webhook] Consultando detalles para pago ID: ${paymentId}`);

      const clientConfig = new MercadoPagoConfig({ accessToken: token });
      const paymentBuilder = new Payment(clientConfig);

      try {
        const paymentData = await paymentBuilder.get({ id: paymentId });
        const { status, status_detail, external_reference, metadata } = paymentData;

        console.log('>> [Webhook] Detalle de Pago obtenido:', {
          status,
          status_detail,
          external_reference,
          metadata
        });

        // If the payment is approved, proceed to sync with database
        if (status === 'approved' && external_reference) {
          const clientId = external_reference;
          const amount = metadata && metadata.amount ? Number(metadata.amount) : Number(paymentData.transaction_amount);

          if (supabase) {
            console.log(`>> [Webhook] Sincronizando pago de $${amount} para socio ${clientId} en Supabase...`);
            
            // 1. Fetch current client data
            const { data: client, error: clientErr } = await supabase
              .from('clientes')
              .select('id, nombre, apellido, email, deuda_acumulada, estado, ultimo_mes_pagado')
              .eq('id', clientId)
              .single();

            if (clientErr || !client) {
              console.error('>> [Webhook] Cliente no encontrado en DB o error:', clientErr);
            } else {
              const currentDebt = Number(client.deuda_acumulada);
              const nuevaDeuda = Math.max(0, currentDebt - amount);
              const nuevoEstado = nuevaDeuda === 0 ? 'ACTIVO' : 'CON_DEUDA';
              const mesActual = new Date().toISOString().slice(0, 7);
              const ultimoMes = (!client.ultimo_mes_pagado || mesActual > client.ultimo_mes_pagado)
                ? mesActual
                : client.ultimo_mes_pagado;

              // 2. Update client debt & status
              const { error: updateErr } = await supabase
                .from('clientes')
                .update({
                  deuda_acumulada: nuevaDeuda,
                  estado: nuevoEstado,
                  ultimo_mes_pagado: ultimoMes,
                  actualizado_at: new Date().toISOString()
                })
                .eq('id', clientId);

              if (updateErr) {
                console.error('>> [Webhook] Error actualizando cliente:', updateErr);
              } else {
                console.log('>> [Webhook] Cliente actualizado exitosamente.');
              }

              // 3. Register payment
              const { error: pagoErr } = await supabase
                .from('pagos')
                .insert({
                  cliente_id: clientId,
                  monto: amount,
                  medio_pago: 'MERCADO_PAGO',
                  mes_correspondiente: mesActual,
                  hash_transaccion: `MP-${paymentId}`,
                  creado_at: new Date().toISOString(),
                  fecha_pago: new Date().toISOString()
                });

              if (pagoErr) {
                console.error('>> [Webhook] Error insertando pago en DB:', pagoErr);
              } else {
                console.log('>> [Webhook] Pago registrado exitosamente en DB.');
              }

              // 4. Log audit log
              await supabase
                .from('logs_auditoria')
                .insert({
                  accion: 'PAGO_WEBHOOK_REGISTRADO',
                  usuario_email: client.email,
                  detalles: {
                    cliente: `${client.nombre} ${client.apellido}`,
                    monto: amount,
                    pago_id: paymentId,
                    deuda_restante: nuevaDeuda
                  }
                });
            }
          } else {
            console.log('>> [Webhook] Supabase no está configurado. Sincronización omitida (se ejecutó localmente en el cliente).');
          }
        }
      } catch (fetchErr) {
        console.error('>> [Webhook] Error al consultar pago:', fetchErr.message);
      }
    }

    // Acknowledge webhook
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('>> [Webhook] Error crítico procesando webhook:', err);
    return res.status(500).json({ error: err.message || 'Error processing webhook' });
  }
});

// -----------------------------------------------------------------------------
// Aviso al socio cuando lo dan de baja de una clase.
// Canal 1 (preferido): WhatsApp Business API oficial (plantilla "utility" de Meta).
// Canal 2 (respaldo):  email vía Resend, si no hay WhatsApp o el número no sirve.
// Todas las credenciales viven SOLO en env; nunca en el frontend ni en el repo.
//   WhatsApp: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
//             WHATSAPP_TEMPLATE_BAJA (def "baja_clase"), WHATSAPP_TEMPLATE_LANG (def "es_AR"),
//             WHATSAPP_API_VERSION (def "v21.0")
//   Email:    RESEND_API_KEY, RESEND_FROM
// -----------------------------------------------------------------------------

// Texto seguro para parámetros de plantilla de WhatsApp (sin saltos ni espacios largos).
function paramSafe(s) {
  return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

// Envía la plantilla de baja por WhatsApp Cloud API. Devuelve { ok, id } o { ok:false, detail }.
async function enviarWhatsappBaja({ telefono, nombreSocio, claseTxt }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return { ok: false, reason: 'sin_whatsapp_config' };

  const to = normalizeArgPhone(telefono);
  if (!isSendablePhone(to)) return { ok: false, reason: 'telefono_invalido' };

  const templateName = process.env.WHATSAPP_TEMPLATE_BAJA || 'baja_clase';
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'es_AR';
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';

  const resp = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: lang },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: paramSafe(nombreSocio) },
              { type: 'text', text: paramSafe(claseTxt) }
            ]
          }
        ]
      }
    })
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error('>> [notify-baja] Error de WhatsApp:', JSON.stringify(data));
    return { ok: false, reason: 'whatsapp_error', detail: data };
  }
  const id = data && data.messages && data.messages[0] && data.messages[0].id;
  return { ok: true, id };
}

// Envía el aviso por email vía Resend. Devuelve { ok, id } o { ok:false, detail }.
async function enviarEmailBaja({ email, nombreSocio, claseTxt, motivo }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const esInvitado = cleanEmail.startsWith('invitado-') && cleanEmail.endsWith('@kaha.com');
  const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail);
  if (!emailValido || esInvitado) return { ok: false, reason: 'sin_email_valido' };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'sin_api_key' };

  const from = process.env.RESEND_FROM || 'KAHA GYM <onboarding@resend.dev>';
  const motivoLinea = motivo ? `<p style="margin:0 0 16px;color:#3f3f46;font-size:14px;">Motivo: ${motivo}</p>` : '';

  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f2;font-family:Inter,Arial,sans-serif;">
      <div style="max-width:520px;margin:0 auto;padding:24px;">
        <div style="background:#18181b;border-radius:20px;padding:24px 24px 20px;">
          <div style="color:#c8f63e;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-family:monospace;">KAHA GYM</div>
          <h1 style="color:#fff;margin:6px 0 0;font-size:20px;font-weight:800;">Baja de una clase</h1>
        </div>
        <div style="background:#fff;border:1px solid #e7e7e4;border-top:none;border-radius:0 0 20px 20px;padding:24px;">
          <p style="margin:0 0 14px;color:#18181b;font-size:15px;">${nombreSocio}, te avisamos que fuiste dado/a de baja de la siguiente clase:</p>
          <div style="background:#f7ffe3;border:1px solid #dcfd85;border-radius:14px;padding:14px 16px;margin:0 0 16px;">
            <div style="color:#3b4e17;font-size:18px;font-weight:800;">${claseTxt}</div>
          </div>
          ${motivoLinea}
          <p style="margin:0 0 20px;color:#52525b;font-size:14px;line-height:1.5;">Si creés que es un error o querés reprogramar tu horario, respondé este mail o escribinos por WhatsApp y lo resolvemos.</p>
          <p style="margin:0;color:#a1a1aa;font-size:12px;">— Equipo KAHA GYM</p>
        </div>
      </div>
    </body></html>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [cleanEmail], subject: `Baja de ${claseTxt} — KAHA GYM`, html })
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error('>> [notify-baja] Error de Resend:', data);
    return { ok: false, reason: 'resend_error', detail: data };
  }
  return { ok: true, id: data.id };
}

app.post('/api/notify-baja', async (req, res) => {
  try {
    const { email, telefono = '', nombre = '', dia = '', hora = '', fecha = '', motivo = '' } = req.body || {};

    const nombreSocio = String(nombre || '').trim() || 'Hola';
    const horaFmt = hora ? String(hora).slice(0, 5) : '';
    // Si viene fecha (baja de una clase puntual desde la turnera), la mostramos DD/MM.
    // Si no, es la baja del horario fijo semanal (solo día + hora).
    const fechaMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha || '').trim());
    const fechaFmt = fechaMatch ? `${fechaMatch[3]}/${fechaMatch[2]}` : '';
    const claseTxt = [dia, fechaFmt, horaFmt ? `${horaFmt} hs` : ''].filter(Boolean).join(' ') || 'tu clase';

    // 1) WhatsApp primero (si está configurado y el número sirve).
    const wpp = await enviarWhatsappBaja({ telefono, nombreSocio, claseTxt });
    if (wpp.ok) {
      return res.status(200).json({ sent: true, channel: 'whatsapp', id: wpp.id });
    }

    // 2) Email de respaldo.
    const mail = await enviarEmailBaja({ email, nombreSocio, claseTxt, motivo });
    if (mail.ok) {
      return res.status(200).json({ sent: true, channel: 'email', id: mail.id, whatsapp_skip: wpp.reason });
    }

    return res.status(200).json({ sent: false, reason: mail.reason, whatsapp_skip: wpp.reason });
  } catch (err) {
    console.error('>> [notify-baja] Error:', err);
    return res.status(500).json({ sent: false, reason: 'server_error', detail: err.message });
  }
});

// Serve static assets from build output folder
app.use(express.static(path.join(__dirname, 'dist')));

// SPA support: Route all remaining traffic to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

if (!process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server is running in production mode on port ${port}`);
  });
}

export default app;
