-- 015_reposo_socios.sql
--
-- Reposo: congelar la cuenta de un socio en vez de borrarla.
--
-- Pedido de Juanchi: gente que cambia de laburo y no puede sostener la cuota unos
-- meses. La baja definitiva la borra como socia y al volver hay que cargarla de
-- cero. Con reposo sale de los turnos y deja de generar deuda, pero la ficha
-- sobrevive 6 meses.
--
-- Columna nullable y aditiva: no toca ninguna fila existente ni ningún índice.
-- Forma del JSON: { desde, hasta, motivo?, turnos_liberados? }
-- La lógica de fechas vive en src/lib/reposo.ts (con tests).

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS reposo jsonb;

COMMENT ON COLUMN clientes.reposo IS
  'Cuenta congelada temporalmente. { desde, hasta, motivo?, turnos_liberados? }. NULL = socio normal.';

-- Para listar rápido quién está en reposo sin escanear toda la tabla.
CREATE INDEX IF NOT EXISTS idx_clientes_en_reposo
  ON clientes ((reposo IS NOT NULL))
  WHERE reposo IS NOT NULL;
