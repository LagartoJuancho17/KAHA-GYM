-- Migration 020: Eliminar turno de Martes a las 11:00 hs
-- (El turno de 11:00 hs ya no se dicta ningún día de la semana)

DELETE FROM asignaciones_turnos 
WHERE turno_id IN (
  SELECT id FROM turnos WHERE dia = 'MARTES' AND (hora = '11:00:00' OR hora = '11:00')
);

DELETE FROM lista_espera_turnos 
WHERE turno_id IN (
  SELECT id FROM turnos WHERE dia = 'MARTES' AND (hora = '11:00:00' OR hora = '11:00')
);

DELETE FROM turnos 
WHERE dia = 'MARTES' AND (hora = '11:00:00' OR hora = '11:00');
