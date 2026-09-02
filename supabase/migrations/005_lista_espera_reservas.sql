-- Lista de espera POR FECHA (un dia puntual de un turno).
-- Distinta de lista_espera_turnos, que es la lista semanal del turno.
-- Antes esto vivia SOLO en localStorage, asi que se perdia al cambiar de
-- dispositivo, limpiar el navegador o abrir desde otra sesion: los socios
-- reportaban que no les quedaba guardado el cupo en la lista de espera.
CREATE TABLE IF NOT EXISTS lista_espera_reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id uuid NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  creado_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lista_espera_reservas_unica UNIQUE (turno_id, cliente_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_lista_espera_reservas_turno_fecha
  ON lista_espera_reservas (turno_id, fecha, creado_at);

GRANT ALL ON lista_espera_reservas TO anon, authenticated, service_role;
