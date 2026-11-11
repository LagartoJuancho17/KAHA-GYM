-- Migration 025: Catálogo de Ejercicios de PR y Marcas Personales (PRs) de Socios
CREATE TABLE IF NOT EXISTS public.ejercicios_pr (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT DEFAULT 'Fuerza',
  instruccion_titulo TEXT DEFAULT '',
  instruccion_detalle TEXT DEFAULT '',
  unidad TEXT DEFAULT 'kg',
  orden INTEGER DEFAULT 1,
  activo BOOLEAN DEFAULT TRUE,
  creado_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.registros_pr (
  id TEXT PRIMARY KEY, -- `${cliente_id}__${ejercicio_id}`
  cliente_id TEXT NOT NULL,
  ejercicio_id TEXT NOT NULL,
  rm_1 NUMERIC,
  rm_2 NUMERIC,
  rm_3 NUMERIC,
  rm_5 NUMERIC,
  historial JSONB DEFAULT '[]'::jsonb,
  actualizado_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_registros_pr_cliente ON public.registros_pr(cliente_id);
CREATE INDEX IF NOT EXISTS idx_registros_pr_ejercicio ON public.registros_pr(ejercicio_id);

ALTER TABLE public.ejercicios_pr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_pr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura y gestión de ejercicios_pr" ON public.ejercicios_pr
  FOR ALL USING (true);

CREATE POLICY "Lectura y gestión de registros_pr" ON public.registros_pr
  FOR ALL USING (true);
