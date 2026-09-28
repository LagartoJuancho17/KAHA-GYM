-- Permite registrar pagos e ingresos de pagadores externos (ej: alquiler a masajista, convenios)
-- sin requerir que sean socios/alumnos del gimnasio.

-- 1. Permitir cliente_id nulo para pagos externos
ALTER TABLE pagos ALTER COLUMN cliente_id DROP NOT NULL;

-- 2. Columnas adicionales en la tabla pagos para identificar pagadores externos y conceptos
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS cliente_nombre_completo TEXT;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS es_externo BOOLEAN DEFAULT false;
ALTER TABLE pagos ADD COLUMN IF NOT EXISTS concepto TEXT;

-- 3. Tabla para el catálogo de pagadores externos reutilizables
CREATE TABLE IF NOT EXISTS pagadores_externos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    concepto TEXT,
    telefono TEXT,
    email TEXT,
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Habilitar RLS y políticas
ALTER TABLE pagadores_externos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagadores_externos_all" ON pagadores_externos;
CREATE POLICY "pagadores_externos_all" ON pagadores_externos FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Seed inicial con el pagador de ejemplo: Masajista (Alquiler del local)
INSERT INTO pagadores_externos (id, nombre, concepto)
VALUES ('ext-masajista', 'Masajista (Alquiler del local)', 'Alquiler de espacio / consultorio')
ON CONFLICT (id) DO NOTHING;
