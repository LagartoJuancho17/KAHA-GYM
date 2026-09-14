// src/components/Pagos/PagoFormModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useGym } from '../../GymContext';
import { MedioPago } from '../../types';
import { X, Trash2, Search, Users, Check, Plus, Calendar } from 'lucide-react';
import {
  sincronizarMedioYDestino,
  validarPartes,
  restoSinAsignar,
  asignarPartesACobros,
  ParteDePago,
  DestinoPago
} from '../../lib/pagoDividido';

interface PagoFormModalProps {
  onClose: () => void;
  onSuccess: (generatedReceipts: any[]) => void;
}

interface BeneficiarioItem {
  id: string;
  cliente_id: string;
  monto: string;
  mes_correspondiente: string;
}

export const PagoFormModal: React.FC<PagoFormModalProps> = ({ onClose, onSuccess }) => {
  const { clientes, planes, registrarPagosMultiples } = useGym();

  const [pagoForm, setPagoForm] = useState({
    cliente_id: '',
    medio_pago: 'TRANSFERENCIA' as MedioPago,
    mes_correspondiente: new Date().toISOString().slice(0, 7),
    hash_transaccion: '',
    destino_transferencia: 'RULO' as 'JUANCHI' | 'RULO' | 'EFECTIVO'
  });
  
  const [esPagoMultiple, setEsPagoMultiple] = useState(false);
  const [beneficiarios, setBeneficiarios] = useState<BeneficiarioItem[]>([]);

  // Pago repartido en varios medios (ej: mitad efectivo, mitad transferencia).
  const [usaVariosMedios, setUsaVariosMedios] = useState(false);
  const [partes, setPartes] = useState<ParteDePago[]>([]);
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

  const genId = () => typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const totalACobrar = useMemo(
    () => beneficiarios.reduce((acc, b) => acc + (parseFloat(b.monto) || 0), 0),
    [beneficiarios]
  );
  const validacionPartes = useMemo(
    () => validarPartes(partes, totalACobrar),
    [partes, totalACobrar]
  );
  const resto = useMemo(() => restoSinAsignar(partes, totalACobrar), [partes, totalACobrar]);

  // Vía de pago y destino se mueven juntos: efectivo en uno implica efectivo en
  // el otro, y salir de efectivo por un lado saca al otro. Ver lib/pagoDividido.
  const cambiarMedioODestino = (
    cambio: { medio?: MedioPago; destino?: DestinoPago },
    campoTocado: 'medio' | 'destino'
  ) => {
    setPagoForm(prev => {
      const sincronizado = sincronizarMedioYDestino(
        {
          medio: cambio.medio ?? prev.medio_pago,
          destino: cambio.destino ?? prev.destino_transferencia
        },
        campoTocado
      );
      return { ...prev, medio_pago: sincronizado.medio, destino_transferencia: sincronizado.destino };
    });
  };

  const activarVariosMedios = (activar: boolean) => {
    setUsaVariosMedios(activar);
    setFormErr('');
    if (activar) {
      // Arranca con lo que ya estaba elegido como primer medio, así no se pierde
      // lo que el operador venía cargando.
      setPartes([
        { id: genId(), medio: pagoForm.medio_pago, destino: pagoForm.destino_transferencia, monto: totalACobrar }
      ]);
    } else {
      setPartes([]);
    }
  };

  const cambiarParte = (
    id: string,
    cambio: Partial<Pick<ParteDePago, 'medio' | 'destino' | 'monto'>>,
    campoTocado: 'medio' | 'destino' | 'monto'
  ) => {
    setPartes(prev => prev.map(p => {
      if (p.id !== id) return p;
      if (campoTocado === 'monto') return { ...p, monto: cambio.monto ?? 0 };
      const sincronizado = sincronizarMedioYDestino(
        { medio: cambio.medio ?? p.medio, destino: cambio.destino ?? p.destino },
        campoTocado
      );
      return { ...p, medio: sincronizado.medio, destino: sincronizado.destino };
    }));
  };

  const agregarParte = () => {
    setPartes(prev => [
      ...prev,
      { id: genId(), medio: 'TRANSFERENCIA', destino: 'RULO', monto: restoSinAsignar(prev, totalACobrar) }
    ]);
  };

  const quitarParte = (id: string) => {
    setPartes(prev => (prev.length <= 1 ? prev : prev.filter(p => p.id !== id)));
  };

  const completarConElResto = () => {
    setPartes(prev => {
      if (prev.length === 0) return prev;
      const faltante = restoSinAsignar(prev, totalACobrar);
      if (faltante <= 0) return prev;
      const ultimo = prev.length - 1;
      return prev.map((p, i) => (i === ultimo ? { ...p, monto: Number((p.monto + faltante).toFixed(2)) } : p));
    });
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Click / touch fuera para cerrar los dropdowns de búsqueda
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (pagadorRef.current && !pagadorRef.current.contains(target)) {
        setIsPagadorDropdownOpen(false);
      }
      if (beneficiarioRef.current && !beneficiarioRef.current.contains(target)) {
        setIsBeneficiarioDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
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
    setSearchPagadorText(`${cl.apellido}, ${cl.nombre}`);
    
    // Si no es pago múltiple, el pagador es el único beneficiario
    if (!esPagoMultiple) {
      setBeneficiarios([{
        id: genId(),
        cliente_id: clientId,
        monto: planPrecio.toString(),
        mes_correspondiente: pagoForm.mes_correspondiente
      }]);
    } else {
      // Si es pago múltiple y no hay ninguno, agregar al pagador primero
      if (beneficiarios.length === 0) {
        setBeneficiarios([{
          id: genId(),
          cliente_id: clientId,
          monto: planPrecio.toString(),
          mes_correspondiente: pagoForm.mes_correspondiente
        }]);
      }
    }
  };

  const handleAddBeneficiary = (clientId: string) => {
    if (!clientId) return;
    const cl = clientes.find(c => c.id === clientId);
    if (!cl) return;
    const plan = planes.find(p => p.id === cl.plan_id);
    const planPrecio = cl.precio_personalizado ?? (plan ? plan.precio : 0);

    // Si este cliente ya tiene pagos en la lista, sugerir el siguiente mes
    let mesSugerido = pagoForm.mes_correspondiente;
    const mesesDelCliente = beneficiarios
      .filter(b => b.cliente_id === clientId)
      .map(b => b.mes_correspondiente)
      .sort();

    if (mesesDelCliente.length > 0) {
      const ultimoMes = mesesDelCliente[mesesDelCliente.length - 1]; // ej: "2026-09"
      const [yStr, mStr] = ultimoMes.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      if (!isNaN(y) && !isNaN(m)) {
        mesSugerido = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      }
    }

    setBeneficiarios(prev => [
      ...prev,
      {
        id: genId(),
        cliente_id: clientId,
        monto: planPrecio.toString(),
        mes_correspondiente: mesSugerido
      }
    ]);
    setFormErr('');
  };

  const handleManualPagoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');
    setFormSuccess('');
    if (!pagoForm.cliente_id) { setFormErr('Por favor seleccione quién abona la transacción.'); return; }
    if (beneficiarios.length === 0) { setFormErr('Debe ingresar al menos un cobro o cuota para registrar.'); return; }

    for (let i = 0; i < beneficiarios.length; i++) {
      const b = beneficiarios[i];
      const parsedMonto = parseFloat(b.monto);
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        const c = clientes.find(x => x.id === b.cliente_id);
        setFormErr(`El monto para ${c ? c.nombre + ' ' + c.apellido : 'el socio'} debe ser mayor a 0 pesos.`);
        return;
      }
      if (!b.mes_correspondiente) { setFormErr('Todos los pagos deben tener un mes asignado.'); return; }
    }

    // Con varios medios, cada medio genera su propia fila de pago. Guardarlo así
    // (y no como una fila con un campo raro) hace que el balance por medio y por
    // destino siga saliendo de una suma simple, sin tocar ningún reporte.
    let payloadList;
    if (usaVariosMedios) {
      const chequeo = validarPartes(partes, totalACobrar);
      if (!chequeo.ok) { setFormErr(chequeo.motivo || 'Revisá los medios de pago.'); return; }

      payloadList = asignarPartesACobros(
        beneficiarios.map(b => ({
          cliente_id: b.cliente_id,
          mes_correspondiente: b.mes_correspondiente,
          monto: parseFloat(b.monto)
        })),
        partes
      ).map(f => ({
        ...f,
        hash_transaccion: pagoForm.hash_transaccion.trim() || undefined,
        registrado_por: 'operator@gimnasio.com.ar'
      }));
    } else {
      payloadList = beneficiarios.map(b => ({
        cliente_id: b.cliente_id,
        monto: parseFloat(b.monto),
        medio_pago: pagoForm.medio_pago,
        mes_correspondiente: b.mes_correspondiente,
        hash_transaccion: pagoForm.hash_transaccion.trim() || undefined,
        destino_transferencia: pagoForm.destino_transferencia,
        registrado_por: 'operator@gimnasio.com.ar'
      }));
    }

    // Registro atómico por lote para evitar colisiones de hash en Supabase y sobrescrituras de estado
    const res = registrarPagosMultiples(payloadList, 'operator@gimnasio.com.ar');

    if (!res.success) {
      setFormErr(res.message);
      return;
    }

    // Comprobantes para enviar por WhatsApp
    const generatedReceipts: any[] = [];
    beneficiarios.forEach(b => {
      const clObj = clientes.find(c => c.id === b.cliente_id);
      if (clObj) {
        const nombre = clObj.nombre;
        const parsedMonto = parseFloat(b.monto);
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
        generatedReceipts.push({
          cliente_nombre: `${clObj.apellido}, ${clObj.nombre} (${b.mes_correspondiente})`,
          messageText: textMsg,
          telefono: clObj.telefono || '5491123456789',
          copiado: false
        });
      }
    });

    setFormSuccess(res.message);
    setPagoForm({
      cliente_id: '',
      medio_pago: 'TRANSFERENCIA',
      mes_correspondiente: new Date().toISOString().slice(0, 7),
      hash_transaccion: '',
      destino_transferencia: 'RULO'
    });
    setBeneficiarios([]);
    setSearchPagadorText('');
    setSearchBeneficiarioText('');
    setEsPagoMultiple(false);
    setUsaVariosMedios(false);
    setPartes([]);
    setTimeout(() => {
      onSuccess(generatedReceipts);
      setFormSuccess('');
    }, 1000);
  };

  const pagadorSeleccionado = clientes.find(c => c.id === pagoForm.cliente_id);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-xs font-sans overflow-hidden" id="payment-form-modal">
      <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-xl max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden text-xs">
        
        {/* MODAL HEADER - FIJO */}
        <div className="bg-zinc-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight">Cargar Transacción Contable</h3>
            <p className="text-[10px] sm:text-xs text-zinc-400">Registrar cobros individuales o múltiples pagos / cuotas</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors bg-transparent border-none cursor-pointer" 
            id="btn-close-payment"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL FORM CONTAINER */}
        <form onSubmit={handleManualPagoSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          
          {/* SCROLLABLE BODY */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
            {formErr && <div className="bg-red-50 text-red-700 p-2.5 rounded-lg font-medium border border-red-200 text-xs">{formErr}</div>}
            {formSuccess && <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-semibold border border-emerald-200 text-xs">{formSuccess}</div>}
            
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
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-zinc-100">
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
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            c.exencion_cobro === 'BECADO' || c.exencion_cobro === 'PERDONADO'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : c.deuda_acumulada > 0
                              ? 'bg-red-50 text-red-600 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {c.exencion_cobro === 'BECADO' || c.exencion_cobro === 'PERDONADO'
                              ? 'Becado ($0)'
                              : c.deuda_acumulada > 0
                              ? `Deuda: $${c.deuda_acumulada.toLocaleString('es-AR')}`
                              : 'Al día'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* ATAJO RÁPIDO PARA SUMAR OTRA CUOTA / MES PARA EL MISMO SOCIO */}
            {pagoForm.cliente_id && pagadorSeleccionado && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleAddBeneficiary(pagoForm.cliente_id)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Permite cargar 2, 3 o 4 meses juntos para este mismo socio"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Sumar otro mes para {pagadorSeleccionado.nombre}</span>
                </button>
              </div>
            )}

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
                        id: genId(),
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
                  Pagar por otros socios o grupo (ej: familiar, amigos, múltiples personas)
                </span>
              </label>
            </div>

            {/* BUSCADOR DE BENEFICIARIO ADICIONAL (SI SE MARCA EL CHECKBOX) */}
            {esPagoMultiple && (
              <div className="space-y-1 relative pt-1" ref={beneficiarioRef}>
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">Agregar Alumno Beneficiario</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Buscar y agregar otro alumno..."
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
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-xl z-50 max-h-52 overflow-y-auto divide-y divide-zinc-100">
                    {beneficiarioOptions.length === 0 ? (
                      <div className="p-3 text-center text-zinc-400 italic text-xs">No hay socios que coincidan</div>
                    ) : (
                      beneficiarioOptions.map(c => {
                        const pl = planes.find(p => p.id === c.plan_id);
                        const cantAgregado = beneficiarios.filter(b => b.cliente_id === c.id).length;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              handleAddBeneficiary(c.id);
                              setSearchBeneficiarioText('');
                              setIsBeneficiarioDropdownOpen(false);
                            }}
                            className="w-full text-left p-2.5 hover:bg-zinc-50 flex items-center justify-between transition-colors text-xs cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-zinc-900 block">{c.apellido}, {c.nombre}</span>
                              <span className="text-[10px] text-zinc-400 font-mono">Plan: {pl ? pl.nombre : 'Sin plan'}</span>
                            </div>
                            {cantAgregado > 0 ? (
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> {cantAgregado} {cantAgregado === 1 ? 'cuota' : 'cuotas'} (+ tocar para sumar otra)
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-400 font-semibold">+ Agregar</span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {/* DETALLE DE COBROS Y BENEFICIARIOS */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">
                  Detalle de Pagos / Cuotas Cubiertas ({beneficiarios.length})
                </label>
              </div>

              {beneficiarios.length === 0 ? (
                <div className="border border-dashed border-zinc-200 rounded-lg p-4 text-center text-zinc-400 italic">
                  Seleccioná quién abona para comenzar a registrar los cobros.
                </div>
              ) : (
                <>
                  {/* VISTA MOBILE: TARJETAS CÓMODAS PARA PANTALLAS TÁCTILES */}
                  <div className="block sm:hidden space-y-2 max-h-56 overflow-y-auto pr-1">
                    {beneficiarios.map((b, idx) => {
                      const cl = clientes.find(c => c.id === b.cliente_id);
                      return (
                        <div key={b.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-2.5 shadow-2xs">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-zinc-900 text-xs truncate max-w-[200px]">
                              {idx + 1}. {cl ? `${cl.apellido}, ${cl.nombre}` : 'Desconocido'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setBeneficiarios(prev => prev.filter(x => x.id !== b.id))}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                              title="Eliminar este pago"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-zinc-500 font-bold uppercase block mb-1">Mes a Cubrir</label>
                              <input
                                type="month"
                                required
                                value={b.mes_correspondiente}
                                onChange={e => setBeneficiarios(prev => prev.map(x => x.id === b.id ? { ...x, mes_correspondiente: e.target.value } : x))}
                                className="w-full border border-zinc-200 rounded-lg p-1.5 bg-white font-mono text-xs font-semibold outline-hidden focus:border-black"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-zinc-500 font-bold uppercase block mb-1">Monto ($)</label>
                              <div className="relative">
                                <span className="absolute left-2 top-1.5 text-zinc-400 font-mono text-[10px]">$</span>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={b.monto}
                                  onChange={e => setBeneficiarios(prev => prev.map(x => x.id === b.id ? { ...x, monto: e.target.value } : x))}
                                  className="w-full border border-zinc-200 rounded-lg p-1.5 pl-5 bg-white font-mono text-xs font-bold outline-hidden focus:border-black"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* VISTA DESKTOP / TABLET: TABLA CONSOLIDADA */}
                  <div className="hidden sm:block border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50 max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-100 text-zinc-600 font-bold border-b border-zinc-200 text-[10px] uppercase">
                          <th className="p-2">Socio</th>
                          <th className="p-2 w-32">Mes</th>
                          <th className="p-2 w-28">Monto</th>
                          <th className="p-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {beneficiarios.map((b, idx) => {
                          const cl = clientes.find(c => c.id === b.cliente_id);
                          return (
                            <tr key={b.id}>
                              <td className="p-2 font-semibold text-zinc-900 truncate max-w-[160px]">
                                {cl ? `${cl.apellido}, ${cl.nombre}` : 'Desconocido'}
                              </td>
                              <td className="p-2">
                                <input 
                                  type="month" 
                                  required 
                                  value={b.mes_correspondiente} 
                                  onChange={e => setBeneficiarios(prev => prev.map(x => x.id === b.id ? { ...x, mes_correspondiente: e.target.value } : x))} 
                                  className="w-full border border-zinc-200 rounded-md p-1 bg-white font-mono text-xs outline-hidden" 
                                />
                              </td>
                              <td className="p-2">
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1 text-zinc-400 font-mono text-[10px]">$</span>
                                  <input 
                                    type="number" 
                                    required 
                                    min="1" 
                                    value={b.monto} 
                                    onChange={e => setBeneficiarios(prev => prev.map(x => x.id === b.id ? { ...x, monto: e.target.value } : x))} 
                                    className="w-full border border-zinc-200 rounded-md p-1 pl-4 bg-white font-mono text-xs font-bold outline-hidden" 
                                  />
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <button 
                                  type="button" 
                                  onClick={() => setBeneficiarios(prev => prev.filter(x => x.id !== b.id))} 
                                  className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-md border-none bg-transparent cursor-pointer"
                                  title="Quitar pago"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {/* PAGO CON VARIOS MEDIOS (ej: mitad efectivo, mitad transferencia) */}
            <div className="pt-1">
              <label
                className="flex items-center gap-2 cursor-pointer select-none bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2"
                htmlFor="chk-varios-medios"
              >
                <input
                  type="checkbox"
                  id="chk-varios-medios"
                  checked={usaVariosMedios}
                  onChange={e => activarVariosMedios(e.target.checked)}
                  className="w-4 h-4 accent-zinc-900 cursor-pointer"
                />
                <span className="text-xs font-bold text-zinc-800">Pagó con más de un medio</span>
                <span className="text-[11px] text-zinc-500">ej: una parte en efectivo y otra por transferencia</span>
              </label>
            </div>

            {usaVariosMedios ? (
              <div className="space-y-2 border border-zinc-200 rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">Medios usados</span>
                  <span className={`text-[11px] font-mono font-bold ${validacionPartes.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ${validacionPartes.suma.toLocaleString('es-AR')} de ${totalACobrar.toLocaleString('es-AR')}
                  </span>
                </div>

                {partes.map((p, idx) => (
                  <div key={p.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
                    <select
                      value={p.medio}
                      onChange={e => cambiarParte(p.id, { medio: e.target.value as MedioPago }, 'medio')}
                      className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
                      id={`parte-medio-${idx}`}
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                      <option value="MERCADO_PAGO">Mercado Pago</option>
                      <option value="UALA">Uala</option>
                      <option value="OTRO">Otro</option>
                    </select>

                    <select
                      value={p.destino}
                      onChange={e => cambiarParte(p.id, { destino: e.target.value as DestinoPago }, 'destino')}
                      className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
                      id={`parte-destino-${idx}`}
                    >
                      <option value="RULO">🟡 Rulo</option>
                      <option value="JUANCHI">🟣 Juanchi</option>
                      <option value="EFECTIVO">💵 Efectivo (caja)</option>
                    </select>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.monto || ''}
                      onChange={e => cambiarParte(p.id, { monto: parseFloat(e.target.value) || 0 }, 'monto')}
                      placeholder="Monto"
                      className="w-full sm:w-32 border border-zinc-200 rounded-lg p-2 text-xs font-mono outline-hidden font-medium"
                      id={`parte-monto-${idx}`}
                    />

                    <button
                      type="button"
                      onClick={() => quitarParte(p.id)}
                      disabled={partes.length <= 1}
                      className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border-none bg-transparent"
                      title="Quitar este medio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={agregarParte}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-[11px] font-bold cursor-pointer transition-colors"
                    id="btn-agregar-medio"
                  >
                    <Plus className="w-3 h-3" /> Agregar medio
                  </button>

                  {resto > 0 && (
                    <button
                      type="button"
                      onClick={completarConElResto}
                      className="px-2.5 py-1.5 rounded-lg border border-lime-300 bg-lime-50 text-lime-900 hover:bg-lime-100 text-[11px] font-bold cursor-pointer transition-colors"
                      id="btn-completar-resto"
                    >
                      Poner el resto (${resto.toLocaleString('es-AR')}) en el último
                    </button>
                  )}
                </div>

                {!validacionPartes.ok && validacionPartes.motivo && (
                  <p className="text-[11px] text-rose-700 font-semibold">{validacionPartes.motivo}</p>
                )}
              </div>
            ) : null}

            {/* DATOS DE LA TRANSACCIÓN: VÍA, DESTINO, REF */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-1">
              <div className={`space-y-1 ${usaVariosMedios ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">Vía de Pago</label>
                <select
                  value={pagoForm.medio_pago}
                  onChange={e => cambiarMedioODestino({ medio: e.target.value as MedioPago }, 'medio')}
                  disabled={usaVariosMedios}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="MERCADO_PAGO">Mercado Pago</option>
                  <option value="UALA">Uala</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div className={`space-y-1 ${usaVariosMedios ? 'opacity-40 pointer-events-none' : ''}`}>
                <label className="text-violet-700 font-bold block text-[10px] uppercase">Destino (Juanchi / Rulo / Efectivo)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['RULO', 'JUANCHI', 'EFECTIVO'] as const).map(dest => (
                    <button
                      key={dest}
                      type="button"
                      onClick={() => cambiarMedioODestino({ destino: dest }, 'destino')}
                      disabled={usaVariosMedios}
                      className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        pagoForm.destino_transferencia === dest
                          ? dest === 'JUANCHI'
                            ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                            : dest === 'EFECTIVO'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-amber-500 text-white border-amber-500 shadow-xs'
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
                <input 
                  type="text" 
                  placeholder="ej: MP-90382211 (opcional)" 
                  value={pagoForm.hash_transaccion} 
                  onChange={e => setPagoForm(prev => ({ ...prev, hash_transaccion: e.target.value }))} 
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs font-mono outline-hidden font-medium" 
                />
              </div>
            </div>

          </div>

          {/* STICKY FOOTER CON TOTAL Y ACCIONES - SIEMPRE VISIBLE EN PANTALLA MÓVIL */}
          <div className="p-3 sm:p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-zinc-400 leading-none">Total Transacción:</span>
              <span className="font-mono font-black text-emerald-600 text-sm sm:text-base leading-tight mt-0.5">
                ${beneficiarios.reduce((sum, b) => sum + (parseFloat(b.monto) || 0), 0).toLocaleString('es-AR')} ARS
              </span>
            </div>
            <div className="flex gap-2 font-semibold">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-3 sm:px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-100 transition-all cursor-pointer bg-white text-zinc-700 text-xs"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-3 sm:px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg transition-all font-bold shadow-xs cursor-pointer border-none text-xs flex items-center gap-1.5"
                id="btn-confirm-register-payment"
              >
                Registrar Cobro ({beneficiarios.length})
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};
