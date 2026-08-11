-- Migration 006: Agregar columna destino_transferencia a la tabla pagos
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS destino_transferencia VARCHAR(50);
