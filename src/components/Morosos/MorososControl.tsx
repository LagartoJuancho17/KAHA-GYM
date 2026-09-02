// src/components/Morosos/MorososControl.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Cliente, MedioPago } from '../../types';
import { 
  AlertTriangle, ShieldAlert, DollarSign, X, Receipt, UserMinus, Mail
} from 'lucide-react';
import { MorososCronSimulator } from './MorososCronSimulator';
import { MorososList } from './MorososList';
import { AdminBajasReviewModal } from './AdminBajasReviewModal';
import { EmailReporteMorososAdminModal } from '../Notifications/EmailReporteMorososAdminModal';

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

  // Modales de Bajas y Reporte Email
  const [showBajasModal, setShowBajasModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const mesActual = new Date().toISOString().slice(0, 7);
  const diaHoy = new Date().getDate();

  // --- CALCULO KPIs DE CONTROL ---
  const clientesActivos = useMemo(() => clientes.filter(c => c.activo), [clientes]);
  const totalActivosCount = clientesActivos.length;

  const morososList = useMemo(() => clientesActivos.filter(c => c.estado === 'MOROSO'), [clientesActivos]);
  const morososCount = morososList.length;

  const deudoresTotalesList = useMemo(() => clientesActivos.filter(c => c.deuda_acumulada > 0), [clientesActivos]);
  const deudoresCount = deudoresTotalesList.length;

  // Candidatos a baja de turno fijo (Día 10+)
  const candidatosBajaFijos = useMemo(() => {
    return clientesActivos.filter(c => {
      if (!c.turnos_fijos || c.turnos_fijos.length === 0) return false;
      const noPago = !c.ultimo_mes_pagado || c.ultimo_mes_pagado < mesActual;
      return noPago;
    });
  }, [clientesActivos, mesActual]);

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
    <div className="space-y-6 p-3 sm:p-6 max-w-7xl mx-auto overflow-x-hidden" id="morosos-tab-panel">
      
      {/* SECCIÓN CABECERA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Módulo de Morosidad</h2>
          <p className="text-zinc-500 font-sans text-sm font-medium">Control de impagos mensualizado, conciliación de saldos y simulación de base de datos</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Mail className="w-3.5 h-3.5 text-zinc-500" />
            <span>Reporte Email Admins</span>
          </button>

          {candidatosBajaFijos.length > 0 && (
            <button
              onClick={() => setShowBajasModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Revisar Bajas Día 10 ({candidatosBajaFijos.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* BANNER AVISO DÍA 10+ BAJAS PENDIENTES DE REVISIÓN */}
      {candidatosBajaFijos.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 via-amber-50 to-red-50 border border-red-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-fade-in" id="morosos-dia-10-banner">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-950">
                ⚠️ Bajas sugeridas de turno fijo (Día 10+): {candidatosBajaFijos.length} socio(s) sin pagar
              </p>
              <p className="text-[11px] text-red-800/80 mt-0.5">
                Las bajas de turno fijo no se ejecutan automáticamente. Requieren tu confirmación manual para liberar los cupos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowEmailModal(true)}
              className="px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              <Mail className="w-3.5 h-3.5 text-zinc-500" />
              <span>Enviar Reporte</span>
            </button>
            <button
              onClick={() => setShowBajasModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all border-none"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Revisar Bajas</span>
            </button>
          </div>
        </div>
      )}

      {/* KPIS DE MOROSIDAD */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5" id="delinquency-kpis">
        {/* TOTAL MOROSOS CARD */}
        <div className="bg-white border border-zinc-200 p-4 sm:p-5 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans leading-tight">Morosos Críticos</span>
            <div className="text-2xl sm:text-3xl font-sans font-bold text-red-600 mt-1">{morososCount} socios</div>
            <span className="text-[10px] text-zinc-400 font-sans mt-1 block">Sin pago luego del plazo</span>
          </div>
          <div className="p-2 mt-2 bg-red-50 text-red-600 rounded-lg w-fit hidden sm:block">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* % MOROSIDAD */}
        <div className="bg-white border border-zinc-200 p-4 sm:p-5 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans leading-tight">Tasa de Incumplimiento</span>
            <div className="text-2xl sm:text-3xl font-sans font-bold text-zinc-950 mt-1">{porcentajeMora}%</div>
            <span className="text-[10px] text-zinc-400 font-sans mt-1 block">{deudoresCount} alumnos con deuda vencida</span>
          </div>
          <div className="p-2 mt-2 bg-zinc-100 text-zinc-500 rounded-lg w-fit hidden sm:block">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* DEUDA TOTAL ACUMULADA */}
        <div className="col-span-2 md:col-span-1 bg-white border border-zinc-200 p-4 sm:p-5 rounded-xl flex flex-col justify-between">
          <div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans leading-tight">Monto Total de Deuda Pendiente</span>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-amber-600 mt-1">${totalDeudaPendienteGimnasio.toLocaleString('es-AR')}</div>
            <span className="text-[10px] text-zinc-400 font-sans mt-1 block">ARS que restan recaudar</span>
          </div>
          <div className="p-2 mt-2 bg-amber-50 text-amber-600 rounded-lg w-fit hidden sm:block">
            <DollarSign className="w-5 h-5" />
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
                className="text-zinc-400 hover:text-white bg-transparent border-none cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmFastPagoSubmit} className="p-5 space-y-4 text-xs">
              
              {fastPagoSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-semibold border border-emerald-200">
                  {fastPagoSuccess}
                </div>
              )}

              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100 leading-relaxed">
                <span className="text-zinc-400 text-[10px] uppercase font-bold block mb-0.5">Socio</span>
                <span className="font-bold text-zinc-900 text-sm block">{selectedClienteToClear.nombre} {selectedClienteToClear.apellido}</span>
                <span className="text-zinc-600 font-semibold block text-[10px] mt-2">Deuda histórica registrada: <span className="font-mono text-red-600 font-bold">${selectedClienteToClear.deuda_acumulada.toLocaleString('es-AR')}</span></span>
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

      {/* MODAL REVISIÓN DE BAJAS DE TURNOS FIJOS (DÍA 10+) */}
      <AdminBajasReviewModal
        isOpen={showBajasModal}
        onClose={() => setShowBajasModal(false)}
        onOpenEmailModal={() => setShowEmailModal(true)}
      />

      {/* MODAL REPORTE EMAIL MOROSOS ADMIN */}
      <EmailReporteMorososAdminModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </div>
  );
};
