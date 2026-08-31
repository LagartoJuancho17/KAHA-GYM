// src/components/Notifications/EmailInicioMesModal.tsx
import React, { useState, useMemo } from 'react';
import { 
  Mail, X, Send, Copy, Check, Users, AlertCircle, 
  ExternalLink, Sparkles, CheckCircle2, ChevronDown, ChevronUp 
} from 'lucide-react';
import { useGym } from '../../GymContext';
import { supabase } from '../../supabaseClient';

interface EmailInicioMesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MENSAJE_MAIL_INICIO_MES = `¡Hola! ¿Cómo están?

Comenzamos un nuevo mes y queríamos agradecerles, una vez más, por seguir eligiendo KAHA y permitirnos acompañarlos en este camino de entrenamiento, salud y movimiento. 💚

Les recordamos que, durante los primeros 5 días hábiles del mes, la aplicación asigna automáticamente los turnos fijos a quienes hayan realizado el pago de su cuota.

Si por alguna dificultad económica o por cualquier otro motivo necesitan retrasar el pago, no duden en comunicarse con nosotros. No tenemos ningún problema en ayudarlos y buscar la mejor alternativa; simplemente necesitamos hacerlo manualmente para poder mantenerles la prioridad sobre sus turnos.

Para nosotros es muy importante que puedan seguir entrenando en KAHA y sostener sus procesos, así que ante cualquier situación, antes de preocuparse o dejar de venir, háblennos. Estamos para acompañarlos. 🤝

¡Gracias por seguir siendo parte de esta comunidad!
Les deseamos un gran comienzo de mes y nos vemos entrenando 💚

Equipo KAHA`;

export const ASUNTO_MAIL_INICIO_MES = '💚 ¡Comenzamos un nuevo mes en KAHA!';

export const EmailInicioMesModal: React.FC<EmailInicioMesModalProps> = ({ isOpen, onClose }) => {
  const { clientes, addAuditLog, addToast, googleUser } = useGym();
  const [asunto, setAsunto] = useState(ASUNTO_MAIL_INICIO_MES);
  const [mensaje, setMensaje] = useState(MENSAJE_MAIL_INICIO_MES);
  const [copiado, setCopiado] = useState(false);
  const [copiadoEmails, setCopiadoEmails] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verDestinatarios, setVerDestinatarios] = useState(false);
  const [filtroSocio, setFiltroSocio] = useState('');
  const [resultadoEnvio, setResultadoEnvio] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);

  const hoy = new Date();
  const mesKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const storageEnviadoKey = `kaha-mail-inicio-mes-enviado-${mesKey}`;
  const yaEnviado = localStorage.getItem(storageEnviadoKey);

  // Destinatarios: socios activos con email válido
  const destinatarios = useMemo(() => {
    return clientes.filter(c => {
      if (!c.activo) return false;
      const em = c.email?.trim();
      return em && em.includes('@') && !em.endsWith('@example.com') && !em.includes('test');
    });
  }, [clientes]);

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
    
    // Si la URL es muy larga para el navegador (muchos socios), advertir y ofrecer copia
    if (mailtoUrl.length > 2000) {
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bccList)}&su=${subjectEncoded}&body=${bodyEncoded}`, '_blank');
    } else {
      window.location.href = mailtoUrl;
    }

    // Registrar envío
    const fechaStr = new Date().toLocaleString('es-AR');
    localStorage.setItem(storageEnviadoKey, fechaStr);
    addAuditLog('EMAIL_MENSUAL_ABIERTO_CLIENTE', {
      cantidad: destinatarios.length,
      mes: mesKey,
      fecha: fechaStr
    }, googleUser?.email || 'admin@gimnasio.com.ar');
    addToast('add', 'Abriendo cliente de correo con los socios en CCO.');
  };

  const handleEnviarViaEdgeFunction = async () => {
    if (destinatarios.length === 0) {
      setResultadoEnvio({ tipo: 'error', texto: 'No hay socios activos con email válido para enviar.' });
      return;
    }

    setEnviando(true);
    setResultadoEnvio(null);

    try {
      if (!supabase) {
        throw new Error('Supabase no está configurado.');
      }

      // Invocar Edge Function send-monthly-email
      const { data, error } = await supabase.functions.invoke('send-monthly-email', {
        body: {
          asunto,
          mensaje,
          destinatarios: destinatarios.map(d => ({
            id: d.id,
            nombre: `${d.nombre} ${d.apellido}`.trim(),
            email: d.email.trim()
          }))
        }
      });

      if (error) {
        throw error;
      }

      const fechaStr = new Date().toLocaleString('es-AR');
      localStorage.setItem(storageEnviadoKey, fechaStr);
      addAuditLog('EMAIL_MENSUAL_ENVIADO', {
        cantidad: destinatarios.length,
        mes: mesKey,
        fecha: fechaStr,
        detalle: data
      }, googleUser?.email || 'admin@gimnasio.com.ar');

      setResultadoEnvio({
        tipo: 'ok',
        texto: `✅ Se enviaron ${destinatarios.length} correos correctamente a los socios.`
      });
      addToast('add', `Correos de inicio de mes enviados a ${destinatarios.length} socios.`);
    } catch (err: any) {
      console.error('Error al invocar Edge Function:', err);
      setResultadoEnvio({
        tipo: 'info',
        texto: `No se pudo conectar con el servicio automatizado (${err?.message || 'clave Resend no configurada'}). Podés usar el botón "Abrir en Gmail / Mailto" para enviarlo directamente.`
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
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 sm:p-6 pb-5 relative shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-inner shrink-0">
                <Mail className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                    Email de Inicio de Mes a Socios
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                    Automático
                  </span>
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  Comunicado oficial de bienvenida al nuevo mes para todos los socios activos
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

          {/* Banner si ya fue enviado este mes */}
          {yaEnviado && (
            <div className="mt-3.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs text-emerald-100 font-sans">
              <CheckCircle2 size={14} className="text-emerald-300 shrink-0" />
              <span>Ya fue marcado como enviado este mes ({yaEnviado}). Podés volver a enviarlo si lo necesitás.</span>
            </div>
          )}
        </div>

        {/* Contenido scrolleable */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto grow">
          
          {/* Destinatarios */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">Destinatarios:</span>
                <span className="bg-emerald-100 text-emerald-800 font-mono font-bold text-xs px-2 py-0.5 rounded-full">
                  {destinatarios.length} socios activos con email
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
                Cuerpo del mensaje
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
              rows={10}
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

        {/* Footer con acciones */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleCopiarEmails}
              className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar lista separada por comas"
              id="modal-email-copy-emails-btn"
            >
              {copiadoEmails ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiadoEmails ? '¡Emails copiados!' : 'Copiar emails'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {/* Opción rápida garantizada: Mailto / Gmail con CCO */}
            <button
              onClick={handleAbrirEnClienteDeCorreo}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Abre Gmail o tu cliente de correo con los socios en CCO"
              id="modal-email-open-client-btn"
            >
              <ExternalLink size={13} />
              <span>Abrir en Gmail / Mail (CCO)</span>
            </button>

            {/* Opción directa por Edge Function */}
            <button
              onClick={handleEnviarViaEdgeFunction}
              disabled={enviando}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/20 transition-all cursor-pointer disabled:opacity-50"
              id="modal-email-send-edge-btn"
            >
              <Send size={13} className={enviando ? 'animate-spin' : ''} />
              <span>{enviando ? 'Enviando correos...' : 'Enviar vía Servidor'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailInicioMesModal;
