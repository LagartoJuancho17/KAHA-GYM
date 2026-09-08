-- Migration 013: Eliminar el turno del Miércoles a las 12:00
-- Este turno ya no se dicta. Se elimina de la tabla turnos.

DELETE FROM turnos
WHERE dia = 'MIERCOLES'
  AND (hora = '12:00:00' OR hora = '12:00');
