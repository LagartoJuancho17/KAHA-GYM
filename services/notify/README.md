# Recibos automáticos por WhatsApp

## Flujo

1. Un administrador entra con Google. El servidor verifica firma y audiencia del token, correo verificado y `PAYMENT_RECEIPT_ADMIN_EMAILS`. Emite una cookie firmada, `HttpOnly`, `SameSite=Strict`, válida durante ocho horas.
2. El alta manual en **Pagos e Ingresos** inserta el pago en Supabase. Sólo cuando la base confirma la inserción, el navegador pide al servidor el envío por ID de pago. La contraseña local no crea una sesión autorizada para recibos automáticos.
3. El servidor vuelve a leer importe, mes, socio, teléfono y consentimiento desde Supabase. Los importes y teléfonos del navegador se ignoran.
4. La fila única de `public.recibos_whatsapp` reserva el pago antes de llamar a Meta. Repetir la solicitud no genera otro mensaje.
5. `ACEPTADO` significa que la API de Meta recibió la solicitud, no que el socio lo recibió o leyó. `FALLIDO` indica rechazo explícito; `INCIERTO` indica que la respuesta se perdió y no se reenvía automáticamente para evitar duplicados.

Los pagos divididos en varios medios quedan para envío manual: son varias filas por un mismo cobro y el recibo debe sumar sus importes antes de automatizar ese caso. Los ingresos externos también quedan manuales. Los pagos de conciliación CSV nunca llaman al endpoint.

## Activación, en este orden

Esto modifica producción. Hacerlo sólo tras aprobar la activación y revisar la plantilla/costos de Meta.

1. Aplicar [`supabase/migrations/022_recibos_whatsapp.sql`](../../supabase/migrations/022_recibos_whatsapp.sql) en el proyecto Supabase de KAHA. Todos los consentimientos existentes empiezan en `false`.
2. Crear y aprobar en la cuenta de Cloud API que enviará desde **+54 9 11 7840-2722** la plantilla de categoría **Utility** `recibo_pago`, idioma `es_AR`, con este cuerpo o ajustar el orden de parámetros en `paymentReceipt.js`:

   `Hola {{1}}, confirmamos la recepción de tu pago de {{2}} correspondiente al mes {{3}}. Gracias, KAHA GYM.`

   No agregar promociones: Meta puede reclasificarla. Las plantillas iniciadas por la empresa pueden tener costo por mensaje. Consultar la [tarifa vigente de Meta](https://whatsappbusiness.com/products/platform-pricing/).
3. Configurar en el servidor `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_EXPECTED_SENDER`, `WHATSAPP_TEMPLATE_RECIBO`, `WHATSAPP_TEMPLATE_LANG`, `WHATSAPP_API_VERSION`, `GOOGLE_CLIENT_ID`, `PAYMENT_RECEIPT_ADMIN_EMAILS` (correos separados por coma) y `PAYMENT_RECEIPT_SESSION_SECRET` (al menos 32 caracteres aleatorios). El `GOOGLE_CLIENT_ID` debe coincidir con `VITE_GOOGLE_CLIENT_ID`. Ningún secreto lleva el prefijo `VITE_` ni se guarda en el repositorio.
4. Dar de alta **+54 9 11 7840-2722** en Cloud API. En Meta figura hoy dentro de la cuenta `Kaha Fitness Center` como número de WhatsApp Business App y `Sin conexión`; el alta completa puede requerir quitarlo de esa app y dejar de usar WhatsApp Business en el celular. Configurar en `WHATSAPP_PHONE_NUMBER_ID` el ID que Meta indique **después** del alta, sin asumir que el ID previo seguirá siendo válido. Configurar `WHATSAPP_EXPECTED_SENDER=+54 9 11 7840-2722`. El servidor consulta a Meta el número asociado al ID antes de cada recibo y rechaza cualquier discrepancia, incluida una configuración accidental con el 3691-2698.
5. Desplegar servidor y app. Obtener consentimiento explícito del socio para recibir comprobantes de KAHA por WhatsApp y marcar la casilla en su ficha. Si falta teléfono válido o consentimiento, no sale mensaje automático.
6. Hacer **un pago de prueba controlado** a un número propio con consentimiento, entrando con Google. Verificar el mensaje, el estado en Pagos e Ingresos y la fila en `recibos_whatsapp`. Repetir la solicitud con el mismo ID y confirmar que no llega un segundo mensaje.

El endpoint de envío requiere una cookie de administrador verificada por el servidor. La RLS pública actual de `pagos` sigue siendo un problema de seguridad para los datos contables en general, aunque no permite activar el envío automático sin esa cookie. Se debe corregir por separado antes de considerar segura la gestión financiera completa.

## Pruebas

`node --test services/notify/paymentReceipt.test.js services/notify/receiptAuth.test.js`

`npm run eval:payment-receipt`

## Reinicio

Local: detener el servidor y ejecutar `node server.js` de nuevo. En Vercel, el despliegue del commit reinicia las funciones automáticamente.
