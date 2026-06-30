// src/components/Morosos/MorososControl.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente, MedioPago } from '../../types';
import { 
  AlertTriangle, ShieldAlert, DollarSign, X, Receipt
} from 'lucide-react';
import { MorososCronSimulator } from './MorososCronSimulator';
import { MorososList } from './MorososList';

export const MorososControl: React.FC = () => {
  const { 
    clientes, planes, registrarPago, updateCliente
  } = useGym();

  const [simularFecha, setSimularFecha] = useState(new Date().toISOString().slice(0, 10)); // Fecha actual como default
  const [filtroMora, setFiltroMora] = useState<'TODOS' | 'MOROSO' | 'CON_DEUDA'>('TODOS');
  
  // --- FAST PAYMENT DIALOG STATE ---
  const [selectedClienteToClear, setSelectedClienteToClear] = useState<Cliente | null>(null);
  const [fastPagoForm, setFastPagoForm] = useState({
    monto: '',
    medio_pago: 'EFECTIVO' as MedioPago,
    hash_transaccion: ''
  });
  const [fastPagoSuccess, setFastPagoSuccess] = useState('');

  // --- CALCULO KPIs DE CONTROL ---
  const clientesActivos = useMemo(() => clientes.filter(c => c.activo), [clientes]);
  const totalActivosCount = clientesActivos.length;

  const morososList = useMemo(() => clientesActivos.filter(c => c.estado === 'MOROSO'), [clientesActivos]);
  const morososCount = morososList.length;

  const deudoresTotalesList = useMemo(() => clientesActivos.filter(c => c.deuda_acumulada > 0), [clientesActivos]);
  const deudoresCount = deudoresTotalesList.length;

  const porcentajeMora = totalActivosCount > 0 
    ? Math.round((morososCount / totalActivosCount) * 100) 
    : 0;

  const totalDeudaPendienteGimnasio = useMemo(() => {
    return deudoresTotalesList.reduce((acc, c) => acc + c.deuda_acumulada, 0);
  }, [deudoresTotalesList]);

  // --- ESCANEAR DEUDORES LISTADO ---
  const listadoDeudoresMora = useMemo(() => {
    let list = deudoresTotalesList;

    if (filtroMora === 'MOROSO') {
      list = list.filter(c => c.estado === 'MOROSO');
    } else if (filtroMora === 'CON_DEUDA') {
      list = list.filter(c => c.estado === 'CON_DEUDA');
    }

    return list.map(c => {
      // Calcular días aproximados de atraso basándose en el día de gracia (día 5)
      // Si simularFecha es mayor que el día 5 de mayo, calcular atraso.
      const simDia = parseInt(simularFecha.slice(8, 10));
      const atrasoDias = c.estado === 'MOROSO' ? Math.max(1, simDia - 5) : 0;

      return {
        ...c,
        atrasoDias
      };
    });
  }, [deudoresTotalesList, filtroMora, simularFecha]);

  // --- REGISTRAR PAGO RAPIDO DESDE TABLA DE MOROSIDAD ---
  const handleStartFastClear = (cl: Cliente) => {
    setSelectedClienteToClear(cl);
    setFastPagoForm({
      monto: cl.deuda_acumulada.toString(),
      medio_pago: 'EFECTIVO',
      hash_transaccion: ''
    });
    setFastPagoSuccess('');
  };

  const handleConfirmFastPagoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClienteToClear) return;

    const res = registrarPago({
      cliente_id: selectedClienteToClear.id,
      cliente_nombre_completo: `${selectedClienteToClear.nombre} ${selectedClienteToClear.apellido}`,
      monto: parseFloat(fastPagoForm.monto),
      medio_pago: fastPagoForm.medio_pago,
      mes_correspondiente: simularFecha.slice(0, 7), // mes actual
      hash_transaccion: fastPagoForm.hash_transaccion || undefined,
      registrado_por: 'admin@gimnasio.com.ar'
    }, 'admin@gimnasio.com.ar');

    if (res.success) {
      setFastPagoSuccess('Pago registrado correctamente. Ficha del alumno regularizada al instante.');
      setTimeout(() => {
        setSelectedClienteToClear(null);
        setFastPagoSuccess('');
      }, 1500);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto" id="morosos-tab-panel">
      
      {/* SECCIÓN CABECERA */}
      <div>
        <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Módulo de Morosidad</h2>
        <p className="text-zinc-500 font-sans text-sm font-medium">Control de impagos mensualizado, conciliación de saldos y simulación de base de datos</p>
      </div>

      {/* KPIS DE MOROSIDAD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="delinquency-kpis">
        {/* TOTAL MOROSOS CARD */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans">Morosos Críticos (Post-Plazo)</span>
            <div className="text-3xl font-sans font-bold text-red-650 mt-1">{morososCount} socios</div>
            <span className="text-[10px] text-zinc-400 font-sans mt-1 block">Alumnos sin pago luego de expirado el plazo</span>
          </div>
          <div className="p-3 ml-4 bg-red-50 text-red-650 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>

        {/* % MOROSIDAD */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans">Tasa de Incumplimiento</span>
            <div className="text-3xl font-sans font-bold text-zinc-955 mt-1">{porcentajeMora}%</div>
            <span className="text-[10px] text-zinc-400 font-sans mt-1 block">{deudoresCount} alumnos con deuda vencida</span>
          </div>
          <div className="p-3 ml-4 bg-zinc-100 text-zinc-500 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* DEUDA TOTAL ACUMULADA */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans">Monto Total de Deuda Pendiente</span>
            <div className="text-3xl font-mono font-bold text-amber-600 mt-1">${totalDeudaPendienteGimnasio.toLocaleString('es-AR')}</div>
            <span className="text-[10px] text-zinc-400 font-sans mt-1 block">ARS que restan recaudar de la cartera activa</span>
          </div>
          <div className="p-3 ml-4 bg-amber-50 text-amber-600 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECCIÓN SIMULACIÓN INTERACTIVA CRON JOB */}
      <MorososCronSimulator
        simularFecha={simularFecha}
        setSimularFecha={setSimularFecha}
        clientesActivosCount={totalActivosCount}
      />

      {/* SECCIÓN TABLA DE DEUDORES */}
      <MorososList
        deudoresCount={deudoresCount}
        morososCount={morososCount}
        listadoDeudoresMora={listadoDeudoresMora}
        filtroMora={filtroMora}
        setFiltroMora={setFiltroMora}
        onFastClearClick={handleStartFastClear}
      />

      {/* --- PANEL DE PAGO RAPIDO DESDE TABLA INTEGRADO --- */}
      {selectedClienteToClear && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-base font-bold tracking-tight">Cobro Rápido de Morosidad</h3>
              <button
                onClick={() => setSelectedClienteToClear(null)}
                className="text-zinc-405 hover:text-white bg-transparent border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmFastPagoSubmit} className="p-5 space-y-4 text-xs">
              
              {fastPagoSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-semibold border border-emerald-250">
                  {fastPagoSuccess}
                </div>
              )}

              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-150 leading-relaxed">
                <span className="text-zinc-400 text-[10px] uppercase font-bold block mb-0.5">Socio</span>
                <span className="font-bold text-zinc-900 text-sm block">{selectedClienteToClear.nombre} {selectedClienteToClear.apellido}</span>
                <span className="text-zinc-555 font-semibold block text-[10px] mt-2">Deuda histórica registrada: <span className="font-mono text-red-650 font-bold">${selectedClienteToClear.deuda_acumulada.toLocaleString('es-AR')}</span></span>
              </div>

              {/* GESTION DE EXCEPCION RAPIDA */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase font-sans">Exención / Excepción de Cobro</label>
                <select
                  value={selectedClienteToClear.exencion_cobro || 'NINGUNA'}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    updateCliente(selectedClienteToClear.id, { exencion_cobro: val });
                    // Mutate locally to update table state instantly
                    selectedClienteToClear.exencion_cobro = val;
                  }}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
                >
                  <option value="NINGUNA">Ninguna (Control estándar)</option>
                  <option value="SUSPENDIDO">Suspensión de cobro momentáneo</option>
                  <option value="POSTERGADO">Postergación autorizada</option>
                  <option value="PERDONADO">Perdonado / Exento este mes</option>
                </select>
              </div>

              {/* MONTO */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Monto a Cobrar (ARS)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-zinc-400 font-mono">$</span>
                  <input
                    type="number"
                    required
                    min="1"
                    value={fastPagoForm.monto}
                    onChange={(e) => setFastPagoForm(prev => ({ ...prev, monto: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-lg p-2 pl-6 text-xs font-mono font-bold overview focus:ring-1 focus:ring-black outline-hidden"
                  />
                </div>
              </div>

              {/* MEDIO */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase font-sans">Canal de Pago</label>
                <select
                  value={fastPagoForm.medio_pago}
                  onChange={(e) => setFastPagoForm(prev => ({ ...prev, medio_pago: e.target.value as MedioPago }))}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden"
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="MERCADO_PAGO">Mercado Pago</option>
                  <option value="UALA">Uala</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              {/* TRANSACCION ID HASH */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase font-sans">Hash / Comprobante MP</label>
                <input
                  type="text"
                  placeholder="ej: MP-90382211"
                  value={fastPagoForm.hash_transaccion}
                  onChange={(e) => setFastPagoForm(prev => ({ ...prev, hash_transaccion: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs font-mono outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSelectedClienteToClear(null)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all font-semibold bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white border-none rounded-lg transition-all font-bold shadow-md shadow-emerald-600/10 cursor-pointer"
                >
                  Registrar Cobranza
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
