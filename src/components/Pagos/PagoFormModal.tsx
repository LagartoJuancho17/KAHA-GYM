// src/components/Pagos/PagoFormModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGym } from '../../GymContext';
import { MedioPago } from '../../types';
import { X, Trash2, Search, Users, Check } from 'lucide-react';

interface PagoFormModalProps {
  onClose: () => void;
  onSuccess: (generatedReceipts: any[]) => void;
}

export const PagoFormModal: React.FC<PagoFormModalProps> = ({ onClose, onSuccess }) => {
  const { clientes, planes, registrarPago } = useGym();

  const [pagoForm, setPagoForm] = useState({
    cliente_id: '',
    medio_pago: 'TRANSFERENCIA' as MedioPago,
    mes_correspondiente: new Date().toISOString().slice(0, 7),
    hash_transaccion: '',
    destino_transferencia: 'RULO' as 'JUANCHI' | 'RULO' | 'EFECTIVO'
  });
  
  const [esPagoMultiple, setEsPagoMultiple] = useState(false);
  const [beneficiarios, setBeneficiarios] = useState<Array<{ cliente_id: string, monto: string, mes_correspondiente: string }>>([]);
  const [formErr, setFormErr] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Búsqueda en pagador (Quién Abona)
  const [searchPagadorText, setSearchPagadorText] = useState('');
  const [isPagadorDropdownOpen, setIsPagadorDropdownOpen] = useState(false);
  const pagadorRef = useRef<HTMLDivElement>(null);

  // Búsqueda en beneficiario adicional
  const [searchBeneficiarioText, setSearchBeneficiarioText] = useState('');
  const [isBeneficiarioDropdownOpen, setIsBeneficiarioDropdownOpen] = useState(false);
  const beneficiarioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Click fuera para cerrar los dropdowns de búsqueda
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pagadorRef.current && !pagadorRef.current.contains(e.target as Node)) {
        setIsPagadorDropdownOpen(false);
      }
      if (beneficiarioRef.current && !beneficiarioRef.current.contains(e.target as Node)) {
        setIsBeneficiarioDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Opciones filtradas para Pagador
  const pagadorOptions = useMemo(() => {
    const activeClients = clientes.filter(c => c.activo);
    if (!searchPagadorText.trim()) return activeClients;
    const term = searchPagadorText.toLowerCase().trim();
    return activeClients.filter(c => 
      c.nombre.toLowerCase().includes(term) ||
      c.apellido.toLowerCase().includes(term) ||
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(term) ||
      `${c.apellido} ${c.nombre}`.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  }, [clientes, searchPagadorText]);

  // Opciones filtradas para Beneficiario Adicional
  const beneficiarioOptions = useMemo(() => {
    const activeClients = clientes.filter(c => c.activo);
    if (!searchBeneficiarioText.trim()) return activeClients;
    const term = searchBeneficiarioText.toLowerCase().trim();
    return activeClients.filter(c => 
      c.nombre.toLowerCase().includes(term) ||
      c.apellido.toLowerCase().includes(term) ||
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(term) ||
      `${c.apellido} ${c.nombre}`.toLowerCase().includes(term) ||
      (c.email && c.email.toLowerCase().includes(term))
    );
  }, [clientes, searchBeneficiarioText]);

  const handleClientSelect = (clientId: string) => {
    const cl = clientes.find(c => c.id === clientId);
    if (!cl) return;
    const plan = planes.find(p => p.id === cl.plan_id);
    const planPrecio = cl.precio_personalizado ?? (plan ? plan.precio : 0);
    setPagoForm(prev => ({ ...prev, cliente_id: clientId }));
    
    // Si no es pago múltiple, el pagador es el único beneficiario
    if (!esPagoMultiple) {
      setBeneficiarios([{ cliente_id: clientId, monto: planPrecio.toString(), mes_correspondiente: pagoForm.mes_correspondiente }]);
    } else {
      // Si es pago múltiple y no hay ninguno, agregar al pagador primero
      if (beneficiarios.length === 0) {
        setBeneficiarios([{ cliente_id: clientId, monto: planPrecio.toString(), mes_correspondiente: pagoForm.mes_correspondiente }]);
      }
    }
  };

  const handleAddBeneficiary = (clientId: string) => {
    if (!clientId) return;
    if (beneficiarios.some(b => b.cliente_id === clientId)) {
      setFormErr('El socio ya está agregado como beneficiario.');
      return;
    }
    const cl = clientes.find(c => c.id === clientId);
    if (!cl) return;
    const plan = planes.find(p => p.id === cl.plan_id);
    const planPrecio = cl.precio_personalizado ?? (plan ? plan.precio : 0);
    setBeneficiarios(prev => [...prev, { cliente_id: clientId, monto: planPrecio.toString(), mes_correspondiente: pagoForm.mes_correspondiente }]);
    setFormErr('');
  };

  const handleManualPagoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');
    setFormSuccess('');
    if (!pagoForm.cliente_id) { setFormErr('Por favor seleccione quién abona la transacción.'); return; }
    if (beneficiarios.length === 0) { setFormErr('Debe ingresar al menos un beneficiario para el pago.'); return; }

    for (let i = 0; i < beneficiarios.length; i++) {
      const b = beneficiarios[i];
      const parsedMonto = parseFloat(b.monto);
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        const c = clientes.find(x => x.id === b.cliente_id);
        setFormErr(`El monto para ${c ? c.nombre + ' ' + c.apellido : 'el socio'} debe ser mayor a 0 pesos.`);
        return;
      }
      if (!b.mes_correspondiente) { setFormErr('Todos los beneficiarios deben tener un mes asignado.'); return; }
    }

    const finalHash = pagoForm.hash_transaccion.trim() || `MP-${Date.now()}`;
    const results: any[] = [];
    const generatedReceipts: any[] = [];

    beneficiarios.forEach((b) => {
      const parsedMonto = parseFloat(b.monto);
      const res = registrarPago({
        cliente_id: b.cliente_id,
        cliente_nombre_completo: '',
        monto: parsedMonto,
        medio_pago: pagoForm.medio_pago,
        mes_correspondiente: b.mes_correspondiente,
        hash_transaccion: finalHash,
        destino_transferencia: pagoForm.destino_transferencia,
        registrado_por: 'operator@gimnasio.com.ar'
      }, 'operator@gimnasio.com.ar');
      results.push(res);

      const clObj = clientes.find(c => c.id === b.cliente_id);
      if (clObj) {
        const nombre = clObj.nombre;
        let textMsg = '';
        if (clObj.tipo === 'FIJO' && clObj.turnos_fijos.length > 0) {
          const turnosStr = clObj.turnos_fijos.map(tfId => {
            const parts = tfId.split('-');
            return `${parts[0]} ${parts[1] || '00:00'}hs`;
          }).join(', ');
          textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${parsedMonto.toLocaleString('es-AR')} correspondiente al mes de ${b.mes_correspondiente} para la actividad física en KAHA BOX. ¡Muchas gracias por tu compromiso! Tus turnos fijos son ${turnosStr}. Recordá darte de baja del turno cuando sepas que no vas a venir, así podemos liberar el lugar.`;
        } else {
          textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${parsedMonto.toLocaleString('es-AR')} correspondiente al mes de ${b.mes_correspondiente} para la actividad física en KAHA BOX. ¡Muchas gracias por tu compromiso! Recordá darte de baja del turno cuando sepas que no vas a venir, así podemos liberar el lugar.`;
        }
        generatedReceipts.push({ cliente_nombre: `${clObj.apellido}, ${clObj.nombre}`, messageText: textMsg, telefono: clObj.telefono || '5491123456789', copiado: false });
      }
    });

    const failed = results.find(r => !r.success);
    if (failed) {
      setFormErr(failed.message);
    } else {
      setFormSuccess('Cobro registrado exitosamente.');
      setPagoForm({ cliente_id: '', medio_pago: 'TRANSFERENCIA', mes_correspondiente: new Date().toISOString().slice(0, 7), hash_transaccion: '', destino_transferencia: 'RULO' });
      setBeneficiarios([]);
      setSearchPagadorText('');
      setSearchBeneficiarioText('');
      setEsPagoMultiple(false);
      setTimeout(() => {
        onSuccess(generatedReceipts);
        setFormSuccess('');
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans" id="payment-form-modal">
      <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-xl overflow-hidden text-xs">
        <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
          <div>
            <h3 className="text-base font-bold tracking-tight">Cargar Transacción Contable</h3>
            <p className="text-[10px] text-zinc-400">Permite registrar cobros individuales o agrupados</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer" id="btn-close-payment">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleManualPagoSubmit} className="p-5 space-y-4">
          {formErr && <div className="bg-red-50 text-red-700 p-2.5 rounded-lg font-medium border border-red-200">{formErr}</div>}
          {formSuccess && <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-semibold border border-emerald-200">{formSuccess}</div>}
          
          {/* BUSCADOR DE QUIÉN ABONA */}
          <div className="space-y-1 relative" ref={pagadorRef}>
            <label className="text-zinc-500 font-bold block text-[10px] uppercase">Quién Abona (Pagador)</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Escribí para buscar por nombre o apellido..."
                value={searchPagadorText}
                onFocus={() => setIsPagadorDropdownOpen(true)}
                onChange={(e) => {
                  setSearchPagadorText(e.target.value);
                  setIsPagadorDropdownOpen(true);
                }}
                className="w-full pl-9 pr-8 py-2 border border-zinc-200 rounded-lg text-xs bg-white outline-hidden focus:border-black font-medium"
                id="pago-cliente-search-input"
              />
              {pagoForm.cliente_id && (
                <button
                  type="button"
                  onClick={() => {
                    setPagoForm(prev => ({ ...prev, cliente_id: '' }));
                    setSearchPagadorText('');
                    setBeneficiarios([]);
                    setIsPagadorDropdownOpen(true);
                  }}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-700 p-0.5 rounded-full hover:bg-zinc-100 cursor-pointer border-none bg-transparent"
                  title="Limpiar selección"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown popup para Pagador */}
            {isPagadorDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-zinc-100">
                {pagadorOptions.length === 0 ? (
                  <div className="p-3 text-center text-zinc-400 italic text-xs">No se encontraron socios que coincidan</div>
                ) : (
                  pagadorOptions.map(c => {
                    const pl = planes.find(p => p.id === c.plan_id);
                    const isSelected = c.id === pagoForm.cliente_id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          handleClientSelect(c.id);
                          setSearchPagadorText(`${c.apellido}, ${c.nombre}`);
                          setIsPagadorDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 hover:bg-zinc-50 flex items-center justify-between transition-colors cursor-pointer text-xs ${
                          isSelected ? 'bg-zinc-100 font-bold' : ''
                        }`}
                      >
                        <div>
                          <span className="font-bold text-zinc-900 block">{c.apellido}, {c.nombre}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">Plan: {pl ? pl.nombre : 'Sin plan'}</span>
                        </div>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${c.deuda_acumulada > 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                          {c.deuda_acumulada > 0 ? `Deuda: $${c.deuda_acumulada}` : 'Al día'}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* OPCIÓN: PAGO MÚLTIPLE O DIFERENTE BENEFICIARIO */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-700 font-bold">
              <input
                type="checkbox"
                checked={esPagoMultiple}
                onChange={(e) => {
                  const val = e.target.checked;
                  setEsPagoMultiple(val);
                  if (!val && pagoForm.cliente_id) {
                    const cl = clientes.find(c => c.id === pagoForm.cliente_id);
                    const plan = planes.find(p => p.id === cl?.plan_id);
                    const planPrecio = cl?.precio_personalizado ?? (plan ? plan.precio : 0);
                    setBeneficiarios([{
                      cliente_id: pagoForm.cliente_id,
                      monto: planPrecio.toString(),
                      mes_correspondiente: pagoForm.mes_correspondiente
                    }]);
                  }
                }}
                className="w-4 h-4 accent-black rounded border-zinc-300 cursor-pointer"
                id="chk-pago-multiple"
              />
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                Pagar por otro socio o grupo (ej: familiar, múltiples beneficiarios)
              </span>
            </label>
          </div>

          {/* BUSCADOR DE BENEFICIARIO ADICIONAL (SOLO SI SE MARCA EL CHECKBOX) */}
          {esPagoMultiple && (
            <div className="space-y-1 relative pt-1" ref={beneficiarioRef}>
              <label className="text-zinc-500 font-bold block text-[10px] uppercase">Agregar Alumno Beneficiario</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar y agregar otro alumno beneficiario..."
                  value={searchBeneficiarioText}
                  onFocus={() => setIsBeneficiarioDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchBeneficiarioText(e.target.value);
                    setIsBeneficiarioDropdownOpen(true);
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-xs bg-white outline-hidden focus:border-black font-medium"
                  id="add-beneficiary-search-input"
                />
              </div>

              {isBeneficiarioDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-zinc-100">
                  {beneficiarioOptions.length === 0 ? (
                    <div className="p-3 text-center text-zinc-400 italic text-xs">No hay socios que coincidan</div>
                  ) : (
                    beneficiarioOptions.map(c => {
                      const pl = planes.find(p => p.id === c.plan_id);
                      const yaAgregado = beneficiarios.some(b => b.cliente_id === c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          disabled={yaAgregado}
                          onClick={() => {
                            handleAddBeneficiary(c.id);
                            setSearchBeneficiarioText('');
                            setIsBeneficiarioDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2.5 hover:bg-zinc-50 flex items-center justify-between transition-colors text-xs ${
                            yaAgregado ? 'opacity-40 cursor-not-allowed bg-zinc-50' : 'cursor-pointer'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-zinc-900 block">{c.apellido}, {c.nombre}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">Plan: {pl ? pl.nombre : 'Sin plan'}</span>
                          </div>
                          {yaAgregado && <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Ya agregado</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* BENEFICIARIOS TABLE */}
          <div className="space-y-2">
            <label className="text-zinc-500 font-bold block text-[10px] uppercase">Detalle de Socios Cubiertos</label>
            {beneficiarios.length === 0 ? (
              <div className="border border-dashed border-zinc-200 rounded-lg p-4 text-center text-zinc-400 italic">No se han seleccionado destinatarios aún.</div>
            ) : (
              <div className="border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50 max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead><tr className="bg-zinc-100 text-zinc-600 font-bold border-b border-zinc-200 text-[10px] uppercase"><th className="p-2">Socio</th><th className="p-2 w-32">Mes</th><th className="p-2 w-28">Monto</th><th className="p-2 text-center w-10"></th></tr></thead>
                  <tbody className="divide-y divide-zinc-200">
                    {beneficiarios.map((b, idx) => {
                      const cl = clientes.find(c => c.id === b.cliente_id);
                      return (
                        <tr key={b.cliente_id}>
                          <td className="p-2 font-semibold text-zinc-900">{cl ? `${cl.apellido}, ${cl.nombre}` : 'Desconocido'}</td>
                          <td className="p-2"><input type="month" required value={b.mes_correspondiente} onChange={e => setBeneficiarios(prev => prev.map((x, i) => i === idx ? { ...x, mes_correspondiente: e.target.value } : x))} className="w-full border border-zinc-200 rounded-md p-1 bg-white font-mono text-xs outline-hidden" /></td>
                          <td className="p-2"><div className="relative"><span className="absolute left-1.5 top-1 text-zinc-400 font-mono text-[10px]">$</span><input type="number" required min="1" value={b.monto} onChange={e => setBeneficiarios(prev => prev.map((x, i) => i === idx ? { ...x, monto: e.target.value } : x))} className="w-full border border-zinc-200 rounded-md p-1 pl-4 bg-white font-mono text-xs font-bold outline-hidden" /></div></td>
                          <td className="p-2 text-center"><button type="button" onClick={() => setBeneficiarios(prev => prev.filter((_, i) => i !== idx))} className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-md border-none bg-transparent cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-zinc-500 font-bold block text-[10px] uppercase">Vía de Pago</label>
              <select value={pagoForm.medio_pago} onChange={e => setPagoForm(prev => ({ ...prev, medio_pago: e.target.value as MedioPago }))} className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium">
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="UALA">Uala</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-violet-700 font-bold block text-[10px] uppercase">Destino (Juanchi / Rulo / Efectivo)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['RULO', 'JUANCHI', 'EFECTIVO'] as const).map(dest => (
                  <button
                    key={dest}
                    type="button"
                    onClick={() => setPagoForm(prev => ({ ...prev, destino_transferencia: dest }))}
                    className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      pagoForm.destino_transferencia === dest
                        ? dest === 'JUANCHI'
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : dest === 'EFECTIVO'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
                    }`}
                    id={`btn-destino-${dest.toLowerCase()}`}
                  >
                    {dest === 'JUANCHI' ? '🟣 Juanchi' : dest === 'EFECTIVO' ? '💵 Efectivo' : '🟡 Rulo'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-zinc-500 font-bold block text-[10px] uppercase">Ref / ID Transacción</label>
              <input type="text" placeholder="ej: MP-90382211 (opcional)" value={pagoForm.hash_transaccion} onChange={e => setPagoForm(prev => ({ ...prev, hash_transaccion: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2 text-xs font-mono outline-hidden font-medium" />
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg flex justify-between items-center text-xs">
            <span className="font-semibold text-zinc-500">Total de la Transacción:</span>
            <span className="font-mono font-bold text-emerald-600 text-sm">${beneficiarios.reduce((sum, b) => sum + (parseFloat(b.monto) || 0), 0).toLocaleString('es-AR')} ARS</span>
          </div>
          <div className="pt-4 border-t border-zinc-100 flex justify-end gap-2 text-xs font-semibold">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer bg-white">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-all font-semibold shadow-xs cursor-pointer border-none">Registrar Cobro ({beneficiarios.length} Socios)</button>
          </div>
        </form>
      </div>
    </div>
  );
};
