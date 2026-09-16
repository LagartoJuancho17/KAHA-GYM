-- 019_ocupacion_no_duplicar_fijos.sql
--
-- Corrige kaha_ocupacion_turno: contaba DOS VECES a un socio que es fijo del
-- turno y ademas tiene una reserva suelta del mismo turno para esa fecha.
--
-- Es una sola persona, un solo cuerpo en la clase. La funcion canonica del
-- front ya lo excluye (src/lib/ocupacion.ts, contarReservas: `if (fijoIds.has(c.id)) return acc`),
-- porque el flujo normal del gimnasio es "primero prueba clases sueltas y
-- despues se hace fijo", y esas reservas viejas quedan.
--
-- Medido en produccion: 16 pares turno/fecha divergian, siempre SQL > TS.
-- Caso vigente al detectarlo: Carlos Sagala, MIERCOLES 20:00 del 2026-09-16.
-- La funcion devolvia 8 sobre un cupo de 7 mientras la turnera mostraba 7.
--
-- Consecuencia: kaha_crear_reserva usa esta funcion para decidir si hay lugar,
-- asi que RECHAZABA reservas legitimas con motivo "lleno" mientras la app
-- mostraba un lugar libre. La direccion del error era segura (nunca metia gente
-- de mas), pero bloqueaba a socios sin explicacion.

CREATE OR REPLACE FUNCTION public.kaha_ocupacion_turno(p_turno_id uuid, p_fecha date)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  WITH t AS (
    SELECT id, dia || '-' || substring(hora::text, 1, 5) AS local_id
    FROM turnos WHERE id = p_turno_id
  )
  SELECT
    (SELECT count(*) FROM asignaciones_turnos a
       JOIN clientes c ON c.id = a.cliente_id
      WHERE a.turno_id = p_turno_id
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(c.clases_suspendidas, '[]'::jsonb)) s
           WHERE s->>'turno_id' = (SELECT local_id FROM t)
             AND (s->>'fecha')::date = p_fecha))
    +
    (SELECT count(*) FROM clientes c,
       jsonb_array_elements(COALESCE(c.reservas_individuales, '[]'::jsonb)) r
      WHERE c.activo
        AND r->>'turno_id' = (SELECT local_id FROM t)
        AND (r->>'fecha')::date = p_fecha
        -- Un fijo del turno ya se conto arriba: no duplicarlo.
        AND NOT EXISTS (
          SELECT 1 FROM asignaciones_turnos a2
           WHERE a2.turno_id = p_turno_id AND a2.cliente_id = c.id))
    +
    (SELECT count(*) FROM recupero_turnos rt
      WHERE rt.turno_recupero_id = p_turno_id
        AND rt.fecha_recupero = p_fecha
        AND rt.estado IN ('PENDIENTE', 'COMPLETADO'))
$function$;
