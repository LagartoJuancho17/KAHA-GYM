// src/lib/feriados.ts
// Gestión de feriados nacionales y días no laborables para KAHA GYM (Argentina)

export type TipoFeriado = 'INAMOVIBLE' | 'TRASLADABLE' | 'PUENTE' | 'GIMNASIO';

export interface Feriado {
  id: string;
  fecha: string; // Formato 'YYYY-MM-DD'
  nombre: string;
  tipo?: TipoFeriado;
  cerrado: boolean; // true = gimnasio cerrado todo el día, false = horario especial
  horario_especial?: string; // ej: "09:30 a 13:00"
  horas_habilitadas?: string[]; // ej: ['09:30', '10:30', '11:30'] - turnos que abren ese feriado
  hora_desde?: string; // ej: "09:30"
  hora_hasta?: string; // ej: "13:00"
  observaciones?: string;
  activo: boolean;
  creado_at: string;
}

/**
 * Horarios oficiales estándar de clases en KAHA GYM
 */
export const HORAS_GIMNASIO_ESTANDAR = [
  '07:30', '08:30', '09:30', '10:30', '11:30', '12:00',
  '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
] as const;

/**
 * Feriados Nacionales Oficiales de Argentina para 2025, 2026 y 2027
 * Fuente: Ministerio del Interior / Ley 27.399
 */
export const FERIADOS_OFICIALES_ARGENTINA: Record<number, Array<{
  fecha: string;
  nombre: string;
  tipo: TipoFeriado;
}>> = {
  2025: [
    { fecha: '2025-01-01', nombre: 'Año Nuevo', tipo: 'INAMOVIBLE' },
    { fecha: '2025-03-03', nombre: 'Carnaval (Lunes)', tipo: 'INAMOVIBLE' },
    { fecha: '2025-03-04', nombre: 'Carnaval (Martes)', tipo: 'INAMOVIBLE' },
    { fecha: '2025-03-24', nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia', tipo: 'INAMOVIBLE' },
    { fecha: '2025-04-02', nombre: 'Día del Veterano y de los Caídos en Malvinas', tipo: 'INAMOVIBLE' },
    { fecha: '2025-04-18', nombre: 'Viernes Santo', tipo: 'INAMOVIBLE' },
    { fecha: '2025-05-01', nombre: 'Día del Trabajador', tipo: 'INAMOVIBLE' },
    { fecha: '2025-05-02', nombre: 'Feriado Puente Turístico', tipo: 'PUENTE' },
    { fecha: '2025-05-25', nombre: 'Día de la Revolución de Mayo', tipo: 'INAMOVIBLE' },
    { fecha: '2025-06-16', nombre: 'Paso a la Inmortalidad del Gral. Güemes (Trasladado)', tipo: 'TRASLADABLE' },
    { fecha: '2025-06-20', nombre: 'Paso a la Inmortalidad del Gral. Belgrano (Día de la Bandera)', tipo: 'INAMOVIBLE' },
    { fecha: '2025-07-09', nombre: 'Día de la Independencia', tipo: 'INAMOVIBLE' },
    { fecha: '2025-08-15', nombre: 'Feriado Puente Turístico', tipo: 'PUENTE' },
    { fecha: '2025-08-17', nombre: 'Paso a la Inmortalidad del Gral. José de San Martín', tipo: 'TRASLADABLE' },
    { fecha: '2025-10-12', nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'TRASLADABLE' },
    { fecha: '2025-11-21', nombre: 'Feriado Puente Turístico', tipo: 'PUENTE' },
    { fecha: '2025-11-24', nombre: 'Día de la Soberanía Nacional (Trasladado)', tipo: 'TRASLADABLE' },
    { fecha: '2025-12-08', nombre: 'Inmaculada Concepción de María', tipo: 'INAMOVIBLE' },
    { fecha: '2025-12-25', nombre: 'Navidad', tipo: 'INAMOVIBLE' },
  ],
  2026: [
    { fecha: '2026-01-01', nombre: 'Año Nuevo', tipo: 'INAMOVIBLE' },
    { fecha: '2026-02-16', nombre: 'Carnaval (Lunes)', tipo: 'INAMOVIBLE' },
    { fecha: '2026-02-17', nombre: 'Carnaval (Martes)', tipo: 'INAMOVIBLE' },
    { fecha: '2026-03-24', nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia', tipo: 'INAMOVIBLE' },
    { fecha: '2026-04-02', nombre: 'Día del Veterano y de los Caídos en Malvinas', tipo: 'INAMOVIBLE' },
    { fecha: '2026-04-03', nombre: 'Viernes Santo', tipo: 'INAMOVIBLE' },
    { fecha: '2026-05-01', nombre: 'Día del Trabajador', tipo: 'INAMOVIBLE' },
    { fecha: '2026-05-25', nombre: 'Día de la Revolución de Mayo', tipo: 'INAMOVIBLE' },
    { fecha: '2026-06-17', nombre: 'Paso a la Inmortalidad del Gral. Güemes', tipo: 'TRASLADABLE' },
    { fecha: '2026-06-20', nombre: 'Paso a la Inmortalidad del Gral. Belgrano (Día de la Bandera)', tipo: 'INAMOVIBLE' },
    { fecha: '2026-07-09', nombre: 'Día de la Independencia', tipo: 'INAMOVIBLE' },
    { fecha: '2026-07-10', nombre: 'Feriado Puente Turístico', tipo: 'PUENTE' },
    { fecha: '2026-08-17', nombre: 'Paso a la Inmortalidad del Gral. José de San Martín', tipo: 'TRASLADABLE' },
    { fecha: '2026-10-12', nombre: 'Día del Respeto a la Diversidad Cultural', tipo: 'TRASLADABLE' },
    { fecha: '2026-11-20', nombre: 'Día de la Soberanía Nacional', tipo: 'TRASLADABLE' },
    { fecha: '2026-12-08', nombre: 'Inmaculada Concepción de María', tipo: 'INAMOVIBLE' },
    { fecha: '2026-12-25', nombre: 'Navidad', tipo: 'INAMOVIBLE' },
  ],
  2027: [
    { fecha: '2027-01-01', nombre: 'Año Nuevo', tipo: 'INAMOVIBLE' },
    { fecha: '2027-02-08', nombre: 'Carnaval (Lunes)', tipo: 'INAMOVIBLE' },
    { fecha: '2027-02-09', nombre: 'Carnaval (Martes)', tipo: 'INAMOVIBLE' },
    { fecha: '2027-03-24', nombre: 'Día Nacional de la Memoria por la Verdad y la Justicia', tipo: 'INAMOVIBLE' },
    { fecha: '2027-03-26', nombre: 'Viernes Santo', tipo: 'INAMOVIBLE' },
    { fecha: '2027-04-02', nombre: 'Día del Veterano y de los Caídos en Malvinas', tipo: 'INAMOVIBLE' },
    { fecha: '2027-05-01', nombre: 'Día del Trabajador', tipo: 'INAMOVIBLE' },
    { fecha: '2027-05-25', nombre: 'Día de la Revolución de Mayo', tipo: 'INAMOVIBLE' },
    { fecha: '2027-06-17', nombre: 'Paso a la Inmortalidad del Gral. Güemes', tipo: 'TRASLADABLE' },
    { fecha: '2027-06-20', nombre: 'Paso a la Inmortalidad del Gral. Belgrano', tipo: 'INAMOVIBLE' },
    { fecha: '2027-07-09', nombre: 'Día de la Independencia', tipo: 'INAMOVIBLE' },
    { fecha: '2027-08-16', nombre: 'Paso a la Inmortalidad del Gral. San Martín (Trasladado)', tipo: 'TRASLADABLE' },
    { fecha: '2027-10-11', nombre: 'Día del Respeto a la Diversidad Cultural (Trasladado)', tipo: 'TRASLADABLE' },
    { fecha: '2027-11-20', nombre: 'Día de la Soberanía Nacional', tipo: 'TRASLADABLE' },
    { fecha: '2027-12-08', nombre: 'Inmaculada Concepción de María', tipo: 'INAMOVIBLE' },
    { fecha: '2027-12-25', nombre: 'Navidad', tipo: 'INAMOVIBLE' },
  ]
};

/**
 * Genera la lista de feriados nacionales oficiales para un año determinado.
 * Por defecto el gimnasio permanece cerrado durante los feriados nacionales.
 */
export function generarFeriadosNacionales(anio: number = 2026): Omit<Feriado, 'id' | 'creado_at'>[] {
  const lista = FERIADOS_OFICIALES_ARGENTINA[anio] || [
    { fecha: `${anio}-01-01`, nombre: 'Año Nuevo', tipo: 'INAMOVIBLE' as TipoFeriado },
    { fecha: `${anio}-03-24`, nombre: 'Día Nacional de la Memoria', tipo: 'INAMOVIBLE' as TipoFeriado },
    { fecha: `${anio}-04-02`, nombre: 'Día del Veterano de Malvinas', tipo: 'INAMOVIBLE' as TipoFeriado },
    { fecha: `${anio}-05-01`, nombre: 'Día del Trabajador', tipo: 'INAMOVIBLE' as TipoFeriado },
    { fecha: `${anio}-05-25`, nombre: 'Día de la Revolución de Mayo', tipo: 'INAMOVIBLE' as TipoFeriado },
    { fecha: `${anio}-06-20`, nombre: 'Día de la Bandera', tipo: 'INAMOVIBLE' as TipoFeriado },
    { fecha: `${anio}-07-09`, nombre: 'Día de la Independencia', tipo: 'INAMOVIBLE' as TipoFeriado },
    { fecha: `${anio}-12-08`, nombre: 'Inmaculada Concepción', tipo: 'INAMOVIBLE' as TipoFeriado },
    { fecha: `${anio}-12-25`, nombre: 'Navidad', tipo: 'INAMOVIBLE' as TipoFeriado },
  ];

  return lista.map(item => ({
    fecha: item.fecha,
    nombre: item.nombre,
    tipo: item.tipo,
    cerrado: true,
    activo: true,
    horario_especial: '',
    observaciones: 'Feriado Nacional Oficial de la República Argentina'
  }));
}

/**
 * Verifica si una fecha puntual ('YYYY-MM-DD') coincide con un feriado activo.
 */
export function esFeriado(fecha: string, feriados: Feriado[] = []): Feriado | undefined {
  if (!fecha || !Array.isArray(feriados)) return undefined;
  return feriados.find(f => f.activo && f.fecha === fecha);
}

/**
 * Estado detallado de un turno u horario en relación a un feriado
 */
export interface EstadoTurnoFeriado {
  esFeriado: boolean;
  cerrado: boolean; // true = este turno específico no abre
  feriado?: Feriado;
  motivo?: string;
  esHorarioEspecial?: boolean; // true = es feriado pero este turno SÍ está habilitado
}

/**
 * Determina el estado de un turno específico (fecha y hora) durante un feriado.
 * Permite manejar feriados de cierre total o feriados con horarios especiales/reducidos.
 */
export function estadoTurnoFeriado(
  fecha: string,
  hora?: string,
  feriados: Feriado[] = []
): EstadoTurnoFeriado {
  const f = esFeriado(fecha, feriados);
  if (!f) {
    return { esFeriado: false, cerrado: false };
  }

  // 1. Cierre completo de todo el día
  if (f.cerrado) {
    return {
      esFeriado: true,
      cerrado: true,
      feriado: f,
      motivo: `Cerrado todo el día por feriado: ${f.nombre}`,
      esHorarioEspecial: false
    };
  }

  // 2. Si no se especificó una hora particular, el feriado como tal no está cerrado completamente
  if (!hora) {
    return {
      esFeriado: true,
      cerrado: false,
      feriado: f,
      esHorarioEspecial: true
    };
  }

  // Limpiamos la hora para comparar formato "HH:mm" (ej: "07:30" desde "07:30:00")
  const horaClean = hora.trim().substring(0, 5);

  // 3. Verificamos si hay lista explícita de turnos habilitados
  if (Array.isArray(f.horas_habilitadas) && f.horas_habilitadas.length > 0) {
    const habilitado = f.horas_habilitadas.some(h => h.trim().substring(0, 5) === horaClean);
    if (!habilitado) {
      return {
        esFeriado: true,
        cerrado: true,
        feriado: f,
        motivo: `Fuera del horario especial del feriado (${f.horario_especial || f.horas_habilitadas.join(', ') + ' hs'})`,
        esHorarioEspecial: false
      };
    }
    return {
      esFeriado: true,
      cerrado: false,
      feriado: f,
      esHorarioEspecial: true
    };
  }

  // 4. Verificamos si hay rango horario (hora_desde y/o hora_hasta)
  if (f.hora_desde || f.hora_hasta) {
    const desde = (f.hora_desde || '00:00').substring(0, 5);
    const hasta = (f.hora_hasta || '23:59').substring(0, 5);
    const enRango = horaClean >= desde && horaClean <= hasta;
    if (!enRango) {
      return {
        esFeriado: true,
        cerrado: true,
        feriado: f,
        motivo: `Fuera del rango especial de atención (${desde} a ${hasta} hs)`,
        esHorarioEspecial: false
      };
    }
    return {
      esFeriado: true,
      cerrado: false,
      feriado: f,
      esHorarioEspecial: true
    };
  }

  // 5. Sin filtros específicos por turno: opera todo el día con horario especial
  return {
    esFeriado: true,
    cerrado: false,
    feriado: f,
    esHorarioEspecial: true
  };
}

/**
 * Verifica si un turno en una fecha y hora específicas se encuentra cerrado por feriado.
 */
export function estaTurnoCerradoPorFeriado(
  fecha: string,
  hora: string,
  feriados: Feriado[] = []
): boolean {
  return estadoTurnoFeriado(fecha, hora, feriados).cerrado;
}

/**
 * Verifica si el gimnasio se encuentra cerrado todo el día debido a un feriado en una fecha dada.
 */
export function estaCerradoPorFeriado(fecha: string, feriados: Feriado[] = []): boolean {
  const f = esFeriado(fecha, feriados);
  return Boolean(f && f.cerrado);
}

/**
 * Filtra los feriados correspondientes a un mes específico ('YYYY-MM').
 */
export function feriadosDelMes(feriados: Feriado[] = [], mesYYYYMM: string): Feriado[] {
  if (!mesYYYYMM || !Array.isArray(feriados)) return [];
  return feriados
    .filter(f => f.activo && f.fecha.startsWith(mesYYYYMM))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/**
 * Devuelve los próximos feriados a partir de una fecha base (por defecto hoy).
 */
export function proximosFeriados(
  feriados: Feriado[] = [],
  desdeFecha: string = new Date().toISOString().slice(0, 10),
  limite: number = 5
): Feriado[] {
  if (!Array.isArray(feriados)) return [];
  return feriados
    .filter(f => f.activo && f.fecha >= desdeFecha)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .slice(0, limite);
}

/**
 * Formato amigable en español para una fecha 'YYYY-MM-DD'
 * Ej: '2026-05-25' -> 'Lunes 25 de mayo de 2026'
 */
export function formatearFechaFeriado(fecha: string, incluirDiaSemana: boolean = true): string {
  if (!fecha) return '';
  const [y, m, d] = fecha.split('-').map(Number);
  if (!y || !m || !d) return fecha;
  const date = new Date(y, m - 1, d);
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };
  if (incluirDiaSemana) {
    options.weekday = 'long';
  }
  const str = date.toLocaleDateString('es-AR', options);
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Genera el payload de Novedad para comunicar un feriado a los socios
 */
export function generarNovedadDeFeriado(feriado: Feriado, publicadoPor: string = 'Administración'): {
  titulo: string;
  contenido: string;
  categoria: 'TURNOS' | 'INFORMACION';
  destacado: boolean;
} {
  const fechaTexto = formatearFechaFeriado(feriado.fecha);
  let estadoTexto = '';
  if (feriado.cerrado) {
    estadoTexto = 'el gimnasio permanecerá CERRADO todo el día y no se dictarán clases.';
  } else {
    const detalleTurnos = Array.isArray(feriado.horas_habilitadas) && feriado.horas_habilitadas.length > 0
      ? `\n\n🕒 Turnos habilitados para entrenar: ${feriado.horas_habilitadas.map(h => `${h} hs`).join(', ')}.\nLos turnos no incluidos en esta lista permanecerán cerrados.`
      : '';
    estadoTexto = `el gimnasio operará con HORARIO ESPECIAL: ${feriado.horario_especial || 'Consulte turnos disponibles en el panel'}.${detalleTurnos}`;
  }

  return {
    titulo: `Feriado: ${feriado.nombre}`,
    contenido: `Les recordamos que el día ${fechaTexto} es feriado (${feriado.nombre}).\n\nPor este motivo, ${estadoTexto}\n\n${feriado.observaciones ? feriado.observaciones + '\n\n' : ''}¡Muchas gracias por su atención!`,
    categoria: 'TURNOS',
    destacado: true
  };
}
