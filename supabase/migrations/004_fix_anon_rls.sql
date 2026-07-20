-- supabase/migrations/004_fix_anon_rls.sql
-- Fix: Este proyecto usa Google OAuth propio (no Supabase Auth).
-- auth.uid() siempre es NULL para el cliente anon, por lo que las políticas
-- RLS con pertenece_perfil()/es_admin() fallan silenciosamente.
-- Solución: agregar políticas permisivas para el rol 'anon'.

-- ===========================================
-- PAGOS
-- ===========================================
DROP POLICY IF EXISTS "Empleados registran ingresos de pagos" ON pagos;
DROP POLICY IF EXISTS "Empleados ven pagos registrados" ON pagos;
DROP POLICY IF EXISTS "Solo admins alteran pagos archivados" ON pagos;
DROP POLICY IF EXISTS "Solo admins eliminan transacciones" ON pagos;
DROP POLICY IF EXISTS "anon_pagos_select" ON pagos;
DROP POLICY IF EXISTS "anon_pagos_insert" ON pagos;
DROP POLICY IF EXISTS "anon_pagos_update" ON pagos;
DROP POLICY IF EXISTS "anon_pagos_delete" ON pagos;
DROP POLICY IF EXISTS "auth_pagos_select" ON pagos;
DROP POLICY IF EXISTS "auth_pagos_insert" ON pagos;
DROP POLICY IF EXISTS "auth_pagos_update" ON pagos;

CREATE POLICY "anon_pagos_select" ON pagos FOR SELECT TO anon USING (true);
CREATE POLICY "anon_pagos_insert" ON pagos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_pagos_update" ON pagos FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_pagos_delete" ON pagos FOR DELETE TO anon USING (true);

CREATE POLICY "auth_pagos_select" ON pagos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_pagos_insert" ON pagos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_pagos_update" ON pagos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ===========================================
-- CLIENTES
-- ===========================================
DROP POLICY IF EXISTS "Empleados gestionan ficha de socios" ON clientes;
DROP POLICY IF EXISTS "anon_clientes_select" ON clientes;
DROP POLICY IF EXISTS "anon_clientes_insert" ON clientes;
DROP POLICY IF EXISTS "anon_clientes_update" ON clientes;

CREATE POLICY "anon_clientes_select" ON clientes FOR SELECT TO anon USING (true);
CREATE POLICY "anon_clientes_insert" ON clientes FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_clientes_update" ON clientes FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ===========================================
-- TURNOS
-- ===========================================
DROP POLICY IF EXISTS "anon_turnos_select" ON turnos;
DROP POLICY IF EXISTS "anon_turnos_update" ON turnos;

CREATE POLICY "anon_turnos_select" ON turnos FOR SELECT TO anon USING (true);
CREATE POLICY "anon_turnos_update" ON turnos FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- ===========================================
-- ASIGNACIONES
-- ===========================================
DROP POLICY IF EXISTS "anon_asig_all" ON asignaciones_turnos;

CREATE POLICY "anon_asig_all" ON asignaciones_turnos FOR ALL TO anon USING (true) WITH CHECK (true);

-- ===========================================
-- RECUPEROS
-- ===========================================
DROP POLICY IF EXISTS "anon_recuperos_all" ON recupero_turnos;

CREATE POLICY "anon_recuperos_all" ON recupero_turnos FOR ALL TO anon USING (true) WITH CHECK (true);
