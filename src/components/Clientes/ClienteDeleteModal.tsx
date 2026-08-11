// src/components/Clientes/ClienteDeleteModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Cliente } from '../../types';
import { AlertCircle, Trash2, ChevronsRight, Check } from 'lucide-react';

interface ClienteDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onConfirmDelete: (id: string) => void;
}

export const ClienteDeleteModal: React.FC<ClienteDeleteModalProps> = ({
  isOpen,
  onClose,
  cliente,
  onConfirmDelete
}) => {
  const [confirmCheck, setConfirmCheck] = useState<boolean>(false);
  const [dragX, setDragX] = useState<number>(0);
  const [maxDrag, setMaxDrag] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Recalcular maxDrag al abrir o al cambiar confirmCheck
  useEffect(() => {
    if (isOpen) {
      setConfirmCheck(false);
      setDragX(0);
      setIsDragging(false);
      setIsUnlocked(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const available = rect.width - 48 - 8; // 48px ancho botón, 4px padding a cada lado
      if (available > 0) {
        setMaxDrag(available);
      }
    }
  }, [isOpen, confirmCheck]);

  const updateDragPosition = (clientX: number) => {
    if (!trackRef.current || !confirmCheck || isUnlocked) return;
    const rect = trackRef.current.getBoundingClientRect();
    const availableWidth = rect.width - 48 - 8;
    if (availableWidth <= 0) return;
    
    // Posición del mouse/touch relativa al borde izquierdo del track (descontando padding de 4px y mitad de botón 24px)
    const rawX = clientX - rect.left - 4 - 24;
    const clampedX = Math.max(0, Math.min(rawX, availableWidth));
    
    setDragX(clampedX);
    setMaxDrag(availableWidth);

    // Al llegar al 85% o más, desbloquea la eliminación
    if (clampedX >= availableWidth * 0.85) {
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
      if (isDragging) {
        updateDragPosition(e.clientX);
      }
    };
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (!isUnlocked) {
          setDragX(0);
        }
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
        if (!isUnlocked) {
          setDragX(0);
        }
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

  if (!isOpen || !cliente) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 z-[60] flex items-center justify-center p-4 backdrop-blur-sm font-sans" id="confirm-delete-double-modal">
      <div className="bg-white rounded-2xl shadow-2xl border border-red-100 w-full max-w-md overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="bg-red-50 border-b border-red-100 p-5 flex items-center gap-3">
          <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm font-black text-red-900 tracking-tight uppercase">Confirmar Baja Permanente</h4>
            <p className="text-[10px] text-red-500 font-mono -mt-0.5">Doble Verificación por Deslizamiento</p>
          </div>
        </div>

        {/* Body Info */}
        <div className="p-5 space-y-4">
          <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-3 text-xs font-sans">
            <span className="text-[10px] uppercase font-bold text-zinc-400 font-mono block">Socio Seleccionado</span>
            <span className="font-bold text-zinc-900 text-sm block">
              {cliente.apellido}, {cliente.nombre}
            </span>
            <span className="text-zinc-500 font-mono text-[10px] block mt-0.5">ID: {cliente.id} | Email: {cliente.email}</span>
          </div>

          <div className="text-xs text-zinc-600 leading-relaxed space-y-2 bg-red-50/40 p-3 rounded-lg border border-red-100/50 font-sans">
            <p className="font-bold text-red-950">⚠️ ADVERTENCIA DE SEGURIDAD CRÍTICA:</p>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-700 font-sans">
              <li>Se eliminará permanentemente de la base de datos de <strong>KAHA GYM</strong>.</li>
              <li>Se <strong>desasignarán automáticamente</strong> todos sus turnos fijos y variables reservados.</li>
              <li>Esta operación es <strong>absolutamente irreversible</strong> y no se puede deshacer.</li>
            </ul>
          </div>

          {/* Paso 1: Checkbox */}
          <div className="pt-2 font-sans">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
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
                className="w-4.5 h-4.5 accent-red-600 rounded border-zinc-300 mt-0.5 cursor-pointer"
                id="checkbox-confirm-delete"
              />
              <span className="text-[11px] font-bold text-zinc-800 leading-tight">
                Paso 1: Comprendo y declaro conocer que liberar sus turnos es definitivo.
              </span>
            </label>
          </div>

          {/* Paso 2: Deslizar para Eliminar */}
          <div className="space-y-2 font-sans">
            <label className="block text-[11px] font-bold text-zinc-800 flex justify-between items-center">
              <span>Paso 2: Mantén pulsado y arrastra el botón a la derecha</span>
              {isUnlocked && (
                <span className="text-emerald-600 text-[10px] font-extrabold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Deslizado con éxito
                </span>
              )}
            </label>

            <div
              ref={trackRef}
              onMouseDown={(e) => handleStartDrag(e.clientX)}
              onTouchStart={(e) => {
                if (e.touches[0]) handleStartDrag(e.touches[0].clientX);
              }}
              className={`relative h-14 rounded-2xl p-1 select-none overflow-hidden transition-colors border cursor-pointer ${
                !confirmCheck
                  ? 'bg-zinc-100 border-zinc-200 opacity-50 cursor-not-allowed'
                  : isUnlocked
                  ? 'bg-red-600 border-red-700 shadow-md'
                  : 'bg-red-50/80 border-red-200 shadow-inner'
              }`}
              id="slide-delete-track"
            >
              {/* Progress Fill */}
              {confirmCheck && (
                <div
                  className={`absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-600 via-red-500 to-red-600 ${
                    isDragging ? '' : 'transition-all duration-300 ease-out'
                  }`}
                  style={{
                    width: isUnlocked ? '100%' : `${dragX + 28}px`
                  }}
                />
              )}

              {/* Text overlay */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs font-bold font-sans transition-opacity duration-150"
                style={{
                  opacity: isUnlocked ? 1 : Math.max(0, 1 - (maxDrag > 0 ? dragX / (maxDrag * 0.5) : 0))
                }}
              >
                {!confirmCheck ? (
                  <span className="text-zinc-400">Marca la casilla del Paso 1 primero</span>
                ) : isUnlocked ? (
                  <span className="text-white flex items-center gap-1.5 font-extrabold text-xs tracking-wide">
                    <Check className="w-4 h-4 text-white" /> ¡Listo! Tocá "Eliminar Permanente"
                  </span>
                ) : (
                  <span className="text-red-800/90 flex items-center gap-1.5 font-bold">
                    Desliza para autorizar <ChevronsRight className="w-4 h-4 text-red-600 animate-pulse" />
                  </span>
                )}
              </div>

              {/* Sliding Handle Thumb */}
              {confirmCheck && (
                <div
                  className={`absolute top-1 bottom-1 w-12 rounded-xl bg-white shadow-md border border-red-200 flex items-center justify-center cursor-grab active:cursor-grabbing ${
                    isDragging ? 'scale-105 shadow-xl border-red-400 cursor-grabbing' : ''
                  }`}
                  style={{
                    transform: `translate3d(${isUnlocked ? maxDrag : dragX}px, 0, 0)`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    touchAction: 'none'
                  }}
                  id="slide-delete-handle"
                >
                  {isUnlocked ? (
                    <Check className="w-5 h-5 text-emerald-600 font-bold" />
                  ) : (
                    <Trash2 className={`w-5 h-5 text-red-600 transition-transform ${isDragging ? 'rotate-12 scale-110' : ''}`} />
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="bg-zinc-50 px-5 py-4 border-t border-zinc-100 flex gap-3 font-sans">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold rounded-xl text-xs transition-all cursor-pointer border border-zinc-300 !py-2.5"
            id="btn-cancel-hard-delete"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!confirmCheck || !isUnlocked}
            onClick={() => {
              if (confirmCheck && isUnlocked && cliente) {
                onConfirmDelete(cliente.id);
                onClose();
              }
            }}
            className={`flex-1 font-bold rounded-xl text-xs border transition-all cursor-pointer !py-2.5 flex items-center justify-center gap-1.5 ${
              confirmCheck && isUnlocked
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-lg shadow-red-500/25 animate-pulse'
                : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
            }`}
            id="btn-confirm-hard-delete-action"
          >
            {confirmCheck && isUnlocked && <Trash2 className="w-3.5 h-3.5" />}
            Eliminar Permanente
          </button>
        </div>

      </div>
    </div>
  );
};
