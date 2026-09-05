-- 013_crear_reserva_atomica.sql
--
-- POR QUE EXISTE
-- El cupo se validaba SOLO en el navegador, contra un estado que se carga una vez
-- al abrir la app (loadSupabaseData corre al montar y al loguearse; no hay realtime).
-- Dos socios en dispositivos distintos veian "6 ocupados" y los dos entraban.
-- Caso real medido: dos reservas al mismo turno con 5 minutos de diferencia.
--
-- POR QUE NO ALCANZA UN TRIGGER QUE CUENTE
-- La base corre en READ COMMITTED (default de Postgres). Dos transacciones
-- simultaneas leen las dos "6" y las dos insertan. Hace falta bloqueo explicito.
--
-- COMO LO RESUELVE
-- Se bloquea la fila del TURNO (SELECT ... FOR UPDATE). El primero que llega toma
-- el candado; el segundo espera y, cuando entra, vuelve a contar y ya ve la reserva
-- del primero. El candado se suelta al cerrar la transaccion.
--
-- QUE NO HACE, A PROPOSITO
-- No migra las reservas a una tabla nueva ni borra clientes.reservas_individuales.
-- El candado sobre el turno es lo que da atomicidad, no la forma de los datos.
-- Con 186 socios y 62 turnos, contar sobre el JSONB es instantaneo.
--
-- FORMULA DE OCUPACION: la misma que src/lib/ocupacion.ts
--   fijos activos (asignados menos los suspendidos ese dia)
--   + reservas puntuales de socios activos
--   + recuperos PENDIENTE o COMPLETADO
-- Ojo: NO se filtra clases_suspendidas.reintegrado. Ese campo solo indica si al
-- socio se le devolvio el credito por avisar con mas de 3hs (types.ts). Falta igual,
-- asi que libera el lugar en los dos casos.

-- ---------------------------------------------------------------------------
-- Ocupacion de un turno en una fecha. Se puede llamar sola para mostrar datos.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kaha_ocupacion_turno(p_turno_id uuid, p_fecha date)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  WITH t AS (
    SELECT id, dia || '-' || substring(hora::text, 1, 5) AS local_id
    FROM turnos WHERE id = p_turno_id
  )
  SELECT
    -- fijos activos
    (SELECT count(*) FROM asignaciones_turnos a
       JOIN clientes c ON c.id = a.cliente_id
      WHERE a.turno_id = p_turno_id
        AND NOT EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(c.clases_suspendidas, '[]'::jsonb)) s
           WHERE s->>'turno_id' = (SELECT local_id FROM t)
             AND (s->>'fecha')::date = p_fecha))
    +
    -- reservas puntuales de socios activos
    (SELECT count(*) FROM clientes c,
       jsonb_array_elements(COALESCE(c.reservas_individuales, '[]'::jsonb)) r
      WHERE c.activo
        AND r->>'turno_id' = (SELECT local_id FROM t)
        AND (r->>'fecha')::date = p_fecha)
    +
    -- recuperos que ocupan lugar (COMPLETADO = ya hizo check-in, esta en la sala)
    (SELECT count(*) FROM recupero_turnos rt
      WHERE rt.turno_recupero_id = p_turno_id
        AND rt.fecha_recupero = p_fecha
        AND rt.estado IN ('PENDIENTE', 'COMPLETADO'))
$$;

-- ---------------------------------------------------------------------------
-- Crear una reserva respetando el cupo, de forma atomica.
-- Devuelve jsonb: { ok, motivo, ocupacion, cupo, reserva }
--   ok=false + motivo='lleno'     -> el turno esta completo (el front manda a espera)
--   ok=false + motivo='duplicada' -> ese socio ya tiene lugar ese dia
--   ok=true                       -> reserva creada, viene en `reserva`
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kaha_crear_reserva(
  p_cliente_id uuid,
  p_turno_id   uuid,
  p_fecha      date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cupo      integer;
  v_local_id  text;
  v_ocupado   integer;
  v_activo    boolean;
  v_reserva   jsonb;
  v_fecha_txt text := to_char(p_fecha, 'YYYY-MM-DD');
BEGIN
  -- EL CANDADO. Serializa todas las reservas de este turno.
  -- Todo lo que sigue corre con la garantia de que nadie mas esta reservando aca.
  SELECT cupo_maximo, dia || '-' || substring(hora::text, 1, 5)
    INTO v_cupo, v_local_id
    FROM turnos
   WHERE id = p_turno_id
     FOR UPDATE;

  IF v_cupo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'turno_inexistente');
  END IF;

  SELECT activo INTO v_activo FROM clientes WHERE id = p_cliente_id;
  IF v_activo IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'socio_inexistente');
  END IF;
  IF NOT v_activo THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'socio_inactivo');
  END IF;

  -- Ya tiene lugar ese dia? Como fijo no suspendido, o como reserva puntual.
  IF EXISTS (
    SELECT 1 FROM clientes c,
      jsonb_array_elements(COALESCE(c.reservas_individuales, '[]'::jsonb)) r
     WHERE c.id = p_cliente_id
       AND r->>'turno_id' = v_local_id
       AND (r->>'fecha')::date = p_fecha
  ) OR EXISTS (
    SELECT 1 FROM asignaciones_turnos a
     WHERE a.cliente_id = p_cliente_id AND a.turno_id = p_turno_id
       AND NOT EXISTS (
         SELECT 1 FROM clientes c2,
           jsonb_array_elements(COALESCE(c2.clases_suspendidas, '[]'::jsonb)) s
          WHERE c2.id = p_cliente_id
            AND s->>'turno_id' = v_local_id
            AND (s->>'fecha')::date = p_fecha)
  ) THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'duplicada', 'cupo', v_cupo);
  END IF;

  -- Recien aca se cuenta, con el candado tomado.
  v_ocupado := public.kaha_ocupacion_turno(p_turno_id, p_fecha);

  IF v_ocupado >= v_cupo THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'lleno',
                              'ocupacion', v_ocupado, 'cupo', v_cupo);
  END IF;

  -- Mismo formato que arma el front, para que el resto de la app no note diferencia.
  v_reserva := jsonb_build_object(
    'id', 'res-' || (extract(epoch from clock_timestamp()) * 1000)::bigint
                 || '-' || substr(md5(random()::text), 1, 6),
    'turno_id', v_local_id,
    'fecha', v_fecha_txt,
    'creado_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  UPDATE clientes
     SET reservas_individuales = COALESCE(reservas_individuales, '[]'::jsonb) || v_reserva
   WHERE id = p_cliente_id;

  RETURN jsonb_build_object('ok', true, 'reserva', v_reserva,
                            'ocupacion', v_ocupado + 1, 'cupo', v_cupo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.kaha_ocupacion_turno(uuid, date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.kaha_crear_reserva(uuid, uuid, date) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.kaha_crear_reserva(uuid, uuid, date) IS
  'Crea una reserva puntual respetando el cupo. Bloquea la fila del turno (FOR UPDATE) antes de contar, asi dos dispositivos no pueden tomar el mismo lugar.';
