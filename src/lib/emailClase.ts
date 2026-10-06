// src/lib/emailClase.ts
// Lógica de plantillas y personalización para emails enviados a los alumnos de una clase puntual.

export interface AlumnoClaseEmail {
  id: string;
  clienteId: string;
  nombreCompleto: string;
  nombre: string;
  apellido: string;
  email: string;
  tipo: 'FIJO' | 'VARIABLE' | 'RECUPERO';
  presente: boolean;
  esInvitado?: boolean;
  emailValido: boolean;
}

export interface PlantillaEmailClase {
  id: string;
  nombre: string;
  icono: string;
  asunto: string;
  cuerpo: string;
}

export const PLANTILLAS_EMAIL_CLASE: PlantillaEmailClase[] = [
  {
    id: 'AVISO_GENERAL',
    nombre: 'Aviso General',
    icono: '📢',
    asunto: 'Aviso sobre tu clase de {clase} — KAHA GYM',
    cuerpo: 'Hola {nombre}! 👋\n\nTe escribimos desde KAHA GYM para comentarte sobre tu clase de hoy {clase}.\n\n[Escribí aquí tu aviso]\n\n¡Cualquier duda avisanos por este medio o por WhatsApp! 🤝\n\n— Equipo KAHA GYM'
  },
  {
    id: 'SUSPENSION_CLIMA',
    nombre: 'Clase Suspendida',
    icono: '🌧️',
    asunto: '⚠️ Clase suspendida ({clase}) — KAHA GYM',
    cuerpo: 'Hola {nombre}! 👋\n\nTe avisamos que por cuestiones de fuerza mayor / climáticas, la clase de {clase} queda suspendida.\n\nEl cupo correspondiente se te reintegra automáticamente para que puedas reprogramar tu entrenamiento.\n\n¡Disculpas por las molestias y buen descanso! 💚\n\n— Equipo KAHA GYM'
  },
  {
    id: 'RETRASO_HORARIO',
    nombre: 'Demora / Horario',
    icono: '⏱️',
    asunto: '⏱️ Aviso de horario para la clase de {clase} — KAHA GYM',
    cuerpo: 'Hola {nombre}! 👋\n\nTe notificamos que la clase de hoy {clase} en KAHA GYM comenzará con unos minutos de demora / tiene una modificación de horario.\n\n¡Te esperamos en el box listos para entrenar! 💪\n\n— Equipo KAHA GYM'
  },
  {
    id: 'ENTRENAMIENTO_ESPECIAL',
    nombre: 'Entrenamiento Especial',
    icono: '🏋️‍♂️',
    asunto: '🔥 Entrenamiento especial hoy en {clase} — KAHA GYM',
    cuerpo: 'Hola {nombre}! 👋\n\n¡Hoy tenemos un entrenamiento especial preparado para la clase de {clase}!\n\nRecordá venir con ropa cómoda, hidratación y toalla.\n\n¡A darlo todo! 💥\n\n— Equipo KAHA GYM'
  },
  {
    id: 'CAMBIO_PROFESOR',
    nombre: 'Profesor a Cargo',
    icono: '👤',
    asunto: '👤 Profe a cargo de tu clase de {clase} — KAHA GYM',
    cuerpo: 'Hola {nombre}! 👋\n\nTe informamos que la clase de {clase} estará a cargo de {profesor}.\n\n¡Te esperamos puntual para arrancar con toda la energía! 🏋️\n\n— Equipo KAHA GYM'
  },
  {
    id: 'CUSTOM',
    nombre: 'Personalizado',
    icono: '✏️',
    asunto: 'Aviso importante sobre tu clase de {clase} — KAHA GYM',
    cuerpo: 'Hola {nombre}! 👋\n\n'
  }
];

/**
 * Valida si un email es apto para envío real:
 * - Formato de email válido
 * - Excluye cuentas ficticias de invitados (invitado-*@kaha.com)
 */
export function esEmailValido(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  if (clean.startsWith('invitado-') && clean.endsWith('@kaha.com')) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean);
}

/**
 * Reemplaza variables dinámicas en el texto:
 * - {nombre}: Primer nombre del socio
 * - {clase}: Texto identificador de la clase (ej: "Lunes 18:00 hs")
 * - {profesor}: Nombre del profesor a cargo
 */
export function personalizarTexto({
  texto,
  nombre,
  claseTxt,
  profesor
}: {
  texto: string;
  nombre?: string;
  claseTxt?: string;
  profesor?: string;
}): string {
  const nombreLimpio = (nombre || 'Socio').trim().split(' ')[0] || 'Socio';
  const claseLimpia = claseTxt || 'tu clase';
  const profeLimpio = profesor || 'el profesor asignado';

  return (texto || '')
    .replace(/{nombre}/g, nombreLimpio)
    .replace(/{clase}/g, claseLimpia)
    .replace(/{profesor}/g, profeLimpio);
}

/**
 * Genera el enlace mailto con copia oculta (BCC) para clientes de correo externos.
 */
export function generarMailtoClase({
  destinatarios,
  asunto,
  cuerpo
}: {
  destinatarios: string[];
  asunto: string;
  cuerpo: string;
}): string {
  const bcc = destinatarios.filter(esEmailValido).join(',');
  return `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
