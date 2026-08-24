// src/components/Pagos/PagoEditModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGym } from '../../GymContext';
import { Pago, MedioPago } from '../../types';
import { X, Search, Edit3, Check, AlertCircle } from 'lucide-react';

interface PagoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  pago: Pago | null;
  onSuccess?: () => void;
}

export const PagoEditModal: React.FC<PagoEditModalProps> = ({
  isOpen,
  onClose,
  pago,
  onSuccess
}) => {
  const { clientes, planes, actualizarPago } = useGym();

  const [clienteId, setClienteId] = useState('');
  const [monto, setMonto] = useState('');
  const [mesCorrespondiente, setMesCorrespondiente] = useState('');
  const [medioPago, setMedioPago] = useState<MedioPago>('TRANSFERENCIA');
  const [destinoTransferencia, setDestinoTransferencia] = useState<'JUANCHI' | 'RULO' | 'EFECTIVO'>('RULO');
  const [hashTransaccion, setHashTransaccion] = useState('');

  const [searchText, setSearchText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar estado cuando se abre el modal con un pago
  useEffect(() => {
    if (pago && isOpen) {
      setClienteId(pago.cliente_id);
      setMonto(pago.monto.toString());
      setMesCorrespondiente(pago.mes_correspondiente);
      setMedioPago(pago.medio_pago);
      const dest = pago.destino_transferencia as 'JUANCHI' | 'RULO' | 'EFECTIVO';
      setDestinoTransferencia(dest || 'RULO');
      setHashTransaccion(pago.hash_transaccion || '');

      const cl = clientes.find(c => c.id === pago.cliente_id);
      if (cl) {
        setSearchText(`${cl.apellido}, ${cl.nombre}`);
      } else {
        setSearchText(pago.cliente_nombre_completo || '');
      }

      setErrorMsg('');
      setSuccessMsg('');
      setIsSubmitting(false);
      setIsDropdownOpen(false);
    }
  }, [pago, isOpen, clientes]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Click fuera para cerrar dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clientes filtrados por búsqueda
  const clientOptions = useMemo(() => {
    const activeClients = clientes.filter(c => c.activo);
    if (!searchText.trim()) return activeClients;
    const term = searchText.toLowerCase().trim();
    return activeClients.filter(c =>
      c.nombre.toLowerCase().includes(term) ||
      c.apellido.toLowerCase().includes(term) ||
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(term) ||
      `${c.apellido} ${c.nombre}`.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  }, [clientes, searchText]);

  if (!isOpen || !pago) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!clienteId) {
      setErrorMsg('Seleccioná el socio correspondiente.');
      return;
    }

    const parsedMonto = parseFloat(monto);
    if (isNaN(parsedMonto) || parsedMonto <= 0) {
      setErrorMsg('El monto debe ser un número mayor a 0.');
      return;
    }

    if (!mesCorrespondiente) {
      setErrorMsg('Ingresá el mes cubierto por el pago.');
      return;
    }

    setIsSubmitting(true);

    const res = actualizarPago(pago.id, {
      cliente_id: clienteId,
      monto: parsedMonto,
      mes_correspondiente: mesCorrespondiente,
      medio_pago: medioPago,
      destino_transferencia: destinoTransferencia,
      hash_transaccion: hashTransaccion.trim()
    });

    if (res.success) {
      setSuccessMsg('Pago modificado correctamente.');
      setTimeout(() => {
        setIsSubmitting(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } else {
      setIsSubmitting(false);
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs" id="pago-edit-modal">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-zinc-800 text-lime-400 rounded-xl border border-zinc-700">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Editar Cobro Registrado</h3>
              <p className="text-[10px] text-zinc-400">Modificá el socio, monto, mes o destino del pago</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl font-medium border border-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl font-semibold border border-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. BUSCADOR DE SOCIO */}
          <div className="space-y-1 relative" ref={dropdownRef}>
            <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">
              Socio / Titular del Abono *
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre o apellido..."
                value={searchText}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className="w-full pl-9 pr-8 py-2 border border-zinc-200 rounded-lg text-xs bg-white outline-hidden focus:border-black font-semibold text-zinc-900"
                id="edit-pago-cliente-search"
              />
              {clienteId && (
                <button
                  type="button"
                  onClick={() => {
                    setClienteId('');
                    setSearchText('');
                    setIsDropdownOpen(true);
                  }}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-700 p-0.5 rounded-full hover:bg-zinc-100 cursor-pointer border-none bg-transparent"
                  title="Limpiar selección"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown popup */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-zinc-100">
                {clientOptions.length === 0 ? (
                  <div className="p-3 text-center text-zinc-400 italic text-xs">No se encontraron socios activos</div>
                ) : (
                  clientOptions.map(c => {
                    const pl = planes.find(p => p.id === c.plan_id);
                    const isSelected = c.id === clienteId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setClienteId(c.id);
                          setSearchText(`${c.apellido}, ${c.nombre}`);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 hover:bg-zinc-50 flex items-center justify-between transition-colors cursor-pointer text-xs ${
                          isSelected ? 'bg-zinc-100 font-bold' : ''
                        }`}
                      >
                        <div>
                          <span className="font-bold text-zinc-900 block">{c.apellido}, {c.nombre}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">Plan: {pl ? pl.nombre : 'Sin plan'}</span>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Seleccionado
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 2. MONTO Y MES CUBIERTO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">
                Monto Abonado (ARS) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-zinc-400 font-mono font-bold text-xs">$</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={monto}
                  onChange={e => setMonto(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 border border-zinc-200 rounded-lg text-xs font-mono font-bold text-emerald-600 bg-white outline-hidden focus:border-black"
                  placeholder="ej: 35000"
                  id="edit-pago-monto"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">
                Mes Cubierto *
              </label>
              <div className="relative">
                <input
                  type="month"
                  required
                  value={mesCorrespondiente}
                  onChange={e => setMesCorrespondiente(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs font-mono font-semibold text-zinc-800 bg-white outline-hidden focus:border-black"
                  id="edit-pago-mes"
                />
              </div>
            </div>
          </div>

          {/* 3. VIA DE PAGO Y DESTINO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">
                Vía de Pago
              </label>
              <select
                value={medioPago}
                onChange={e => setMedioPago(e.target.value as MedioPago)}
                className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium cursor-pointer"
                id="edit-pago-medio"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="UALA">Uala</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">
                Ref / ID Transacción
              </label>
              <input
                type="text"
                placeholder="ej: MP-90382211"
                value={hashTransaccion}
                onChange={e => setHashTransaccion(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg p-2 text-xs font-mono outline-hidden focus:border-black font-medium"
                id="edit-pago-hash"
              />
            </div>
          </div>

          {/* 4. DESTINO CAJA */}
          <div className="space-y-1.5 pt-1">
            <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">
              Destino de Caja (Juanchi / Rulo / Efectivo)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['RULO', 'JUANCHI', 'EFECTIVO'] as const).map(dest => (
                <button
                  key={dest}
                  type="button"
                  onClick={() => setDestinoTransferencia(dest)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    destinoTransferencia === dest
                      ? dest === 'JUANCHI'
                        ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                        : dest === 'EFECTIVO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                  }`}
                  id={`btn-edit-destino-${dest.toLowerCase()}`}
                >
                  {dest === 'JUANCHI' ? '🟣 Juanchi' : dest === 'EFECTIVO' ? '💵 Efectivo' : '🟡 Rulo'}
                </button>
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-zinc-100 flex justify-end gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all cursor-pointer bg-white text-zinc-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-all font-bold shadow-xs cursor-pointer border-none flex items-center gap-1.5 disabled:opacity-50"
              id="btn-save-edit-pago"
            >
              <Check className="w-3.5 h-3.5 text-lime-400" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
