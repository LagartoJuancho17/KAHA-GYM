import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

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
