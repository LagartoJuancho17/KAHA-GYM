import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';
import { normalizeArgPhone, isSendablePhone } from './services/notify/phone.js';
import { normalizarSupabaseUrl } from './services/supabase/baseUrl.js';

// Load environment variables from .env
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Initialize Supabase Client
// La URL se normaliza porque en producción viene con "/rest/v1" pegado y
// supabase-js lo vuelve a agregar: la API respondía PGRST125 y fallaba TODA
// operación del servidor contra Supabase. Ver services/supabase/baseUrl.js.
const supabaseUrl = normalizarSupabaseUrl(process.env.SUPABASE_URL);
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (process.env.SUPABASE_URL && supabaseUrl !== process.env.SUPABASE_URL.trim()) {
  console.warn(
    `>> [supabase] SUPABASE_URL venía como "${process.env.SUPABASE_URL}" y se normalizó a "${supabaseUrl}". ` +
    `Conviene dejar en la variable sólo el dominio.`
  );
}

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

// Envía el aviso de confirmación de turno desde Lista de Espera por email vía Resend.
async function enviarEmailAltaWaitlist({ email, nombreSocio, claseTxt }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const esInvitado = cleanEmail.startsWith('invitado-') && cleanEmail.endsWith('@kaha.com');
  const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail);
  if (!emailValido || esInvitado) return { ok: false, reason: 'sin_email_valido' };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'sin_api_key' };

  const from = process.env.RESEND_FROM || 'KAHA BOX <onboarding@resend.dev>';

  const html = `<!doctype html><html><body style="margin:0;background:#09090b;font-family:Inter,Arial,sans-serif;color:#f4f4f5;">
      <div style="max-width:540px;margin:0 auto;padding:24px;">
        <div style="background:#18181b;border:1px solid #27272a;border-radius:24px 24px 0 0;padding:32px 28px 24px;text-align:center;">
          <div style="display:inline-block;background:#c8f63e;color:#09090b;font-size:11px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;padding:4px 12px;border-radius:9999px;margin-bottom:12px;font-family:monospace;">KAHA BOX</div>
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:900;letter-spacing:-0.03em;">🎉 ¡Lugar Confirmado!</h1>
          <p style="margin:8px 0 0;color:#a1a1aa;font-size:14px;">Se liberó un cupo en tu lista de espera</p>
        </div>
        <div style="background:#141416;border:1px solid #27272a;border-top:none;border-radius:0 0 24px 24px;padding:28px;">
          <p style="margin:0 0 16px;color:#e4e4e7;font-size:15px;line-height:1.5;">Hola <strong>${nombreSocio}</strong>, ¡excelentes noticias! Se liberó una vacante y fuiste promovido/a al siguiente turno:</p>
          <div style="background:#18181b;border:2px solid #c8f63e;border-radius:16px;padding:18px 20px;margin:0 0 20px;text-align:center;">
            <div style="color:#c8f63e;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;">Turno Asignado</div>
            <div style="color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.02em;">${claseTxt}</div>
          </div>
          <p style="margin:0 0 24px;color:#a1a1aa;font-size:13px;line-height:1.6;">Ya podés ver tu turno confirmado ingresando a la app de <strong>KAHA BOX</strong>. Recordá que si por algún motivo no podés asistir, avisanos o date de baja para liberar el lugar a otro compañero.</p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="https://kaha.com.ar" style="display:inline-block;background:#c8f63e;color:#09090b;font-weight:900;font-size:14px;padding:12px 28px;border-radius:12px;text-decoration:none;letter-spacing:-0.01em;">Ingresar a la App</a>
          </div>
          <p style="margin:0;color:#71717a;font-size:12px;text-align:center;">— Equipo KAHA BOX</p>
        </div>
      </div>
    </body></html>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [cleanEmail], subject: `🎉 ¡Lugar confirmado! Turno asignado en ${claseTxt} — KAHA BOX`, html })
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error('>> [notify-waitlist-alta] Error de Resend:', data);
    return { ok: false, reason: 'resend_error', detail: data };
  }
  return { ok: true, id: data.id };
}

app.post('/api/notify-waitlist-alta', async (req, res) => {
  try {
    const { email, telefono = '', nombre = '', dia = '', hora = '', fecha = '' } = req.body || {};

    const nombreSocio = String(nombre || '').trim() || 'Hola';
    const horaFmt = hora ? String(hora).slice(0, 5) : '';
    const fechaMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha || '').trim());
    const fechaFmt = fechaMatch ? `${fechaMatch[3]}/${fechaMatch[2]}` : '';
    const claseTxt = [dia, fechaFmt, horaFmt ? `${horaFmt} hs` : ''].filter(Boolean).join(' ') || 'tu clase';

    console.log(`>> [notify-waitlist-alta] Enviando confirmación a ${email} (${nombreSocio}) para ${claseTxt}`);

    const mail = await enviarEmailAltaWaitlist({ email, nombreSocio, claseTxt });
    return res.status(200).json({ sent: mail.ok, channel: 'email', id: mail.id, reason: mail.reason });
  } catch (err) {
    console.error('>> [notify-waitlist-alta] Error:', err);
    return res.status(500).json({ sent: false, reason: 'server_error', detail: err.message });
  }
});

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

// Envía el correo mensual a un socio vía Resend
async function enviarEmailInicioMes({ email, nombreSocio, asunto, mensaje }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const esInvitado = cleanEmail.startsWith('invitado-') && cleanEmail.endsWith('@kaha.com');
  const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail);
  if (!emailValido || esInvitado) return { ok: false, reason: 'sin_email_valido' };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'sin_api_key' };

  const from = process.env.RESEND_FROM || 'KAHA GYM <onboarding@resend.dev>';
  const subject = asunto || '💚 ¡Comenzamos un nuevo mes en KAHA!';

  const html = `<!doctype html><html><body style="margin:0;background:#062319;font-family:Inter,Arial,sans-serif;color:#f4f4f5;">
    <div style="max-width:540px;margin:0 auto;padding:24px;">
      <div style="background:#043d2f;border:1px solid #059669;border-radius:24px 24px 0 0;padding:32px 28px 24px;text-align:center;">
        <div style="display:inline-block;background:#10b981;color:#043d2f;font-size:11px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;padding:4px 12px;border-radius:9999px;margin-bottom:12px;font-family:monospace;">KAHA GYM</div>
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:900;letter-spacing:-0.03em;">¡Nuevo Mes de Entrenamiento! 💚</h1>
      </div>
      <div style="background:#064e3b;border:1px solid #059669;border-top:none;border-radius:0 0 24px 24px;padding:28px;">
        <div style="color:#ecfdf5;font-size:14px;line-height:1.7;white-space:pre-line;">
${mensaje}
        </div>
        <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(52,211,153,0.2);text-align:center;">
          <p style="margin:0;color:#6ee7b7;font-size:12px;">Equipo KAHA GYM — Entrená con nosotros</p>
        </div>
      </div>
    </div>
  </body></html>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [cleanEmail], subject, html })
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    console.error('>> [send-monthly-email] Error de Resend para', cleanEmail, data);
    return { ok: false, reason: 'resend_error', detail: data };
  }
  return { ok: true, id: data.id };
}

// Endpoint para envío masivo de email de inicio de mes
app.post('/api/send-monthly-email', async (req, res) => {
  try {
    const { asunto, mensaje, destinatarios = [] } = req.body || {};

    let targets = destinatarios;
    if ((!targets || targets.length === 0) && supabase) {
      const { data: clients } = await supabase
        .from('clientes')
        .select('id, nombre, apellido, email')
        .eq('activo', true);
      targets = (clients || []).map(c => ({ email: c.email, nombre: `${c.nombre} ${c.apellido}`.trim() }));
    }

    console.log(`>> [send-monthly-email] Iniciando envío de correos a ${targets.length} socios...`);

    let enviados = 0;
    let errores = 0;
    for (const target of targets) {
      if (!target.email) continue;
      const resMail = await enviarEmailInicioMes({
        email: target.email,
        nombreSocio: target.nombre || 'Socio',
        asunto,
        mensaje
      });
      if (resMail.ok) enviados++;
      else errores++;
    }

    console.log(`>> [send-monthly-email] Envío finalizado: ${enviados} enviados, ${errores} errores.`);
    return res.status(200).json({ ok: true, enviados, errores, total: targets.length });
  } catch (err) {
    console.error('>> [send-monthly-email] Error general:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ============================================================================
// COBRANZA AUTOMÁTICA (día 5 y día 10)
//
// Calendario acordado con Juanchi:
//   día 1  -> la cuota del mes ya figura como deuda (lo hace la app, no un cron)
//   día 5  -> aviso al socio con la fecha límite
//   día 10 -> reporte a los administradores
//
// Los dispara pg_cron (ver migración 017). Los endpoints son idempotentes por
// día: el segundo llamado del mismo día no manda nada. Eso cubre el reintento
// del cron y también que alguien golpee la URL de prafuera.
// ============================================================================

const DIA_BAJA_RESERVA = 10;

// Fecha de hoy en Argentina (UTC-3 fijo, sin horario de verano desde 2009).
// new Date().toISOString() da el día equivocado entre las 21:00 y la medianoche.
function hoyArgentinaISO() {
  return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Devuelve true si este tipo de envío ya corrió hoy. El candado es la PK de
// envios_automaticos: si el insert choca, ya se mandó.
async function tomarCandadoDelDia(tipo) {
  if (!supabase) return { ok: false, motivo: 'sin_supabase' };
  const fecha = hoyArgentinaISO();
  const { error } = await supabase.from('envios_automaticos').insert({ tipo, fecha });
  if (error) {
    if (error.code === '23505') return { ok: false, motivo: 'ya_enviado_hoy', fecha };
    return { ok: false, motivo: 'error_candado', detalle: error.message };
  }
  return { ok: true, fecha };
}

async function registrarResultadoEnvio(tipo, fecha, enviados, errores, detalle) {
  if (!supabase) return;
  await supabase.from('envios_automaticos')
    .update({ enviados, errores, detalle })
    .eq('tipo', tipo).eq('fecha', fecha);
}

// Socios que están debiendo. Misma regla que src/lib/recordatorioDeuda.ts:
// deja afuera a los dados de baja, a los que están en reposo y a los exentos.
async function sociosQueDeben() {
  if (!supabase) return [];
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, email, telefono, deuda_acumulada, estado, ultimo_mes_pagado, exencion_cobro, reposo, activo')
    .eq('activo', true);
  if (error) {
    console.error('>> [cobranza] Error al leer clientes:', error.message);
    return [];
  }

  const hoy = hoyArgentinaISO();
  const mesActual = hoy.slice(0, 7);
  const diaDelMes = Number(hoy.slice(8, 10));

  return (clientes || []).filter(c => {
    if (c.reposo) return false; // cuenta congelada: no se le reclama
    const exento = c.exencion_cobro && c.exencion_cobro !== 'NINGUNA';
    const deuda = Number(c.deuda_acumulada || 0);
    if (exento && deuda <= 0) return false;
    if (deuda > 0 || c.estado === 'CON_DEUDA' || c.estado === 'MOROSO') return true;
    const pagoEsteMes = c.ultimo_mes_pagado && c.ultimo_mes_pagado >= mesActual;
    return diaDelMes >= 6 && !pagoEsteMes;
  });
}

async function enviarMailSimple({ email, asunto, titulo, cuerpo }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const esInvitado = cleanEmail.startsWith('invitado-') && cleanEmail.endsWith('@kaha.com');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail) || esInvitado) {
    return { ok: false, reason: 'sin_email_valido' };
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: 'sin_api_key' };
  const from = process.env.RESEND_FROM || 'KAHA GYM <onboarding@resend.dev>';

  const html = `<!doctype html><html><body style="margin:0;background:#062319;font-family:Inter,Arial,sans-serif;">
    <div style="max-width:540px;margin:0 auto;padding:24px;">
      <div style="background:#043d2f;border:1px solid #059669;border-radius:24px 24px 0 0;padding:28px;text-align:center;">
        <div style="display:inline-block;background:#10b981;color:#043d2f;font-size:11px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;padding:4px 12px;border-radius:9999px;margin-bottom:12px;font-family:monospace;">KAHA GYM</div>
        <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:900;letter-spacing:-0.03em;">${titulo}</h1>
      </div>
      <div style="background:#064e3b;border:1px solid #059669;border-top:none;border-radius:0 0 24px 24px;padding:28px;">
        <div style="color:#ecfdf5;font-size:14px;line-height:1.7;white-space:pre-line;">${cuerpo}</div>
      </div>
    </div>
  </body></html>`;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [cleanEmail], subject: asunto, html })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return { ok: false, reason: 'resend_error', detail: data };
  return { ok: true, id: data.id };
}

// --- DÍA 5: aviso al socio con la fecha límite ---
app.post('/api/cron/aviso-deuda', async (req, res) => {
  try {
    const candado = await tomarCandadoDelDia('AVISO_DIA_5');
    if (!candado.ok) {
      console.log(`>> [aviso-deuda] No se envía: ${candado.motivo}`, candado.detalle || "");
      // El detalle va en la respuesta a propósito: un cron que falla en silencio
      // es justamente lo que tuvo roto el reporte del día 10 durante meses.
      return res.status(200).json({ ok: true, omitido: true, motivo: candado.motivo, detalle: candado.detalle });
    }

    const deudores = await sociosQueDeben();
    console.log(`>> [aviso-deuda] ${deudores.length} socio(s) con deuda.`);

    let enviados = 0, errores = 0;
    for (const socio of deudores) {
      const cuerpo =
        `Hola ${socio.nombre}! 👋\n\n` +
        `Todavía no nos figura el pago de la cuota de este mes.\n\n` +
        `Si no llegamos a registrarlo antes del día ${DIA_BAJA_RESERVA}, tu turno fijo queda liberado ` +
        `para que lo tome otra persona.\n\n` +
        `Si tuviste alguna dificultad o necesitás unos días más, escribinos y lo vemos. ` +
        `Con que nos avises alcanza para que te lo guardemos. 🤝\n\n` +
        `¡Gracias por ser parte de KAHA! 💚`;

      const r = await enviarMailSimple({
        email: socio.email,
        asunto: '💚 Recordatorio de tu cuota — KAHA GYM',
        titulo: 'Recordatorio de tu cuota',
        cuerpo
      });
      if (r.ok) enviados++; else errores++;
    }

    await registrarResultadoEnvio('AVISO_DIA_5', candado.fecha, enviados, errores, {
      socios: deudores.map(d => ({ id: d.id, nombre: `${d.nombre} ${d.apellido}` }))
    });

    console.log(`>> [aviso-deuda] ${enviados} enviados, ${errores} errores.`);
    return res.status(200).json({ ok: true, enviados, errores, total: deudores.length });
  } catch (err) {
    console.error('>> [aviso-deuda] Error general:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// --- DÍA 10: reporte a los administradores ---
app.post('/api/cron/reporte-morosos', async (req, res) => {
  try {
    const candado = await tomarCandadoDelDia('REPORTE_DIA_10');
    if (!candado.ok) {
      console.log(`>> [reporte-morosos] No se envía: ${candado.motivo}`, candado.detalle || "");
      // El detalle va en la respuesta a propósito: un cron que falla en silencio
      // es justamente lo que tuvo roto el reporte del día 10 durante meses.
      return res.status(200).json({ ok: true, omitido: true, motivo: candado.motivo, detalle: candado.detalle });
    }

    const deudores = await sociosQueDeben();
    const admins = (process.env.ADMIN_EMAILS || 'totoarr17@gmail.com,jmferrariprofe@gmail.com')
      .split(',').map(s => s.trim()).filter(Boolean);

    const totalDeuda = deudores.reduce((acc, d) => acc + Number(d.deuda_acumulada || 0), 0);
    const filas = deudores
      .sort((a, b) => Number(b.deuda_acumulada || 0) - Number(a.deuda_acumulada || 0))
      .map(d => `• ${d.apellido}, ${d.nombre} — $${Number(d.deuda_acumulada || 0).toLocaleString('es-AR')} — ${d.telefono || 'sin tel'}`)
      .join('\n');

    const cuerpo = deudores.length === 0
      ? 'No hay socios con deuda este mes. 🎉'
      : `Hoy es ${candado.fecha}, día ${DIA_BAJA_RESERVA}: estos socios siguen sin pagar.\n\n` +
        `${filas}\n\n` +
        `Total adeudado: $${totalDeuda.toLocaleString('es-AR')}\n` +
        `Socios: ${deudores.length}\n\n` +
        `Entrá a la app para decidir a quién se le da de baja el turno y a quién se le perdona.`;

    let enviados = 0, errores = 0;
    for (const admin of admins) {
      const r = await enviarMailSimple({
        email: admin,
        asunto: `📋 Morosos al día ${DIA_BAJA_RESERVA} — ${deudores.length} socio(s)`,
        titulo: `Reporte de morosos`,
        cuerpo
      });
      if (r.ok) enviados++; else errores++;
    }

    await registrarResultadoEnvio('REPORTE_DIA_10', candado.fecha, enviados, errores, {
      morosos: deudores.length,
      total_deuda: totalDeuda
    });

    console.log(`>> [reporte-morosos] ${deudores.length} morosos, ${enviados} mails enviados.`);
    return res.status(200).json({ ok: true, morosos: deudores.length, enviados, errores });
  } catch (err) {
    console.error('>> [reporte-morosos] Error general:', err);
    return res.status(500).json({ ok: false, error: err.message });
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
