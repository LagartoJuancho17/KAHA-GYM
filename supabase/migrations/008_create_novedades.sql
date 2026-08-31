-- supabase/migrations/008_create_novedades.sql
-- Tabla de Novedades / Comunicados del Gimnasio
-- Permite persistir anuncios, novedades y comunicados para socios
-- socio_id: si está presente, la novedad es privada y solo la ve ese socio

CREATE TABLE IF NOT EXISTS novedades (
    id TEXT PRIMARY KEY,                -- ID local tipo 'nov-1234567890'
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    fecha TEXT NOT NULL,                -- Formato 'YYYY-MM-DD HH:mm'
    categoria TEXT NOT NULL DEFAULT 'INFORMACION'
        CHECK (categoria IN ('ARANCELES', 'TURNOS', 'INFORMACION', 'EVENTOS')),
    creado_por TEXT NOT NULL DEFAULT 'admin@gimnasio.com.ar',
    destacado BOOLEAN NOT NULL DEFAULT FALSE,
    socio_id TEXT NULL,                 -- NULL = novedad global; UUID del cliente = novedad privada
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índice para ordenar por fecha descendente (novedades más recientes primero)
CREATE INDEX IF NOT EXISTS idx_novedades_fecha ON novedades (creado_at DESC);

-- Índice para buscar novedades privadas por socio
CREATE INDEX IF NOT EXISTS idx_novedades_socio ON novedades (socio_id) WHERE socio_id IS NOT NULL;

-- RLS: habilitar seguridad a nivel de fila
ALTER TABLE novedades ENABLE ROW LEVEL SECURITY;

-- Política: cualquier rol anon/authenticated puede leer novedades
CREATE POLICY "novedades_select_all"
    ON novedades FOR SELECT
    USING (true);

-- Política: cualquier rol anon/authenticated puede insertar novedades (sistema interno)
CREATE POLICY "novedades_insert_all"
    ON novedades FOR INSERT
    WITH CHECK (true);

-- Política: cualquier rol anon/authenticated puede actualizar novedades
CREATE POLICY "novedades_update_all"
    ON novedades FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Política: cualquier rol anon/authenticated puede eliminar novedades
CREATE POLICY "novedades_delete_all"
    ON novedades FOR DELETE
    USING (true);
