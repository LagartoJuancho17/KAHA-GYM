import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables (including those without VITE_ prefix, like MP_ACCESS_TOKEN)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'mercadopago-api-plugin',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/api/create-preference' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const { amount, title, clientId } = JSON.parse(body);
                  const token = env.MP_ACCESS_TOKEN;

                  if (!token) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Mercado Pago Access Token not configured on server.' }));
                    return;
                  }

                   const origin = req.headers.referer || req.headers.origin || 'http://localhost:3000';
                  // Extract base origin and force HTTPS for Mercado Pago redirect safety
                  const urlObj = new URL(origin);
                  const baseOrigin = urlObj.origin.replace(/^http:/, 'https:');

                  console.log('>> [Vite create-preference] Creando preferencia:', {
                    amount,
                    title,
                    clientId,
                    origin,
                    baseOrigin,
                    successUrl: `${baseOrigin}/?mp_status=success&clientId=${clientId}&amount=${amount}`
                  });

                  // Call Mercado Pago API securely using the official SDK
                  const { MercadoPagoConfig, Preference } = await import('mercadopago');
                  
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
                      external_reference: clientId,
                      metadata: {
                        client_id: clientId,
                        amount: Number(amount)
                      }
                    }
                  });

                  res.statusCode = 201;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(result));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Error processing request' }));
                }
              });
            } else if (req.url === '/api/webhooks/mercadopago' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk.toString();
              });
              req.on('end', async () => {
                try {
                  const payload = JSON.parse(body);
                  console.log('>> [Vite Webhook] Recibida notificación de Mercado Pago:', payload);

                  const token = env.MP_ACCESS_TOKEN;
                  if (payload.type === 'payment' && payload.data && payload.data.id) {
                    const paymentId = payload.data.id;
                    console.log(`>> [Vite Webhook] Consultando pago ID: ${paymentId}`);

                    const { MercadoPagoConfig, Payment } = await import('mercadopago');
                    const client = new MercadoPagoConfig({ accessToken: token });
                    const paymentBuilder = new Payment(client);

                    try {
                      const paymentData = await paymentBuilder.get({ id: paymentId });
                      console.log('>> [Vite Webhook] Detalle de Pago obtenido con éxito:', {
                        status: paymentData.status,
                        status_detail: paymentData.status_detail,
                        external_reference: paymentData.external_reference,
                        metadata: paymentData.metadata
                      });
                    } catch (fetchErr: any) {
                      console.error('>> [Vite Webhook] Error al consultar pago:', fetchErr.message);
                    }
                  }

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ received: true }));
                } catch (err: any) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Invalid JSON payload' }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
