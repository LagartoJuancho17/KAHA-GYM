// src/components/Notifications/EmailInicioMesModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Mail, X, Send, Copy, Check, Users, AlertCircle, 
  ExternalLink, Sparkles, CheckCircle2, ChevronDown, ChevronUp, Clock, AlertTriangle
} from 'lucide-react';
import { useGym } from '../../GymContext';
import { supabase } from '../../supabaseClient';
import { hoyArgentina } from '../../lib/fechas';
import { ACCIONES_EMAIL_INICIO_MES } from '../../lib/emailInicioMes';

export type ModoMail = 'MES_SIGUIENTE' | 'RECORDATORIO_DIA_8' | 'AVISO_DIA_11';

interface EmailInicioMesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
  initialMode?: ModoMail;
}

export const PLANTILLAS_MAILS: Record<ModoMail, {
  nombre: string;
  badge: string;
  asunto: string;
  cuerpo: string;
  descripcion: string;
}> = {
  MES_SIGUIENTE: {
    nombre: 'Mes Siguiente / Valores',
    badge: 'A 2 días de fin de mes / Días 1-5',
    asunto: '💚 ¡Se viene el próximo mes en KAHA!',
    descripcion: 'Confirmar/actualizar valor de la cuota del nuevo mes y solicitar que abonen en los primeros días del mes.',
    cuerpo: `¡Hola! ¿Cómo están?

Se acerca el próximo mes y queríamos confirmar y actualizar los valores de las cuotas para que puedan organizarse con tiempo. Les pedimos que en lo posible abonen durante los primeros días del mes (hasta el día 10 hay tiempo para pagar y mantener asegurados sus turnos fijos).

Si por alguna dificultad económica o por cualquier otro motivo necesitan unos días más o conversar alternativas, no duden en comunicarse con nosotros. Con que nos avisen alcanza para que les reservemos sus turnos. 🤝

Para nosotros es muy importante que puedan seguir entrenando en KAHA y sostener sus procesos, así que ante cualquier situación, antes de preocuparse o dejar de venir, háblennos. Estamos para acompañarlos.

¡Gracias por seguir siendo parte de esta comunidad! Les deseamos un gran mes y nos vemos entrenando 💚

Equipo KAHA`
  },
  RECORDATORIO_DIA_8: {
    nombre: 'Recordatorio Día 8 (Deudores)',
    badge: 'Día 8 del mes',
    asunto: '💚 Recordatorio de cuota: hasta el día 10 hay tiempo para pagar',
    descripcion: 'Recordar a los deudores que hasta el día 10 hay tiempo para pagar, luego la app quita el bloqueo de sus días fijos.',
    cuerpo: `¡Hola! 👋

Les dejamos este recordatorio a quienes todavía no abonaron la cuota del mes en curso: hasta el día 10 del corriente mes hay tiempo para pagar.

Luego de esa fecha, la app les quita el bloqueo de sus días fijos para que los turnos queden liberados y disponibles para otros socios.

Si tuviste alguna dificultad o necesitás unos días más, por favor avisanos por mensaje privado para coordinarlo y guardarte la vacante sin inconvenientes. 🤝

¡Gracias por ser parte de KAHA! 💚

Equipo KAHA`
  },
  AVISO_DIA_11: {
    nombre: 'Aviso Día 11 (Cupos Liberados)',
    badge: 'Día 11 del mes',
    asunto: '⚠️ Aviso: liberación de cupos reservados a partir del día 11',
    descripcion: 'Avisar que la app a partir de este día libera los cupos que tenías reservados para que los pueda tomar otro socio.',
    cuerpo: `¡Hola!

Les informamos que habiendo concluido el período regular de pago (día 10), a partir del día de hoy (día 11) la app libera los cupos que tenías reservados para que los pueda tomar otro socio.

Si deseás regularizar tu cuota o reincorporarte a tus turnos habituales, comunicate con nosotros a la brevedad para coordinar la vacante. 🤝

¡Queremos que sigas entrenando con nosotros! 💚

Equipo KAHA`
  }
};

export const EmailInicioMesModal: React.FC<EmailInicioMesModalProps> = ({ 
  isOpen, 
  onClose, 
  onSent,
  initialMode
}) => {
  const { clientes, addAuditLog, addToast, googleUser, auditLogs } = useGym();

  const hoyStr = hoyArgentina();
  const mesKey = hoyStr.slice(0, 7);
  const diaHoy = Number(hoyStr.slice(8, 10));
  const diasEnMes = new Date(Number(mesKey.split('-')[0]), Number(mesKey.split('-')[1]), 0).getDate();

  // Modo sugerido automáticamente por fecha si no viene predeterminado
  const modoSugerido: ModoMail = useMemo(() => {
    if (initialMode) return initialMode;
    if (diaHoy >= diasEnMes - 2 || diaHoy <= 5) return 'MES_SIGUIENTE';
    if (diaHoy >= 8 && diaHoy <= 10) return 'RECORDATORIO_DIA_8';
    if (diaHoy >= 11) return 'AVISO_DIA_11';
    return 'MES_SIGUIENTE';
  }, [initialMode, diaHoy, diasEnMes]);

  const [modo, setModo] = useState<ModoMail>(modoSugerido);
  const [asunto, setAsunto] = useState(PLANTILLAS_MAILS[modoSugerido].asunto);
  const [mensaje, setMensaje] = useState(PLANTILLAS_MAILS[modoSugerido].cuerpo);
  const [copiado, setCopiado] = useState(false);
  const [copiadoEmails, setCopiadoEmails] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verDestinatarios, setVerDestinatarios] = useState(false);
  const [filtroSocio, setFiltroSocio] = useState('');
  const [resultadoEnvio, setResultadoEnvio] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);

  // Al cambiar de pestaña/modo, actualizar plantilla sugerida
  const handleCambiarModo = (nuevoModo: ModoMail) => {
    setModo(nuevoModo);
    setAsunto(PLANTILLAS_MAILS[nuevoModo].asunto);
    setMensaje(PLANTILLAS_MAILS[nuevoModo].cuerpo);
    setResultadoEnvio(null);
  };

  useEffect(() => {
    if (isOpen) {
      setModo(modoSugerido);
      setAsunto(PLANTILLAS_MAILS[modoSugerido].asunto);
      setMensaje(PLANTILLAS_MAILS[modoSugerido].cuerpo);
      setResultadoEnvio(null);
    }
  }, [isOpen, modoSugerido]);

  const storageEnviadoKey = `kaha-mail-${modo.toLowerCase()}-${mesKey}`;
  const yaEnviado = typeof localStorage !== 'undefined' ? localStorage.getItem(storageEnviadoKey) : null;

  // Destinatarios según el modo seleccionado
  const destinatarios = useMemo(() => {
    return clientes.filter(c => {
      if (!c.activo) return false;
      const em = c.email?.trim().toLowerCase();
      if (!em || !em.includes('@') || em.endsWith('@example.com') || em.includes('test') || em.startsWith('invitado-')) {
        return false;
      }
      if (c.reposo) return false; // En reposo no se molesta

      if (modo === 'MES_SIGUIENTE') {
        return true; // A todos los socios activos
      }

      if (modo === 'RECORDATORIO_DIA_8') {
        // Socios que deben este mes o tienen deuda acumulada
        const exento = c.exencion_cobro === 'POSTERGADO' || c.exencion_cobro === 'SUSPENDIDO';
        if (exento) return false;
        const noPago = !c.ultimo_mes_pagado || c.ultimo_mes_pagado < mesKey;
        const tieneDeuda = (c.deuda_acumulada && c.deuda_acumulada > 0);
        return noPago || tieneDeuda;
      }

      if (modo === 'AVISO_DIA_11') {
        // Morosos o con turnos fijos sin pagar del mes actual
        const exento = c.exencion_cobro === 'POSTERGADO' || c.exencion_cobro === 'SUSPENDIDO';
        if (exento) return false;
        const noPago = !c.ultimo_mes_pagado || c.ultimo_mes_pagado < mesKey;
        const tieneDeuda = (c.deuda_acumulada && c.deuda_acumulada > 0);
        return (noPago || tieneDeuda) && (c.turnos_fijos && c.turnos_fijos.length > 0);
      }

      return true;
    });
  }, [clientes, modo, mesKey]);

  const destinatariosFiltrados = useMemo(() => {
    if (!filtroSocio.trim()) return destinatarios;
    const q = filtroSocio.toLowerCase();
    return destinatarios.filter(
      d => d.nombre.toLowerCase().includes(q) || 
           d.apellido.toLowerCase().includes(q) || 
           d.email.toLowerCase().includes(q)
    );
  }, [destinatarios, filtroSocio]);

  if (!isOpen) return null;

  const handleCopiarMensaje = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleCopiarEmails = async () => {
    const lista = destinatarios.map(d => d.email.trim()).join(', ');
    try {
      await navigator.clipboard.writeText(lista);
      setCopiadoEmails(true);
      setTimeout(() => setCopiadoEmails(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleAbrirEnClienteDeCorreo = () => {
    const bccList = destinatarios.map(d => d.email.trim()).join(',');
    const subjectEncoded = encodeURIComponent(asunto);
    const bodyEncoded = encodeURIComponent(mensaje);
    
    // mailto con BCC para proteger la privacidad de todos los socios
    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=${subjectEncoded}&body=${bodyEncoded}`;
    
    if (mailtoUrl.length > 2000) {
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bccList)}&su=${subjectEncoded}&body=${bodyEncoded}`, '_blank');
    } else {
      window.location.href = mailtoUrl;
    }

    const fechaStr = new Date().toLocaleString('es-AR');
    localStorage.setItem(storageEnviadoKey, fechaStr);
    addAuditLog(`EMAIL_${modo}_ABIERTO_CLIENTE`, {
      cantidad: destinatarios.length,
      mes: mesKey,
      modo,
      fecha: fechaStr
    }, googleUser?.email || 'admin@gimnasio.com.ar');
    addToast('add', `Abriendo cliente de correo (${destinatarios.length} socios en CCO).`);
    onSent?.();
  };

  const handleEnviarViaServidor = async () => {
    if (destinatarios.length === 0) {
      setResultadoEnvio({ tipo: 'error', texto: 'No hay destinatarios que cumplan las condiciones para enviar en este modo.' });
      return;
    }

    if (!window.confirm(`¿Confirmás el envío de este email a ${destinatarios.length} socio(s)? Todos los envíos requieren aprobación previa.`)) {
      return;
    }

    setEnviando(true);
    setResultadoEnvio(null);

    try {
      let sentSuccess = false;
      let responseDetail: any = null;

      // 1. Intentar a través del servidor Express /api/send-monthly-email
      try {
        const res = await fetch('/api/send-monthly-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asunto,
            cuerpo: mensaje,
            titulo: PLANTILLAS_MAILS[modo].nombre,
            destinatarios: destinatarios.map(d => ({
              email: d.email.trim(),
              nombre: d.nombre,
              apellido: d.apellido,
              cliente_id: d.id
            }))
          })
        });

        if (res.ok) {
          responseDetail = await res.json().catch(() => ({}));
          sentSuccess = true;
        }
      } catch (e) {
        console.warn('API local /api/send-monthly-email no respondió, probando Supabase Edge Function:', e);
      }

      // 2. Fallback a Supabase Edge Function si estuviera disponible
      if (!sentSuccess && supabase) {
        try {
          const { data, error } = await supabase.functions.invoke('send-monthly-email', {
            body: {
              asunto,
              cuerpo: mensaje,
              titulo: PLANTILLAS_MAILS[modo].nombre,
              destinatarios: destinatarios.map(d => ({
                email: d.email.trim(),
                nombre: d.nombre,
                apellido: d.apellido
              }))
            }
          });
          if (!error) {
            responseDetail = data;
            sentSuccess = true;
          }
        } catch (edgeErr) {
          console.warn('Fallback a Supabase function falló:', edgeErr);
        }
      }

      if (!sentSuccess) {
        throw new Error('No se pudo conectar con el servicio automatizado de correo.');
      }

      const fechaStr = new Date().toLocaleString('es-AR');
      localStorage.setItem(storageEnviadoKey, fechaStr);
      addAuditLog(`EMAIL_${modo}_ENVIADO`, {
        cantidad: destinatarios.length,
        mes: mesKey,
        modo,
        fecha: fechaStr,
        detalle: responseDetail
      }, googleUser?.email || 'admin@gimnasio.com.ar');

      setResultadoEnvio({
        tipo: 'ok',
        texto: `✅ Se enviaron ${destinatarios.length} correos correctamente con aprobación de administración.`
      });
      addToast('add', `Correos enviados a ${destinatarios.length} socios.`);
      onSent?.();
    } catch (err: any) {
      console.error('Error al enviar correos:', err);
      setResultadoEnvio({
        tipo: 'info',
        texto: `No se pudo conectar con el servicio automatizado (${err?.message || 'clave de servidor'}). Podés usar el botón "Abrir en Gmail / Mail (CCO)" para enviarlo directamente.`
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
        id="modal-email-inicio-mes"
      >
        {/* Header con gradiente KAHA */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 sm:p-6 pb-4 relative shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner shrink-0">
                <Mail className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                    Envío de Comunicados Oficiales
                  </h3>
                  <span className="bg-amber-400/20 text-amber-200 border border-amber-300/30 text-[9.5px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                    Aprobación Previa Requerida
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Confirmá el texto y destinatarios antes de disparar el envío. Ningún correo sale sin previa aprobación.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              id="modal-email-close-btn"
            >
              <X size={18} />
            </button>
          </div>

          {/* Selector de Modos / Fechas acordadas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-4 pt-3 border-t border-white/10">
            {(['MES_SIGUIENTE', 'RECORDATORIO_DIA_8', 'AVISO_DIA_11'] as ModoMail[]).map((m) => {
              const info = PLANTILLAS_MAILS[m];
              const activo = modo === m;
              return (
                <button
                  key={m}
                  onClick={() => handleCambiarModo(m)}
                  className={`text-left p-2.5 rounded-xl transition-all cursor-pointer border ${
                    activo 
                      ? 'bg-white text-emerald-950 font-bold border-white shadow-sm' 
                      : 'bg-white/10 hover:bg-white/15 text-emerald-100 border-white/10'
                  }`}
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider opacity-75">{info.badge}</div>
                  <div className="text-xs truncate font-bold mt-0.5">{info.nombre}</div>
                </button>
              );
            })}
          </div>

          {yaEnviado && (
            <div className="mt-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-3 py-1 flex items-center gap-2 text-[11px] text-emerald-100 font-sans">
              <CheckCircle2 size={13} className="text-emerald-300 shrink-0" />
              <span>Este comunicado ya figura como enviado anteriormente ({yaEnviado}).</span>
            </div>
          )}
        </div>

        {/* Contenido scrolleable */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto grow font-sans">
          
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Destinatarios correspondientes:</span>
                <span className="bg-emerald-100 text-emerald-800 font-mono font-bold text-xs px-2 py-0.5 rounded-full">
                  {destinatarios.length} socio(s)
                </span>
              </div>
              <button
                onClick={() => setVerDestinatarios(v => !v)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <span>{verDestinatarios ? 'Ocultar lista' : 'Ver lista'}</span>
                {verDestinatarios ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {PLANTILLAS_MAILS[modo].descripcion}
            </p>

            {verDestinatarios && (
              <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
                <input
                  type="text"
                  placeholder="Buscar socio por nombre o email..."
                  value={filtroSocio}
                  onChange={(e) => setFiltroSocio(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                  {destinatariosFiltrados.map(d => (
                    <div key={d.id} className="flex justify-between items-center py-1 px-2 bg-white rounded border border-slate-100">
                      <span className="font-sans font-medium text-slate-700">{d.nombre} {d.apellido}</span>
                      <span className="text-slate-500 text-[10px]">{d.email}</span>
                    </div>
                  ))}
                  {destinatariosFiltrados.length === 0 && (
                    <p className="text-center py-2 text-slate-400 text-xs italic">No hay socios con ese criterio.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Asunto */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
              Asunto del correo
            </label>
            <input
              type="text"
              value={asunto}
              onChange={(e) => setAsunto(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm font-sans font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
              id="modal-email-asunto-input"
            />
          </div>

          {/* Mensaje */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                Cuerpo del mensaje (Editable para confirmar o ajustar valor)
              </label>
              <button
                onClick={handleCopiarMensaje}
                className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                id="modal-email-copy-body-btn"
              >
                {copiado ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiado ? '¡Copiado!' : 'Copiar texto'}</span>
              </button>
            </div>
            <textarea
              rows={9}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              className="w-full p-3.5 text-xs sm:text-sm font-sans leading-relaxed text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
              id="modal-email-mensaje-input"
            />
          </div>

          {/* Mensaje de resultado si hubo intento */}
          {resultadoEnvio && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              resultadoEnvio.tipo === 'ok' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : resultadoEnvio.tipo === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {resultadoEnvio.tipo === 'ok' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="grow leading-relaxed">{resultadoEnvio.texto}</div>
            </div>
          )}
        </div>

        {/* Footer con acciones de aprobación */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleCopiarEmails}
              className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar lista de emails separados por comas"
              id="modal-email-copy-emails-btn"
            >
              {copiadoEmails ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiadoEmails ? '¡Emails copiados!' : 'Copiar emails'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleAbrirEnClienteDeCorreo}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Abre Gmail o tu cliente de correo con los socios en CCO"
              id="modal-email-open-client-btn"
            >
              <ExternalLink size={13} />
              <span>Abrir en Gmail (CCO)</span>
            </button>

            <button
              onClick={handleEnviarViaServidor}
              disabled={enviando || destinatarios.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/20 transition-all cursor-pointer disabled:opacity-50"
              id="modal-email-send-edge-btn"
            >
              <Send size={13} className={enviando ? 'animate-spin' : ''} />
              <span>{enviando ? 'Enviando...' : 'Aprobar y Enviar Correo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailInicioMesModal;
