-- 017_fix_crons_cobranza.sql
--
-- Arregla los dos cron de cobranza, que estaban activos pero NUNCA funcionaron.
--
-- Qué pasaba (verificado en cron.job_run_details):
--   jobid 1 'enviar_email_inicio_mes'      -> 2026-09-01 12:00 -> failed
--   jobid 2 'enviar_reporte_morosos_admin' -> 2026-09-10 12:00 -> failed
--   ERROR: null value in column "url" of relation "http_request_queue"
--
-- Causa: armaban la URL leyendo de vault.decrypted_secrets, y el vault está
-- vacío (0 secretos). El SELECT devolvía NULL, net.http_post recibía url = NULL
-- y el insert violaba el NOT NULL. Encima apuntaban a edge functions que nunca
-- se desplegaron (supabase/functions existe en el repo, pero el proyecto no
-- tiene ninguna función publicada).
--
-- Arreglo: apuntar al server Express que ya corre en Vercel y que ya tiene
-- Resend configurado y andando. La URL de producción no es un secreto, así que
-- va literal y se elimina la dependencia del vault. Los endpoints son
-- idempotentes por día (tabla envios_automaticos, migración 016), así que un
-- reintento del cron no manda el mail dos veces.
--
-- Horario: 12:00 UTC = 09:00 en Argentina.

-- Se borra sólo el de morosos, que es el que este cambio reemplaza.
-- OJO: 'enviar_email_inicio_mes' (jobid 1) está roto por exactamente la misma
-- causa y queda SIN tocar a propósito: es otra función (el saludo mensual a los
-- socios, que hoy se manda a mano desde el botón "Mail de Mes") y no entra en
-- este pedido. Arreglarlo es apuntarlo a /api/send-monthly-email, que ya existe.
SELECT cron.unschedule('enviar_reporte_morosos_admin');

-- Día 5: aviso al socio con la fecha límite.
SELECT cron.schedule(
  'kaha_aviso_deuda_dia_5',
  '0 12 5 * *',
  $$
  SELECT net.http_post(
    url     := 'https://kaha.com.ar/api/cron/aviso-deuda',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Día 10: reporte de morosos a los administradores.
SELECT cron.schedule(
  'kaha_reporte_morosos_dia_10',
  '0 12 10 * *',
  $$
  SELECT net.http_post(
    url     := 'https://kaha.com.ar/api/cron/reporte-morosos',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
