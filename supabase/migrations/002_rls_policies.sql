-- supabase/migrations/002_rls_policies.sql
-- Políticas de Seguridad de Fila (RLS) para el Sistema de Gimnasio (Argentina)

-- Habilitar RLS en todas las tablas
ALTER TABLE perfiles_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_precios_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_espera_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE recupero_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_morosos_kpi ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_auditoria ENABLE ROW LEVEL SECURITY;

-- Funciones auxiliares para verificar roles
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles_usuario
    WHERE id = auth.uid() AND rol = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.pertenece_perfil()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM perfiles_usuario
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 1. Políticas para PERFILES_USUARIO
-- Los usuarios autenticados pueden ver perfiles
CREATE POLICY "Usuarios pueden ver todos los perfiles"
ON perfiles_usuario FOR SELECT
TO authenticated
USING (true);

-- Solo admins pueden insertar/actualizar perfiles
CREATE POLICY "Solo admins pueden modificar perfiles"
ON perfiles_usuario FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());


-- 2. Políticas para PLANES
-- Todos los operadores y admins autenticados pueden consultar planes
CREATE POLICY "Todos los terapeutas/operadores pueden ver planes"
ON planes FOR SELECT
TO authenticated
USING (true);

-- Solo admins pueden insertar, actualizar o borrar planes (operadores no pueden cambiar precios)
CREATE POLICY "Solo admins pueden actualizar planes"
ON planes FOR ALL
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());


-- 3. Políticas para HISTORIAL_PRECIOS_PLANES
-- Solo admins pueden ver o gestionar el historial detallado de precios
CREATE POLICY "Solo admins ven historial de precios"
ON historial_precios_planes FOR SELECT
TO authenticated
USING (es_admin());

CREATE POLICY "Solo admins insertan historial de precios"
ON historial_precios_planes FOR INSERT
TO authenticated
WITH CHECK (es_admin());


-- 4. Políticas para CLIENTES
-- Todos los empleados registrados pueden ver clientes
CREATE POLICY "Empleados ven listado de clientes"
ON clientes FOR SELECT
TO authenticated
USING (pertenece_perfil());

-- Todos los empleados registrados pueden insertar, actualizar clientes
CREATE POLICY "Empleados gestionan fichas de clientes"
ON clientes FOR ALL
TO authenticated
USING (pertenece_perfil())
WITH CHECK (pertenece_perfil());


-- 5. Políticas para ASIGNACIONES_TURNOS, LISTA_ESPERA_TURNOS, RECUPERO_TURNOS
-- Operadores y Admins pueden gestionar la asignación del día a día
CREATE POLICY "Empleados ven asignaciones de turnos"
ON asignaciones_turnos FOR SELECT
TO authenticated
USING (pertenece_perfil());

CREATE POLICY "Empleados modifican asignaciones de turnos"
ON asignaciones_turnos FOR ALL
TO authenticated
USING (pertenece_perfil())
WITH CHECK (pertenece_perfil());

CREATE POLICY "Empleados ven lista de espera"
ON lista_espera_turnos FOR SELECT
TO authenticated
USING (pertenece_perfil());

CREATE POLICY "Empleados modifican lista de espera"
ON lista_espera_turnos FOR ALL
TO authenticated
USING (pertenece_perfil())
WITH CHECK (pertenece_perfil());

CREATE POLICY "Empleados ven planillas de recupero"
ON recupero_turnos FOR SELECT
TO authenticated
USING (pertenece_perfil());

CREATE POLICY "Empleados modifican planillas de recupero"
ON recupero_turnos FOR ALL
TO authenticated
USING (pertenece_perfil())
WITH CHECK (pertenece_perfil());


-- 6. Políticas para PAGOS y CLIENTES_MOROSOS_KPI
-- Operadores y Admins pueden registrar pagos, pero la visualización consolidada u operaciones delicadas de pagos
-- se registran según nivel. Ambos roles pueden auditar pagos individuales de clientes.
CREATE POLICY "Empleados ven pagos registrados"
ON pagos FOR SELECT
TO authenticated
USING (pertenece_perfil());

CREATE POLICY "Empleados registran ingresos de pagos"
ON pagos FOR INSERT
TO authenticated
WITH CHECK (pertenece_perfil());

-- Solo Admins pueden suprimir o modificar pagos historicos
CREATE POLICY "Solo admins alteran pagos archivados"
ON pagos FOR UPDATE
TO authenticated
USING (es_admin())
WITH CHECK (es_admin());

CREATE POLICY "Solo admins eliminan transacciones"
ON pagos FOR DELETE
TO authenticated
USING (es_admin());

CREATE POLICY "Todos los empleados analizan morosos"
ON clientes_morosos_kpi FOR SELECT
TO authenticated
USING (pertenece_perfil());

CREATE POLICY "Todos los empleados gestionan morosos"
ON clientes_morosos_kpi FOR ALL
TO authenticated
USING (pertenece_perfil())
WITH CHECK (pertenece_perfil());


-- 7. Políticas para LOGS_AUDITORIA
-- Todos los empleados pueden registrar logs de lo que hacen, pero solo Admins pueden auditar los logs completos
CREATE POLICY "Todos los procesos escriben logs de auditoria"
ON logs_auditoria FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Solo admins ven logeria de auditoria"
ON logs_auditoria FOR SELECT
TO authenticated
USING (es_admin());
