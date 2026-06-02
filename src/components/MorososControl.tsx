// src/components/MorososControl.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../GymContext';
import { Cliente, MedioPago } from '../types';
import { 
  AlertTriangle, Play, ShieldAlert, Cpu, Calendar, DollarSign, 
  Receipt, ArrowRight, User, Check, RefreshCw, X
} from 'lucide-react';

export const MorososControl: React.FC = () => {
  const { 
    clientes, planes, pagos, ejecutarCronMorosidad, registrarPago, updateCliente
  } = useGym();

  const [simularFecha, setSimularFecha] = useState('2026-05-10'); // May 10th, 2026 as standard post-gracia date
  const [filtroMora, setFiltroMora] = useState<'TODOS' | 'MOROSO' | 'CON_DEUDA'>('TODOS');
  
  // --- STATE CRON LOGGING INTERACTIVO ---
  const [cronRunning, setCronRunning] = useState(false);
  const [cronConsole, setCronConsole] = useState<string[]>([]);
  const [cronStatsResult, setCronStatsResult] = useState<any | null>(null);

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

  // --- DISPARAR SIMULADOR CRON EDGE FUNCTION ---
  const handleTriggerEdgeFunction = () => {
    setCronRunning(true);
    setCronStatsResult(null);
    setCronConsole([
      '>> [Deno Server Instance] Booting check-morosidad edge function...',
      `>> Env: SUPABASE_URL connected, Service role bypass RLS activated.`,
      `>> Timezone override: America/Argentina/Buenos_Aires (Argentina-UTC hours offset computed).`,
      `>> Simulated current epoch evaluating date: [${simularFecha} 23:59:00]`,
      '>> Querying active database client catalog...'
    ]);

    setTimeout(() => {
      setCronConsole(prev => [...prev, `>> Success: Returned ${clientesActivos.length} active memberships.`]);
    }, 300);

    setTimeout(() => {
      setCronConsole(prev => [
        ...prev,
        `>> Evaluating grace period limits (Rules: Day 1, 5, 6, 11).`,
        `>> Checking registered monthly coverages for mes-current: [${simularFecha.slice(0, 7)}]`
      ]);
    }, 600);

    setTimeout(() => {
      const result = ejecutarCronMorosidad(simularFecha);
      setCronStatsResult(result);
      setCronRunning(false);
      setCronConsole(prev => [
        ...prev,
        ...result.logLineas,
        `>> Deno response status: 200 (Success).`
      ]);
    }, 1200);
  };

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
            <div className="text-3xl font-sans font-bold text-zinc-950 mt-1">{porcentajeMora}%</div>
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

      {/* SECCIÓN SIMULACIÓN INTERACTIVA CRON JOB (Edge Function check-morosidad) */}
      <div className="bg-zinc-950 text-white rounded-xl border border-zinc-850 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 shadow-xl leading-normal">
        
        {/* Info y fecha */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="text-amber-400 w-5 h-5" />
            <h3 className="font-sans font-bold text-sm tracking-tight uppercase">Simulador de Supabase Edge Function</h3>
          </div>

          <p className="text-zinc-400 text-xs font-sans">
            La regla comercial determina: <strong>"Día 5 de cada mes a las 23:59 es el vencimiento"</strong>. Cualquier alumno que no registre un pago para el mes se le cambia el estado automáticamente a <strong className="text-red-400">MOROSO</strong> y se le imputa el saldo de su plan.
          </p>

          <p className="text-zinc-400 text-xs font-sans">
            Para probar las automatizaciones del sistema, puedes escoger una fecha simulada posterior y gatillar la Edge Function con el botón.
          </p>

          <div className="space-y-1.5 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
            <label className="text-[10px] text-zinc-400 font-bold uppercase block tracking-wider font-sans">Fecha corriente de simulación</label>
            <input
              type="date"
              value={simularFecha}
              onChange={(e) => setSimularFecha(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-white rounded-md p-1.5 text-xs font-mono outline-hidden w-full focus:border-amber-500"
            />
          </div>

          <button
            onClick={handleTriggerEdgeFunction}
            disabled={cronRunning}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black py-2.5 px-4 rounded-lg text-xs font-bold font-sans flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/5 transition-all"
            id="btn-run-delinquency-cron"
          >
            {cronRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
                Evaluando cartera...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-black" />
                Ejecutar Edge Function de Control
              </>
            )}
          </button>
        </div>

        {/* Consola interactiva de ejecución */}
        <div className="lg:col-span-2 flex flex-col justify-between bg-zinc-900 border border-zinc-800 rounded-xl p-4 overflow-hidden h-72">
          <div className="space-y-1 select-none flex-1 overflow-y-auto font-mono text-[10.5px] text-zinc-300 pr-2">
            <span className="text-zinc-500 block uppercase font-sans font-bold text-[9px] tracking-wide mb-2">Terminal de ejecución en Tiempo Real:</span>
            {cronConsole.map((line, idx) => (
              <div key={idx} className="py-0.5 leading-relaxed">{line}</div>
            ))}
          </div>

          {cronStatsResult && (
            <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center text-xs animate-fade-in font-sans">
              <span className="text-amber-400 font-bold uppercase tracking-wider text-[9px]">Análisis Terminado con éxito</span>
              <div className="flex flex-wrap gap-4 font-mono font-semibold">
                <span>Procesados: <strong className="text-white">{cronStatsResult.procesados}</strong></span>
                <span>Pasaron a Mora: <strong className="text-red-400 font-bold">{cronStatsResult.nuevosMorosos}</strong></span>
                <span>Turnos Suspendidos (Semana 1): <strong className="text-amber-400 font-bold">{cronStatsResult.suspendidosSemanaCount}</strong></span>
                <span>Bajas de Turno: <strong className="text-red-400 font-bold">{cronStatsResult.dadosBajaCount}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN TABLA DE DEUDORES */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        
        {/* Filtros rápidos mora */}
        <div className="bg-zinc-50 px-5 py-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <h3 className="font-sans font-bold text-zinc-900 leading-none">Miembros con deuda activa registrada</h3>
          
          <div className="flex text-xs bg-white p-0.5 rounded-lg border border-zinc-250 font-sans">
            <button
              onClick={() => setFiltroMora('TODOS')}
              className={`px-3 py-1 rounded-md py-1 transition-all ${filtroMora === 'TODOS' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              Todos ({deudoresCount})
            </button>
            <button
              onClick={() => setFiltroMora('MOROSO')}
              className={`px-3 py-1 rounded-md py-1 transition-all ${filtroMora === 'MOROSO' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-500 hover:text-zinc-950'}`}
              id="filter-morosos-button"
            >
              Morosos Críticos ({morososCount})
            </button>
            <button
              onClick={() => setFiltroMora('CON_DEUDA')}
              className={`px-3 py-1 rounded-md py-1 transition-all ${filtroMora === 'CON_DEUDA' ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-500 hover:text-zinc-900'}`}
            >
              Atrasos de Gracia
            </button>
          </div>
        </div>

        {/* Listado */}
        <div className="overflow-x-auto text-xs font-sans">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#fbfcff] text-zinc-500 border-b border-zinc-200 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-4">Socio</th>
                <th className="p-4">Plan contratado</th>
                <th className="p-4">Último abono cubierto</th>
                <th className="p-4">Días de Atraso</th>
                <th className="p-4">Monto Adeudado</th>
                <th className="p-4 text-center">Acción Rápida de Cobro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium font-sans">
              {listadoDeudoresMora.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-400 italic">No hay deudores ni morosos registrados de acuerdo con los criterios seleccionados.</td>
                </tr>
              ) : (
                listadoDeudoresMora.map(c => {
                  const pl = planes.find(p => p.id === c.plan_id);
                  let stateLabel = c.estado === 'MOROSO' ? 'Moroso Crítico' : 'Período Gracia';
                  let statusColor = c.estado === 'MOROSO' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-100 text-amber-700 border-amber-200';

                  return (
                    <tr key={c.id} className="hover:bg-zinc-50/50">
                      <td className="p-4">
                        <div className="font-bold text-zinc-950 flex items-center gap-1.5 flex-wrap">
                          <span>{c.apellido}, {c.nombre}</span>
                          {c.exencion_cobro && c.exencion_cobro !== 'NINGUNA' && (
                            <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase shrink-0 ${
                              c.exencion_cobro === 'SUSPENDIDO' ? 'bg-amber-100 text-amber-700 border border-amber-205' :
                              c.exencion_cobro === 'POSTERGADO' ? 'bg-cyan-100 text-cyan-700 border border-cyan-205' :
                              'bg-emerald-100 text-emerald-705 border border-emerald-205'
                            }`}>
                              {c.exencion_cobro === 'SUSPENDIDO' ? 'Cobro Suspendido' :
                               c.exencion_cobro === 'POSTERGADO' ? 'Postergado' : 'Perdonado'}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{c.email}</div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-zinc-800">{pl ? pl.nombre : 'Plan base'}</span>
                      </td>
                      <td className="p-4 font-mono text-zinc-600">{c.ultimo_mes_pagado || 'Sin abonos'}</td>
                      <td className="p-4 text-zinc-950 font-bold">
                        {c.estado === 'MOROSO' ? (
                          <span className="font-mono text-red-600 font-bold">{c.atrasoDias} días de atraso</span>
                        ) : (
                          <span className="font-sans text-zinc-400 font-normal">Dentro de fecha límite</span>
                        )}
                      </td>
                      <td className="p-4 font-mono font-bold text-red-650">
                        ${c.deuda_acumulada.toLocaleString('es-AR')}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleStartFastClear(c)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-colors"
                          id={`btn-cobro-rapido-${c.id}`}
                        >
                          <Receipt className="w-3.5 h-3.5 text-white" />
                          Registrar Cobro
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PANEL DE PAGO RAPIDO DESDE TABLA INTEGRADO --- */}
      {selectedClienteToClear && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-sm overflow-hidden">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-base font-bold tracking-tight">Cobro Rápido de Morosidad</h3>
              <button
                onClick={() => setSelectedClienteToClear(null)}
                className="text-zinc-400 hover:text-white"
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
                  className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all font-bold shadow-md shadow-emerald-600/10"
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
