// Normalización de teléfonos a formato WhatsApp (E.164 sin "+").
// La WhatsApp Cloud API espera el número en internacional sin "+", y para
// móviles de Argentina exige el "9" después del código de país: 54 9 <area> <numero>.
//
// Casos reales en la base de KAHA (todos deben mapear bien):
//   "1131776907"          -> "5491131776907"   (local 10 díg, area 11)
//   "+54 9 11 6010-3720"  -> "5491160103720"   (ya internacional móvil)
//   "+5492215640800"      -> "5492215640800"   (La Plata, area 221)
//   "011 3177-6907"       -> "5491131776907"   (con 0 de trunk)
//   "+54 11 3177 6907"    -> "5491131776907"   (internacional sin el 9)
//   "+61482592164"        -> "61482592164"     (extranjero: se respeta tal cual)
//
// Limitación conocida: no resolvemos el viejo prefijo local "15" sin área
// (ej "15-3177-6907"), porque falta el código de área para reconstruirlo.
// Devolvemos null en ese caso para no mandar a un número inválido.

export function normalizeArgPhone(raw) {
  let d = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (!d) return null;

  // Prefijo internacional "00" -> quitarlo.
  if (d.startsWith('00')) d = d.slice(2);

  // Ya trae el código de país argentino.
  if (d.startsWith('54')) {
    let rest = d.slice(2);
    if (rest.startsWith('9')) rest = rest.slice(1); // sacar el 9 para re-normalizar
    rest = rest.replace(/^0/, '');                  // sacar 0 de trunk si quedó
    if (rest.length < 8 || rest.length > 12) return null;
    return '549' + rest;
  }

  // Número de otro país ya en internacional (ej. +61...): respetarlo.
  // Heurística: 11+ dígitos que no arrancan en 0 ni son un local AR de 10.
  if (!d.startsWith('0') && d.length >= 11 && d.length <= 15) {
    return d;
  }

  // Local argentino: sacar 0 de trunk.
  if (d.startsWith('0')) d = d.slice(1);

  // Prefijo local "15" sin área -> no se puede reconstruir con seguridad.
  if (d.length === 10 && d.startsWith('15')) return null;

  // Local de 10 dígitos (area + número, ej 11 + 8): agregar 549.
  if (d.length === 10) return '549' + d;

  // Local de 11 dígitos (algunos interiores: area de 4 + número de 6/7).
  if (d.length === 11) return '549' + d;

  return null;
}

// ¿El número normalizado es plausible para enviar? (largo E.164 válido)
export function isSendablePhone(normalized) {
  return typeof normalized === 'string' && normalized.length >= 10 && normalized.length <= 15;
}
