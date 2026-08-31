import React, { useState, useEffect, useCallback } from 'react';
import { Copy, Check, X, Bell, Calendar, ChevronDown, ChevronUp, MessageCircle, Send } from 'lucide-react';
import { useGym } from '../../GymContext';

// ─── Constantes ──────────────────────────────────────────────────────────────

const DIAS_ANTICIPACION = 3; // Días antes del fin de mes para mostrar el recordatorio

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/** Clave de localStorage para guardar estado: 'open' | 'closed' | 'done' */
const stateStorageKey = (yyyy: number, mm: number) =>
  `kaha-recordatorio-state-${yyyy}-${String(mm).padStart(2, '0')}`;

/** Clave de localStorage para "recordarme mañana" */
const snoozeStorageKey = (yyyy: number, mm: number) =>
  `kaha-recordatorio-snooze-${yyyy}-${String(mm).padStart(2, '0')}`;

/** Clave de localStorage para guardar el id de la novedad publicada del mes */
const novedadIdStorageKey = (yyyy: number, mm: number) =>
  `kaha-recordatorio-novedad-id-${yyyy}-${String(mm).padStart(2, '0')}`;

// ─── Mensaje predefinido ──────────────────────────────────────────────────────

const MENSAJE_MENSUAL = `💚 ¡Se viene un nuevo mes en KAHA!

Queremos seguir teniéndote con nosotros y acompañándote en tu proceso de entrenamiento.

Recordá que el pago de la cuota es lo que confirma y sostiene tu turno fijo. Si no se realiza a tiempo, la aplicación puede liberar ese lugar para otra persona.

Si por algún motivo económico necesitás retrasar o modificar tu pago, por favor escribinos. Estamos para ayudarte y buscar juntos la mejor alternativa. 🤝

¡No te cuelgues! 😅
Nos vemos en KAHA 💚`;

// ─── Utilidades de fecha ──────────────────────────────────────────────────────

function diasRestantesDelMes(): number {
  const hoy = new Date();
  const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  return ultimoDia - hoy.getDate();
}

function getMesActual(): { yyyy: number; mm: number } {
  const hoy = new Date();
  return { yyyy: hoy.getFullYear(), mm: hoy.getMonth() + 1 };
}

function getProximoMesNombre(): string {
  const hoy = new Date();
  const proximoMesIndex = (hoy.getMonth() + 1) % 12;
  return MESES_ES[proximoMesIndex];
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface MensajeMensualReminderProps {
  /** Solo mostrar para roles admin/operador. */
  visible?: boolean;
}

export const MensajeMensualReminder: React.FC<MensajeMensualReminderProps> = ({ visible = true }) => {
  const { addNovedad, deleteNovedad } = useGym();
  const [shouldRender, setShouldRender] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const checkStatus = useCallback(() => {
    if (!visible) {
      setShouldRender(false);
      return;
    }

    const hoy = new Date();
    const diaHoy = hoy.getDate();
    const { yyyy, mm } = getMesActual();

    // ── Auto-borrado el día 5 del mes ──────────────────────────────────────
    // Si ya pasó el 1ro del mes siguiente al que se publicó, borramos la novedad
    // Ej: si publicamos en agosto (mm=8), borramos el 5 de septiembre (mm=9)
    // Buscamos el ID guardado del mes ANTERIOR (el que se publicó 3 días antes)
    const mesAnterior = mm === 1 ? 12 : mm - 1;
    const yyyyAnterior = mm === 1 ? yyyy - 1 : yyyy;
    const novedadIdMesAnterior = localStorage.getItem(novedadIdStorageKey(yyyyAnterior, mesAnterior));
    if (novedadIdMesAnterior && diaHoy >= 5) {
      // Borrar la novedad del mes anterior de la cartelera
      deleteNovedad(novedadIdMesAnterior);
      localStorage.removeItem(novedadIdStorageKey(yyyyAnterior, mesAnterior));
      console.log('[KAHA] Novedad mensual auto-borrada el día 5:', novedadIdMesAnterior);
    }

    const diasRestantes = diasRestantesDelMes();
    if (diasRestantes > DIAS_ANTICIPACION) {
      setShouldRender(false);
      return;
    }

    // ¿Está en snooze?
    const snoozedUntil = localStorage.getItem(snoozeStorageKey(yyyy, mm));
    if (snoozedUntil) {
      const snoozedDate = new Date(snoozedUntil);
      if (new Date() < snoozedDate) {
        setShouldRender(false);
        return;
      }
    }

    // Leer estado guardado en localStorage
    const savedState = localStorage.getItem(stateStorageKey(yyyy, mm));
    if (savedState === 'done') {
      // Si ya lo marcó como enviado, no se muestra automáticamente a menos que no esté 'done'
      setShouldRender(false);
      return;
    }

    setShouldRender(true);
    // Si guardó 'closed', empieza cerrado (mostrando el botón flotante). Si no hay guardado o es 'open', empieza abierto.
    if (savedState === 'closed') {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [visible, deleteNovedad]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30 * 60 * 1000); // Chequea cada 30 min
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(MENSAJE_MENSUAL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = MENSAJE_MENSUAL;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCerrar = () => {
    const { yyyy, mm } = getMesActual();
    setIsOpen(false);
    localStorage.setItem(stateStorageKey(yyyy, mm), 'closed');
  };

  const handleAbrir = () => {
    const { yyyy, mm } = getMesActual();
    setIsOpen(true);
    localStorage.setItem(stateStorageKey(yyyy, mm), 'open');
  };

  const handleEnviar = () => {
    if (isPublishing) return;
    setIsPublishing(true);

    try {
      const proximoMes = getProximoMesNombre();

      const result = addNovedad({
        titulo: proximoMes,
        contenido: MENSAJE_MENSUAL,
        categoria: 'INFORMACION',
        destacado: true,
        creado_por: 'Administración KAHA'
      });

      const { yyyy, mm } = getMesActual();

      // Guardar el id de la novedad para auto-borrarla el día 5 del mes siguiente
      if (result?.success && result.id) {
        localStorage.setItem(novedadIdStorageKey(yyyy, mm), result.id);
      }

      localStorage.setItem(stateStorageKey(yyyy, mm), 'done');
      setShouldRender(false);
      setIsOpen(false);
    } catch (e) {
      console.error('Error al publicar novedad mensual:', e);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSnooze = () => {
    const { yyyy, mm } = getMesActual();
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    manana.setHours(9, 0, 0, 0);
    localStorage.setItem(snoozeStorageKey(yyyy, mm), manana.toISOString());
    setShouldRender(false);
    setIsOpen(false);
  };

  if (!shouldRender) return null;

  const diasRestantes = diasRestantesDelMes();
  const urgente = diasRestantes === 0;

  return (
    <>
      {/* ── BOTÓN FLOTANTE COMPACTO (cuando está cerrado/minimizado) ── */}
      {!isOpen && (
        <div className="fixed bottom-20 sm:bottom-5 right-3 sm:right-5 z-[9990] animate-in fade-in zoom-in duration-200">
          <button
            onClick={handleAbrir}
            className="group flex items-center gap-2 rounded-full pl-3 pr-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-xs font-bold shadow-lg shadow-emerald-950/30 border border-emerald-300/30 backdrop-blur-md transition-all hover:scale-105 hover:shadow-emerald-500/25 active:scale-95 cursor-pointer"
            title="Abrir recordatorio de mensaje mensual"
            id="mensual-reminder-reopen-btn"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-100"></span>
            </span>
            <MessageCircle size={14} className="text-emerald-200 group-hover:rotate-12 transition-transform" />
            <span className="text-[11px] sm:text-xs tracking-tight">Mensaje de Mes</span>
            <span className="bg-emerald-900/60 text-[10px] text-emerald-200 px-1.5 py-0.2 rounded-full border border-emerald-400/20 font-mono">
              {urgente ? '¡Hoy!' : `${diasRestantes}d`}
            </span>
          </button>
        </div>
      )}

      {/* ── POPUP PRINCIPAL COMPACTO (cuando está abierto) ── */}
      {isOpen && (
        <div
          className="fixed bottom-20 sm:bottom-5 right-3 sm:right-5 z-[9990] w-[calc(100vw-1.5rem)] max-w-[320px] sm:max-w-sm animate-in slide-in-from-bottom-4 duration-300"
          role="alertdialog"
          aria-label="Recordatorio de mensaje mensual"
          id="mensual-reminder-banner"
        >
          <div
            className="rounded-2xl overflow-hidden shadow-2xl shadow-emerald-950/40"
            style={{
              background: 'linear-gradient(145deg, #043d2f 0%, #064e3b 60%, #065f46 100%)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Header compacto */}
            <div className="flex items-center justify-between gap-2 p-3 sm:p-3.5 pb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="flex-shrink-0 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-white text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
                    animation: urgente ? 'pulse 1.5s infinite' : undefined,
                  }}
                >
                  📣
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-white text-xs sm:text-sm tracking-tight truncate">
                      Mensaje de Nuevo Mes
                    </p>
                    <span
                      className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0"
                      style={{
                        background: urgente
                          ? 'rgba(239, 68, 68, 0.3)'
                          : 'rgba(52, 211, 153, 0.25)',
                        color: urgente ? '#fca5a5' : '#6ee7b7',
                        border: `1px solid ${urgente ? 'rgba(239,68,68,0.4)' : 'rgba(52,211,153,0.35)'}`,
                      }}
                    >
                      <Calendar size={8} />
                      {urgente ? 'Hoy' : `${diasRestantes}d`}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-emerald-300/90 truncate">
                    Próximo mes: <span className="font-semibold text-emerald-200">{getProximoMesNombre()}</span>
                  </p>
                </div>
              </div>

              {/* Botón cerrar/minimizar (guarda en localStorage) */}
              <button
                onClick={handleCerrar}
                className="flex-shrink-0 p-1 rounded-lg text-emerald-300/80 hover:text-white hover:bg-emerald-800/40 transition-colors cursor-pointer"
                title="Minimizar (podes volver a abrirlo)"
                id="mensual-reminder-close-btn"
              >
                <X size={15} />
              </button>
            </div>

            {/* Toggle ver/ocultar texto predefinido */}
            <div className="px-3 sm:px-3.5 pb-2">
              <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] text-emerald-200/90 cursor-pointer transition-all hover:text-white hover:bg-black/20"
                style={{
                  background: 'rgba(0,0,0,0.18)',
                  border: '1px solid rgba(52,211,153,0.15)',
                }}
                id="mensual-reminder-expand-btn"
              >
                <span className="font-medium">
                  {expanded ? 'Ocultar vista previa' : 'Ver mensaje completo'}
                </span>
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>

              {/* Preview del mensaje expandido */}
              {expanded && (
                <div
                  className="mt-1.5 rounded-lg p-2 sm:p-2.5 text-[10px] sm:text-[11px] text-emerald-100 leading-relaxed whitespace-pre-wrap font-mono"
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(52,211,153,0.2)',
                    maxHeight: '140px',
                    overflowY: 'auto',
                  }}
                >
                  {MENSAJE_MENSUAL}
                </div>
              )}
            </div>

            {/* Botones de acción */}
            <div className="px-3 sm:px-3.5 pb-3 flex flex-col gap-1.5">
              {/* Botón principal Copiar */}
              <button
                onClick={handleCopiar}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white transition-all active:scale-95 cursor-pointer shadow-md shadow-emerald-950/30"
                style={{
                  background: copied
                    ? 'linear-gradient(135deg, #059669, #10b981)'
                    : 'linear-gradient(135deg, #10b981, #059669)',
                }}
                id="mensual-reminder-copy-btn"
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    <span>¡Copiado al portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar mensaje</span>
                  </>
                )}
              </button>

              {/* Acciones secundarias */}
              <div className="flex gap-1.5">
                <button
                  onClick={handleEnviar}
                  disabled={isPublishing}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[10px] sm:text-[11px] font-bold text-white bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-400/40 transition-colors cursor-pointer disabled:opacity-50"
                  id="mensual-reminder-sent-btn"
                  title={`Publicar en Novedades (${getProximoMesNombre()}, Destacado, Información General)`}
                >
                  <Send size={11} className={isPublishing ? 'animate-spin' : ''} />
                  <span>{isPublishing ? 'Publicando...' : 'Enviar'}</span>
                </button>

                <button
                  onClick={handleSnooze}
                  className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] sm:text-[11px] font-semibold text-emerald-300/90 hover:text-white transition-colors cursor-pointer"
                  style={{
                    background: 'rgba(0,0,0,0.18)',
                    border: '1px solid rgba(52,211,153,0.15)',
                  }}
                  id="mensual-reminder-snooze-btn"
                  title="Posponer hasta mañana"
                >
                  <Bell size={11} />
                  <span>Mañana</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MensajeMensualReminder;
