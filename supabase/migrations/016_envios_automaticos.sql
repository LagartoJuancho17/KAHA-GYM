-- 016_envios_automaticos.sql
--
-- Candado de un envío por día para los mails automáticos (aviso del día 5 y
-- reporte del día 10).
--
-- Por qué hace falta:
--  1. pg_cron reintenta si la llamada falla a mitad de camino. Sin candado, un
--     reintento le manda el aviso dos veces a todos los socios.
--  2. El endpoint queda accesible sin token (no hay forma de compartir un secreto
--     entre Postgres y Vercel sin que alguien lo cargue a mano). El candado hace
--     que golpearlo mil veces mande un solo mail igual.
--
-- La unicidad la da la PK (tipo, fecha): el segundo insert del día choca y el
-- endpoint responde "ya se envió" sin mandar nada.

CREATE TABLE IF NOT EXISTS envios_automaticos (
  tipo        text        NOT NULL,
  fecha       date        NOT NULL,
  enviados    integer     NOT NULL DEFAULT 0,
  errores     integer     NOT NULL DEFAULT 0,
  detalle     jsonb,
  creado_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tipo, fecha)
);

COMMENT ON TABLE envios_automaticos IS
  'Un renglón por (tipo de envío, día). Su PK es el candado que evita mandar dos veces el mismo mail automático.';
