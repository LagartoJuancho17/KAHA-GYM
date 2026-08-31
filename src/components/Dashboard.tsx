// src/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useGym } from '../GymContext';
import { 
  Users, AlertTriangle, TrendingUp, DollarSign, 
  Calendar, ArrowUpRight, Plus, Receipt, Grid, ListOrdered,
  TrendingDown, X, Minus, Check, AlertCircle, CheckCircle2,
  Eye, EyeOff
} from 'lucide-react';
import { Gasto, PagoEnRevision } from '../types';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
  setEditingClienteId?: (id: string | null) => void;
  setShowAddClienteModal?: (show: boolean) => void;
  setShowAddPagoModal?: (show: boolean) => void;
  setOpenTurnosModalForId?: (id: string | null) => void;
  onStartAuthorization?: (clientId: string) => void;
}

const CATEGORIAS_GASTO = ['ALQUILER', 'SERVICIOS', 'INSUMOS', 'PROFESORES', 'OTROS'] as const;

export const Dashboard: React.FC<DashboardProps> = ({ 
  setActiveTab, setEditingClienteId, setShowAddClienteModal, setShowAddPagoModal, setOpenTurnosModalForId, onStartAuthorization 
}) => {
  const { 
    clientes, planes, turnos, pagos, gastos, rolActivo, notificaciones, 
    registrarGasto, autorizarCliente, eliminarCliente,
    pagosEnRevision, aprobarPagoTransferencia, rechazarPagoTransferencia, googleUser
  } = useGym();

  const clientesPendientes = clientes.filter(c => c.activo && c.autorizado === false);
  const transferenciasPendientes = pagosEnRevision?.filter(p => p.estado === 'PENDIENTE') || [];
  
  // Modal state
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [transferToApprove, setTransferToApprove] = useState<PagoEnRevision | null>(null);
  const [destinoSeleccionado, setDestinoSeleccionado] = useState<'JUANCHI' | 'RULO'>('JUANCHI');
  const [gastoForm, setGastoForm] = useState({
    concepto: '',
    monto: '',
    categoria: 'OTROS' as Gasto['categoria'],
    fecha: new Date().toISOString().slice(0, 10)
  });
  const [gastoErr, setGastoErr] = useState('');
  const [gastoOk, setGastoOk] = useState('');

  // Privacy / Visibilidad de Balance: SIEMPRE OCULTO por defecto al abrir el Dashboard
  const [mostrarBalance, setMostrarBalance] = useState<boolean>(false);

  const handleToggleBalance = () => {
    setMostrarBalance(prev => !prev);
  };

  // Mes corriente de análisis (dinámico)
  const mesActual = new Date().toISOString().slice(0, 7);

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

  // --- DATOS PARA GRÁFICOS (dinámico, últimos 6 meses desde hoy) ---
  const ultimos6Meses = (() => {
    const meses: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return meses;
  })();

  // Datos históricos para gráficos (100% reales basados en registros de pago)
  const ingresosHistoricos = ultimos6Meses.map((mes) => {
    return pagos
      .filter(p => p.mes_correspondiente === mes)
      .reduce((sum, p) => sum + p.monto, 0);
  });

  const maxIngreso = Math.max(...ingresosHistoricos, 10000);

  // Ocupación por horario (dinámico en base a los turnos reales de la grilla)
  const horariosUnicos = Array.from(new Set(turnos.map(t => t.hora.slice(0, 5)))).sort();
  const ocupacionPorHorario = horariosUnicos
    .map(hora => {
      const turnosDelHorario = turnos.filter(t => t.hora.slice(0, 5) === hora);
      const cupoTot = turnosDelHorario.reduce((acc, t) => acc + t.cupo_maximo, 0);
      const asigTot = turnosDelHorario.reduce((acc, t) => acc + t.asignados_ids.length, 0);
      return {
        hora,
        porcent: cupoTot > 0 ? Math.round((asigTot / cupoTot) * 100) : 0,
        asig: asigTot,
        cupo: cupoTot,
        cantTurnos: turnosDelHorario.length
      };
    })
    .filter(h => h.cantTurnos > 0);

  // Clientes por plan
  const planDistribucion = planes.map(plan => {
    const cant = clientesActivosFicha.filter(c => c.plan_id === plan.id).length;
    return {
      id: plan.id,
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

  // Escape key closes modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGastoModal(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

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

  // Nombre legible del mes actual
  const mesNombre = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 p-3 sm:p-6 max-w-7xl mx-auto overflow-x-hidden" id="dashboard-tab-panel">
      {/* SECCIÓN BIENVENIDA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 leading-[1.05]">Panel de Control</h2>
          <p className="text-zinc-500 font-sans text-sm mt-1.5">
            Indicadores operativos · <span className="font-semibold text-zinc-800 capitalize">{mesNombre}</span>
          </p>
        </div>
        
        {/* BOTONERA ACCESOS RAPIDOS */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (setShowAddPagoModal) setShowAddPagoModal(true);
              setActiveTab('PAGOS');
            }}
            className="bg-zinc-900 hover:bg-black text-white pl-4 pr-1.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow-md cursor-pointer"
            id="quick-add-payment-btn"
          >
            Registrar Pago
            <span className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 text-zinc-950 font-bold" />
            </span>
          </button>

          <button
            onClick={() => {
              setGastoErr('');
              setGastoOk('');
              setShowGastoModal(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer"
            id="quick-add-expense-btn"
          >
            <Minus className="w-3.5 h-3.5 text-white" />
            Añadir Gasto
          </button>

          <button
            onClick={() => {
              if (setShowAddClienteModal) setShowAddClienteModal(true);
              setActiveTab('CLIENTES');
            }}
            className="bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            id="quick-add-client-btn"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-500" />
            Nuevo Socio
          </button>

          <button
            onClick={() => setActiveTab('TURNOS')}
            className="bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-200 px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            id="quick-schedule-btn"
          >
            <Grid className="w-3.5 h-3.5 text-zinc-500" />
            Grilla Horarios
          </button>
        </div>
      </div>

      {/* TRANSFERENCIAS PENDIENTES DE REVISIÓN */}
      {transferenciasPendientes.length > 0 && (
        <div className="bg-emerald-50/60 backdrop-blur-xs border border-emerald-200 p-5 rounded-2xl space-y-4 shadow-xs animate-fade-in mb-6" id="pending-transfers-section-dashboard">
          <div className="flex items-center justify-between border-b border-emerald-200/50 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-200/50">
                <Receipt className="w-4 h-4 text-emerald-600 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 font-sans">Transferencias a Confirmar (Revisión)</h3>
                <p className="text-[10px] text-emerald-700/80 font-sans mt-0.5">Socios que notificaron pago por transferencia bancaria</p>
              </div>
            </div>
            <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
              {transferenciasPendientes.length} {transferenciasPendientes.length === 1 ? 'pendiente' : 'pendientes'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {transferenciasPendientes.map(p => (
              <div key={p.id} className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 font-bold uppercase text-[11px] shrink-0">
                    {p.cliente_nombre_completo[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900 text-xs truncate leading-none mb-1">{p.cliente_nombre_completo}</p>
                    <p className="text-[10px] text-emerald-700 font-mono font-bold leading-none mb-2">
                      Monto: ${p.monto.toLocaleString('es-AR')} ARS
                    </p>
                    <div className="flex flex-col gap-0.5 text-[9px] text-zinc-500">
                      <span>Mes: {p.mes_correspondiente}</span>
                      <span>Notificado: {new Date(p.solicitado_at).toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() => {
                      setDestinoSeleccionado('JUANCHI');
                      setTransferToApprove(p);
                    }}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded-lg text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-transparent shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Aprobar Pago
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Rechazar la solicitud de transferencia de ${p.cliente_nombre_completo}?`)) {
                        rechazarPagoTransferencia(p.id);
                      }
                    }}
                    className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
                    title="Rechazar y cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOLICITUDES PENDIENTES DE AUTORIZACIÓN */}
      {clientesPendientes.length > 0 && (
        <div className="bg-amber-50/60 backdrop-blur-xs border border-amber-200 p-5 rounded-2xl space-y-4 shadow-xs animate-fade-in" id="pending-authorizations-section-dashboard">
          <div className="flex items-center justify-between border-b border-amber-200/50 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-200/50">
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
                    <span className="text-[9px] text-zinc-400 font-sans bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-100">
                      Registrado: {new Date(c.creado_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() => {
                      if (onStartAuthorization) {
                        onStartAuthorization(c.id);
                      } else {
                        autorizarCliente(c.id);
                        if (setOpenTurnosModalForId) {
                          setOpenTurnosModalForId(c.id);
                        }
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
                    className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
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

      {/* BENTO DE INDICADORES (jerarquía por tamaño de tile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 auto-rows-[150px] gap-4">

        {/* HERO — Balance del mes (tile 2x2, oscuro) */}
        <button
          onClick={() => setActiveTab('PAGOS')}
          className="group col-span-2 row-span-2 bg-zinc-900 text-white rounded-3xl p-7 text-left flex flex-col justify-between relative overflow-hidden cursor-pointer transition-transform hover:-translate-y-0.5"
          id="card-net-balance"
        >
          <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-lime-300/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Balance del mes</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleBalance();
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer border-none bg-transparent"
                title={mostrarBalance ? "Ocultar balance" : "Mostrar balance"}
                id="btn-toggle-dashboard-balance"
              >
                {mostrarBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
              </button>
            </div>
            <span className="w-8 h-8 rounded-full bg-lime-300 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-zinc-900" />
            </span>
          </div>

          <div className="relative z-10">
            <div className={`font-display text-3xl sm:text-5xl xl:text-6xl font-bold leading-none tracking-tight ${balanceNeto >= 0 ? 'text-lime-300' : 'text-rose-400'}`}>
              {mostrarBalance
                ? `${balanceNeto >= 0 ? '' : '−'}$${Math.abs(balanceNeto).toLocaleString('es-AR')}`
                : '$ •••••••'}
            </div>
            <p className="text-zinc-400 text-xs mt-2 capitalize">{mesNombre} · Ingresos − Egresos</p>
          </div>

          <div className="space-y-2.5 relative z-10">
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-lime-300" />Ingresos</span>
              <span className="font-mono font-semibold text-white">
                {mostrarBalance ? `$${ingresosReales.toLocaleString('es-AR')}` : '$ •••••••'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" />Gastos</span>
              <span className="font-mono font-semibold text-white">
                {mostrarBalance ? `$${gastosTotal.toLocaleString('es-AR')}` : '$ •••••••'}
              </span>
            </div>
            <div className="pt-3 border-t border-white/10">
              <div className="flex justify-between text-[10px] text-zinc-400 mb-1.5">
                <span className="uppercase tracking-wider">Cobranza</span>
                <span className="font-mono">{porcentajeCobranza}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-lime-300 rounded-full transition-all"
                  style={{ width: `${Math.min(100, porcentajeCobranza)}%` }}
                />
              </div>
            </div>
          </div>
        </button>

        {/* Socios Activos */}
        <button
          onClick={() => setActiveTab('CLIENTES')}
          className="group bg-white border border-zinc-200/70 rounded-3xl p-5 text-left flex flex-col justify-between cursor-pointer transition-all hover:border-zinc-900 hover:-translate-y-0.5"
          id="card-active-clients"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Socios Activos</span>
            <Users className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display text-4xl font-bold text-zinc-900 leading-none">{totalActivosCount}</span>
            <ArrowUpRight className="w-4 h-4 text-zinc-300 mb-1 group-hover:text-zinc-900 transition-colors" />
          </div>
        </button>

        {/* Morosidad */}
        <button
          onClick={() => setActiveTab('MOROSIDAD')}
          className="group bg-white border border-zinc-200/70 rounded-3xl p-5 text-left flex flex-col justify-between cursor-pointer transition-all hover:border-zinc-900 hover:-translate-y-0.5"
          id="card-delinquency-rate"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Morosidad</span>
            <AlertTriangle className={`w-4 h-4 transition-colors ${porcentajeMorosidad > 15 ? 'text-rose-500' : 'text-zinc-300 group-hover:text-zinc-900'}`} />
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display text-4xl font-bold text-zinc-900 leading-none">{porcentajeMorosidad}<span className="text-2xl text-zinc-400">%</span></span>
            <span className="text-[10px] text-zinc-400 mb-1"><span className="font-semibold text-rose-500">{morososCount}</span> en mora</span>
          </div>
        </button>

        {/* Ocupación */}
        <div
          className="bg-white border border-zinc-200/70 rounded-3xl p-5 flex flex-col justify-between"
          id="card-occupancy"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Ocupación</span>
            <TrendingUp className="w-4 h-4 text-zinc-300" />
          </div>
          <div>
            <span className="font-display text-4xl font-bold text-zinc-900 leading-none">{ocupacionPromedio}<span className="text-2xl text-zinc-400">%</span></span>
            <div className="mt-2 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-900 rounded-full transition-all" style={{ width: `${Math.min(100, ocupacionPromedio)}%` }} />
            </div>
          </div>
        </div>

        {/* Pendientes de autorización */}
        <button
          onClick={() => setActiveTab('CLIENTES')}
          className="group bg-white border border-zinc-200/70 rounded-3xl p-5 text-left flex flex-col justify-between cursor-pointer transition-all hover:border-zinc-900 hover:-translate-y-0.5"
          id="card-pending"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">Pendientes</span>
            <span className={`w-2 h-2 rounded-full ${clientesPendientes.length > 0 ? 'bg-lime-400 animate-pulse' : 'bg-zinc-200'}`} />
          </div>
          <div className="flex items-end justify-between">
            <span className="font-display text-4xl font-bold text-zinc-900 leading-none">{clientesPendientes.length}</span>
            <span className="text-[10px] text-zinc-400 mb-1">por autorizar</span>
          </div>
        </button>
      </div>

      {/* GRÁFICOS VISUALES PREMIUM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO 1: EVOLUCIÓN HISTÓRICA INGRESOS (CURVA BEZIER FLUIDA) */}
        <div className="bg-white border border-zinc-200/80 p-6 rounded-3xl col-span-1 lg:col-span-2 flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400">Evolución Financiera</h3>
              </div>
              <p className="text-sm font-extrabold text-zinc-900 font-display mt-0.5">Ingresos Recaudados (Últimos 6 Meses)</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 text-emerald-800 px-3 py-1 rounded-full text-[10px] font-bold font-mono shadow-2xs">
              <span>🚀 Tendencia Positiva</span>
            </div>
          </div>

          <div className="relative h-64 w-full flex items-end justify-between font-mono text-[10px] text-zinc-500 pt-6 pb-2">
            {/* SVG Background Grid & Smooth Bezier Path */}
            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="smoothAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                </linearGradient>
                <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#059669" floodOpacity="0.3" />
                </filter>
              </defs>

              {/* Dotted Horizontal Grid Lines */}
              <line x1="0" y1="20" x2="100" y2="20" stroke="#f1f5f9" strokeDasharray="3,3" strokeWidth="1" />
              <line x1="0" y1="45" x2="100" y2="45" stroke="#f1f5f9" strokeDasharray="3,3" strokeWidth="1" />
              <line x1="0" y1="70" x2="100" y2="70" stroke="#f1f5f9" strokeDasharray="3,3" strokeWidth="1" />

              {/* Smooth Cubic Bezier Line & Area Polygon */}
              {(() => {
                const points = ingresosHistoricos.map((val, idx) => {
                  const x = (idx / (ingresosHistoricos.length - 1)) * 100;
                  const ratio = maxIngreso > 0 ? val / maxIngreso : 0;
                  const y = 75 - (ratio * 55); 
                  return { x, y };
                });

                // Build Cubic Bezier string
                let bezierPath = `M ${points[0].x},${points[0].y}`;
                for (let i = 0; i < points.length - 1; i++) {
                  const p0 = points[i];
                  const p1 = points[i + 1];
                  const cpX = (p0.x + p1.x) / 2;
                  bezierPath += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
                }

                const areaPath = `${bezierPath} L 100,85 L 0,85 Z`;

                return (
                  <>
                    <path d={areaPath} fill="url(#smoothAreaGrad)" />
                    <path
                      d={bezierPath}
                      fill="none"
                      stroke="#059669"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#emeraldGlow)"
                    />
                  </>
                );
              })()}
            </svg>

            {/* Interactive Nodes & Tooltips */}
            <div className="relative z-10 w-full h-full flex justify-between items-end">
              {ultimos6Meses.map((mes, idx) => {
                const val = ingresosHistoricos[idx];
                const ratio = maxIngreso > 0 ? val / maxIngreso : 0;
                const topPercent = Math.max(15, Math.min(75, 75 - (ratio * 55)));
                const [yyyy, mm] = mes.split('-');
                const mesLabel = new Date(Number(yyyy), Number(mm) - 1, 1)
                  .toLocaleDateString('es-AR', { month: 'short' })
                  .replace('.', '');

                return (
                  <div key={mes} className="flex-1 flex flex-col items-center justify-between h-full relative group cursor-pointer">
                    {/* Tooltip on Hover */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10.5px] px-3 py-1.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-30 whitespace-nowrap shadow-xl font-sans font-bold border border-zinc-800 flex items-center gap-1.5 group-hover:-translate-y-1"
                      style={{ top: `${topPercent - 32}%` }}
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>{mostrarBalance ? `$${val.toLocaleString('es-AR')} ARS` : '$ ••••••'}</span>
                    </div>

                    {/* Glowing Node Dot */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-emerald-600 shadow-lg ring-4 ring-emerald-500/15 group-hover:ring-emerald-500/40 group-hover:scale-130 group-hover:bg-emerald-500 transition-all duration-200 z-20"
                      style={{ top: `${topPercent}%` }}
                    ></div>

                    {/* Month Label */}
                    <div className="mt-auto pt-2 text-center">
                      <span className="font-bold text-zinc-900 block font-mono text-[10.5px]">
                        {mostrarBalance ? `$${Math.round(val / 1000)}k` : '••••'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-sans font-medium capitalize">{mesLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* GRÁFICO 2: CLIENTES POR PLAN (DONA MULTICOLOR) */}
        <div className="bg-white border border-zinc-200/80 p-6 rounded-3xl flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow">
          <div>
            <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-0.5">Membresías</h3>
            <p className="text-sm font-extrabold text-zinc-900 font-display mb-4">Distribución por Plan</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
            <div className="relative w-38 h-38 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="76" cy="76" r="54" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />
                {totalPlanSum > 0 ? (() => {
                  let accumulatedOffset = 0;
                  const colores = ['#09090b', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                  const r = 54;
                  const circ = 2 * Math.PI * r;

                  return planDistribucion.map((p, idx) => {
                    if (p.cantidad === 0) return null;
                    const pctOfCircle = p.cantidad / totalPlanSum;
                    const strokeDasharray = `${pctOfCircle * circ} ${circ}`;
                    const strokeDashoffset = -accumulatedOffset * circ;
                    accumulatedOffset += pctOfCircle;

                    return (
                      <circle
                        key={p.id || p.nombre}
                        cx="76"
                        cy="76"
                        r={r}
                        fill="transparent"
                        stroke={colores[idx % colores.length]}
                        strokeWidth="18"
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-300 hover:opacity-85 hover:stroke-width-[20] cursor-pointer"
                      />
                    );
                  });
                })() : (
                  <circle cx="76" cy="76" r="54" fill="transparent" stroke="#e2e8f0" strokeWidth="18" />
                )}
              </svg>

              <div className="absolute text-center flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-zinc-900 font-display leading-none">{totalActivosCount}</span>
                <span className="text-[9px] text-zinc-400 font-sans font-bold uppercase tracking-wider mt-0.5">Socios Activos</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs flex-1 w-full">
              {planDistribucion.map((p, idx) => {
                const colores = ['bg-zinc-900', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-pink-500'];
                const pct = totalActivosCount > 0 ? Math.round((p.cantidad / totalActivosCount) * 100) : 0;
                return (
                  <div key={p.id || p.nombre} className="flex justify-between items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${colores[idx % colores.length]} shadow-2xs`}></span>
                      <span className="text-zinc-800 font-sans font-semibold text-xs truncate">{p.nombre}</span>
                    </div>
                    <span className="font-mono font-bold text-zinc-900 shrink-0">{p.cantidad} <span className="text-zinc-400 font-normal">({pct}%)</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* OCUPACIÓN POR HORARIO & ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GRÁFICO 3: OCUPACIÓN POR TURNO/HORA (BARRAS DE DEGRADADO FLUIDAS) */}
        <div className="bg-white border border-zinc-200/80 p-6 rounded-3xl col-span-1 lg:col-span-2 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[11px] font-mono font-bold uppercase tracking-widest text-slate-400 mb-0.5">Capacidad Operativa</h3>
              <p className="text-sm font-extrabold text-zinc-900 font-display">Saturación por Horarios de Entrenamiento</p>
            </div>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-full font-semibold">
              Turnos en Grilla
            </span>
          </div>
          
          <div className="space-y-3">
            {ocupacionPorHorario.map(h => {
              let barGradient = 'from-emerald-400 to-teal-500';
              let badgeColor = 'text-emerald-800 bg-emerald-50 border-emerald-200/80';
              if (h.porcent >= 70 && h.porcent < 90) {
                barGradient = 'from-amber-400 to-orange-500';
                badgeColor = 'text-amber-800 bg-amber-50 border-amber-200/80';
              } else if (h.porcent >= 90) {
                barGradient = 'from-rose-500 to-pink-600';
                badgeColor = 'text-rose-800 bg-rose-50 border-rose-200/80';
              }

              return (
                <div key={h.hora} className="flex items-center justify-between gap-4 text-xs group">
                  <div className="w-14 font-mono font-bold text-zinc-900 text-xs shrink-0 flex items-center gap-1">
                    <span>{h.hora}</span>
                    <span className="text-[9px] text-slate-400 font-normal">hs</span>
                  </div>
                  <div className="flex-1 bg-slate-100 h-6 rounded-xl overflow-hidden relative border border-slate-200/60 shadow-inner">
                    <div 
                      className={`bg-gradient-to-r ${barGradient} h-full transition-all duration-700 rounded-xl shadow-2xs`}
                      style={{ width: `${Math.min(100, Math.max(5, h.porcent))}%` }}
                    ></div>
                    <span className="absolute inset-y-0 right-3 font-mono font-semibold flex items-center text-[10px] text-slate-600 select-none">
                      {h.asig} inscritos / cap. {h.cupo}
                    </span>
                  </div>
                  <div className={`w-14 text-center py-1 rounded-xl font-extrabold font-mono text-[10.5px] border ${badgeColor} shrink-0`}>
                    {h.porcent}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PANEL DE ALERTAS EN TIEMPO REAL */}
        <div className="bg-white border border-zinc-200/70 p-6 rounded-3xl space-y-6">
          <h3 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-zinc-400">Alertas Operativas Críticas</h3>

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
                    <p className="text-[10px] text-slate-700 font-medium leading-relaxed font-sans">{n.mensaje}</p>
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
        <div className="bg-white border border-zinc-200/70 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-mono font-semibold uppercase tracking-widest text-zinc-400">Últimos Gastos Registrados — {mesActual}</h3>
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

      {/* MODAL SELECCION DE DESTINO (JUANCHI / RULO) AL APROBAR TRANSFERENCIA */}
      {transferToApprove && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm md:text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Aprobar Transferencia Bancaria
              </h3>
              <button 
                onClick={() => setTransferToApprove(null)} 
                className="text-zinc-400 hover:text-zinc-600 p-1 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1.5 text-xs">
              <p className="font-semibold text-slate-700">Socio: <span className="font-bold text-slate-900">{transferToApprove.cliente_nombre_completo}</span></p>
              <p className="font-semibold text-slate-700">Monto: <span className="font-bold text-emerald-700 font-mono">${transferToApprove.monto.toLocaleString('es-AR')} ARS</span></p>
              <p className="font-semibold text-slate-700">Mes: <span className="font-bold text-slate-900">{transferToApprove.mes_correspondiente}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700 block">
                ¿A qué alias / cuenta ingresó la transferencia?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDestinoSeleccionado('JUANCHI')}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    destinoSeleccionado === 'JUANCHI'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <span className="text-sm font-extrabold">👤 Juanchi</span>
                  <span className="text-[10px] font-medium text-zinc-500 font-mono">Alias Juanchi</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDestinoSeleccionado('RULO')}
                  className={`p-3 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    destinoSeleccionado === 'RULO'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  <span className="text-sm font-extrabold">👤 Rulo</span>
                  <span className="text-[10px] font-medium text-zinc-500 font-mono">Alias Rulo</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 text-xs font-semibold">
              <button
                onClick={() => setTransferToApprove(null)}
                className="px-4 py-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 text-zinc-600 cursor-pointer bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  aprobarPagoTransferencia(transferToApprove.id, googleUser?.email || 'admin@kaha.fit', destinoSeleccionado);
                  setTransferToApprove(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer border-none flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Confirmar Pago a {destinoSeleccionado}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
