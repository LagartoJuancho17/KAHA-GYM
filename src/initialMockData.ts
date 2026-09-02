// src/initialMockData.ts
// Datos semilla iniciales para simular Supabase mediante localStorage (Argentina timezone)

import { Cliente, Plan, Turno, Pago, AuditLog, HistorialPrecioPlan, RecuperoTurno, Novedad } from './types';

export const INITIAL_PLANES: Plan[] = [
  { id: 'p-none', nombre: 'Aún no sabe', dias_por_semana: 5, precio: 0.00, creado_at: '2026-01-10T10:00:00Z' },
  { id: 'p-2d', nombre: 'Plan 2 Días Semana', dias_por_semana: 2, precio: 65000.00, creado_at: '2026-01-10T10:00:00Z' },
  { id: 'p-3d', nombre: 'Plan 3 Días Semana', dias_por_semana: 3, precio: 85000.00, creado_at: '2026-01-10T10:00:00Z' },
  { id: 'p-4d', nombre: 'Plan 4 Días Semana', dias_por_semana: 4, precio: 115000.00, creado_at: '2026-01-10T10:00:00Z' },
  { id: 'p-5d', nombre: 'Plan 5 Días Semana', dias_por_semana: 5, precio: 135000.00, creado_at: '2026-01-10T10:00:00Z' },
];

export const INITIAL_HISTORIAL_PRECIOS: HistorialPrecioPlan[] = [
  {
    id: 'h-1',
    plan_id: 'p-3d',
    nombre_plan: 'Plan 3 Días Semana',
    precio_anterior: 16000.00,
    precio_nuevo: 18000.00,
    fecha_cambio: '2026-03-01T12:00:00Z',
    cambiado_por: 'admin@gimnasio.com.ar'
  },
  {
    id: 'h-2',
    plan_id: 'p-5d',
    nombre_plan: 'Plan 5 Días Semana',
    precio_anterior: 22000.00,
    precio_nuevo: 24000.00,
    fecha_cambio: '2026-03-01T12:00:00Z',
    cambiado_por: 'admin@gimnasio.com.ar'
  }
];

// Días de Lunes a Viernes
const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const;

// Horarios de Lunes a Viernes: 
// 7:30 (cupo 7), 8:30 (7), 9:30 (7), 10:30 (5 ó 7), 11:00 (3 solo Martes), 11:30 (5), 12:00 (7),
// 16:00 (7), 17:00 (7), 18:00 (7), 19:00 (7), 20:00 (7), 21:00 (8)
// Adicionalmente solo Martes + Jueves + Viernes: 15:00 (cupo 7)
export function generarTurnosIniciales(): Turno[] {
  const turnos: Turno[] = [];
  
  DIAS.forEach(dia => {
    const esDiasLMW = dia === 'LUNES' || dia === 'MIERCOLES' || dia === 'VIERNES';

    const horasBase = [
      { hora: '07:30', cupo: 7 },
      { hora: '08:30', cupo: 7 },
      { hora: '09:30', cupo: 7 },
      { hora: '10:30', cupo: esDiasLMW ? 7 : 5 },
      ...(dia === 'MARTES' ? [{ hora: '11:00', cupo: 3 }] : []),
      { hora: '11:30', cupo: 5 },
      { hora: '12:00', cupo: esDiasLMW ? 3 : 7 },
      { hora: '16:00', cupo: 7 },
      { hora: '17:00', cupo: 7 },
      { hora: '18:00', cupo: 7 },
      { hora: '19:00', cupo: 7 },
      { hora: '20:00', cupo: 7 },
      { hora: '21:00', cupo: 8 }
    ];

    horasBase.forEach(h => {
      turnos.push({
        id: `${dia}-${h.hora}`,
        dia,
        hora: h.hora,
        cupo_maximo: h.cupo,
        asignados_ids: [],
        lista_espera_ids: []
      });
    });

    // Horario extra para Martes, Jueves y Viernes (15:00, cupo 7)
    if (dia === 'MARTES' || dia === 'JUEVES' || dia === 'VIERNES') {
      turnos.push({
        id: `${dia}-15:00`,
        dia,
        hora: '15:00',
        cupo_maximo: 7,
        asignados_ids: [],
        lista_espera_ids: []
      });
    }
  });

  return turnos;
}

export const INITIAL_CLIENTES: Cliente[] = [
  {
    id: 'c-1',
    codigo_socio: 'SOC-001',
    nombre: 'Facundo',
    apellido: 'Gómez',
    email: 'facundo.gomez@gmail.com',
    telefono: '11-5432-8901',
    tipo: 'FIJO',
    estado: 'ACTIVO',
    plan_id: 'p-3d',
    activo: true,
    deuda_acumulada: 0,
    ultimo_mes_pagado: '2026-07',
    turnos_fijos: ['LUNES-08:30', 'MIERCOLES-08:30', 'VIERNES-08:30'],
    creado_at: '2026-01-15T09:00:00Z'
  },
  {
    id: 'c-2',
    codigo_socio: 'SOC-002',
    nombre: 'Sofía',
    apellido: 'Rodríguez',
    email: 'sofia.rod@hotmail.com',
    telefono: '11-3422-9988',
    tipo: 'FIJO',
    estado: 'MOROSO',
    plan_id: 'p-2d',
    activo: true,
    deuda_acumulada: 65000.00, // Debe el mes actual (julio)
    ultimo_mes_pagado: '2026-06',
    turnos_fijos: ['MARTES-19:00', 'JUEVES-19:00'],
    creado_at: '2026-02-01T18:30:00Z'
  },
  {
    id: 'c-3',
    codigo_socio: 'SOC-003',
    nombre: 'Mateo',
    apellido: 'Rossi',
    email: 'mateo_rossi@yahoo.com.ar',
    telefono: '341-234-5678',
    tipo: 'FIJO',
    estado: 'ACTIVO',
    plan_id: 'p-3d',
    activo: true,
    deuda_acumulada: 0,
    ultimo_mes_pagado: '2026-07',
    turnos_fijos: [],
    creado_at: '2026-02-14T11:00:00Z'
  },
  {
    id: 'c-4',
    codigo_socio: 'SOC-004',
    nombre: 'Valentina',
    apellido: 'Díaz',
    email: 'diaz.vale@gmail.com',
    telefono: '11-8976-5432',
    tipo: 'FIJO',
    estado: 'ACTIVO',
    plan_id: 'p-5d',
    activo: true,
    deuda_acumulada: 0,
    ultimo_mes_pagado: '2026-07',
    turnos_fijos: ['LUNES-18:00', 'MARTES-18:00', 'MIERCOLES-18:00', 'JUEVES-18:00', 'VIERNES-18:00'],
    creado_at: '2026-03-10T16:00:00Z'
  },
  {
    id: 'c-5',
    codigo_socio: 'SOC-005',
    nombre: 'Emiliano',
    apellido: 'Fernández',
    email: 'emiliano.f@outlook.com',
    telefono: '261-456-7890',
    tipo: 'FIJO',
    estado: 'INACTIVO',
    plan_id: 'p-2d',
    activo: false, // Baja lógica
    deuda_acumulada: 0,
    ultimo_mes_pagado: '2026-03',
    turnos_fijos: [],
    creado_at: '2026-01-20T10:00:00Z'
  },
  {
    id: 'c-6',
    codigo_socio: 'SOC-006',
    nombre: 'Catalina',
    apellido: 'López',
    email: 'cata.lopez@gmail.com',
    telefono: '11-7654-3210',
    tipo: 'FIJO',
    estado: 'ACTIVO',
    plan_id: 'p-3d',
    activo: true,
    deuda_acumulada: 0,
    ultimo_mes_pagado: '2026-07',
    turnos_fijos: ['LUNES-10:30', 'MIERCOLES-10:30', 'VIERNES-10:30'],
    creado_at: '2026-04-05T08:00:00Z'
  },
  {
    id: 'c-7',
    codigo_socio: 'SOC-007',
    nombre: 'Bautista',
    apellido: 'González',
    email: 'bauti.gonzalez@gmail.com',
    telefono: '11-9898-7676',
    tipo: 'FIJO',
    estado: 'ACTIVO',
    plan_id: 'p-4d',
    activo: true,
    deuda_acumulada: 0,
    ultimo_mes_pagado: '2026-07',
    turnos_fijos: ['MARTES-15:00', 'JUEVES-15:00', 'VIERNES-15:00'],
    creado_at: '2026-04-12T14:00:00Z'
  },
  {
    id: 'c-invitado',
    codigo_socio: 'SOC-999',
    nombre: 'Invitado',
    apellido: 'de Prueba',
    email: 'invitado@test.com',
    telefono: '11-0000-0000',
    tipo: 'FIJO',
    estado: 'ACTIVO',
    plan_id: 'p-none',
    activo: true,
    deuda_acumulada: 0,
    ultimo_mes_pagado: '2026-07',
    turnos_fijos: [],
    creado_at: '2026-05-01T10:00:00Z'
  }
];

export const INITIAL_PAGOS: Pago[] = [
  // --- JULIO 2026 (MES ACTUAL) ---
  {
    id: 'pay-jul-1',
    cliente_id: 'c-1',
    cliente_nombre_completo: 'Facundo Gómez',
    monto: 85000.00,
    fecha_pago: '2026-07-02T10:15:00Z',
    medio_pago: 'MERCADO_PAGO',
    mes_correspondiente: '2026-07',
    hash_transaccion: 'MP-99881122',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-07-02T10:15:00Z'
  },
  {
    id: 'pay-jul-2',
    cliente_id: 'c-3',
    cliente_nombre_completo: 'Mateo Rossi',
    monto: 85000.00,
    fecha_pago: '2026-07-03T16:40:00Z',
    medio_pago: 'TRANSFERENCIA',
    mes_correspondiente: '2026-07',
    hash_transaccion: 'TX-88224511',
    registrado_por: 'operator@gimnasio.com.ar',
    creado_at: '2026-07-03T16:40:00Z'
  },
  {
    id: 'pay-jul-3',
    cliente_id: 'c-4',
    cliente_nombre_completo: 'Valentina Díaz',
    monto: 135000.00,
    fecha_pago: '2026-07-02T11:00:00Z',
    medio_pago: 'TRANSFERENCIA',
    mes_correspondiente: '2026-07',
    hash_transaccion: 'TX-77341109',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-07-02T11:00:00Z'
  },
  {
    id: 'pay-jul-4',
    cliente_id: 'c-6',
    cliente_nombre_completo: 'Catalina López',
    monto: 85000.00,
    fecha_pago: '2026-07-04T09:00:00Z',
    medio_pago: 'EFECTIVO',
    mes_correspondiente: '2026-07',
    hash_transaccion: 'EF-33211',
    registrado_por: 'operator@gimnasio.com.ar',
    creado_at: '2026-07-04T09:00:00Z'
  },
  {
    id: 'pay-jul-5',
    cliente_id: 'c-7',
    cliente_nombre_completo: 'Bautista González',
    monto: 115000.00,
    fecha_pago: '2026-07-05T19:30:00Z',
    medio_pago: 'TRANSFERENCIA',
    mes_correspondiente: '2026-07',
    hash_transaccion: 'TX-9038221',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-07-05T19:30:00Z'
  },

  // --- JUNIO 2026 (MES ANTERIOR) ---
  {
    id: 'pay-jun-1',
    cliente_id: 'c-1',
    cliente_nombre_completo: 'Facundo Gómez',
    monto: 85000.00,
    fecha_pago: '2026-06-02T10:00:00Z',
    medio_pago: 'MERCADO_PAGO',
    mes_correspondiente: '2026-06',
    hash_transaccion: 'MP-88112233',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-06-02T10:00:00Z'
  },
  {
    id: 'pay-jun-2',
    cliente_id: 'c-2',
    cliente_nombre_completo: 'Sofía Rodríguez',
    monto: 65000.00,
    fecha_pago: '2026-06-05T11:30:00Z',
    medio_pago: 'EFECTIVO',
    mes_correspondiente: '2026-06',
    hash_transaccion: 'EF-11992',
    registrado_por: 'operator@gimnasio.com.ar',
    creado_at: '2026-06-05T11:30:00Z'
  },
  {
    id: 'pay-jun-3',
    cliente_id: 'c-3',
    cliente_nombre_completo: 'Mateo Rossi',
    monto: 85000.00,
    fecha_pago: '2026-06-03T15:00:00Z',
    medio_pago: 'TRANSFERENCIA',
    mes_correspondiente: '2026-06',
    hash_transaccion: 'TX-55443322',
    registrado_por: 'operator@gimnasio.com.ar',
    creado_at: '2026-06-03T15:00:00Z'
  },
  {
    id: 'pay-jun-4',
    cliente_id: 'c-4',
    cliente_nombre_completo: 'Valentina Díaz',
    monto: 135000.00,
    fecha_pago: '2026-06-02T18:00:00Z',
    medio_pago: 'TRANSFERENCIA',
    mes_correspondiente: '2026-06',
    hash_transaccion: 'TX-66778899',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-06-02T18:00:00Z'
  },
  {
    id: 'pay-jun-5',
    cliente_id: 'c-6',
    cliente_nombre_completo: 'Catalina López',
    monto: 85000.00,
    fecha_pago: '2026-06-04T10:15:00Z',
    medio_pago: 'MERCADO_PAGO',
    mes_correspondiente: '2026-06',
    hash_transaccion: 'MP-77221199',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-06-04T10:15:00Z'
  },
  {
    id: 'pay-jun-6',
    cliente_id: 'c-7',
    cliente_nombre_completo: 'Bautista González',
    monto: 115000.00,
    fecha_pago: '2026-06-06T12:00:00Z',
    medio_pago: 'TRANSFERENCIA',
    mes_correspondiente: '2026-06',
    hash_transaccion: 'TX-11223344',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-06-06T12:00:00Z'
  },

  // --- MAYO 2026 ---
  {
    id: 'pay-may-1',
    cliente_id: 'c-1',
    cliente_nombre_completo: 'Facundo Gómez',
    monto: 85000.00,
    fecha_pago: '2026-05-03T10:00:00Z',
    medio_pago: 'MERCADO_PAGO',
    mes_correspondiente: '2026-05',
    hash_transaccion: 'MP-445566',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-05-03T10:00:00Z'
  },
  {
    id: 'pay-may-2',
    cliente_id: 'c-3',
    cliente_nombre_completo: 'Mateo Rossi',
    monto: 85000.00,
    fecha_pago: '2026-05-04T14:00:00Z',
    medio_pago: 'TRANSFERENCIA',
    mes_correspondiente: '2026-05',
    hash_transaccion: 'TX-332211',
    registrado_por: 'operator@gimnasio.com.ar',
    creado_at: '2026-05-04T14:00:00Z'
  },
  {
    id: 'pay-may-3',
    cliente_id: 'c-4',
    cliente_nombre_completo: 'Valentina Díaz',
    monto: 135000.00,
    fecha_pago: '2026-05-02T09:00:00Z',
    medio_pago: 'TRANSFERENCIA',
    mes_correspondiente: '2026-05',
    hash_transaccion: 'TX-998877',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-05-02T09:00:00Z'
  },
  {
    id: 'pay-may-4',
    cliente_id: 'c-6',
    cliente_nombre_completo: 'Catalina López',
    monto: 85000.00,
    fecha_pago: '2026-05-05T11:00:00Z',
    medio_pago: 'EFECTIVO',
    mes_correspondiente: '2026-05',
    hash_transaccion: 'EF-55443',
    registrado_por: 'operator@gimnasio.com.ar',
    creado_at: '2026-05-05T11:00:00Z'
  },
  {
    id: 'pay-may-5',
    cliente_id: 'c-7',
    cliente_nombre_completo: 'Bautista González',
    monto: 115000.00,
    fecha_pago: '2026-05-06T16:00:00Z',
    medio_pago: 'TRANSFERENCIA',
    mes_correspondiente: '2026-05',
    hash_transaccion: 'TX-118844',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-05-06T16:00:00Z'
  }
];

export const INITIAL_GASTOS: any[] = [
  {
    id: 'gas-jul-1',
    concepto: 'Alquiler Salón Principal',
    monto: 150000.00,
    categoria: 'ALQUILER',
    efectuado_por: 'JUANCHI_TRANSFERENCIA',
    fecha: '2026-07-05',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-07-05T10:00:00Z'
  },
  {
    id: 'gas-jul-2',
    concepto: 'Servicios Luz Edesur y Gas',
    monto: 38000.00,
    categoria: 'SERVICIOS',
    efectuado_por: 'RULO_TRANSFERENCIA',
    fecha: '2026-07-10',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-07-10T11:00:00Z'
  },
  {
    id: 'gas-jul-3',
    concepto: 'Honorarios Profesores Julio',
    monto: 130000.00,
    categoria: 'PROFESORES',
    efectuado_por: 'EFECTIVO_CAJA',
    fecha: '2026-07-28',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-07-28T18:00:00Z'
  },
  {
    id: 'gas-jun-1',
    concepto: 'Alquiler Salón Principal',
    monto: 140000.00,
    categoria: 'ALQUILER',
    efectuado_por: 'JUANCHI_TRANSFERENCIA',
    fecha: '2026-06-05',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-06-05T10:00:00Z'
  },
  {
    id: 'gas-jun-2',
    concepto: 'Servicios Luz e Internet',
    monto: 32000.00,
    categoria: 'SERVICIOS',
    efectuado_por: 'RULO_TRANSFERENCIA',
    fecha: '2026-06-10',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-06-10T11:00:00Z'
  },
  {
    id: 'gas-jun-3',
    concepto: 'Honorarios Profesores Junio',
    monto: 110000.00,
    categoria: 'PROFESORES',
    efectuado_por: 'EFECTIVO_CAJA',
    fecha: '2026-06-28',
    registrado_por: 'admin@gimnasio.com.ar',
    creado_at: '2026-06-28T18:00:00Z'
  }
];

export const INITIAL_RECUPEROS: RecuperoTurno[] = [
  {
    id: 'rec-1',
    cliente_id: 'c-1',
    cliente_nombre: 'Facundo Gómez',
    turno_original_id: 'LUNES-08:30',
    fecha_inasistencia: '2026-05-18',
    turno_recupero_id: 'MARTES-08:30',
    fecha_recupero: '2026-05-19',
    estado: 'COMPLETADO',
    fecha_limite: '2026-06-18'
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    usuario_id: 'usr-admin',
    usuario_email: 'admin@gimnasio.com.ar',
    accion: 'SISTEMA_INICIADO',
    detalles: { mensaje: 'Base de datos inicializada y cargada desde seeds' },
    creado_at: '2026-05-20T08:00:00Z'
  },
  {
    id: 'log-2',
    usuario_id: 'usr-admin',
    usuario_email: 'admin@gimnasio.com.ar',
    accion: 'PRECIO_PLAN_MODIFICADO',
    detalles: { plan: 'Plan 3 Días', aumento: 'De 16000 a 18000 ARS' },
    creado_at: '2026-05-20T09:12:00Z'
  },
  {
    id: 'log-3',
    usuario_id: 'usr-operator',
    usuario_email: 'operator@gimnasio.com.ar',
    accion: 'PAGO_REGISTRADO',
    detalles: { cliente: 'Catalina López', monto: 18000, mes: '2026-05' },
    creado_at: '2026-05-20T10:15:00Z'
  }
];

export const INITIAL_NOVEDADES: Novedad[] = [
  {
    id: 'nov-1',
    titulo: 'Reajuste General del Costo de Planes (Junio 2026)',
    contenido: 'Estimados socios, debido a los costos operativos generales, les informamos que a partir de las inscripciones del mes de Junio 2026 habrá una actualización de aranceles de un 15% promedio en todos nuestros planes fijos y flexibles. Pueden chequear los nuevos valores en la sección de Planes e Historial.',
    fecha: '2026-05-20 10:00',
    categoria: 'ARANCELES',
    creado_por: 'admin@gimnasio.com.ar',
    destacado: true
  },
  {
    id: 'nov-2',
    titulo: 'Mantenimiento preventivo en zona de musculación',
    contenido: 'Este sábado 30 de Mayo de 14:00hs a 17:00hs el gimnasio permanecerá cerrado en la zona de musculación por calibración de poleas, mantenimiento de cintas de correr y pintura de soportes. El resto de las instalaciones (sala funcional y área de estiramiento) funcionarán con normalidad. ¡Disculpen las molestias!',
    fecha: '2026-05-22 08:30',
    categoria: 'TURNOS',
    creado_por: 'admin@gimnasio.com.ar',
    destacado: false
  },
  {
    id: 'nov-3',
    titulo: 'Nuevo horario especial de CrossFit los Miércoles 19:30hs',
    contenido: '¡Sumamos un turno de alta demanda! Debido a las incesantes consultas, habilitamos un horario variable adaptativo para entrenamiento metabólico de CrossFit. Los cupos ya se encuentran cargados en el planificador semanal para reservas puntuales.',
    fecha: '2026-05-23 15:45',
    categoria: 'INFORMACION',
    creado_por: 'operator@gimnasio.com.ar',
    destacado: true
  }
];

