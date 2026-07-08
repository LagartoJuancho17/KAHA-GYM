// src/types.ts
// Definición de tipos estricta para el Sistema del Gimnasio (Argentina)

export type TipoCliente = 'FIJO' | 'FLEXIBLE';
export type EstadoCliente = 'ACTIVO' | 'CON_DEUDA' | 'MOROSO' | 'INACTIVO';
export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'MERCADO_PAGO' | 'UALA' | 'OTRO';
export type RolUsuario = 'ADMIN' | 'OPERADOR' | 'SOCIO';

export interface ReservaIndividual {
  id: string;
  turno_id: string;
  fecha: string; // Formato 'YYYY-MM-DD'
  creado_at: string;
}

export interface ClaseSuspendida {
  turno_id: string;
  fecha: string; // Formato 'YYYY-MM-DD'
  reintegrado: boolean; // Indica si se le devolvió el cupo al socio (aviso > 3 horas)
  creado_at: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  tipo: TipoCliente;
  estado: EstadoCliente;
  plan_id: string;
  activo: boolean; // para baja lógica
  deuda_acumulada: number;
  ultimo_mes_pagado: string; // Formato 'YYYY-MM'
  turnos_fijos: string[]; // IDs de los turnos asignados (si es FIJO)
  turno_variable?: string; // ID del turno variable asignado en tiempo real
  exencion_cobro?: 'NINGUNA' | 'SUSPENDIDO' | 'POSTERGADO' | 'PERDONADO';
  reservas_individuales?: ReservaIndividual[];
  clases_suspendidas?: ClaseSuspendida[];
  creado_at: string;
  autorizado?: boolean;
}

export interface Plan {
  id: string;
  nombre: string;
  dias_por_semana: number;
  precio: number;
  creado_at: string;
}

export interface HistorialPrecioPlan {
  id: string;
  plan_id: string;
  nombre_plan: string;
  precio_anterior: number;
  precio_nuevo: number;
  fecha_cambio: string;
  cambiado_por: string;
}

export interface Turno {
  id: string; // ej: "LUNES-07:30"
  dia: 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES';
  hora: string; // "07:30", "15:00", etc.
  cupo_maximo: number;
  asignados_ids: string[]; // cliente_id de clientes asignados fijos
  lista_espera_ids: string[]; // cliente_id de clientes en lista de espera
  profesor?: string; // Profesor asignado a este turno
  db_uuid?: string; // UUID real en la base de datos de Supabase
}

export interface Pago {
  id: string;
  cliente_id: string;
  cliente_nombre_completo: string;
  monto: number;
  fecha_pago: string;
  medio_pago: MedioPago;
  mes_correspondiente: string; // Formato 'YYYY-MM'
  hash_transaccion?: string;
  registrado_por: string; // email del operador/admin
  creado_at: string;
}

export interface PagoEnRevision {
  id: string;
  cliente_id: string;
  cliente_nombre_completo: string;
  monto: number;
  mes_correspondiente: string;
  solicitado_por_email: string;
  solicitado_at: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
}

export interface RecuperoTurno {
  id: string;
  cliente_id: string;
  cliente_nombre: string;
  turno_original_id: string;
  fecha_inasistencia: string;
  turno_recupero_id: string; // ID del turno de recupero, o 'PENDIENTE_DEFINICION'
  fecha_recupero: string; // Fecha de recupero, o vacía ''
  estado: 'PENDIENTE' | 'COMPLETADO' | 'EXPIRADO';
  fecha_limite: string; // Fecha máxima para recuperar (1 mes desde inasistencia)
}

export interface AuditLog {
  id: string;
  usuario_id: string;
  usuario_email: string;
  accion: string;
  detalles: any;
  creado_at: string;
}

export interface Novedad {
  id: string;
  titulo: string;
  contenido: string;
  fecha: string; // 'YYYY-MM-DD HH:mm' o similar
  categoria: 'ARANCELES' | 'TURNOS' | 'INFORMACION' | 'EVENTOS';
  creado_por: string;
  destacado: boolean;
}

export interface AlertaNotificacion {
  id: string;
  tipo: 'PAGO_REALIZADO' | 'SISTEMA' | 'DEUDA_VENCIDA';
  titulo: string;
  mensaje: string;
  fecha: string; // ISO string
  leido: boolean;
}

export interface Gasto {
  id: string;
  concepto: string;
  monto: number;
  categoria: 'PROFESORES' | 'SERVICIOS' | 'ALQUILER' | 'INSUMOS' | 'OTROS';
  fecha: string; // 'YYYY-MM-DD'
  registrado_por: string;
  creado_at: string;
}

export interface Profesor {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  valor_hora: number;
  activo: boolean;
}

export interface NovedadProfesor {
  id: string;
  profesor_id: string; // Profesor ausente / a reemplazar
  fecha: string; // 'YYYY-MM-DD'
  turno_id: string;
  tipo: 'AUSENCIA' | 'REEMPLAZO';
  reemplazo_profesor_id?: string; // Profesor que lo cubre, si aplica
  creado_at: string;
}

export interface WaitlistReserva {
  id: string;
  cliente_id: string;
  turno_id: string;
  fecha: string;
  creado_at: string;
}

export interface ToastMessage {
  id: string;
  type: 'add' | 'delete' | 'success' | 'error';
  message: string;
}


