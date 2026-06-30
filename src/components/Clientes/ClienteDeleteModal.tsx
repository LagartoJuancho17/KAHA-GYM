// src/components/Clientes/ClienteDeleteModal.tsx
import React, { useState, useEffect } from 'react';
import { Cliente } from '../../types';
import { AlertCircle } from 'lucide-react';

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
  const [confirmText, setConfirmText] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setConfirmCheck(false);
      setConfirmText('');
    }
  }, [isOpen]);

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
            <p className="text-[10px] text-red-500 font-mono -mt-0.5">Doble Verificación de Seguridad</p>
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
                onChange={(e) => setConfirmCheck(e.target.checked)}
                className="w-4.5 h-4.5 accent-red-600 rounded border-zinc-300 mt-0.5 cursor-pointer"
                id="checkbox-confirm-delete"
              />
              <span className="text-[11px] font-bold text-zinc-800 leading-tight">
                Paso 1: Comprendo y declaro conocer que liberar sus turnos es definitivo.
              </span>
            </label>
          </div>

          {/* Paso 2: Escribir ELIMINAR */}
          <div className="space-y-1.5 transition-all font-sans">
            <label className="block text-[11px] font-bold text-zinc-800">
              Paso 2: Escribe la palabra <span className="font-extrabold text-red-600 font-mono text-xs">ELIMINAR</span> para autorizar:
            </label>
            <input
              type="text"
              placeholder="Escribe ELIMINAR para proceder..."
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-white border border-red-200 focus:ring-1 focus:ring-red-500 rounded-xl p-2.5 font-mono text-xs font-bold text-center text-red-900 tracking-wider placeholder:normal-case uppercase"
              id="input-confirm-delete-word"
            />
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
            disabled={!confirmCheck || confirmText !== 'ELIMINAR'}
            onClick={() => {
              onConfirmDelete(cliente.id);
              onClose();
            }}
            className={`flex-1 font-bold rounded-xl text-xs border transition-all cursor-pointer !py-2.5 ${
              confirmCheck && confirmText === 'ELIMINAR'
                ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-xs'
                : 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed'
            }`}
            id="btn-confirm-hard-delete-action"
          >
            Eliminar Permanente
          </button>
        </div>

      </div>
    </div>
  );
};
