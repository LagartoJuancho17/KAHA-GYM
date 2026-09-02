// src/components/Notifications/EmailReporteMorososAdminModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  Mail, X, Send, Copy, Check, Users, AlertCircle, 
  Sparkles, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import { useGym } from '../../GymContext';
import { supabase } from '../../supabaseClient';

interface EmailReporteMorososAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailReporteMorososAdminModal: React.FC<EmailReporteMorososAdminModalProps> = ({ isOpen, onClose }) => {
  const { clientes, planes, turnos, addAuditLog, addToast, googleUser } = useGym();
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verDetalle, setVerDetalle] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const mesNombre = hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  // Socios activos con turnos fijos asignados y sin pagar el mes corriente
  const sociosMoraFijos = useMemo(() => {
    return clientes.filter(c => {
      if (!c.activo) return false;
      if (!c.turnos_fijos || c.turnos_fijos.length === 0) return false;
      const noPago = !c.ultimo_mes_pagado || c.ultimo_mes_pagado < mesActual;
      return noPago;
    });
  }, [clientes, mesActual]);

  const defaultAdminEmail = googleUser?.email || 'admin@gimnasio.com.ar';
  const [destinatariosAdmin, setDestinatariosAdmin] = useState(defaultAdminEmail);
  const [asunto, setAsunto] = useState(`⚠️ [KAHA GYM] Reporte de Socios con Turno Fijo sin Abonar - Día 10 (${mesNombre})`);

  const mensajeGenerado = useMemo(() => {
    const lineas: string[] = [
      `Hola Administradores de KAHA GYM,`,
      ``,
      `Les acercamos el reporte consolidado de socios que poseen turnos fijos asignados y aún no registraron el pago correspondiente al mes de ${mesNombre} (Día 10+).`,
      ``,
      `A partir del día 10 de cada mes, estos turnos se encuentran en estado de REVISIÓN MANUAL para que el equipo administrativo confirme si procede la baja de la vacante o si se les mantiene el lugar reservado.`,
      ``,
      `📊 RESUMEN GENERAL:`,
      `• Total de socios con turno fijo sin abonar: ${sociosMoraFijos.length}`,
      `• Monto total adeudado estimado: $${sociosMoraFijos.reduce((acc, c) => acc + (c.deuda_acumulada || 0), 0).toLocaleString('es-AR')} ARS`,
      ``,
      `📋 DETALLE DE SOCIOS Y TURNOS FIJOS:`
    ];

    if (sociosMoraFijos.length === 0) {
      lineas.push(`¡Excelente! No hay socios con turnos fijos adeudados al día de hoy.`);
    } else {
      sociosMoraFijos.forEach((s, index) => {
        const pl = planes.find(p => p.id === s.plan_id);
        const turnosStr = s.turnos_fijos.join(', ');
        const exencionStr = s.exencion_cobro && s.exencion_cobro !== 'NINGUNA' ? ` [Excepción: ${s.exencion_cobro}]` : '';
        lineas.push(
          `${index + 1}. ${s.apellido}, ${s.nombre} - Plan: ${pl?.nombre || 'General'}${exencionStr}`,
          `   Deuda: $${s.deuda_acumulada.toLocaleString('es-AR')} | Turnos: ${turnosStr}`,
          `   Email: ${s.email} | Tel: ${s.telefono || 'Sin teléfono'}`
        );
      });
    }

    lineas.push(
      ``,
      `🔗 Para confirmar las bajas individuales o masivas, ingresen al Panel de Control > Módulo de Morosidad.`,
      ``,
      `Sistema de Gestión KAHA GYM`
    );

    return lineas.join('\n');
  }, [sociosMoraFijos, planes, mesNombre]);

  if (!isOpen) return null;

  const handleCopiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(mensajeGenerado);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleAbrirEnClienteDeCorreo = () => {
    const subjectEncoded = encodeURIComponent(asunto);
    const bodyEncoded = encodeURIComponent(mensajeGenerado);
    const mailtoUrl = `mailto:${encodeURIComponent(destinatariosAdmin)}?subject=${subjectEncoded}&body=${bodyEncoded}`;
    
    if (mailtoUrl.length > 2000) {
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(destinatariosAdmin)}&su=${subjectEncoded}&body=${bodyEncoded}`, '_blank');
    } else {
      window.location.href = mailtoUrl;
    }
  };

  const handleEnviarViaEdgeFunction = async () => {
    setEnviando(true);
    setResultadoEnvio(null);

    const adminsList = destinatariosAdmin
      .split(',')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (adminsList.length === 0) {
      setResultadoEnvio({ tipo: 'error', texto: 'Por favor ingresá al menos un email válido de administrador.' });
      setEnviando(false);
      return;
    }

    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado.');
      }

      const { data, error } = await supabase.functions.invoke('send-admin-delinquent-report', {
        body: {
          asunto,
          mensaje: mensajeGenerado,
          destinatariosAdmin: adminsList,
          sociosDetalle: sociosMoraFijos.map(s => ({
            id: s.id,
            nombre: `${s.nombre} ${s.apellido}`,
            email: s.email,
            telefono: s.telefono,
            deuda: s.deuda_acumulada,
            turnos_fijos: s.turnos_fijos
          }))
        }
      });

      if (error) throw error;

      if (data && data.success === false) {
        throw new Error(data.message || 'Error al procesar el envío.');
      }

      setResultadoEnvio({
        tipo: 'ok',
        texto: data?.message || `Reporte enviado con éxito a ${adminsList.join(', ')}.`
      });

      addAuditLog('EMAIL_REPORTE_MOROSOS_ADMIN_ENVIADO', {
        admins: adminsList,
        socios_afectados_count: sociosMoraFijos.length,
        fecha: new Date().toISOString()
      }, googleUser?.email || 'admin@gimnasio.com.ar');

      addToast('success', '¡Reporte enviado exitosamente a los administradores!');
    } catch (err: any) {
      setResultadoEnvio({
        tipo: 'info',
        texto: `No se pudo conectar a la Edge Function (${err.message}). Podés abrirlo directamente en tu Gmail / Cliente de correo con el botón de abajo.`
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden text-zinc-800 font-sans animate-scale-up">
        
        {/* HEADER */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-900 via-amber-950 to-zinc-950 text-white flex justify-between items-start relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(245,158,11,0.18),transparent_60%)] pointer-events-none" />
          <div className="relative z-10 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-sans font-bold text-base sm:text-lg text-white">
                  Reporte de Bajas por Falta de Pago (Día 10)
                </h3>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[9px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                  Revisión Admin
                </span>
              </div>
              <p className="text-zinc-300 text-xs mt-1">
                Envío de informe oficial a los administradores con el detalle de alumnos con turnos fijos impagos.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors shrink-0 z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* BANNER INFORMATIVO */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-amber-950">
            <div className="flex items-center gap-3 min-w-0">
              <Users className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-xs">
                  {sociosMoraFijos.length} socio(s) con turno fijo pendiente de pago
                </p>
                <p className="text-[11px] text-amber-800">
                  Mes: <span className="font-semibold capitalize">{mesNombre}</span> · Requieren decisión manual del Administrador.
                </p>
              </div>
            </div>
            <button
              onClick={() => setVerDetalle(!verDetalle)}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 bg-amber-100 hover:bg-amber-200/80 px-2.5 py-1 rounded-xl transition-colors shrink-0"
            >
              <span>{verDetalle ? 'Ocultar' : 'Ver lista'}</span>
              {verDetalle ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* DESPLEGABLE DE LISTA DE SOCIOS */}
          {verDetalle && (
            <div className="border border-zinc-200 rounded-2xl p-3 bg-zinc-50 space-y-2 max-h-48 overflow-y-auto">
              {sociosMoraFijos.length === 0 ? (
                <p className="text-zinc-400 text-center py-2 italic text-[11px]">No hay socios con turnos fijos adeudados.</p>
              ) : (
                sociosMoraFijos.map((s, idx) => (
                  <div key={s.id} className="bg-white border border-zinc-200 rounded-xl p-2.5 flex justify-between items-center text-[11px]">
                    <div>
                      <span className="font-bold text-zinc-900">{idx + 1}. {s.nombre} {s.apellido}</span>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        Turnos: {s.turnos_fijos.join(', ')}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-red-600 shrink-0">
                      ${s.deuda_acumulada.toLocaleString('es-AR')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* DESTINATARIOS ADMIN */}
          <div>
            <label className="block font-bold text-zinc-700 text-xs mb-1">
              Email(s) de Destinatarios Administradores:
            </label>
            <input
              type="text"
              value={destinatariosAdmin}
              onChange={(e) => setDestinatariosAdmin(e.target.value)}
              placeholder="admin@kaha.fit, socio@gimnasio.com.ar"
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-amber-500"
            />
            <p className="text-[10px] text-zinc-400 mt-1">Podés ingresar múltiples correos separados por coma.</p>
          </div>

          {/* ASUNTO */}
          <div>
            <label className="block font-bold text-zinc-700 text-xs mb-1">
              Asunto del Correo:
            </label>
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-sans focus:outline-hidden focus:border-amber-500 font-medium"
            />
          </div>

          {/* MENSAJE PREVIEW */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-bold text-zinc-700 text-xs">
                Cuerpo del Reporte (Generado automáticamente):
              </label>
              <button
                onClick={handleCopiarMensaje}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-200 transition-colors"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? '¡Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
            <textarea
              readOnly
              rows={8}
              value={mensajeGenerado}
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-2xl text-[11px] font-mono focus:outline-hidden text-zinc-700 leading-relaxed resize-none"
            />
          </div>

          {/* FEEDBACK STATUS */}
          {resultadoEnvio && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              resultadoEnvio.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
              resultadoEnvio.tipo === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
              'bg-sky-50 text-sky-800 border border-sky-200'
            }`}>
              {resultadoEnvio.tipo === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" /> :
               <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />}
              <div className="flex-1 text-[11px] leading-relaxed">
                {resultadoEnvio.texto}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 bg-zinc-50 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-zinc-600 hover:text-zinc-900 text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleAbrirEnClienteDeCorreo}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Abrir en tu programa de correo predeterminado o Gmail"
            >
              <Mail className="w-3.5 h-3.5 text-zinc-600" />
              <span>Abrir en Gmail / Mail</span>
            </button>

            <button
              onClick={handleEnviarViaEdgeFunction}
              disabled={enviando || sociosMoraFijos.length === 0}
              className="flex-1 sm:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
            >
              {enviando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar a Administradores</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
