-- supabase/migrations/023_reactivar_cuentas_morosas_dia_11.sql
-- Reactiva cuentas que quedaron inactivas o morosas por cortes previos
-- y asegura que la morosidad empiece a partir del día 11 del mes.

UPDATE clientes
SET 
  activo = true,
  estado = CASE 
    WHEN deuda_acumulada > 0 THEN 'CON_DEUDA' 
    ELSE 'ACTIVO' 
  END
WHERE activo = false OR estado IN ('INACTIVO', 'MOROSO');
