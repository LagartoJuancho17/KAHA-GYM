-- supabase/migrations/001_initial_schema.sql
-- Schema inicial para el Sistema del Gimnasio (Argentina)
-- Timezone recomendada para la base de datos: America/Argentina/Buenos_Aires

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Creación de Enums
CREATE TYPE tipo_cliente AS ENUM ('FIJO', 'FLEXIBLE');
CREATE TYPE estado_cliente AS ENUM ('ACTIVO', 'CON_DEUDA', 'MOROSO', 'INACTIVO');
CREATE TYPE medio_pago AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'MERCADO_PAGO', 'UALA', 'OTRO');
CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'OPERADOR');

-- Tabla de Usuarios de Gestión (Roles y datos de contacto)
CREATE TABLE IF NOT EXISTS perfiles_usuario (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    rol rol_usuario DEFAULT 'OPERADOR' NOT NULL,
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabla de Planes de Entrenamiento
CREATE TABLE IF NOT EXISTS planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE, -- ej: "2 días", "3 días", "4 días", "5 días"
    dias_por_semana INTEGER NOT NULL CHECK (dias_por_semana BETWEEN 1 AND 6),
    precio NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Historial de Cambios de Precio (no retroactivo)
CREATE TABLE IF NOT EXISTS historial_precios_planes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES planes(id) ON DELETE CASCADE NOT NULL,
    precio_anterior NUMERIC(12, 2) NOT NULL CHECK (precio_anterior >= 0),
    precio_nuevo NUMERIC(12, 2) NOT NULL CHECK (precio_nuevo >= 0),
    fecha_cambio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    cambiado_por UUID REFERENCES perfiles_usuario(id)
);

-- Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    telefono TEXT,
    tipo tipo_cliente DEFAULT 'FLEXIBLE' NOT NULL,
    estado estado_cliente DEFAULT 'ACTIVO' NOT NULL,
    plan_id UUID REFERENCES planes(id) NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL, -- Para baja lógica (no eliminar físicamente)
    deuda_acumulada NUMERIC(12, 2) DEFAULT 0.00 NOT NULL CHECK (deuda_acumulada >= 0),
    ultimo_mes_pagado VARCHAR(7), -- Formato 'YYYY-MM'
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    actualizado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabla de Turnos (Definición de Slots y Cupos semanales)
CREATE TABLE IF NOT EXISTS turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dia VARCHAR(10) NOT NULL CHECK (dia IN ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES')),
    hora TIME NOT NULL,
    cupo_maximo INTEGER NOT NULL CHECK (cupo_maximo > 0),
    UNIQUE (dia, hora)
);

-- Tabla de Relación Turno-Clientes (Asignaciones Fijas de turnos)
CREATE TABLE IF NOT EXISTS asignaciones_turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
    turno_id UUID REFERENCES turnos(id) ON DELETE CASCADE NOT NULL,
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (cliente_id, turno_id)
);

-- Lista de Espera Automática para turnos llenos
CREATE TABLE IF NOT EXISTS lista_espera_turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id UUID REFERENCES turnos(id) ON DELETE CASCADE NOT NULL,
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
    prioridad SERIAL, -- Orden de llegada
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (turno_id, cliente_id)
);

-- Recupero de Turnos (Para ausencias/cancelaciones de clientes fijos que quieren recuperar otro día)
CREATE TABLE IF NOT EXISTS recupero_turnos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
    turno_original_id UUID REFERENCES turnos(id) ON DELETE SET NULL,
    fecha_inasistencia DATE NOT NULL,
    turno_recupero_id UUID REFERENCES turnos(id) ON DELETE CASCADE NOT NULL,
    fecha_recupero DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'COMPLETADO', 'EXPIRADO')),
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabla de Pagos
CREATE TABLE IF NOT EXISTS pagos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,
    monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
    fecha_pago TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    medio_pago medio_pago NOT NULL,
    mes_correspondiente VARCHAR(7) NOT NULL, -- ej: '2026-05'
    hash_transaccion TEXT UNIQUE, -- para detección de duplicados (por ej. desde importaciones de extractos)
    registrado_por UUID REFERENCES perfiles_usuario(id),
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabla de Alertas de Morosidad e Historial de Mora
CREATE TABLE IF NOT EXISTS clientes_morosos_kpi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE UNIQUE NOT NULL,
    dias_atraso INTEGER NOT NULL DEFAULT 0,
    monto_adeudado NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ultimo_chequeo TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Tabla de Logs de Auditoría
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES perfiles_usuario(id) ON DELETE SET NULL,
    usuario_email TEXT,
    accion TEXT NOT NULL, -- ej: 'CLIENTE_CREADO', 'PRECIO_PLAN_MODIFICADO', 'PAGO_REGISTRADO', 'CLIENTE_BAJA'
    detalles JSONB,
    creado_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices calientes para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_clientes_busqueda ON clientes (apellido, nombre);
CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes (estado, activo);
CREATE INDEX IF NOT EXISTS idx_pagos_cliente ON pagos (cliente_id, mes_correspondiente);
CREATE INDEX IF NOT EXISTS idx_asignaciones_turno ON asignaciones_turnos (turno_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_cliente ON asignaciones_turnos (cliente_id);
