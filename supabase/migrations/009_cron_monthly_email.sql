-- supabase/migrations/009_cron_monthly_email.sql
-- Programación automática de envío de correos de inicio de mes con pg_cron
-- Se ejecuta el día 1 de cada mes a las 09:00 AM (hora Buenos Aires / UTC-3 -> 12:00 UTC)

-- Habilitar extensión pg_cron y pg_net si no están activas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Desprogramar trabajo previo si existía
SELECT cron.unschedule('enviar_email_inicio_mes')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'enviar_email_inicio_mes'
);

-- Programar ejecución mensual: Minuto 0, Hora 12 UTC (09:00 AM Argentina), Día 1 de cada mes
-- Llama a la Edge Function 'send-monthly-email' mediante pg_net
SELECT cron.schedule(
    'enviar_email_inicio_mes',
    '0 12 1 * *',
    $$
    SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/send-monthly-email',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);
