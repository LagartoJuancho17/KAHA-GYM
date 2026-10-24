// supabase/functions/send-novedad-email/index.ts
// Deno Edge Function para envío de novedades / circulares a los socios de KAHA GYM vía Resend API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apiKey, content-type",
};

function generarHtmlEmail(novedad: any, nombreSocio?: string) {
  const iconos: Record<string, string> = {
    ARANCELES: "💰",
    TURNOS: "📅",
    EVENTOS: "🎉",
    INFORMACION: "📢"
  };
  const icono = iconos[novedad?.categoria] || "📢";
  const tag = {
    ARANCELES: "Aranceles y Pagos",
    TURNOS: "Horarios y Turnos",
    EVENTOS: "Talleres y Eventos",
    INFORMACION: "Comunicado Oficial"
  }[novedad?.categoria] || "Comunicado";

  const firstName = (nombreSocio || "Socio").trim().split(" ")[0] || "Socio";

  return `<!doctype html><html><body style="margin:0;background:#062319;font-family:Inter,Arial,sans-serif;color:#1f2937;">
    <div style="max-width:560px;margin:20px auto;padding:0 16px;">
      <div style="background:#043d2f;border:1px solid #059669;border-radius:24px 24px 0 0;padding:28px 24px 22px;text-align:center;">
        <div style="display:inline-block;background:#10b981;color:#043d2f;font-size:11px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;padding:4px 12px;border-radius:9999px;margin-bottom:10px;">KAHA GYM</div>
        <div style="margin-bottom:6px;">
          <span style="display:inline-block;background:rgba(255,255,255,0.12);color:#a7f3d0;font-size:11px;font-weight:700;padding:3px 10px;border-radius:8px;text-transform:uppercase;">${icono} ${tag}</span>
          ${novedad?.destacado ? '<span style="display:inline-block;background:#f59e0b;color:#ffffff;font-size:10px;font-weight:900;padding:3px 8px;border-radius:8px;margin-left:6px;text-transform:uppercase;">⭐ Destacado</span>' : ''}
        </div>
        <h1 style="color:#ffffff;margin:8px 0 0;font-size:20px;font-weight:900;letter-spacing:-0.02em;">${novedad?.titulo || "Comunicado"}</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 24px 24px;padding:26px;">
        <p style="margin:0 0 14px;color:#111827;font-size:14px;font-weight:600;">¡Hola, ${firstName}! 👋</p>
        <div style="color:#374151;font-size:14px;line-height:1.75;white-space:pre-line;background:#f9fafb;border:1px solid #f3f4f6;border-radius:16px;padding:18px;margin-bottom:20px;">
${novedad?.contenido || ""}
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;margin-bottom:18px;text-align:center;">
          <p style="margin:0;color:#166534;font-size:12px;font-weight:600;">📲 Podés ver todas las circulares y gestionar tus turnos desde tu portal de socio en KAHA GYM.</p>
        </div>
        <div style="border-top:1px solid #f3f4f6;padding-top:16px;text-align:center;">
          <p style="margin:0;color:#059669;font-size:12px;font-weight:700;">Equipo KAHA GYM</p>
          <p style="margin:3px 0 0;color:#9ca3af;font-size:11px;">Entrenamiento, salud y movimiento 💚</p>
        </div>
      </div>
    </div>
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const senderEmail = Deno.env.get("SENDER_EMAIL") ?? "KAHA GYM <onboarding@resend.dev>";

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

    const novedad = bodyData.novedad || {};
    if (!novedad.titulo) {
      return new Response(
        JSON.stringify({ success: false, message: "Faltan datos de la novedad." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let destinatarios: { id?: string; nombre: string; email: string }[] = [];

    if (bodyData.destinatarios && Array.isArray(bodyData.destinatarios) && bodyData.destinatarios.length > 0) {
      destinatarios = bodyData.destinatarios;
    } else if (supabase) {
      const query = supabase
        .from("clientes")
        .select("id, nombre, apellido, email")
        .eq("activo", true);

      if (novedad.socio_id) {
        query.eq("id", novedad.socio_id);
      }

      const { data: clientes, error: errCli } = await query;
      if (errCli) throw errCli;

      destinatarios = (clientes || [])
        .filter(c => c.email && c.email.includes("@") && !c.email.endsWith("@example.com") && !c.email.startsWith("invitado-"))
        .map(c => ({
          id: c.id,
          nombre: `${c.nombre} ${c.apellido || ""}`.trim(),
          email: c.email.trim()
        }));
    }

    if (destinatarios.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: "No se encontraron socios activos con email válido." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const iconos: Record<string, string> = { ARANCELES: "💰", TURNOS: "📅", EVENTOS: "🎉", INFORMACION: "📢" };
    const icono = iconos[novedad.categoria] || "📢";
    const prefijo = novedad.destacado ? "⭐ " : "";
    const subject = novedad.asunto || `${prefijo}${icono} ${novedad.titulo} — KAHA GYM`;

    let enviadosCount = 0;
    let fallidosCount = 0;

    if (resendApiKey) {
      const batchPayload = destinatarios.map(d => ({
        from: senderEmail,
        to: [d.email],
        subject,
        html: novedad.html || generarHtmlEmail(novedad, d.nombre)
      }));

      const chunkSize = 100;
      for (let i = 0; i < batchPayload.length; i += chunkSize) {
        const chunk = batchPayload.slice(i, i + chunkSize);
        const resendRes = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(chunk)
        });

        if (resendRes.ok) {
          enviadosCount += chunk.length;
        } else {
          fallidosCount += chunk.length;
        }
      }
    } else {
      enviadosCount = destinatarios.length;
    }

    if (supabase) {
      await supabase.from("logs_auditoria").insert({
        accion: "EMAIL_NOVEDAD_ENVIADO",
        detalles: {
          novedad_id: novedad.id,
          titulo: novedad.titulo,
          destinatarios_total: destinatarios.length,
          enviados_resend: enviadosCount,
          fallidos_resend: fallidosCount,
          resend_configurado: !!resendApiKey,
          fecha: new Date().toISOString()
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Envío completado: ${enviadosCount} socios notificados.`,
        totalDestinatarios: destinatarios.length,
        enviadosCount,
        fallidosCount,
        resendConfigurado: !!resendApiKey
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error en Edge Function send-novedad-email:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
