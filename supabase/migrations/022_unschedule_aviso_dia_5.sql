-- supabase/migrations/022_unschedule_aviso_dia_5.sql
-- Desprogramar el cron del día 5 por solicitud: solo queda activo el proceso del día 10

SELECT cron.unschedule('kaha_aviso_deuda_dia_5')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'kaha_aviso_deuda_dia_5'
);
