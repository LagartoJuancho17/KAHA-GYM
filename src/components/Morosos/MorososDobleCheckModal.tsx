// src/components/Morosos/MorososDobleCheckModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  AlertTriangle, X, Check, ChevronsRight, UserMinus, 
  UserCheck, Receipt, Clock, ShieldAlert, AlertCircle 
} from 'lucide-react';
import { Cliente } from '../../types';

export type TipoMovimientoMoroso = 
  | 'BAJA_TURNOS_FIJOS'
  | 'BAJA_SOCIO'
  | 'ALTA_SOCIO'
  | 'COBRO_MOROSIDAD'
  | 'EXENCION_COBRO'
  | 'BAJA_MASIVA_TURNOS';

export interface MorososDobleCheckConfig {
  tipo: TipoMovimientoMoroso;
  titulo?: string;
  subtitulo?: string;
  cliente?: Cliente | null;
  clientesMultiples?: Cliente[];
  detallesExtra?: {
    monto?: number;
    mes?: string;
    medio?: string;
    exencion?: string;
    turnosCount?: number;
    motivo?: string;
  };
  onConfirm: () => void | Promise<void>;
}

interface MorososDobleCheckModalProps {
  config: MorososDobleCheckConfig | null;
  onClose: () => void;
}

export const MorososDobleCheckModal: React.FC<MorososDobleCheckModalProps> = ({ config, onClose }) => {
  const [confirmCheck, setConfirmCheck] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [maxDrag, setMaxDrag] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const trackRef = useRef<HTMLDivElement>(null);

  // Reset al abrir o cambiar configuración
  useEffect(() => {
    setConfirmCheck(false);
    setIsUnlocked(false);
    setDragX(0);
    setIsDragging(false);
    setIsProcessing(false);
  }, [config]);

  // Recalcular dimensiones del slider
  useEffect(() => {
    if (trackRef.current && config) {
      const rect = trackRef.current.getBoundingClientRect();
      const available = rect.width - 48 - 8;
      if (available > 0) {
        setMaxDrag(available);
      }
    }
  }, [config, confirmCheck]);

  const updateDragPosition = (clientX: number) => {
    if (!trackRef.current || !confirmCheck || isUnlocked) return;
    const rect = trackRef.current.getBoundingClientRect();
    const availableWidth = rect.width - 48 - 8;
    if (availableWidth <= 0) return;

    const rawX = clientX - rect.left - 4 - 24;
    const clampedX = Math.max(0, Math.min(rawX, availableWidth));

    setDragX(clampedX);
    setMaxDrag(availableWidth);

    // Desbloqueo al superar el 80%
    if (clampedX >= availableWidth * 0.8) {
      setIsUnlocked(true);
      setDragX(availableWidth);
      setIsDragging(false);
    }
  };

  const handleStartDrag = (clientX: number) => {
    if (!confirmCheck || isUnlocked) return;
    setIsDragging(true);
    updateDragPosition(clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) updateDragPosition(e.clientX);
    };
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (!isUnlocked) setDragX(0);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        if (e.cancelable) e.preventDefault();
        updateDragPosition(e.touches[0].clientX);
      }
    };
    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
        if (!isUnlocked) setDragX(0);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      window.addEventListener('touchcancel', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isDragging, confirmCheck, isUnlocked]);

  if (!config) return null;

  const { tipo, cliente, clientesMultiples, detallesExtra, onConfirm } = config;

  // Metadata visual según tipo de movimiento
  const getThemeDetails = () => {
    switch (tipo) {
      case 'BAJA_TURNOS_FIJOS':
        return {
          colorClass: 'red',
          bgHeader: 'bg-red-50 border-red-100 text-red-950',
          badgeText: 'Baja de Turnos Fijos (Día 10+)',
          badgeClass: 'bg-red-100 text-red-700 border-red-200',
          icon: <UserMinus className="w-5 h-5 text-red-600" />,
          title: `¿Confirmar baja de turnos fijos a ${cliente?.nombre} ${cliente?.apellido}?`,
          desc: `Esta acción removerá al socio de sus ${cliente?.turnos_fijos?.length || 0} turno(s) fijo(s). Los cupos quedarán liberados inmediatamente para otros alumnos.`,
          step1Text: 'Paso 1: Confirmo que el socio adeuda su cuota y autorizo la liberación de sus turnos fijos.',
          btnConfirmText: 'Autorizar y Dar de Baja'
        };
      case 'BAJA_MASIVA_TURNOS':
        return {
          colorClass: 'red',
          bgHeader: 'bg-red-50 border-red-100 text-red-950',
          badgeText: 'Baja Masiva de Turnos',
          badgeClass: 'bg-red-100 text-red-700 border-red-200',
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          title: `¿Autorizar baja masiva para ${clientesMultiples?.length || 0} socio(s)?`,
          desc: `Se liberarán todos los turnos fijos asignados a los socios seleccionados y se promoverán las vacantes en lista de espera.`,
          step1Text: `Paso 1: Confirmo haber revisado el lote y autorizo la baja de los ${clientesMultiples?.length || 0} socios seleccionados.`,
          btnConfirmText: `Autorizar ${clientesMultiples?.length || 0} Bajas`
        };
      case 'BAJA_SOCIO':
        return {
          colorClass: 'rose',
          bgHeader: 'bg-rose-50 border-rose-100 text-rose-950',
          badgeText: 'Inactivación de Membresía',
          badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
          icon: <ShieldAlert className="w-5 h-5 text-rose-600" />,
          title: `¿Dar de baja del gimnasio a ${cliente?.nombre} ${cliente?.apellido}?`,
          desc: `El socio pasará a estado INACTIVO. Se revocarán sus accesos y reservas activas en el sistema.`,
          step1Text: 'Paso 1: Confirmo la inactivación de la cuenta del socio en KAHA GYM.',
          btnConfirmText: 'Autorizar Baja de Socio'
        };
      case 'ALTA_SOCIO':
        return {
          colorClass: 'emerald',
          bgHeader: 'bg-emerald-50 border-emerald-100 text-emerald-950',
          badgeText: 'Reactivación de Socio',
          badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          icon: <UserCheck className="w-5 h-5 text-emerald-600" />,
          title: `¿Dar de alta y reactivar a ${cliente?.nombre} ${cliente?.apellido}?`,
          desc: `El socio volverá a figurar como ACTIVO en el gimnasio, permitiéndole reservar clases y acceder a la plataforma.`,
          step1Text: 'Paso 1: Confirmo que la situación del socio está regularizada y autorizo su alta en el sistema.',
          btnConfirmText: 'Autorizar Alta de Socio'
        };
      case 'COBRO_MOROSIDAD':
        return {
          colorClass: 'emerald',
          bgHeader: 'bg-emerald-50 border-emerald-100 text-emerald-950',
          badgeText: 'Liquidación de Deuda',
          badgeClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
          icon: <Receipt className="w-5 h-5 text-emerald-600" />,
          title: `¿Autorizar cobro de $${detallesExtra?.monto?.toLocaleString('es-AR') || 0} ARS?`,
          desc: `Se registrará el pago para ${cliente?.nombre} ${cliente?.apellido} correspondiente al mes ${detallesExtra?.mes || 'actual'} (${detallesExtra?.medio || 'EFECTIVO'}) y se regularizará su saldo.`,
          step1Text: 'Paso 1: Confirmo la recepción efectiva de los fondos y autorizo liquidar la deuda.',
          btnConfirmText: 'Autorizar Cobranza'
        };
      case 'EXENCION_COBRO':
        return {
          colorClass: 'amber',
          bgHeader: 'bg-amber-50 border-amber-100 text-amber-950',
          badgeText: 'Excepción de Cobro',
          badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
          icon: <Clock className="w-5 h-5 text-amber-600" />,
          title: `¿Modificar excepción de cobro para ${cliente?.nombre} ${cliente?.apellido}?`,
          desc: `Nuevo estado de excepción: ${detallesExtra?.exencion || 'NINGUNA'}. Esto suspende o prorroga penalizaciones automáticas.`,
          step1Text: 'Paso 1: Autorizo expresamente esta excepción de cobro para el socio.',
          btnConfirmText: 'Autorizar Excepción'
        };
    }
  };

  const theme = getThemeDetails();

  const handleExecute = async () => {
    if (!confirmCheck || !isUnlocked || isProcessing) return;
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error('[DobleCheckModal] Error al ejecutar acción:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 z-[70] flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs font-sans animate-fade-in" id="morosos-doble-check-modal">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden animate-scale-in text-xs">
        
        {/* HEADER */}
        <div className={`p-4 sm:p-5 border-b flex items-start gap-3 justify-between ${theme.bgHeader}`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-xl shadow-2xs shrink-0 mt-0.5">
              {theme.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase border ${theme.badgeClass}`}>
                  {theme.badgeText}
                </span>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                  Doble Verificación
                </span>
              </div>
              <h4 className="font-bold text-sm sm:text-base text-zinc-950 mt-1 leading-snug">
                {config.titulo || theme.title}
              </h4>
            </div>
          </div>
          <button 
            onClick={onClose} 
            disabled={isProcessing}
            className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg bg-transparent border-none cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* DETALLES DEL SOCIO O LOTE */}
          {cliente && (
            <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-zinc-400">Socio Afectado</span>
                {cliente.deuda_acumulada > 0 && (
                  <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                    Deuda: ${cliente.deuda_acumulada.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
              <div className="font-bold text-sm text-zinc-900">
                {cliente.apellido}, {cliente.nombre}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-2 flex-wrap">
                <span>Email: {cliente.email || 'N/A'}</span>
                {cliente.turnos_fijos && cliente.turnos_fijos.length > 0 && (
                  <span>· Turnos: {cliente.turnos_fijos.join(', ')}</span>
                )}
              </div>
            </div>
          )}

          {clientesMultiples && clientesMultiples.length > 0 && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-zinc-500">Lote Seleccionado ({clientesMultiples.length} socios)</span>
                <span className="text-[10px] font-mono font-bold text-red-600">
                  Total Deuda: ${clientesMultiples.reduce((s, c) => s + (c.deuda_acumulada || 0), 0).toLocaleString('es-AR')}
                </span>
              </div>
              <div className="max-h-24 overflow-y-auto divide-y divide-zinc-200 text-[11px] font-medium text-zinc-700">
                {clientesMultiples.map(c => (
                  <div key={c.id} className="py-1 flex justify-between items-center">
                    <span className="truncate pr-2">{c.apellido}, {c.nombre}</span>
                    <span className="font-mono text-[10px] text-zinc-500 shrink-0">{c.turnos_fijos?.length || 0} turnos</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DESCRIPCIÓN DE IMPACTO */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1 text-amber-950">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Impacto en el sistema:</span>
            </div>
            <p className="text-zinc-700 pl-4">{config.subtitulo || theme.desc}</p>
          </div>

          {/* PASO 1: CHECKBOX OBLIGATORIO */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none bg-zinc-50 hover:bg-zinc-100 p-3 rounded-xl border border-zinc-200 transition-colors">
              <input
                type="checkbox"
                checked={confirmCheck}
                onChange={(e) => {
                  setConfirmCheck(e.target.checked);
                  if (!e.target.checked) {
                    setDragX(0);
                    setIsUnlocked(false);
                  }
                }}
                className="w-4 h-4 accent-black rounded border-zinc-300 mt-0.5 cursor-pointer shrink-0"
                id="checkbox-doble-check-moroso"
              />
              <span className="text-xs font-bold text-zinc-900 leading-tight">
                {theme.step1Text}
              </span>
            </label>
          </div>

          {/* PASO 2: DESLIZAR O TOCAR PARA AUTORIZAR */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold text-zinc-600 uppercase">
              <span>Paso 2: Desliza o toca para desbloquear autorización</span>
              {isUnlocked && (
                <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Desbloqueado
                </span>
              )}
            </div>

            <div
              ref={trackRef}
              onMouseDown={(e) => handleStartDrag(e.clientX)}
              onTouchStart={(e) => {
                if (e.touches[0]) handleStartDrag(e.touches[0].clientX);
              }}
              onClick={() => {
                // Atajo: si marcó Paso 1, tocar la barra desbloquea directamente
                if (confirmCheck && !isUnlocked) {
                  setIsUnlocked(true);
                  if (trackRef.current) {
                    const available = trackRef.current.getBoundingClientRect().width - 48 - 8;
                    setDragX(available);
                  }
                }
              }}
              className={`relative h-13 rounded-xl p-1 select-none overflow-hidden transition-all border cursor-pointer ${
                !confirmCheck
                  ? 'bg-zinc-100 border-zinc-200 opacity-50 cursor-not-allowed'
                  : isUnlocked
                  ? 'bg-emerald-600 border-emerald-700 shadow-md'
                  : 'bg-zinc-100 hover:bg-zinc-200/80 border-zinc-300 shadow-inner'
              }`}
              id="slider-track-morosos-doble-check"
            >
              {/* Relleno de progreso */}
              {confirmCheck && (
                <div
                  className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r from-zinc-900 to-zinc-700 ${
                    isDragging ? '' : 'transition-all duration-300 ease-out'
                  }`}
                  style={{
                    width: isUnlocked ? '100%' : `${dragX + 28}px`
                  }}
                />
              )}

              {/* Texto en barra */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-bold font-sans transition-opacity duration-150"
                style={{
                  opacity: isUnlocked ? 1 : Math.max(0, 1 - (maxDrag > 0 ? dragX / (maxDrag * 0.5) : 0))
                }}
              >
                {!confirmCheck ? (
                  <span className="text-zinc-400">Marca primero la casilla del Paso 1</span>
                ) : isUnlocked ? (
                  <span className="text-white flex items-center gap-1.5 font-extrabold text-xs tracking-wide">
                    <Check className="w-4 h-4 text-white" /> ¡Desbloqueado! Presiona confirmar abajo
                  </span>
                ) : (
                  <span className="text-zinc-700 flex items-center gap-1.5 font-bold">
                    Desliza o toca para autorizar <ChevronsRight className="w-4 h-4 text-zinc-500 animate-pulse" />
                  </span>
                )}
              </div>

              {/* Handle / Botón deslizante */}
              {confirmCheck && (
                <div
                  className={`absolute top-1 bottom-1 w-11 rounded-lg bg-white shadow-md border border-zinc-200 flex items-center justify-center cursor-grab active:cursor-grabbing ${
                    isDragging ? 'scale-105 shadow-xl border-zinc-400 cursor-grabbing' : ''
                  }`}
                  style={{
                    transform: `translate3d(${isUnlocked ? maxDrag : dragX}px, 0, 0)`,
                    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    touchAction: 'none'
                  }}
                  id="slider-handle-morosos-doble-check"
                >
                  {isUnlocked ? (
                    <Check className="w-4 h-4 text-emerald-600 font-bold" />
                  ) : (
                    <ChevronsRight className={`w-4 h-4 text-zinc-700 ${isDragging ? 'scale-110' : ''}`} />
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="bg-zinc-50 px-4 sm:p-5 py-3 border-t border-zinc-200 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-xl font-bold text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            disabled={!confirmCheck || !isUnlocked || isProcessing}
            onClick={handleExecute}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border-none cursor-pointer shadow-xs ${
              confirmCheck && isUnlocked && !isProcessing
                ? tipo.includes('BAJA')
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25 animate-pulse'
                  : 'bg-black hover:bg-zinc-800 text-white'
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
            }`}
            id="btn-confirmar-autorizacion-moroso"
          >
            {isProcessing ? (
              <span>Procesando...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{theme.btnConfirmText}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
