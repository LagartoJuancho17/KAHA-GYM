-- supabase/migrations/003_seed_data.sql
-- Datos Iniciales (Seed Run) para Sistema de Gimnasio en Argentina

-- 1. Insertar Planes Base con Precios Sugeridos en ARS (Pesos Argentinos)
INSERT INTO planes (nombre, dias_por_semana, precio) VALUES
('Plan 2 Días Semana', 2, 14000.00),
('Plan 3 Días Semana', 3, 18000.00),
('Plan 4 Días Semana', 4, 21000.00),
('Plan 5 Días Semana', 5, 24000.00)
ON CONFLICT (nombre) DO UPDATE SET 
  precio = EXCLUDED.precio,
  dias_por_semana = EXCLUDED.dias_por_semana;

-- 2. Insertar Turnos correspondientes a Lunes a Viernes
-- Lunes a Viernes: 7:30 (7), 8:30 (7), 9:30 (7), 10:30 (5), 11:00 (3), 12:00 (7), 16:00 (7), 17:00 (7), 18:00 (7), 19:00 (7), 20:00 (7), 21:00 (8)
-- Adicionalmente para Martes, Jueves y Viernes: 15:00 (7)

-- LUNES
INSERT INTO turnos (dia, hora, cupo_maximo) VALUES
('LUNES', '07:30:00', 7),
('LUNES', '08:30:00', 7),
('LUNES', '09:30:00', 7),
('LUNES', '10:30:00', 5),
('LUNES', '11:00:00', 3),
('LUNES', '12:00:00', 7),
('LUNES', '16:00:00', 7),
('LUNES', '17:00:00', 7),
('LUNES', '18:00:00', 7),
('LUNES', '19:00:00', 7),
('LUNES', '20:00:00', 7),
('LUNES', '21:00:00', 8)
ON CONFLICT (dia, hora) DO UPDATE SET cupo_maximo = EXCLUDED.cupo_maximo;

-- MARTES
INSERT INTO turnos (dia, hora, cupo_maximo) VALUES
('MARTES', '07:30:00', 7),
('MARTES', '08:30:00', 7),
('MARTES', '09:30:00', 7),
('MARTES', '10:30:00', 5),
('MARTES', '11:00:00', 3),
('MARTES', '12:00:00', 7),
('MARTES', '15:00:00', 7), -- Extra Martes
('MARTES', '16:00:00', 7),
('MARTES', '17:00:00', 7),
('MARTES', '18:00:00', 7),
('MARTES', '19:00:00', 7),
('MARTES', '20:00:00', 7),
('MARTES', '21:00:00', 8)
ON CONFLICT (dia, hora) DO UPDATE SET cupo_maximo = EXCLUDED.cupo_maximo;

-- MIÉRCOLES
INSERT INTO turnos (dia, hora, cupo_maximo) VALUES
('MIERCOLES', '07:30:00', 7),
('MIERCOLES', '08:30:00', 7),
('MIERCOLES', '09:30:00', 7),
('MIERCOLES', '10:30:00', 5),
('MIERCOLES', '11:00:00', 3),
('MIERCOLES', '12:00:00', 7),
('MIERCOLES', '16:00:00', 7),
('MIERCOLES', '17:00:00', 7),
('MIERCOLES', '18:00:00', 7),
('MIERCOLES', '19:00:00', 7),
('MIERCOLES', '20:00:00', 7),
('MIERCOLES', '21:00:00', 8)
ON CONFLICT (dia, hora) DO UPDATE SET cupo_maximo = EXCLUDED.cupo_maximo;

-- JUEVES
INSERT INTO turnos (dia, hora, cupo_maximo) VALUES
('JUEVES', '07:30:00', 7),
('JUEVES', '08:30:00', 7),
('JUEVES', '09:30:00', 7),
('JUEVES', '10:30:00', 5),
('JUEVES', '11:00:00', 3),
('JUEVES', '12:00:00', 7),
('JUEVES', '15:00:00', 7), -- Extra Jueves
('JUEVES', '16:00:00', 7),
('JUEVES', '17:00:00', 7),
('JUEVES', '18:00:00', 7),
('JUEVES', '19:00:00', 7),
('JUEVES', '20:00:00', 7),
('JUEVES', '21:00:00', 8)
ON CONFLICT (dia, hora) DO UPDATE SET cupo_maximo = EXCLUDED.cupo_maximo;

-- VIERNES
INSERT INTO turnos (dia, hora, cupo_maximo) VALUES
('VIERNES', '07:30:00', 7),
('VIERNES', '08:30:00', 7),
('VIERNES', '09:30:00', 7),
('VIERNES', '10:30:00', 5),
('VIERNES', '11:00:00', 3),
('VIERNES', '12:00:00', 7),
('VIERNES', '15:00:00', 7), -- Extra Viernes
('VIERNES', '16:00:00', 7),
('VIERNES', '17:00:00', 7),
('VIERNES', '18:00:00', 7),
('VIERNES', '19:00:00', 7),
('VIERNES', '20:00:00', 7),
('VIERNES', '21:00:00', 8)
ON CONFLICT (dia, hora) DO UPDATE SET cupo_maximo = EXCLUDED.cupo_maximo;
