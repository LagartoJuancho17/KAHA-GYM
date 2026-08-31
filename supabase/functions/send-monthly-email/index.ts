// supabase/functions/send-monthly-email/index.ts
// Deno Edge Function para envío de correo mensual a todos los socios activos de KAHA.
// Compatible con Resend API y ejecutable manualmente o vía pg_cron al inicio de mes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apiKey, content-type",
};

const MENSAJE_DEFAULT = `¡Hola! ¿Cómo están?

Comenzamos un nuevo mes y queríamos agradecerles, una vez más, por seguir eligiendo KAHA y permitirnos acompañarlos en este camino de entrenamiento, salud y movimiento. 💚

Les recordamos que, durante los primeros 5 días hábiles del mes, la aplicación asigna automáticamente los turnos fijos a quienes hayan realizado el pago de su cuota.

Si por alguna dificultad económica o por cualquier otro motivo necesitan retrasar el pago, no duden en comunicarse con nosotros. No tenemos ningún problema en ayudarlos y buscar la mejor alternativa; simplemente necesitamos hacerlo manualmente para poder mantenerles la prioridad sobre sus turnos.

Para nosotros es muy importante que puedan seguir entrenando en KAHA y sostener sus procesos, así que ante cualquier situación, antes de preocuparse o dejar de venir, háblennos. Estamos para acompañarlos. 🤝

¡Gracias por seguir siendo parte de esta comunidad!
Les deseamos un gran comienzo de mes y nos vemos entrenando 💚

Equipo KAHA`;

const ASUNTO_DEFAULT = "💚 ¡Comenzamos un nuevo mes en KAHA!";

Deno.serve(async (req) => {
  // Manejo de peticiones preflight (CORS)
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

    // Parsear body si existe
    let bodyData: any = {};
    if (req.method === "POST") {
      try {
        bodyData = await req.json();
      } catch {
        bodyData = {};
      }
    }

    const asunto = bodyData.asunto || ASUNTO_DEFAULT;
    const mensaje = bodyData.mensaje || MENSAJE_DEFAULT;

    // Obtener lista de destinatarios
    let destinatarios: { id?: string; nombre: string; email: string }[] = [];

    if (bodyData.destinatarios && Array.isArray(bodyData.destinatarios) && bodyData.destinatarios.length > 0) {
      destinatarios = bodyData.destinatarios;
    } else if (supabase) {
      // Buscar en base de datos Supabase
      const { data: clientes, error: errCli } = await supabase
        .from("clientes")
        .select("id, nombre, apellido, email")
        .eq("activo", true);

      if (errCli) throw errCli;

      destinatarios = (clientes || [])
        .filter(c => c.email && c.email.includes("@") && !c.email.endsWith("@example.com"))
        .map(c => ({
          id: c.id,
          nombre: `${c.nombre} ${c.apellido}`.trim(),
          email: c.email.trim()
        }));
    }

    if (destinatarios.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No se encontraron socios activos con email válido." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Si hay Resend API Key, enviar a través de la API oficial de Resend
    let enviadosCount = 0;
    let fallidosCount = 0;
    const detallesEnvio: any[] = [];

    if (resendApiKey) {
      // Enviar por lotes a través de Resend Batch API
      const batchPayload = destinatarios.map(d => ({
        from: senderEmail,
        to: [d.email],
        subject: asunto,
        text: mensaje,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #065f46; margin: 0; font-size: 24px;">KAHA GYM</h1>
              <p style="color: #059669; font-size: 14px; margin: 4px 0 0 0; font-weight: bold;">Comenzamos un nuevo mes 💚</p>
            </div>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 16px; padding: 20px; margin-bottom: 20px; white-space: pre-line; font-size: 15px; color: #14532d;">
${mensaje}
            </div>
            <div style="text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px;">
              Enviado automáticamente por el sistema KAHA GYM
            </div>
          </div>
        `
      }));

      // Resend permite hasta 100 emails por batch
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
          const resData = await resendRes.json();
          enviadosCount += chunk.length;
          detallesEnvio.push(resData);
        } else {
          const errText = await resendRes.text();
          console.error("Error al enviar lote de Resend:", errText);
          fallidosCount += chunk.length;
        }
      }
    } else {
      console.warn("RESEND_API_KEY no configurada. Simulación de envío completada.");
    }

    // Registrar en auditoría si Supabase está activo
    if (supabase) {
      await supabase.from("logs_auditoria").insert({
        accion: "EMAIL_MENSUAL_INICIO_MES_ENVIADO",
        detalles: {
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
        message: resendApiKey 
          ? `Envío completado: ${enviadosCount} enviados, ${fallidosCount} fallidos.`
          : `Se procesaron ${destinatarios.length} destinatarios. (Agregá RESEND_API_KEY en Supabase secrets para envío SMTP directo).`,
        totalDestinatarios: destinatarios.length,
        enviadosCount,
        resendConfigurado: !!resendApiKey
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error en Edge Function send-monthly-email:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
