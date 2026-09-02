// supabase/functions/send-admin-delinquent-report/index.ts
// Deno Edge Function para envío de reporte de morosidad y bajas de turno fijo a los administradores de KAHA.
// Se ejecuta el día 10 de cada mes vía pg_cron o manualmente desde el panel de administración.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apiKey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const senderEmail = Deno.env.get("SENDER_EMAIL") ?? "KAHA GYM <onboarding@resend.dev>";
    const defaultAdminEmail = Deno.env.get("ADMIN_EMAIL") ?? "admin@gimnasio.com.ar";

    const supabase = (supabaseUrl && supabaseServiceKey) 
      ? createClient(supabaseUrl, supabaseServiceKey) 
      : null;

    let bodyData: any = {};
    if (req.method === "POST") {
      try {
        bodyData = await req.json();
      } catch {
        bodyData = {};
      }
    }

    const nowBuenosAires = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
    );
    const mesActual = nowBuenosAires.toISOString().slice(0, 7);
    const mesNombre = nowBuenosAires.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

    let admins: string[] = [];
    if (bodyData.destinatariosAdmin && Array.isArray(bodyData.destinatariosAdmin) && bodyData.destinatariosAdmin.length > 0) {
      admins = bodyData.destinatariosAdmin;
    } else {
      admins = [defaultAdminEmail];
    }

    let sociosDetalle = bodyData.sociosDetalle || [];

    // Si no vienen en el body, buscamos en Supabase
    if (sociosDetalle.length === 0 && supabase) {
      const { data: clientes, error: errCli } = await supabase
        .from("clientes")
        .select(`
          id, nombre, apellido, email, telefono, deuda_acumulada, ultimo_mes_pagado,
          asignaciones_turnos ( turno_id, turnos ( dia, hora ) )
        `)
        .eq("activo", true);

      if (errCli) throw errCli;

      sociosDetalle = (clientes || [])
        .filter(c => {
          const noPago = !c.ultimo_mes_pagado || c.ultimo_mes_pagado < mesActual;
          const tieneTurnos = c.asignaciones_turnos && c.asignaciones_turnos.length > 0;
          return noPago && tieneTurnos;
        })
        .map(c => ({
          id: c.id,
          nombre: `${c.nombre} ${c.apellido}`,
          email: c.email,
          telefono: c.telefono,
          deuda: c.deuda_acumulada || 0,
          turnos_fijos: (c.asignaciones_turnos || []).map((a: any) => `${a.turnos?.dia}-${a.turnos?.hora}`)
        }));
    }

    const asunto = bodyData.asunto || `⚠️ [KAHA GYM] Reporte de Turnos Fijos sin Abonar - Día 10 (${mesNombre})`;

    // Construcción del HTML
    const filasHtml = sociosDetalle.map((s: any, idx: number) => `
      <tr style="border-bottom: 1px solid #e5e7eb; font-size: 13px;">
        <td style="padding: 10px 8px; font-weight: bold; color: #111827;">${idx + 1}. ${s.nombre}</td>
        <td style="padding: 10px 8px; color: #4b5563;">${s.email || '-'}<br/><span style="font-size: 11px; color: #9ca3af;">${s.telefono || ''}</span></td>
        <td style="padding: 10px 8px; font-family: monospace; font-weight: bold; color: #b91c1c;">$${Number(s.deuda).toLocaleString('es-AR')}</td>
        <td style="padding: 10px 8px; font-size: 12px; color: #374151;">${(s.turnos_fijos || []).join(', ')}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; color: #1f2937; line-height: 1.5;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 2px solid #fee2e2; padding-bottom: 16px;">
          <h1 style="color: #991b1b; margin: 0; font-size: 22px;">KAHA GYM — Control de Bajas (Día 10)</h1>
          <p style="color: #6b7280; font-size: 13px; margin: 4px 0 0 0;">Reporte mensual de alumnos con turnos fijos impagos · <strong>${mesNombre}</strong></p>
        </div>

        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: bold;">
            ⚠️ Requiere Revisión y Decisión Manual
          </p>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #7f1d1d;">
            A partir del día 10, estos <strong>${sociosDetalle.length} alumnos</strong> están en condición de baja de turno fijo por falta de pago. Podés ingresar al panel para confirmar la liberación del cupo o mantenerles la vacante si solicitaron prórroga.
          </p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; text-align: left;">
          <thead>
            <tr style="background-color: #f3f4f6; border-bottom: 2px solid #d1d5db; font-size: 11px; text-transform: uppercase; color: #4b5563;">
              <th style="padding: 8px;">Socio</th>
              <th style="padding: 8px;">Contacto</th>
              <th style="padding: 8px;">Deuda</th>
              <th style="padding: 8px;">Turnos Fijos</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml || '<tr><td colspan="4" style="padding: 16px; text-align: center; color: #9ca3af;">No hay socios con turnos fijos impagos al día de hoy.</td></tr>'}
          </tbody>
        </table>

        <div style="text-align: center; margin-top: 24px;">
          <a href="${supabaseUrl ? supabaseUrl.replace('.supabase.co', '') : '#'}" style="background-color: #111827; color: #ffffff; padding: 12px 24px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 13px; display: inline-block;">
            Abrir Panel de Administración KAHA
          </a>
        </div>

        <div style="text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 32px;">
          Reporte generado automáticamente por KAHA GYM Management System
        </div>
      </div>
    `;

    let enviadosCount = 0;
    if (resendApiKey && admins.length > 0) {
      for (const adminEmail of admins) {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: senderEmail,
            to: [adminEmail],
            subject: asunto,
            html: htmlContent,
            text: bodyData.mensaje || `Reporte de morosos: ${sociosDetalle.length} alumnos pendientes de baja de turnos fijos.`
          })
        });

        if (resendRes.ok) enviadosCount++;
        else console.error("Error al enviar email a admin:", await resendRes.text());
      }
    }

    if (supabase) {
      await supabase.from("logs_auditoria").insert({
        accion: "CRON_REPORTE_MOROSIDAD_ADMIN_ENVIADO",
        detalles: {
          admins,
          socios_afectados: sociosDetalle.length,
          mes_evaluado: mesActual,
          enviados_resend: enviadosCount,
          fecha: nowBuenosAires.toISOString()
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reporte de día 10 procesado. ${sociosDetalle.length} socios identificados. Emails enviados a: ${admins.join(', ')}.`,
        totalSocios: sociosDetalle.length,
        adminsNotificados: admins,
        enviadosCount
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error en Edge Function send-admin-delinquent-report:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
