// src/lib/emailNovedades.ts
// Lógica para formateo, generación y despacho de correos electrónicos para Novedades / Circulares de KAHA GYM.

import { Cliente, Novedad } from '../types';
import { esEmailValido } from './emailClase';
import { supabase } from '../supabaseClient';

export interface DestinatarioNovedad {
  id: string;
  nombre: string;
  apellido?: string;
  email: string;
}

export interface CategoriaNovedadMeta {
  icono: string;
  label: string;
  tag: string;
  badgeBg: string;
  badgeText: string;
}

export const CATEGORIAS_NOVEDAD_META: Record<Novedad['categoria'], CategoriaNovedadMeta> = {
  ARANCELES: {
    icono: '💰',
    label: 'Actualización de Aranceles',
    tag: 'Aranceles y Pagos',
    badgeBg: '#ecfdf5',
    badgeText: '#065f46'
  },
  TURNOS: {
    icono: '📅',
    label: 'Horarios y Turnos',
    tag: 'Horarios y Turnos',
    badgeBg: '#f0fdfa',
    badgeText: '#115e59'
  },
  EVENTOS: {
    icono: '🎉',
    label: 'Talleres y Eventos',
    tag: 'Talleres y Eventos',
    badgeBg: '#fffbeb',
    badgeText: '#92400e'
  },
  INFORMACION: {
    icono: '📢',
    label: 'Información General',
    tag: 'Comunicado Oficial',
    badgeBg: '#f0f9ff',
    badgeText: '#075985'
  }
};

/**
 * Filtra los socios aptos para recibir la novedad por email:
 * - Socios activos (c.activo === true)
 * - Con email válido y no ficticio
 * - Si socioId está especificado (novedad privada), solo ese socio
 */
export function getDestinatariosNovedad(clientes: Cliente[], socioId?: string | null): DestinatarioNovedad[] {
  if (!clientes || !Array.isArray(clientes)) return [];

  if (socioId) {
    const single = clientes.find(c => c.id === socioId);
    if (!single || !single.activo || !esEmailValido(single.email)) return [];
    return [{
      id: single.id,
      nombre: single.nombre || 'Socio',
      apellido: single.apellido || '',
      email: single.email.trim()
    }];
  }

  return clientes
    .filter(c => c.activo && esEmailValido(c.email))
    .map(c => ({
      id: c.id,
      nombre: c.nombre || 'Socio',
      apellido: c.apellido || '',
      email: c.email.trim()
    }));
}

/**
 * Genera el asunto estándar para el correo de la novedad.
 */
export function generarAsuntoNovedad(novedad: Pick<Novedad, 'titulo' | 'categoria' | 'destacado'>): string {
  const meta = CATEGORIAS_NOVEDAD_META[novedad.categoria] || CATEGORIAS_NOVEDAD_META.INFORMACION;
  const prefix = novedad.destacado ? '⭐ ' : '';
  const tituloLimpio = (novedad.titulo || 'Comunicado Oficial').trim();
  return `${prefix}${meta.icono} ${tituloLimpio} — KAHA GYM`;
}

/**
 * Genera la plantilla HTML responsive y moderna para el envío de la novedad.
 */
export function generarHtmlNovedad(
  novedad: Pick<Novedad, 'titulo' | 'contenido' | 'categoria' | 'destacado' | 'fecha'>,
  nombreSocio?: string
): string {
  const meta = CATEGORIAS_NOVEDAD_META[novedad.categoria] || CATEGORIAS_NOVEDAD_META.INFORMACION;
  const nombreLimpio = (nombreSocio || 'Socio').trim().split(' ')[0] || 'Socio';
  const fechaStr = novedad.fecha || '';

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${novedad.titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#062319;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <div style="max-width:580px;margin:24px auto;padding:0 16px;">
    
    <!-- HEADER -->
    <div style="background:#043d2f;border:1px solid #059669;border-radius:24px 24px 0 0;padding:32px 24px 24px;text-align:center;">
      <div style="display:inline-block;background:#10b981;color:#043d2f;font-size:11px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;padding:4px 14px;border-radius:9999px;margin-bottom:14px;">
        KAHA GYM
      </div>
      
      <div style="margin-bottom:8px;">
        <span style="display:inline-block;background:rgba(255,255,255,0.12);color:#a7f3d0;font-size:11px;font-weight:700;padding:3px 10px;border-radius:8px;text-transform:uppercase;letter-spacing:.05em;">
          ${meta.icono} ${meta.tag}
        </span>
        ${novedad.destacado ? `
        <span style="display:inline-block;background:#f59e0b;color:#ffffff;font-size:10px;font-weight:900;padding:3px 8px;border-radius:8px;margin-left:6px;text-transform:uppercase;letter-spacing:.05em;">
          ⭐ Destacado
        </span>` : ''}
      </div>

      <h1 style="color:#ffffff;margin:10px 0 4px;font-size:22px;font-weight:900;letter-spacing:-0.02em;line-height:1.25;">
        ${novedad.titulo}
      </h1>

      ${fechaStr ? `<p style="margin:6px 0 0;color:#6ee7b7;font-size:12px;opacity:0.9;">${fechaStr}</p>` : ''}
    </div>

    <!-- CUERPO PRINCIPAL -->
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 24px 24px;padding:28px 24px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);">
      
      <p style="margin:0 0 16px;color:#111827;font-size:15px;font-weight:600;">
        ¡Hola, ${nombreLimpio}! 👋
      </p>

      <div style="color:#374151;font-size:14px;line-height:1.75;white-space:pre-line;background:#f9fafb;border:1px solid #f3f4f6;border-radius:16px;padding:20px;margin-bottom:24px;">
${novedad.contenido}
      </div>

      <!-- AVISO DE PORTAL -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;color:#166534;font-size:12px;font-weight:600;">
          📲 Podés ver todas las novedades y gestionar tus turnos desde tu portal de socio en KAHA GYM.
        </p>
      </div>

      <!-- FOOTER -->
      <div style="border-top:1px solid #f3f4f6;padding-top:20px;text-align:center;">
        <p style="margin:0;color:#059669;font-size:13px;font-weight:700;">
          Equipo KAHA GYM
        </p>
        <p style="margin:4px 0 0;color:#9ca3af;font-size:11px;">
          Entrenamiento, salud y movimiento 💚
        </p>
      </div>

    </div>

  </div>
</body>
</html>`;
}

/**
 * Genera el cuerpo en texto plano para clientes de correo sin soporte HTML o previsualización.
 */
export function generarTextoPlanoNovedad(
  novedad: Pick<Novedad, 'titulo' | 'contenido' | 'categoria' | 'fecha'>,
  nombreSocio?: string
): string {
  const meta = CATEGORIAS_NOVEDAD_META[novedad.categoria] || CATEGORIAS_NOVEDAD_META.INFORMACION;
  const nombreLimpio = (nombreSocio || 'Socio').trim().split(' ')[0] || 'Socio';

  return `¡Hola, ${nombreLimpio}! 👋

KAHA GYM — ${meta.tag}
${novedad.titulo}
${novedad.fecha ? `Fecha: ${novedad.fecha}\n` : ''}
${novedad.contenido}

—
Equipo KAHA GYM 💚
Podés ver todos los avisos y turnos desde tu portal de socio.`;
}

/**
 * Genera una URL mailto o Gmail compose con todos los destinatarios en CCO (BCC)
 * para proteger la privacidad de los socios en envíos manuales.
 */
export function generarMailtoNovedad({
  destinatarios,
  asunto,
  cuerpo
}: {
  destinatarios: string[];
  asunto: string;
  cuerpo: string;
}): string {
  const bccList = (destinatarios || []).filter(Boolean).map(e => e.trim()).join(',');
  const encodedSubj = encodeURIComponent(asunto);
  const encodedBody = encodeURIComponent(cuerpo);

  const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=${encodedSubj}&body=${encodedBody}`;

  if (mailtoUrl.length > 2000) {
    return `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bccList)}&su=${encodedSubj}&body=${encodedBody}`;
  }

  return mailtoUrl;
}

/**
 * Despacha el correo de la novedad intentando:
 * 1. Backend local Express `/api/send-novedad-email`
 * 2. Fallback a Supabase Edge Function `send-novedad-email`
 */
export async function enviarNovedadEmailBackend({
  novedad,
  destinatarios
}: {
  novedad: Novedad;
  destinatarios: DestinatarioNovedad[];
}): Promise<{ ok: boolean; enviados: number; errores: number; total: number; message?: string }> {
  if (!destinatarios || destinatarios.length === 0) {
    return { ok: false, enviados: 0, errores: 0, total: 0, message: 'No hay socios con email válido para enviar.' };
  }

  const asunto = generarAsuntoNovedad(novedad);
  const html = generarHtmlNovedad(novedad);
  const texto = generarTextoPlanoNovedad(novedad);

  // 1. Intentar endpoint de Express server
  try {
    const res = await fetch('/api/send-novedad-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        novedad: {
          ...novedad,
          asunto,
          html,
          texto
        },
        destinatarios: destinatarios.map(d => ({
          id: d.id,
          nombre: `${d.nombre} ${d.apellido || ''}`.trim(),
          email: d.email.trim()
        }))
      })
    });

    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        enviados: data.enviados ?? destinatarios.length,
        errores: data.errores ?? 0,
        total: data.total ?? destinatarios.length,
        message: `Correos enviados correctamente (${data.enviados ?? destinatarios.length} socios).`
      };
    }
  } catch (err) {
    console.warn('[emailNovedades] Servidor Express local no disponible, intentando Edge Function:', err);
  }

  // 2. Fallback a Supabase Edge Function si está configurado
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('send-novedad-email', {
        body: {
          novedad: {
            ...novedad,
            asunto,
            html,
            texto
          },
          destinatarios: destinatarios.map(d => ({
            id: d.id,
            nombre: `${d.nombre} ${d.apellido || ''}`.trim(),
            email: d.email.trim()
          }))
        }
      });

      if (!error && (data?.success || data?.ok)) {
        return {
          ok: true,
          enviados: data.enviadosCount ?? data.enviados ?? destinatarios.length,
          errores: data.fallidosCount ?? data.errores ?? 0,
          total: data.totalDestinatarios ?? destinatarios.length,
          message: data.message || `Correos enviados vía Edge Function (${destinatarios.length} socios).`
        };
      }
    } catch (edgeErr) {
      console.warn('[emailNovedades] Edge Function fallo:', edgeErr);
    }
  }

  return {
    ok: false,
    enviados: 0,
    errores: destinatarios.length,
    total: destinatarios.length,
    message: 'No se pudo conectar con el servicio de correo automático.'
  };
}
