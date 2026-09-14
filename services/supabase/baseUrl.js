// services/supabase/baseUrl.js
//
// Normaliza SUPABASE_URL antes de construir el cliente.
//
// Por qué existe: en producción la variable está cargada como
// "https://<proyecto>.supabase.co/rest/v1". supabase-js le concatena OTRA VEZ
// "/rest/v1", queda ".../rest/v1/rest/v1/tabla" y la API responde
//   PGRST125 "Invalid path specified in request URL"
// Reproducido con curl contra la API real: esa forma es la única que da ese
// error exacto.
//
// El efecto era que TODA operación del servidor contra Supabase fallaba, no
// sólo los cron de cobranza: también el webhook de Mercado Pago, que desde el
// 08/07/2026 no volvió a escribir un pago.
//
// La URL viene de una variable de entorno, o sea entrada externa: normalizarla
// acá es validar en el borde, no tapar un problema. Igual conviene dejar la
// variable bien cargada (sólo el dominio).

/**
 * Devuelve el origin limpio de Supabase, sin barras finales ni sufijos de API.
 * Tolera "", null, espacios y comillas pegadas al copiar y pegar.
 */
export function normalizarSupabaseUrl(valor) {
  if (typeof valor !== 'string') return '';

  let url = valor.trim().replace(/^["']|["']$/g, '');
  if (!url) return '';

  // Sufijos de API que supabase-js agrega por su cuenta. Se sacan en cualquier
  // orden y con o sin barra final.
  url = url.replace(/\/+$/, '');
  const sufijos = [/\/rest\/v1$/i, /\/auth\/v1$/i, /\/storage\/v1$/i, /\/realtime\/v1$/i, /\/functions\/v1$/i];
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const sufijo of sufijos) {
      if (sufijo.test(url)) {
        url = url.replace(sufijo, '');
        cambio = true;
      }
    }
    url = url.replace(/\/+$/, '');
  }

  return url;
}
