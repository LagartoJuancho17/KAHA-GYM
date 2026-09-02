-- supabase/migrations/011_cron_admin_delinquent_email.sql
-- Programación automática de envío de reporte de morosidad a los administradores con pg_cron
-- Se ejecuta el día 10 de cada mes a las 09:00 AM (hora Buenos Aires / UTC-3 -> 12:00 UTC)

-- Habilitar extensión pg_cron y pg_net si no están activas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Desprogramar trabajo previo si existía
SELECT cron.unschedule('enviar_reporte_morosos_admin')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'enviar_reporte_morosos_admin'
);

-- Programar ejecución mensual: Minuto 0, Hora 12 UTC (09:00 AM Argentina), Día 10 de cada mes
-- Llama a la Edge Function 'send-admin-delinquent-report' mediante pg_net
SELECT cron.schedule(
    'enviar_reporte_morosos_admin',
    '0 12 10 * *',
    $$
    SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/send-admin-delinquent-report',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);
