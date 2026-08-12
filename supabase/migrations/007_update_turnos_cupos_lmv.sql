-- Migration 007: Actualizar cupos para Lunes, Miércoles y Viernes
-- 10:30 (cupo 7), 11:30 (cupo 5), 12:00 (cupo 3)

UPDATE turnos 
SET cupo_maximo = 7 
WHERE dia IN ('LUNES', 'MIERCOLES', 'VIERNES') 
  AND (hora = '10:30:00' OR hora = '10:30');

UPDATE turnos 
SET cupo_maximo = 3 
WHERE dia IN ('LUNES', 'MIERCOLES', 'VIERNES') 
  AND (hora = '12:00:00' OR hora = '12:00');

INSERT INTO turnos (dia, hora, cupo_maximo) VALUES
('LUNES', '11:30:00', 5),
('MIERCOLES', '11:30:00', 5),
('VIERNES', '11:30:00', 5)
ON CONFLICT (dia, hora) DO UPDATE SET cupo_maximo = 5;
