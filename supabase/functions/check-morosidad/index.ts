// supabase/functions/check-morosidad/index.ts
// Deno Edge Function para control de morosidad automatizado (Gimnasio - Argentina)
// Se puede gatillar diariamente mediante pg_cron o triggers automáticos en Supabase.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apiKey, content-type",
};

Deno.serve(async (req) => {
  // Manejo de peticiones preflight (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Configuración del cliente Supabase con privilegios Service Role para bypass RLS en tareas batch
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener la fecha actual en la zona horaria de Buenos Aires
    // El servidor puede correr en UTC, por lo que convertimos
    const nowBuenosAires = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
    );

    const diaDelMes = nowBuenosAires.getDate();
    const deMesFormato = nowBuenosAires.toISOString().slice(0, 7); // ej: "2026-05"
    
    // El criterio dictamina: Si pasó el día 5 del mes de Cobro del gimnasio a las 23:59
    // y no hay fecha de pago para el mes actual, se los marca como MOROSO.
    // Si estamos antes del día 5 pero tienen deudas históricas se evalúan.
    
    const esFechaLimitePasada = diaDelMes > 5 || (diaDelMes === 5 && nowBuenosAires.getHours() >= 23 && nowBuenosAires.getMinutes() >= 59);

    // 1. Traer todos los clientes activos
    const { data: clientes, error: errClientes } = await supabase
      .from("clientes")
      .select(`
        id, 
        nombre, 
        apellido, 
        estado, 
        tipo, 
        plan_id, 
        ultimo_mes_pagado, 
        deuda_acumulada,
        planes ( precio )
      `)
      .eq("activo", true);

    if (errClientes) throw errClientes;

    const report = {
      procesados: 0,
      actualizadosAMorosos: 0,
      deudaTotalIdentificada: 0,
    };

    const updates = [];
    const kpiInsertsOrUpdates = [];

    for (const cliente of clientes) {
      report.procesados++;
      const planPrecio = cliente.planes ? Number(cliente.planes.precio) : 0;
      
      let nuevoEstado = cliente.estado;
      let deudaActualizada = Number(cliente.deuda_acumulada);
      
      // Chequear si ya pagó este mes
      const pagoEsteMes = cliente.ultimo_mes_pagado === deMesFormato;

      if (!pagoEsteMes && esFechaLimitePasada) {
        // No pagó el mes corriente y ya expiró el plazo de gracia (día 5)
        nuevoEstado = "MOROSO";
        // Si no se le ha cargado la deuda de este mes todavía
        if (deudaActualizada < planPrecio) {
          deudaActualizada = planPrecio; // cargamos el precio del plan como deuda base
        }
      } else if (!pagoEsteMes && !esFechaLimitePasada && nuevoEstado === "ACTIVO") {
        // Estamos antes del 5 del mes, aún tiene tiempo de pagar pero se le cataloga activo/pendiente
        nuevoEstado = "ACTIVO";
      }

      // Si tiene deuda pero está dentro de fecha o tiene pago viejo, revisar acumulados
      if (deudaActualizada > 0 && nuevoEstado === "ACTIVO" && esFechaLimitePasada) {
        nuevoEstado = "CON_DEUDA";
      }

      // Si cambió de estado, encolar actualización de cliente
      if (nuevoEstado !== cliente.estado || deudaActualizada !== Number(cliente.deuda_acumulada)) {
        updates.push(
          supabase
            .from("clientes")
            .update({ 
              estado: nuevoEstado, 
              deuda_acumulada: deudaActualizada,
              actualizado_at: new Date().toISOString()
            })
            .eq("id", cliente.id)
        );

        if (nuevoEstado === "MOROSO") {
          report.actualizadosAMorosos++;
        }
      }

      // Actualizar o registrar en la tabla clientes_morosos_kpi si tiene deudas
      if (deudaActualizada > 0 || nuevoEstado === "MOROSO") {
        const diasAtraso = esFechaLimitePasada 
          ? Math.max(1, diaDelMes - 5) 
          : 0;

        report.deudaTotalIdentificada += deudaActualizada;

        kpiInsertsOrUpdates.push({
          cliente_id: cliente.id,
          dias_atraso: diasAtraso,
          monto_adeudado: deudaActualizada,
          ultimo_chequeo: new Date().toISOString()
        });
      }
    }

    // Correr actualizaciones concurrentes
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    // Guardar reportes acumulativos de mora para KPIs rápidos
    if (kpiInsertsOrUpdates.length > 0) {
      // Limpiar anteriores para repoblar con estados precisos del día
      await supabase.from("clientes_morosos_kpi").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      
      const { error: errKpi } = await supabase
        .from("clientes_morosos_kpi")
        .insert(kpiInsertsOrUpdates);
        
      if (errKpi) console.error("Error al persistir KPIs extendidos de mora:", errKpi);
    }

    // Registrar log de corrida en la auditoría
    await supabase.from("logs_auditoria").insert({
      accion: "CRON_CONTROL_MOROSIDAD_EJECUTADO",
      detalles: {
        fecha_evaluacion: nowBuenosAires.toISOString(),
        dia_del_mes: diaDelMes,
        limite_gracia_vencido: esFechaLimitePasada,
        clientes_procesados: report.procesados,
        nuevos_morosos: report.actualizadosAMorosos,
        deuda_total: report.deudaTotalIdentificada
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Escaneo de morosidad completado exitosamente para Argentina.", 
        report 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
