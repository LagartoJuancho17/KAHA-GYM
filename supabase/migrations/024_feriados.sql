-- Migration 024: Crear tabla de feriados para gestión del gimnasio
CREATE TABLE IF NOT EXISTS feriados (
  id TEXT PRIMARY KEY,
  fecha DATE NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT DEFAULT 'INAMOVIBLE',
  cerrado BOOLEAN DEFAULT TRUE,
  horario_especial TEXT DEFAULT '',
  horas_habilitadas TEXT[] DEFAULT '{}',
  hora_desde TEXT DEFAULT '',
  hora_hasta TEXT DEFAULT '',
  observaciones TEXT DEFAULT '',
  activo BOOLEAN DEFAULT TRUE,
  creado_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compatibilidad idempotente por si la tabla ya existía
ALTER TABLE feriados ADD COLUMN IF NOT EXISTS horas_habilitadas TEXT[] DEFAULT '{}';
ALTER TABLE feriados ADD COLUMN IF NOT EXISTS hora_desde TEXT DEFAULT '';
ALTER TABLE feriados ADD COLUMN IF NOT EXISTS hora_hasta TEXT DEFAULT '';

-- Indice para búsqueda rápida por fecha
CREATE INDEX IF NOT EXISTS idx_feriados_fecha ON feriados(fecha);
CREATE INDEX IF NOT EXISTS idx_feriados_activo ON feriados(activo);

-- Habilitar RLS
ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Lectura pública de feriados" ON feriados
  FOR SELECT USING (true);

CREATE POLICY "Administración total de feriados para anon y autenticados" ON feriados
  FOR ALL USING (true);
