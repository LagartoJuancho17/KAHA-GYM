// src/components/Turnos/TurnoClassEmailModal.tsx
import React, { useState, useMemo } from 'react';
import { X, Mail, Send, Copy, ExternalLink, Check, AlertCircle, Sparkles, Users, Info } from 'lucide-react';
import { useGym } from '../../GymContext';
import {
  AlumnoClaseEmail,
  PLANTILLAS_EMAIL_CLASE,
  esEmailValido,
  personalizarTexto,
  generarMailtoClase
} from '../../lib/emailClase';

interface TurnoClassEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  turnoId: string; // ej: 'LUNES-18:00'
  fecha: string;   // ej: '2026-10-06'
  profesor?: string;
  alumnos: AlumnoClaseEmail[];
}

export const TurnoClassEmailModal: React.FC<TurnoClassEmailModalProps> = ({
  isOpen,
  onClose,
  turnoId,
  fecha,
  profesor = '',
  alumnos
}) => {
  const { addAuditLog, googleUser, addToast } = useGym();

  // Parsing slot info
  const [dia = 'LUNES', hora = '08:00'] = turnoId.split('-');
  const fechaObj = new Date(fecha + 'T00:00:00');
  const fechaFmt = !isNaN(fechaObj.getTime())
    ? fechaObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : fecha;
  const fechaCorta = (() => {
    const p = fecha.split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}` : fecha;
  })();
  const claseTxt = `${dia.charAt(0).toUpperCase() + dia.slice(1).toLowerCase()} ${fechaCorta} ${hora} hs`;

  // Presets & Form state
  const [selectedPresetId, setSelectedPresetId] = useState<string>('AVISO_GENERAL');
  const [asunto, setAsunto] = useState<string>(() => {
    const preset = PLANTILLAS_EMAIL_CLASE.find(p => p.id === 'AVISO_GENERAL');
    return (preset?.asunto || 'Aviso sobre tu clase de {clase} — KAHA GYM').replace('{clase}', claseTxt);
  });
  const [mensaje, setMensaje] = useState<string>(() => {
    const preset = PLANTILLAS_EMAIL_CLASE.find(p => p.id === 'AVISO_GENERAL');
    return (preset?.cuerpo || '').replace('{clase}', claseTxt);
  });

  // Selected recipient IDs
  const [selectedClienteIds, setSelectedClienteIds] = useState<Set<string>>(() => {
    const validSet = new Set<string>();
    alumnos.forEach(a => {
      if (a.emailValido) validSet.add(a.clienteId);
    });
    return validSet;
  });

  // Status & Feedback states
  const [enviando, setEnviando] = useState(false);
  const [copiadoEmails, setCopiadoEmails] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // List of active recipients with email
  const destinatariosSeleccionados = useMemo(() => {
    return alumnos.filter(a => selectedClienteIds.has(a.clienteId) && a.emailValido);
  }, [alumnos, selectedClienteIds]);

  const totalConEmailValido = useMemo(() => {
    return alumnos.filter(a => a.emailValido).length;
  }, [alumnos]);

  // Handle Preset Change
  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = PLANTILLAS_EMAIL_CLASE.find(p => p.id === presetId);
    if (preset) {
      const nuevoAsunto = preset.asunto
        .replace('{clase}', claseTxt)
        .replace('{profesor}', profesor || 'el profesor asignado');
      const nuevoCuerpo = preset.cuerpo
        .replace('{clase}', claseTxt)
        .replace('{profesor}', profesor || 'el profesor asignado');
      setAsunto(nuevoAsunto);
      setMensaje(nuevoCuerpo);
    }
  };

  // Toggle recipient checkbox
  const handleToggleRecipient = (clienteId: string) => {
    setSelectedClienteIds(prev => {
      const next = new Set(prev);
      if (next.has(clienteId)) next.delete(clienteId);
      else next.add(clienteId);
      return next;
    });
  };

  const handleSelectAll = () => {
    const next = new Set<string>();
    alumnos.forEach(a => {
      if (a.emailValido) next.add(a.clienteId);
    });
    setSelectedClienteIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedClienteIds(new Set());
  };

  // Copy emails to clipboard
  const handleCopyEmails = async () => {
    const emailsList = destinatariosSeleccionados.map(d => d.email.trim()).join(', ');
    if (!emailsList) return;
    try {
      await navigator.clipboard.writeText(emailsList);
      setCopiadoEmails(true);
      setTimeout(() => setCopiadoEmails(false), 2500);
      addToast('add', `${destinatariosSeleccionados.length} emails copiados al portapapeles.`);
    } catch {
      // Fallback
    }
  };

  // Open Mailto / Gmail in BCC
  const handleAbrirEnClienteDeCorreo = () => {
    if (destinatariosSeleccionados.length === 0) return;
    const bccList = destinatariosSeleccionados.map(d => d.email.trim()).join(',');
    const previewName = destinatariosSeleccionados[0]?.nombre || 'todos';
    const cuerpoGenerico = personalizarTexto({
      texto: mensaje,
      nombre: previewName,
      claseTxt,
      profesor
    });

    const mailtoUrl = generarMailtoClase({
      destinatarios: destinatariosSeleccionados.map(d => d.email),
      asunto: asunto.replace('{clase}', claseTxt),
      cuerpo: cuerpoGenerico
    });

    if (mailtoUrl.length > 2000) {
      window.open(
        `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bccList)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpoGenerico)}`,
        '_blank'
      );
    } else {
      window.location.href = mailtoUrl;
    }

    addAuditLog('EMAIL_CLASE_ABIERTO_CLIENTE', {
      turno_id: turnoId,
      fecha,
      cantidad: destinatariosSeleccionados.length,
      asunto
    }, googleUser?.email || 'admin@kaha.com.ar');

    addToast('add', 'Abriendo cliente de correo con los alumnos en CCO.');
  };

  // Automated Send via Express / Resend backend
  const handleEnviarViaBackend = async () => {
    if (destinatariosSeleccionados.length === 0) {
      setResultadoEnvio({ tipo: 'error', texto: 'Seleccioná al menos un alumno con email válido.' });
      return;
    }

    setEnviando(true);
    setResultadoEnvio(null);

    try {
      const res = await fetch('/api/send-class-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asunto,
          mensaje,
          claseTxt,
          profesor,
          destinatarios: destinatariosSeleccionados.map(d => ({
            id: d.clienteId,
            nombre: d.nombreCompleto,
            email: d.email.trim()
          }))
        })
      });

      if (!res.ok) {
        throw new Error(`El servidor respondió con código ${res.status}`);
      }

      const resData = await res.json();
      if (resData.ok) {
        setResultadoEnvio({
          tipo: 'ok',
          texto: `¡Listo! Se enviaron ${resData.enviados} emails a los alumnos correctamente.${resData.errores > 0 ? ` (${resData.errores} fallaron)` : ''}`
        });

        addAuditLog('EMAIL_CLASE_ENVIADO', {
          turno_id: turnoId,
          fecha,
          enviados: resData.enviados,
          total: destinatariosSeleccionados.length,
          asunto,
          alumnos: destinatariosSeleccionados.map(d => d.nombreCompleto)
        }, googleUser?.email || 'admin@kaha.com.ar');

        addToast('add', `Se enviaron ${resData.enviados} correos a los alumnos de la clase.`);
      } else {
        throw new Error(resData.error || 'No se pudieron despachar los correos');
      }
    } catch (err: any) {
      console.error('Error al enviar email a la clase:', err);
      setResultadoEnvio({
        tipo: 'error',
        texto: `No se pudo enviar vía servidor (${err?.message || 'error de conexión'}). Podés usar el botón "Abrir en Gmail / Mailto" para enviarlo directamente.`
      });
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  // First recipient for live preview
  const primerAlumno = destinatariosSeleccionados[0] || alumnos[0];
  const vistaPreviaTexto = primerAlumno
    ? personalizarTexto({
        texto: mensaje,
        nombre: primerAlumno.nombre || primerAlumno.nombreCompleto.split(' ')[0],
        claseTxt,
        profesor
      })
    : mensaje;

  return (
    <div className="fixed inset-0 bg-black/75 z-60 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs font-sans text-xs" id="turno-class-email-modal">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-2xl overflow-hidden relative animate-scale-up max-h-[92vh] flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-slate-900 text-white p-4 sm:p-5 flex justify-between items-start shrink-0 border-b border-zinc-800">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0 shadow-xs">
              <Mail className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white">
                  Email a los Alumnos de la Clase
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800 font-bold">
                  {claseTxt}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 capitalize">
                📅 {fechaFmt} {profesor ? `· 👤 Profe: ${profesor}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* PLANTILLAS RÁPIDAS / PRESETS */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10.5px] font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Plantilla Rápida / Motivo</span>
              </label>
              <span className="text-[10px] text-zinc-400">Clic en una opción para autocompletar</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PLANTILLAS_EMAIL_CLASE.map(p => {
                const isSelected = selectedPresetId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50 text-sky-950 font-bold shadow-2xs'
                        : 'border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium'
                    }`}
                  >
                    <span className="text-sm shrink-0">{p.icono}</span>
                    <span className="text-[11px] truncate">{p.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ASUNTO */}
          <div className="space-y-1">
            <label className="text-[10.5px] font-bold text-zinc-600 uppercase tracking-wider block">
              Asunto del Correo
            </label>
            <input
              type="text"
              value={asunto}
              onChange={e => setAsunto(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-xs bg-white focus:border-sky-600 focus:ring-1 focus:ring-sky-500 outline-hidden font-medium text-zinc-800"
              placeholder="Ej: Aviso sobre tu clase de hoy en KAHA GYM"
            />
          </div>

          {/* MENSAJE CON VARIABLES */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10.5px] font-bold text-zinc-600 uppercase tracking-wider block">
                Mensaje Personalizado
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">
                Variables: <code className="text-sky-700 bg-sky-50 px-1 py-0.5 rounded font-bold">{'{nombre}'}</code>, <code className="text-sky-700 bg-sky-50 px-1 py-0.5 rounded font-bold">{'{clase}'}</code>
              </span>
            </div>
            <textarea
              rows={4}
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              className="w-full border border-zinc-200 rounded-xl p-3 text-xs bg-white focus:border-sky-600 focus:ring-1 focus:ring-sky-500 outline-hidden font-medium text-zinc-800"
              placeholder="Escribí el mensaje para los alumnos..."
            />
          </div>

          {/* VISTA PREVIA DEL CORREO PARA UN ALUMNO */}
          {primerAlumno && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1 text-slate-700">
                  <Info className="w-3 h-3 text-sky-600" />
                  Vista Previa (ejemplo para {primerAlumno.nombre || primerAlumno.nombreCompleto}):
                </span>
                <span className="text-zinc-400 font-mono lowercase">{primerAlumno.email || 'sin email'}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 text-[11px] text-zinc-700 font-sans whitespace-pre-line leading-relaxed italic">
                {vistaPreviaTexto}
              </div>
            </div>
          )}

          {/* LISTA DE ALUMNOS DESTINATARIOS */}
          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-zinc-800 text-xs">
                  Destinatarios ({destinatariosSeleccionados.length} de {alumnos.length})
                </span>
                {totalConEmailValido < alumnos.length && (
                  <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {alumnos.length - totalConEmailValido} sin email válido
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10.5px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sky-600 hover:text-sky-700 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Marcar todos
                </button>
                <span className="text-zinc-300">·</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-zinc-500 hover:text-zinc-700 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
                >
                  Desmarcar todos
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {alumnos.length === 0 ? (
                <p className="text-zinc-400 italic text-center py-4 bg-zinc-50 rounded-xl border border-zinc-200">
                  No hay alumnos inscriptos en esta clase.
                </p>
              ) : (
                alumnos.map(al => {
                  const isChecked = selectedClienteIds.has(al.clienteId) && al.emailValido;
                  const canSelect = al.emailValido;

                  return (
                    <div
                      key={al.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                        !canSelect
                          ? 'bg-zinc-50/70 border-zinc-200 opacity-60'
                          : isChecked
                            ? 'bg-sky-50/40 border-sky-200 text-zinc-900'
                            : 'bg-white border-zinc-200 text-zinc-600'
                      }`}
                    >
                      <label className={`flex items-center gap-2.5 flex-1 select-none ${canSelect ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!canSelect}
                          onChange={() => canSelect && handleToggleRecipient(al.clienteId)}
                          className="w-3.5 h-3.5 rounded text-sky-600 border-zinc-300 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed"
                        />
                        <div className="flex flex-col">
                          <span className={`font-semibold ${!canSelect ? 'text-zinc-400' : 'text-zinc-800'}`}>
                            {al.nombreCompleto}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {al.emailValido ? al.email : (al.esInvitado ? '👤 Invitado (sin correo real)' : '⚠️ Sin email registrado')}
                          </span>
                        </div>
                      </label>

                      <div className="shrink-0 pl-2">
                        {al.tipo === 'FIJO' && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">
                            Fijo
                          </span>
                        )}
                        {al.tipo === 'VARIABLE' && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100">
                            Variable
                          </span>
                        )}
                        {al.tipo === 'RECUPERO' && (
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-100">
                            Recupero
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* FEEDBACK RESULTADO */}
          {resultadoEnvio && (
            <div
              className={`p-3 rounded-xl flex items-start gap-2 text-xs font-medium animate-fade-in ${
                resultadoEnvio.tipo === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {resultadoEnvio.tipo === 'ok' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{resultadoEnvio.texto}</div>
            </div>
          )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex flex-wrap gap-2.5 items-center justify-between shrink-0 font-sans">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyEmails}
              disabled={destinatariosSeleccionados.length === 0}
              className="px-3 py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Copiar lista de emails de los alumnos seleccionados"
            >
              {copiadoEmails ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
              <span>{copiadoEmails ? '¡Copiados!' : 'Copiar Emails'}</span>
            </button>

            <button
              type="button"
              onClick={handleAbrirEnClienteDeCorreo}
              disabled={destinatariosSeleccionados.length === 0}
              className="px-3 py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Abrir en Gmail o gestor de correo local con alumnos en copia oculta (BCC)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Abrir en Gmail / Mailto (CCO)</span>
              <span className="sm:hidden">Mailto CCO</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-xl text-xs font-bold transition-colors cursor-pointer border-none"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleEnviarViaBackend}
              disabled={enviando || destinatariosSeleccionados.length === 0}
              className="px-4.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer border-none disabled:opacity-50"
              id="btn-confirm-send-class-email"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{enviando ? 'Enviando...' : `Enviar Email (${destinatariosSeleccionados.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
