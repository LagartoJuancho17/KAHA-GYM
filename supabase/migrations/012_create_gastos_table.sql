-- supabase/migrations/012_create_gastos_table.sql
-- Tabla de Gastos y Egresos del Gimnasio
-- Permite persistir los gastos operativos, alquileres, servicios, profesores y origen de fondos

CREATE TABLE IF NOT EXISTS gastos (
    id TEXT PRIMARY KEY,                       -- ID local tipo 'gas-1234567890-abc'
    concepto TEXT NOT NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    categoria VARCHAR(30) NOT NULL DEFAULT 'OTROS'
        CHECK (categoria IN ('ALQUILER', 'SERVICIOS', 'INSUMOS', 'PROFESORES', 'OTROS')),
    efectuado_por VARCHAR(40) NOT NULL DEFAULT 'EFECTIVO_CAJA'
        CHECK (efectuado_por IN ('JUANCHI_TRANSFERENCIA', 'RULO_TRANSFERENCIA', 'EFECTIVO_CAJA')),
    fecha DATE NOT NULL,
    registrado_por TEXT DEFAULT 'admin@gimnasio.com.ar',
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_efectuado_por ON gastos (efectuado_por);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos (categoria);

-- RLS: Habilitar seguridad
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "gastos_select_all"
    ON gastos FOR SELECT
    USING (true);

CREATE POLICY "gastos_insert_all"
    ON gastos FOR INSERT
    WITH CHECK (true);

CREATE POLICY "gastos_update_all"
    ON gastos FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "gastos_delete_all"
    ON gastos FOR DELETE
    USING (true);
