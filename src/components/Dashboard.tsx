// src/components/Dashboard.tsx
import React, { useState } from 'react';
import { useGym } from '../GymContext';
import { 
  Users, AlertTriangle, TrendingUp, DollarSign, 
  Calendar, ArrowUpRight, Plus, Receipt, Grid, ListOrdered,
  TrendingDown, X, Minus, Check, AlertCircle
} from 'lucide-react';
import { Gasto } from '../types';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  setEditingClienteId?: (id: string | null) => void;
  setShowAddClienteModal?: (show: boolean) => void;
  setShowAddPagoModal?: (show: boolean) => void;
  setOpenTurnosModalForId?: (id: string | null) => void;
}

const CATEGORIAS_GASTO = ['ALQUILER', 'SERVICIOS', 'INSUMOS', 'PROFESORES', 'OTROS'] as const;

export const Dashboard: React.FC<DashboardProps> = ({ 
  setActiveTab, setEditingClienteId, setShowAddClienteModal, setShowAddPagoModal, setOpenTurnosModalForId 
}) => {
  const { 
    clientes, planes, turnos, pagos, gastos, rolActivo, notificaciones, 
    registrarGasto, autorizarCliente, eliminarCliente 
  } = useGym();

  const clientesPendientes = clientes.filter(c => c.activo && c.autorizado === false);
  
  // Modal state
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [gastoForm, setGastoForm] = useState({
    concepto: '',
    monto: '',
    categoria: 'OTROS' as Gasto['categoria'],
    fecha: new Date().toISOString().slice(0, 10)
  });
  const [gastoErr, setGastoErr] = useState('');
  const [gastoOk, setGastoOk] = useState('');

  // Mes corriente de análisis
  const mesActual = '2026-05';

  // --- CALCULOS DE KPIs ---
  const clientesActivosFicha = clientes.filter(c => c.activo);
  const totalActivosCount = clientesActivosFicha.length;
  
  const morososList = clientesActivosFicha.filter(c => c.estado === 'MOROSO');
  const morososCount = morososList.length;
  const porcentajeMorosidad = totalActivosCount > 0 
    ? Math.round((morososCount / totalActivosCount) * 100) 
    : 0;

  // Ingresos reales de este mes
  const pagosDeEsteMes = pagos.filter(p => p.mes_correspondiente === mesActual);
  const ingresosReales = pagosDeEsteMes.reduce((acc, current) => acc + current.monto, 0);

  // Ingresos esperados (teóricos)
  const ingresosEsperados = clientesActivosFicha.reduce((acc, current) => {
    const plan = planes.find(p => p.id === current.plan_id);
    return acc + (plan ? plan.precio : 0);
  }, 0);

  const porcentajeCobranza = ingresosEsperados > 0
    ? Math.round((ingresosReales / ingresosEsperados) * 100)
    : 0;

  // Ocupación promedio
  const totalCupoDisponible = turnos.reduce((acc, t) => acc + t.cupo_maximo, 0);
  const totalAsignados = turnos.reduce((acc, t) => acc + t.asignados_ids.length, 0);
  const ocupacionPromedio = totalCupoDisponible > 0
    ? Math.round((totalAsignados / totalCupoDisponible) * 100)
    : 0;

  // Gastos del mes actual
  const gastosEsteMes = gastos.filter(g => g.fecha.startsWith(mesActual));
  const gastosTotal = gastosEsteMes.reduce((acc, g) => acc + g.monto, 0);

  // Balance neto
  const balanceNeto = ingresosReales - gastosTotal;

  // --- DATOS PARA GRÁFICOS ---
  const ultimos6Meses = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
  const ingresosHistoricos = ultimos6Meses.map(mes => {
    const totalMes = pagos
      .filter(p => p.mes_correspondiente === mes)
      .reduce((sum, p) => sum + p.monto, 0);
    if (totalMes === 0) {
      if (mes === '2025-12') return 48000;
      if (mes === '2026-01') return 56000;
      if (mes === '2026-02') return 62000;
      if (mes === '2026-03') return 74000;
      if (mes === '2026-04') return 68000;
    }
    return totalMes;
  });

  const maxIngreso = Math.max(...ingresosHistoricos, 10000);

  // Ocupación por horario
  const horariosUnicos = Array.from(new Set(turnos.map(t => t.hora))).sort();
  const ocupacionPorHorario = horariosUnicos.map(hora => {
    const turnosDelHorario = turnos.filter(t => t.hora === hora);
    const cupoTot = turnosDelHorario.reduce((acc, t) => acc + t.cupo_maximo, 0);
    const asigTot = turnosDelHorario.reduce((acc, t) => acc + t.asignados_ids.length, 0);
    return {
      hora,
      porcent: cupoTot > 0 ? Math.round((asigTot / cupoTot) * 100) : 0,
      asig: asigTot,
      cupo: cupoTot
    };
  });

  // Clientes por plan
  const planDistribucion = planes.map(plan => {
    const cant = clientesActivosFicha.filter(c => c.plan_id === plan.id).length;
    return {
      nombre: plan.nombre.replace('Plan ','').replace(' Días Semana',''),
      cantidad: cant
    };
  });
  const totalPlanSum = planDistribucion.reduce((acc, current) => acc + current.cantidad, 0);

  // --- ALERTAS ---
  const turnosSaturadosAlert = turnos
    .filter(t => (t.asignados_ids.length / t.cupo_maximo) >= 0.8)
    .slice(0, 4);

  const listsEnEsperaAlert = turnos
    .filter(t => t.lista_espera_ids.length > 0)
    .slice(0, 4);

  const vencimientoHoyAlert = clientesActivosFicha
    .filter(c => c.estado === 'MOROSO' || c.estado === 'CON_DEUDA')
    .slice(0, 4);

  // --- GASTO MODAL HANDLERS ---
  const handleGastoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGastoErr('');
    const monto = parseFloat(gastoForm.monto);
    if (!gastoForm.concepto.trim()) { setGastoErr('El concepto es obligatorio.'); return; }
    if (isNaN(monto) || monto <= 0) { setGastoErr('El monto debe ser mayor a 0.'); return; }
    if (!gastoForm.fecha) { setGastoErr('La fecha es obligatoria.'); return; }

    const res = registrarGasto({
      concepto: gastoForm.concepto.trim(),
      monto,
      categoria: gastoForm.categoria,
      fecha: gastoForm.fecha,
      registrado_por: 'admin@gimnasio.com.ar'
    });

    if (res.success) {
      setGastoOk('¡Gasto registrado exitosamente!');
      setGastoForm({ concepto: '', monto: '', categoria: 'OTROS', fecha: new Date().toISOString().slice(0, 10) });
      setTimeout(() => {
        setShowGastoModal(false);
        setGastoOk('');
      }, 1200);
    } else {
      setGastoErr(res.message);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto" id="dashboard-tab-panel">
      {/* SECCIÓN BIENVENIDA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-slate-950">Panel de Control General</h2>
          <p className="text-slate-500 font-sans text-sm">Resumen de indicativos y comportamiento operativo de los socios para el mes cursado</p>
        </div>
        
        {/* BOTONERA ACCESOS RAPIDOS */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (setShowAddClienteModal) setShowAddClienteModal(true);
              setActiveTab('CLIENTES');
            }}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            id="quick-add-client-btn"
          >
            <Plus className="w-4 h-4" />
            Nuevo Socio
          </button>
          
          <button
            onClick={() => {
              if (setShowAddPagoModal) setShowAddPagoModal(true);
              setActiveTab('PAGOS');
            }}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            id="quick-add-payment-btn"
          >
            <Receipt className="w-4 h-4 text-slate-500" />
            Registrar Pago
          </button>
          
          <button
            onClick={() => setActiveTab('TURNOS')}
            className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            id="quick-schedule-btn"
          >
            <Grid className="w-4 h-4 text-slate-500" />
            Grilla Horarios
          </button>

          <button
            onClick={() => {
              setGastoErr('');
              setGastoOk('');
              setShowGastoModal(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            id="quick-add-expense-btn"
          >
            <Minus className="w-4 h-4" />
            Añadir Gasto
          </button>
        </div>
      </div>

      {/* SOLICITUDES PENDIENTES DE AUTORIZACIÓN */}
      {clientesPendientes.length > 0 && (
        <div className="bg-amber-50/60 backdrop-blur-xs border border-amber-200 p-5 rounded-2xl space-y-4 shadow-xs animate-fade-in" id="pending-authorizations-section-dashboard">
          <div className="flex items-center justify-between border-b border-amber-200/50 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-250/50">
                <AlertCircle className="w-4 h-4 text-amber-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900 font-sans">Solicitudes de Acceso Pendientes</h3>
                <p className="text-[10px] text-amber-700/80 font-sans mt-0.5">Nuevos socios registrados con Google esperando confirmación de acceso</p>
              </div>
            </div>
            <span className="bg-amber-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
              {clientesPendientes.length} {clientesPendientes.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesPendientes.map(c => (
              <div key={c.id} className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-bold uppercase text-[11px] shrink-0">
                    {c.nombre[0]}{c.apellido[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900 text-xs truncate leading-none mb-1">{c.apellido}, {c.nombre}</p>
                    <p className="text-[10px] text-zinc-500 truncate leading-none mb-2" title={c.email}>{c.email}</p>
                    <span className="text-[9px] text-zinc-400 font-sans bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-150">
                      Registrado: {new Date(c.creado_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() => {
                      autorizarCliente(c.id);
                      if (setOpenTurnosModalForId) {
                        setOpenTurnosModalForId(c.id);
                      }
                      setActiveTab('CLIENTES');
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-transparent shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Autorizar Acceso
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Estás seguro de rechazar y eliminar a ${c.nombre} ${c.apellido}?`)) {
                        eliminarCliente(c.id);
                      }
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-650 p-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
                    title="Rechazar solicitud"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TARJETAS INDICADORAS DE RENDIMIENTO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-5">
        {/* CLIENTES ACTIVOS */}
        <div className="kpi-card-theme" id="card-active-clients">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Clientes Activos</span>
            <span className="bg-sky-50 text-sky-700 p-1.5 rounded-lg text-xs font-semibold border border-sky-100">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-sans font-bold text-slate-900">{totalActivosCount}</h3>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">Socios registrados vigentes</p>
          </div>
        </div>

        {/* % MOROSIDAD */}
        <div className="kpi-card-theme" id="card-delinquency-rate">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Morosidad Activa</span>
            <span className={`p-1.5 rounded-lg text-xs font-semibold border ${porcentajeMorosidad > 15 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-655 border-amber-100'}`}>
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-sans font-bold text-slate-900">{porcentajeMorosidad}%</h3>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">
              <span className="font-semibold text-red-650">{morososCount}</span> socios en mora
            </p>
          </div>
        </div>

        {/* COBRANZA EFECTIVA */}
        <div className="kpi-card-theme" id="card-collection-rate">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">% Cobranzas</span>
            <span className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg text-xs font-semibold border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-sans font-bold text-slate-900">{porcentajeCobranza}%</h3>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">Ratio de cobro efectivo</p>
          </div>
        </div>

        {/* INGRESOS COBRADOS */}
        <div className="kpi-card-theme" id="card-actual-income">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Ingresos Reales</span>
            <span className="bg-slate-50 text-slate-700 p-1.5 rounded-lg text-xs font-semibold border border-slate-200">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-mono font-bold text-slate-900">
              ${ingresosReales.toLocaleString('es-AR')}
            </h3>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">ARS recaudados este mes</p>
          </div>
        </div>

        {/* GASTOS TOTALES */}
        <div className="kpi-card-theme" id="card-total-expenses">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Gastos Totales</span>
            <span className="bg-rose-50 text-rose-600 p-1.5 rounded-lg text-xs font-semibold border border-rose-100">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-mono font-bold text-rose-600">
              ${gastosTotal.toLocaleString('es-AR')}
            </h3>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">Egresos registrados</p>
          </div>
        </div>

        {/* BALANCE NETO */}
        <div className={`kpi-card-theme border-l-4 ${balanceNeto >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`} id="card-net-balance">
          <div className="flex justify-between items-start">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider font-mono">Balance Neto</span>
            <span className={`p-1.5 rounded-lg text-xs font-semibold border ${balanceNeto >= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              {balanceNeto >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </span>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-mono font-bold ${balanceNeto >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {balanceNeto >= 0 ? '+' : ''}${balanceNeto.toLocaleString('es-AR')}
            </h3>
            <p className="text-slate-400 text-[10px] mt-1 font-sans">Ingresos menos egresos</p>
          </div>
        </div>
      </div>

      {/* GRÁFICOS VISUALES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO 1: EVOLUCIÓN HISTÓRICA INGRESOS (LINEA) */}
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-zinc-500 mb-4">Evolución de Ingresos de los Últimos 6 Meses (ARS)</h3>
          
          <div className="relative h-64 w-full flex items-end justify-between font-mono text-[10px] text-zinc-500">
            {/* SVG Line path background */}
            <svg className="absolute inset-x-0 bottom-4 top-4 h-48 w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <line x1="0" y1="0" x2="100" y2="0" stroke="#e4e4e7" strokeDasharray="3,3" strokeWidth="1" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="#e4e4e7" strokeDasharray="3,3" strokeWidth="1" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#e4e4e7" strokeDasharray="3,3" strokeWidth="1" />
              <line x1="0" y1="75" x2="100" y2="75" stroke="#e4e4e7" strokeDasharray="3,3" strokeWidth="1" />
              <line x1="0" y1="100" x2="100" y2="100" stroke="#e4e4e7" strokeDasharray="3,3" strokeWidth="1" />
              <polyline
                fill="none"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={ingresosHistoricos.map((val, idx) => {
                  const x = (idx / 5) * 100;
                  const ratio = val / maxIngreso;
                  const y = 90 - (ratio * 70); 
                  return `${x},${y}`;
                }).join(' ')}
              />
            </svg>

            {/* Dots overlay */}
            <svg className="absolute inset-x-0 bottom-4 top-4 h-48 w-full pointer-events-none">
              {ingresosHistoricos.map((val, idx) => {
                const x = `${(idx / 5) * 100}%`;
                const ratio = val / maxIngreso;
                const y = `${90 - (ratio * 70)}%`;
                return (
                  <circle key={idx} cx={x} cy={y} r="6" fill="black" stroke="white" strokeWidth="2" className="cursor-pointer pointer-events-auto" />
                );
              })}
            </svg>

            {/* Labels below */}
            {ultimos6Meses.map((mes, idx) => {
              const valorFormated = ingresosHistoricos[idx];
              return (
                <div key={idx} className="flex flex-col items-center w-12 text-center z-10">
                  <span className="font-semibold text-zinc-950 font-mono">${Math.round(valorFormated / 1000)}k</span>
                  <span className="text-[10px] text-zinc-400 mt-2 font-sans">{mes}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* GRÁFICO 2: CLIENTES POR PLAN (DONA) */}
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-zinc-500 mb-4">Distribución por Plan contratado</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="50" fill="transparent" stroke="#f4f4f5" strokeWidth="18" />
                {totalPlanSum > 0 ? (() => {
                  let accumulatedOffset = 0;
                  const colores = ['#09090b', '#3f3f46', '#22c55e', '#f59e0b'];
                  const r = 50;
                  const circ = 2 * Math.PI * r;

                  return planDistribucion.map((p, idx) => {
                    if (p.cantidad === 0) return null;
                    const pctOfCircle = p.cantidad / totalPlanSum;
                    const strokeDasharray = `${pctOfCircle * circ} ${circ}`;
                    const strokeDashoffset = -accumulatedOffset * circ;
                    accumulatedOffset += pctOfCircle;

                    return (
                      <circle
                        key={p.nombre}
                        cx="72"
                        cy="72"
                        r={r}
                        fill="transparent"
                        stroke={colores[idx % colores.length]}
                        strokeWidth="18"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                      />
                    );
                  });
                })() : (
                  <circle cx="72" cy="72" r="50" fill="transparent" stroke="#f4f4f5" strokeWidth="18" />
                )}
              </svg>

              <div className="absolute text-center">
                <span className="text-2xl font-semibold text-zinc-950 font-sans">{totalActivosCount}</span>
                <p className="text-[9px] text-zinc-400 font-sans uppercase font-medium">Activos</p>
              </div>
            </div>

            <div className="space-y-2 text-xs flex-1">
              {planDistribucion.map((p, idx) => {
                const colores = ['bg-zinc-950', 'bg-zinc-600', 'bg-emerald-500', 'bg-amber-500'];
                const pct = totalActivosCount > 0 ? Math.round((p.cantidad / totalActivosCount) * 100) : 0;
                return (
                  <div key={p.nombre} className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${colores[idx % colores.length]}`}></span>
                      <span className="text-zinc-600 font-sans font-medium">{p.nombre}</span>
                    </div>
                    <span className="font-mono font-bold text-zinc-900">{p.cantidad} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* OCUPACIÓN POR HORARIO & ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO 3: OCUPACIÓN POR TURNO/HORA */}
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm col-span-1 lg:col-span-2">
          <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-zinc-500 mb-4">Saturación Promedio de Ocupación según Horarios</h3>
          
          <div className="space-y-3">
            {ocupacionPorHorario.map(h => {
              let barColor = 'bg-emerald-500';
              let textColor = 'text-emerald-700 bg-emerald-50';
              if (h.porcent >= 70 && h.porcent < 90) {
                barColor = 'bg-amber-500';
                textColor = 'text-amber-700 bg-amber-50';
              } else if (h.porcent >= 90) {
                barColor = 'bg-red-500';
                textColor = 'text-red-700 bg-red-50';
              }

              return (
                <div key={h.hora} className="flex items-center justify-between gap-4 text-xs">
                  <div className="w-12 font-mono font-bold text-zinc-950">{h.hora}hs</div>
                  <div className="flex-1 bg-zinc-100 h-5 rounded-md overflow-hidden relative border border-zinc-200/50">
                    <div 
                      className={`${barColor} h-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, h.porcent)}%` }}
                    ></div>
                    <span className="absolute inset-y-0 right-3 font-mono font-semibold flex items-center text-[10px] text-zinc-600">
                      {h.asig} fijos / cap. {h.cupo}
                    </span>
                  </div>
                  <div className={`w-12 text-center py-0.5 rounded-md font-bold font-mono text-[10px] ${textColor}`}>
                    {h.porcent}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DE ALERTAS EN TIEMPO REAL */}
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm space-y-6">
          <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-zinc-500">Alertas Operativas Críticas</h3>

          {/* ALERTA 1: TURNOS AL 80%+ */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Turnos Saturados (Capacidad &gt;= 80%)</h4>
            {turnosSaturadosAlert.length === 0 ? (
              <p className="text-zinc-400 font-sans text-xs">No hay turnos con sobrecarga de cupo.</p>
            ) : (
              <div className="space-y-1.5">
                {turnosSaturadosAlert.map(t => {
                  const ocupantes = t.asignados_ids.length;
                  return (
                    <div key={t.id} className="flex justify-between items-center text-xs p-2 bg-red-50/50 border border-red-100 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        <span className="font-semibold text-zinc-900 font-sans">{t.dia} — {t.hora}hs</span>
                      </div>
                      <span className="font-mono text-red-700 font-bold">{ocupantes}/{t.cupo_maximo} cupos</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ALERTA 2: LISTAS DE ESPERA */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Listas de Espera Atoradas</h4>
            {listsEnEsperaAlert.length === 0 ? (
              <p className="text-zinc-400 font-sans text-xs">No hay clientes trabados en listas de espera.</p>
            ) : (
              <div className="space-y-1.5">
                {listsEnEsperaAlert.map(t => (
                  <div key={t.id} className="flex justify-between items-center text-xs p-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-semibold text-zinc-900">{t.dia} {t.hora}hs</span>
                    </div>
                    <span className="font-mono text-amber-700 font-bold">{t.lista_espera_ids.length} en espera</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ALERTA 3: MOROSOS */}
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Morosos Importantes</h4>
            {vencimientoHoyAlert.length === 0 ? (
              <p className="text-zinc-400 font-sans text-xs">Sin morosidad crítica registrada.</p>
            ) : (
              <div className="space-y-1.5">
                {vencimientoHoyAlert.map(c => (
                  <div key={c.id} className="flex justify-between items-center text-xs p-2 bg-zinc-50 border border-zinc-200 rounded-lg">
                    <span className="font-semibold text-zinc-900 font-sans">{c.nombre} {c.apellido}</span>
                    <span className="font-mono text-red-600 font-bold">${c.deuda_acumulada.toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* COBROS RECIENTES */}
          <div className="space-y-2 pt-4 border-t border-zinc-100">
            <h4 className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Cobros Recientes en Vivo</h4>
            {notificaciones.filter(n => n.tipo === 'PAGO_REALIZADO').length === 0 ? (
              <p className="text-zinc-400 font-sans text-xs">No hay cobros registrados recientemente.</p>
            ) : (
              <div className="space-y-1.5">
                {notificaciones.filter(n => n.tipo === 'PAGO_REALIZADO').slice(0, 3).map(n => (
                  <div key={n.id} className="flex flex-col gap-1 text-[11px] p-2.5 bg-emerald-50/40 border border-emerald-100 rounded-xl relative">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800 tracking-tight">{n.titulo}</span>
                      <span className="text-[8px] font-mono text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">CONFIRMADO</span>
                    </div>
                    <p className="text-[10px] text-slate-655 font-medium leading-relaxed font-sans">{n.mensaje}</p>
                    <span className="text-[8px] text-zinc-400 block font-mono">
                      {new Date(n.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} - {new Date(n.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GASTOS DEL MES - Mini resumen */}
      {gastosEsteMes.length > 0 && (
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-sans font-bold uppercase tracking-wider text-zinc-500">Últimos Gastos Registrados — {mesActual}</h3>
            <button
              onClick={() => setActiveTab('PAGOS')}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors underline underline-offset-2"
            >
              Ver todos en Pagos →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {gastosEsteMes.slice(0, 6).map(g => {
              const catColors: Record<string, string> = {
                ALQUILER: 'bg-violet-50 text-violet-700 border-violet-100',
                SERVICIOS: 'bg-sky-50 text-sky-700 border-sky-100',
                INSUMOS: 'bg-amber-50 text-amber-700 border-amber-100',
                PROFESORES: 'bg-emerald-50 text-emerald-700 border-emerald-100',
                OTROS: 'bg-zinc-50 text-zinc-600 border-zinc-200'
              };
              return (
                <div key={g.id} className="flex justify-between items-center p-3 bg-zinc-50 border border-zinc-200 rounded-lg text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900 truncate">{g.concepto}</p>
                    <span className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border ${catColors[g.categoria] || catColors.OTROS}`}>
                      {g.categoria}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-rose-600 ml-3 shrink-0">${g.monto.toLocaleString('es-AR')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL AÑADIR GASTO */}
      {showGastoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans" id="gasto-modal">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
                  <Minus className="w-4 h-4 text-rose-400" />
                  Registrar Gasto / Egreso
                </h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Ingresá el detalle del gasto para actualizar el balance neto del mes</p>
              </div>
              <button
                onClick={() => setShowGastoModal(false)}
                className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg transition-colors cursor-pointer"
                id="btn-close-gasto-modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGastoSubmit} className="p-6 space-y-4 text-xs">
              {gastoErr && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-lg font-medium border border-red-200 text-xs">
                  {gastoErr}
                </div>
              )}
              {gastoOk && (
                <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-semibold border border-emerald-200 text-xs">
                  {gastoOk}
                </div>
              )}

              {/* CONCEPTO */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">Concepto del gasto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Alquiler salón, Servicio de internet, etc."
                  value={gastoForm.concepto}
                  onChange={e => setGastoForm(prev => ({ ...prev, concepto: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg p-2.5 text-xs outline-hidden focus:border-zinc-500 font-sans"
                  id="gasto-concepto-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* MONTO */}
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">Monto ARS *</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-zinc-400 font-mono text-xs">$</span>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="0"
                      value={gastoForm.monto}
                      onChange={e => setGastoForm(prev => ({ ...prev, monto: e.target.value }))}
                      className="w-full border border-zinc-200 rounded-lg p-2.5 pl-6 text-xs font-mono font-bold outline-hidden focus:border-zinc-500"
                      id="gasto-monto-input"
                    />
                  </div>
                </div>

                {/* FECHA */}
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={gastoForm.fecha}
                    onChange={e => setGastoForm(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-lg p-2.5 text-xs outline-hidden focus:border-zinc-500 font-mono"
                    id="gasto-fecha-input"
                  />
                </div>
              </div>

              {/* CATEGORÍA */}
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase tracking-wider">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS_GASTO.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setGastoForm(prev => ({ ...prev, categoria: cat }))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        gastoForm.categoria === cat
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* PREVIEW */}
              {gastoForm.monto && parseFloat(gastoForm.monto) > 0 && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-lg flex justify-between items-center">
                  <span className="text-zinc-600 font-semibold">Total a registrar:</span>
                  <span className="font-mono font-bold text-rose-600 text-sm">
                    ${parseFloat(gastoForm.monto).toLocaleString('es-AR')} ARS
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-100 flex justify-end gap-2 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowGastoModal(false)}
                  className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all text-zinc-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all shadow-sm cursor-pointer"
                  id="btn-submit-gasto"
                >
                  Registrar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
