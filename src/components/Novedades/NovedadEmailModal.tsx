// src/components/Novedades/NovedadEmailModal.tsx
import React, { useState, useMemo } from 'react';
import { Novedad } from '../../types';
import { useGym } from '../../GymContext';
import { 
  Mail, X, Send, Copy, Check, Users, AlertCircle, 
  Sparkles, CheckCircle2, ExternalLink 
} from 'lucide-react';
import { 
  getDestinatariosNovedad, 
  generarAsuntoNovedad, 
  generarTextoPlanoNovedad, 
  generarMailtoNovedad, 
  enviarNovedadEmailBackend,
  CATEGORIAS_NOVEDAD_META 
} from '../../lib/emailNovedades';

interface NovedadEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  novedad: Novedad | null;
  onSuccess?: (msg: string) => void;
}

export const NovedadEmailModal: React.FC<NovedadEmailModalProps> = ({
  isOpen,
  onClose,
  novedad,
  onSuccess
}) => {
  const { clientes, addAuditLog, addToast, googleUser } = useGym();

  const [enviando, setEnviando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [copiadoEmails, setCopiadoEmails] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<{ tipo: 'ok' | 'error' | 'info'; texto: string } | null>(null);

  const destinatarios = useMemo(() => {
    if (!novedad) return [];
    return getDestinatariosNovedad(clientes, novedad.socio_id);
  }, [clientes, novedad]);

  const asunto = useMemo(() => {
    if (!novedad) return '';
    return generarAsuntoNovedad(novedad);
  }, [novedad]);

  const textoPlano = useMemo(() => {
    if (!novedad) return '';
    return generarTextoPlanoNovedad(novedad);
  }, [novedad]);

  const meta = novedad ? (CATEGORIAS_NOVEDAD_META[novedad.categoria] || CATEGORIAS_NOVEDAD_META.INFORMACION) : null;

  if (!isOpen || !novedad) return null;

  const handleCopiarTexto = async () => {
    try {
      await navigator.clipboard.writeText(textoPlano);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
      addToast('add', 'Texto de la novedad copiado.');
    } catch {
      // Fallback
    }
  };

  const handleCopiarEmails = async () => {
    const emails = destinatarios.map(d => d.email).join(', ');
    try {
      await navigator.clipboard.writeText(emails);
      setCopiadoEmails(true);
      setTimeout(() => setCopiadoEmails(false), 2500);
      addToast('add', `${destinatarios.length} emails copiados al portapapeles.`);
    } catch {
      // Fallback
    }
  };

  const handleAbrirEnClienteDeCorreo = () => {
    const mailtoUrl = generarMailtoNovedad({
      destinatarios: destinatarios.map(d => d.email),
      asunto,
      cuerpo: textoPlano
    });

    if (mailtoUrl.length > 2000) {
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(destinatarios.map(d => d.email).join(','))}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(textoPlano)}`,
        '_blank'
      );
    } else {
      window.location.href = mailtoUrl;
    }

    addAuditLog('EMAIL_NOVEDAD_ABIERTO_CLIENTE', {
      novedad_id: novedad.id,
      titulo: novedad.titulo,
      cantidad: destinatarios.length,
      fecha: new Date().toISOString()
    }, googleUser?.email || 'admin@kaha.com.ar');

    addToast('add', `Abriendo cliente de correo (${destinatarios.length} socios en CCO).`);
    onClose();
  };

  const handleEnviarViaServidor = async () => {
    if (destinatarios.length === 0) {
      setResultadoEnvio({ tipo: 'error', texto: 'No hay socios activos con email válido para enviar.' });
      return;
    }

    if (!window.confirm(`¿Confirmás el envío de este correo a ${destinatarios.length} socio(s) activos?`)) {
      return;
    }

    setEnviando(true);
    setResultadoEnvio(null);

    try {
      const res = await enviarNovedadEmailBackend({
        novedad,
        destinatarios
      });

      if (res.ok) {
        setResultadoEnvio({
          tipo: 'ok',
          texto: `¡Listo! Se enviaron ${res.enviados} correos exitosamente.${res.errores > 0 ? ` (${res.errores} fallaron)` : ''}`
        });

        addAuditLog('EMAIL_NOVEDAD_ENVIADO', {
          novedad_id: novedad.id,
          titulo: novedad.titulo,
          cantidad: res.enviados,
          fecha: new Date().toISOString()
        }, googleUser?.email || 'admin@kaha.com.ar');

        addToast('add', `Novedad enviada por correo a ${res.enviados} socios.`);
        onSuccess?.(`Novedad enviada a ${res.enviados} socios.`);
        setTimeout(() => onClose(), 1500);
      } else {
        throw new Error(res.message || 'No se pudo conectar con el servicio de correo.');
      }
    } catch (err: any) {
      console.error('Error al enviar novedad por email:', err);
      setResultadoEnvio({
        tipo: 'error',
        texto: err.message || 'Ocurrió un error al enviar los correos.'
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-xs select-none animate-fade-in font-sans">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-4 animate-scale-up">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                Enviar Novedad por Correo
              </h3>
              <p className="text-[11px] text-slate-400">
                Notificá a los socios directamente en su casilla de correo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Destinatarios Info */}
        <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-700" />
            <div>
              <span className="text-xs font-bold text-emerald-950">Destinatarios Activos</span>
              <p className="text-[11px] text-emerald-800">
                {destinatarios.length} socio(s) con dirección de email válida
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopiarEmails}
            className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-200 hover:border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
          >
            {copiadoEmails ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiadoEmails ? 'Copiados' : 'Copiar emails'}
          </button>
        </div>

        {/* Preview Asunto */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
            Asunto del correo
          </label>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 flex items-center gap-2">
            <span>{asunto}</span>
          </div>
        </div>

        {/* Preview Contenido */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">
              Vista previa del contenido
            </label>
            <button
              type="button"
              onClick={handleCopiarTexto}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              {copiado ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copiado ? 'Copiado' : 'Copiar texto'}
            </button>
          </div>
          
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <div className="flex items-center gap-2">
              {meta && (
                <span className="px-2 py-0.5 border rounded-md text-[9px] font-black uppercase font-mono bg-emerald-50 text-emerald-800 border-emerald-100">
                  {meta.icono} {meta.tag}
                </span>
              )}
              {novedad.destacado && (
                <span className="bg-amber-500 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase font-mono">
                  ⭐ Destacado
                </span>
              )}
            </div>
            
            <h4 className="text-sm font-bold text-slate-900">{novedad.titulo}</h4>
            <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed max-h-44 overflow-y-auto">
              {novedad.contenido}
            </div>
          </div>
        </div>

        {/* Feedback / Resultado */}
        {resultadoEnvio && (
          <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${
            resultadoEnvio.tipo === 'ok' 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}>
            {resultadoEnvio.tipo === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{resultadoEnvio.texto}</span>
          </div>
        )}

        {/* Botonera de Envío */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleAbrirEnClienteDeCorreo}
            className="flex-1 py-2.5 px-3 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            Abrir en Gmail / Mail (CCO)
          </button>

          <button
            type="button"
            onClick={handleEnviarViaServidor}
            disabled={enviando || destinatarios.length === 0}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 border-none shadow-xs cursor-pointer ${
              enviando || destinatarios.length === 0 
                ? 'bg-emerald-300 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.01]'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-white" />
            {enviando ? 'Despachando correos...' : `Enviar por Correo (${destinatarios.length})`}
          </button>
        </div>

      </div>
    </div>
  );
};
