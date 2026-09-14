-- 018_cron_url_www.sql
--
-- Corrige el dominio de los cron de cobranza: kaha.com.ar -> www.kaha.com.ar
--
-- Verificado con curl:
--   POST https://kaha.com.ar/api/cron/reporte-morosos      -> HTTP 308
--   Location: https://www.kaha.com.ar/api/cron/reporte-morosos
--
-- pg_net NO sigue redirects. Con el dominio sin www los cron recibían un 308 y
-- el endpoint no se ejecutaba nunca: exactamente el mismo final silencioso que
-- tenían los cron viejos que esta tanda vino a arreglar.

SELECT cron.unschedule('kaha_aviso_deuda_dia_5');
SELECT cron.unschedule('kaha_reporte_morosos_dia_10');

SELECT cron.schedule(
  'kaha_aviso_deuda_dia_5',
  '0 12 5 * *',
  $$
  SELECT net.http_post(
    url     := 'https://www.kaha.com.ar/api/cron/aviso-deuda',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'kaha_reporte_morosos_dia_10',
  '0 12 10 * *',
  $$
  SELECT net.http_post(
    url     := 'https://www.kaha.com.ar/api/cron/reporte-morosos',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
