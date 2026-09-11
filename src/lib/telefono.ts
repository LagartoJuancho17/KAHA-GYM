// src/lib/telefono.ts
// Normalización de números de teléfono para enlaces de WhatsApp (https://wa.me/...)
// La API de WhatsApp requiere formato internacional E.164 sin el prefijo "+".
// Para Argentina, exige estrictamente el prefijo de país 54 + prefijo móvil 9 + código de área + número.

/**
 * Normaliza un número telefónico (argentino o internacional) al formato requerido por wa.me.
 * Retorna null si el teléfono está vacío, es inválido o no se puede reconstruir.
 */
export function normalizarTelefonoWhatsApp(raw: string | null | undefined): string | null {
  const d = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (!d) return null;

  // Prefijo internacional "00" -> quitarlo
  let num = d.startsWith('00') ? d.slice(2) : d;

  // Caso: Ya comienza con el código de país de Argentina (54)
  if (num.startsWith('54')) {
    let rest = num.slice(2);
    // Si ya tiene el 9 móvil, quitarlo momentáneamente para normalizar
    if (rest.startsWith('9')) rest = rest.slice(1);
    // Quitar 0 de código de área si quedó (ej: 54011...)
    rest = rest.replace(/^0/, '');
    if (rest.length < 8 || rest.length > 12) return null;
    return '549' + rest;
  }

  // Caso: Número internacional extranjero ya completo (ej: +61482592164 de Australia)
  // Heurística: 11 a 15 dígitos que no inician con 0
  if (!num.startsWith('0') && num.length >= 11 && num.length <= 15) {
    return num;
  }

  // Caso: Número local argentino con 0 de código de área (ej: 011 3177 6907)
  if (num.startsWith('0')) {
    num = num.slice(1);
  }

  // Caso: Prefijo local "15" sin código de área (no es reconstruible con seguridad)
  if (num.length === 10 && num.startsWith('15')) {
    return null;
  }

  // Caso: Local de 10 dígitos (ej: 11 + 8 dígitos = 1131776907)
  if (num.length === 10) {
    return '549' + num;
  }

  // Caso: Local de 11 dígitos (algunos números del interior: área de 4 + 7 dígitos)
  if (num.length === 11) {
    return '549' + num;
  }

  return null;
}
