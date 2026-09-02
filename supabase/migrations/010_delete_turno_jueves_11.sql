-- Migration 010: Eliminar turno de Jueves a las 11:00 hs
-- (El turno de 11:00 hs ahora solo se dicta los días Martes)

DELETE FROM asignaciones_turnos 
WHERE turno_id IN (
  SELECT id FROM turnos WHERE dia = 'JUEVES' AND (hora = '11:00:00' OR hora = '11:00')
);

DELETE FROM lista_espera_turnos 
WHERE turno_id IN (
  SELECT id FROM turnos WHERE dia = 'JUEVES' AND (hora = '11:00:00' OR hora = '11:00')
);

DELETE FROM turnos 
WHERE dia = 'JUEVES' AND (hora = '11:00:00' OR hora = '11:00');
