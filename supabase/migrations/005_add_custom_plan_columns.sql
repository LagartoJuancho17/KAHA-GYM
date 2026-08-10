-- Migration 005: Agregar columnas para planes personalizados a la tabla clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS precio_personalizado NUMERIC(12, 2);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS dias_personalizados INTEGER;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nota_plan_personalizado TEXT;
