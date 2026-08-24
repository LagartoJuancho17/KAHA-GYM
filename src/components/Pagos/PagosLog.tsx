// src/components/Pagos/PagosLog.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Pago, MedioPago, Gasto } from '../../types';
import { 
  Plus, DollarSign, ArrowDownRight, ArrowUpRight, X, Trash2,
  TrendingDown, Calendar, ChevronRight, AlertCircle, Receipt, Check
} from 'lucide-react';

import { PagoFormModal } from './PagoFormModal';
import { PagoCSVImportModal } from './PagoCSVImportModal';
import { PagoReceiptModal } from './PagoReceiptModal';
import { PagosTable } from './PagosTable';
import { PagoDeleteModal } from './PagoDeleteModal';
import { PagoEditModal } from './PagoEditModal';

interface PagosLogProps {
  showAddPagoModal: boolean;
  setShowAddPagoModal: (show: boolean) => void;
}

type SubTab = 'INGRESOS' | 'EGRESOS' | 'LIQUIDACION';

// Days of week -> index
const DIA_IDX: Record<string, number> = {
  LUNES: 1, MARTES: 2, MIERCOLES: 3, JUEVES: 4, VIERNES: 5
};

/** Count occurrences of a weekday (1=Mon..5=Fri) in a given YYYY-MM */
function diasEnMes(diaSemana: number, yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  let count = 0;
  const jsDia = diaSemana === 7 ? 0 : diaSemana;
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === jsDia) count++;
  }
  return count;
}

const CATEGORIAS_GASTO = ['ALQUILER', 'SERVICIOS', 'INSUMOS', 'PROFESORES', 'OTROS'] as const;

// Genera los últimos N meses desde hoy de forma dinámica
function generarUltimosMeses(n = 12) {
  const meses: { value: string; label: string }[] = [];
  const now = new Date();
  const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MESES_ES[d.getMonth()]} ${d.getFullYear()}`;
    meses.push({ value, label });
  }
  return meses;
}
const MESES_OPCIONES = generarUltimosMeses(12);

export const PagosLog: React.FC<PagosLogProps> = ({ showAddPagoModal, setShowAddPagoModal }) => {
  const { 
    pagos, clientes, planes, 
    gastos, registrarGasto, eliminarGasto,
    profesores, turnos, novedadesProfesores, registrarNovedadProfesor, eliminarNovedadProfesor,
    actualizarDestinoPago, eliminarPago
  } = useGym();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('INGRESOS');

  // ─── INGRESOS STATE ──────────────────────────────────────────────
  const [buscarCliente, setBuscarCliente] = useState('');
  const [filtroMedio, setFiltroMedio] = useState<string>('TODOS');
  const [filtroMes, setFiltroMes] = useState<string>(new Date().toISOString().slice(0, 7));

  const [showImportStatementModal, setShowImportStatementModal] = useState(false);
  const [receiptClientText, setReceiptClientText] = useState<string | null>(null);
  const [recibosMultiples, setRecibosMultiples] = useState<Array<{ cliente_nombre: string, messageText: string, telefono: string, copiado: boolean }>>([]);
  const [showRecibosModal, setShowRecibosModal] = useState(false);
  const [pagoParaEliminar, setPagoParaEliminar] = useState<import('../../types').Pago | null>(null);
  const [pagoParaEditar, setPagoParaEditar] = useState<import('../../types').Pago | null>(null);

  // ─── EGRESOS STATE ───────────────────────────────────────────────
  const [filtroMesGastos, setFiltroMesGastos] = useState<string>(new Date().toISOString().slice(0, 7));
  const [filtroCatGastos, setFiltroCatGastos] = useState<string>('TODOS');
  const [showGastoModal, setShowGastoModal] = useState(false);
  const [gastoForm, setGastoForm] = useState({
    concepto: '',
    monto: '',
    categoria: 'OTROS' as Gasto['categoria'],
    fecha: new Date().toISOString().slice(0, 10)
  });
  const [gastoErr, setGastoErr] = useState('');
  const [gastoOk, setGastoOk] = useState('');

  // ─── LIQUIDACION STATE ───────────────────────────────────────────
  const [filtroMesLiq, setFiltroMesLiq] = useState<string>(new Date().toISOString().slice(0, 7));
  const [showNovedadModal, setShowNovedadModal] = useState(false);
  const [novedadForm, setNovedadForm] = useState({
    profesor_id: '',
    fecha: new Date().toISOString().slice(0, 10),
    turno_id: '',
    tipo: 'AUSENCIA' as 'AUSENCIA' | 'REEMPLAZO',
    reemplazo_profesor_id: ''
  });
  const [novedadErr, setNovedadErr] = useState('');
  const [novedadOk, setNovedadOk] = useState('');
  const [liquidandoId, setLiquidandoId] = useState<string | null>(null);

  // ─── COMPARATIVE ────────────────────────────────────────────────
  const comparativaFinanciera = useMemo(() => {
    const mesCorriente = filtroMes;
    const year = parseInt(mesCorriente.split('-')[0]);
    const month = parseInt(mesCorriente.split('-')[1]);
    const prevMonthStr = month === 1 ? `${year - 1}-12` : `${year}-${(month - 1).toString().padStart(2, '0')}`;
    const ingresosEsteMes = pagos.filter(p => p.mes_correspondiente === mesCorriente).reduce((s, p) => s + p.monto, 0);
    const ingresosMesAnterior = pagos.filter(p => p.mes_correspondiente === prevMonthStr).reduce((s, p) => s + p.monto, 0);
    const variacionAbsoluta = ingresosEsteMes - ingresosMesAnterior;
    const variacionPorcentual = ingresosMesAnterior > 0 ? Math.round((variacionAbsoluta / ingresosMesAnterior) * 100) : 0;
    return { mesActualLabel: mesCorriente, mesAnteriorLabel: prevMonthStr, esteMes: ingresosEsteMes, mesAnterior: ingresosMesAnterior, diferencia: variacionAbsoluta, porcent: variacionPorcentual };
  }, [pagos, filtroMes]);

  const pagosFiltrados = useMemo(() => {
    return pagos.filter(p => {
      if (p.mes_correspondiente !== filtroMes) return false;
      if (filtroMedio !== 'TODOS' && p.medio_pago !== filtroMedio) return false;
      if (buscarCliente.trim()) {
        const query = buscarCliente.toLowerCase();
        const cl = clientes.find(c => c.id === p.cliente_id);
        const nameText = cl ? `${cl.nombre} ${cl.apellido}`.toLowerCase() : p.cliente_nombre_completo.toLowerCase();
        if (!nameText.includes(query)) return false;
      }
      return true;
    });
  }, [pagos, filtroMes, filtroMedio, buscarCliente, clientes]);

  const handleOpenReceipt = (p: Pago) => {
    const cl = clientes.find(c => c.id === p.cliente_id);
    const nombre = cl ? cl.nombre : p.cliente_nombre_completo;
    let textMsg = '';
    if (cl && cl.tipo === 'FIJO' && cl.turnos_fijos.length > 0) {
      const turnosStr = cl.turnos_fijos.map(tfId => { const parts = tfId.split('-'); return `${parts[0]} ${parts[1] || '00:00'}hs`; }).join(', ');
      textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${p.monto.toLocaleString('es-AR')} correspondiente al mes de ${p.mes_correspondiente} para la actividad física en KAHA BOX. Tus turnos fijos son ${turnosStr}. Recordá darte de baja del turno cuando sepas que no vas a venir, así podemos liberar el lugar.`;
    } else {
      textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${p.monto.toLocaleString('es-AR')} correspondiente al mes de ${p.mes_correspondiente} para la actividad física en KAHA BOX. ¡Gracias! Recordá darte de baja del turno cuando sepas que no vas a venir, así podemos liberar el lugar.`;
    }
    setReceiptClientText(textMsg);
  };

  // ─── EGRESOS HANDLERS ───────────────────────────────────────────
  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      if (!g.fecha.startsWith(filtroMesGastos)) return false;
      if (filtroCatGastos !== 'TODOS' && g.categoria !== filtroCatGastos) return false;
      return true;
    });
  }, [gastos, filtroMesGastos, filtroCatGastos]);

  const gastosTotalFiltrado = gastosFiltrados.reduce((s, g) => s + g.monto, 0);

  const handleGastoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGastoErr('');
    const monto = parseFloat(gastoForm.monto);
    if (!gastoForm.concepto.trim()) { setGastoErr('El concepto es obligatorio.'); return; }
    if (isNaN(monto) || monto <= 0) { setGastoErr('El monto debe ser mayor a 0.'); return; }
    const res = registrarGasto({ concepto: gastoForm.concepto.trim(), monto, categoria: gastoForm.categoria, fecha: gastoForm.fecha, registrado_por: 'admin@gimnasio.com.ar' });
    if (res.success) {
      setGastoOk('¡Gasto registrado!');
      setGastoForm({ concepto: '', monto: '', categoria: 'OTROS', fecha: new Date().toISOString().slice(0, 10) });
      setTimeout(() => { setShowGastoModal(false); setGastoOk(''); }, 1200);
    } else {
      setGastoErr(res.message);
    }
  };

  // ─── LIQUIDACION LOGIC ──────────────────────────────────────────
  const liquidaciones = useMemo(() => {
    return profesores.filter(p => p.activo).map(prof => {
      const turnosProf = turnos.filter(t => t.profesor === prof.nombre || t.profesor === prof.id);

      let clasesTeoricasTotal = 0;
      turnosProf.forEach(t => {
        const diaIdx = DIA_IDX[t.dia] || 0;
        if (diaIdx > 0) {
          clasesTeoricasTotal += diasEnMes(diaIdx, filtroMesLiq);
        }
      });

      const ausencias = novedadesProfesores.filter(n =>
        n.profesor_id === prof.id &&
        n.tipo === 'AUSENCIA' &&
        n.fecha.startsWith(filtroMesLiq)
      ).length;

      const reemplazos = novedadesProfesores.filter(n =>
        n.reemplazo_profesor_id === prof.id &&
        n.tipo === 'REEMPLAZO' &&
        n.fecha.startsWith(filtroMesLiq)
      ).length;

      const clasesNetas = Math.max(0, clasesTeoricasTotal - ausencias + reemplazos);
      const montoTotal = clasesNetas * prof.valor_hora;

      const yaLiquidado = gastos.some(g =>
        g.categoria === 'PROFESORES' &&
        g.fecha.startsWith(filtroMesLiq) &&
        g.concepto.includes(prof.nombre)
      );

      return { prof, turnosProf, clasesTeoricasTotal, ausencias, reemplazos, clasesNetas, montoTotal, yaLiquidado };
    });
  }, [profesores, turnos, novedadesProfesores, gastos, filtroMesLiq]);

  const handleLiquidar = (profId: string, profNombre: string, monto: number) => {
    setLiquidandoId(profId);
    registrarGasto({
      concepto: `Liquidación ${profNombre} — ${filtroMesLiq}`,
      monto,
      categoria: 'PROFESORES',
      fecha: `${filtroMesLiq}-28`,
      registrado_por: 'admin@gimnasio.com.ar'
    });
    setTimeout(() => setLiquidandoId(null), 1000);
  };

  const handleNovedadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNovedadErr('');
    if (!novedadForm.profesor_id || !novedadForm.fecha || !novedadForm.turno_id) {
      setNovedadErr('Completá todos los campos obligatorios.');
      return;
    }
    const res = registrarNovedadProfesor({
      profesor_id: novedadForm.profesor_id,
      fecha: novedadForm.fecha,
      turno_id: novedadForm.turno_id,
      tipo: novedadForm.tipo,
      reemplazo_profesor_id: novedadForm.tipo === 'REEMPLAZO' ? novedadForm.reemplazo_profesor_id || undefined : undefined
    });
    if (res.success) {
      setNovedadOk('Novedad registrada.');
      setNovedadForm({ profesor_id: '', fecha: new Date().toISOString().slice(0, 10), turno_id: '', tipo: 'AUSENCIA', reemplazo_profesor_id: '' });
      setTimeout(() => { setShowNovedadModal(false); setNovedadOk(''); }, 1200);
    } else {
      setNovedadErr(res.message);
    }
  };

  const catColors: Record<string, string> = {
    ALQUILER: 'bg-violet-50 text-violet-700 border-violet-100',
    SERVICIOS: 'bg-sky-50 text-sky-700 border-sky-100',
    INSUMOS: 'bg-amber-50 text-amber-700 border-amber-100',
    PROFESORES: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    OTROS: 'bg-zinc-50 text-zinc-600 border-zinc-200'
  };

  return (
    <div className="space-y-6 p-3 sm:p-6 max-w-7xl mx-auto overflow-x-hidden" id="pagos-log-tab-panel">
      {/* HEADER */}
      <div className="flex flex-col gap-3" id="pagos-header">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Finanzas &amp; Pagos</h2>
            <p className="text-zinc-500 font-sans text-sm font-medium">Ingresos, egresos y liquidación de profesores</p>
          </div>

          {/* SUB-TABS (Grid on mobile for 100% width distribution) */}
          <div className="grid grid-cols-3 bg-zinc-100 p-1 rounded-xl border border-zinc-200 gap-1 w-full sm:w-auto">
            {([['INGRESOS', 'Ingresos'], ['EGRESOS', 'Egresos'], ['LIQUIDACION', 'Liquidación']] as [SubTab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveSubTab(key)}
                className={`py-2 px-1 text-center rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer border-none bg-transparent truncate ${
                  activeSubTab === key ? 'bg-white text-zinc-950 shadow-sm font-bold' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SUB-TAB: INGRESOS Y CUOTAS */}
      {activeSubTab === 'INGRESOS' && (
        <div className="space-y-5">
          {/* KPIs: 1 col on mobile, 3 cols on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5" id="comparative-financial-kpis">
            <div className="bg-white border border-zinc-200 p-4 sm:p-5 rounded-xl flex items-center justify-between text-xs font-sans">
              <div className="min-w-0">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Facturado Mes</span>
                <div className="text-2xl font-mono font-bold text-zinc-950 mt-1 truncate">${comparativaFinanciera.esteMes.toLocaleString('es-AR')}</div>
              </div>
              <div className="p-2.5 bg-zinc-100 text-zinc-900 rounded-lg shrink-0"><DollarSign className="w-5 h-5" /></div>
            </div>

            <div className="bg-white border border-zinc-200 p-4 sm:p-5 rounded-xl flex items-center justify-between text-xs font-sans">
              <div className="min-w-0">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block truncate">Mes Anterior ({comparativaFinanciera.mesAnteriorLabel})</span>
                <div className="text-2xl font-mono font-bold text-zinc-500 mt-1 truncate">${comparativaFinanciera.mesAnterior.toLocaleString('es-AR')}</div>
              </div>
              <div className="p-2.5 bg-zinc-50 text-zinc-400 rounded-lg shrink-0"><DollarSign className="w-5 h-5" /></div>
            </div>

            <div className="bg-white border border-zinc-200 p-4 sm:p-5 rounded-xl flex items-center justify-between text-xs font-sans">
              <div className="min-w-0">
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Evolución de Tendencia</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xl font-mono font-bold block ${comparativaFinanciera.diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {comparativaFinanciera.porcent >= 0 ? '+' : ''}{comparativaFinanciera.porcent}%
                  </span>
                  <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 font-mono text-zinc-500 truncate">
                    ${comparativaFinanciera.diferencia.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
              <div className={`p-2.5 rounded-lg shrink-0 ${comparativaFinanciera.diferencia >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {comparativaFinanciera.diferencia >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              </div>
            </div>
          </div>

          <PagosTable 
            buscarCliente={buscarCliente}
            setBuscarCliente={setBuscarCliente}
            filtroMes={filtroMes}
            setFiltroMes={setFiltroMes}
            filtroMedio={filtroMedio}
            setFiltroMedio={setFiltroMedio}
            pagosFiltrados={pagosFiltrados}
            clientes={clientes}
            planes={planes}
            onOpenReceipt={handleOpenReceipt}
            onAddPagoClick={() => setShowAddPagoModal(true)}
            onConciliarCSVClick={() => setShowImportStatementModal(true)}
            onActualizarDestino={actualizarDestinoPago}
            onEditarPago={(p) => setPagoParaEditar(p)}
            onEliminarPago={(p) => setPagoParaEliminar(p)}
          />
        </div>
      )}

      {/* SUB-TAB: GASTOS Y EGRESOS */}
      {activeSubTab === 'EGRESOS' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
            <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between text-xs font-sans">
              <div>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans">Total Egresos</span>
                <div className="text-2xl font-mono font-bold text-rose-600 mt-1">${gastosTotalFiltrado.toLocaleString('es-AR')}</div>
              </div>
              <TrendingDown className="w-6 h-6 text-rose-300" />
            </div>
            <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between text-xs font-sans">
              <div>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Registros</span>
                <div className="text-2xl font-mono font-bold text-zinc-900 mt-1">{gastosFiltrados.length}</div>
              </div>
              <Receipt className="w-6 h-6 text-zinc-300" />
            </div>
            <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between text-xs font-sans">
              <div>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Promedio por Gasto</span>
                <div className="text-2xl font-mono font-bold text-zinc-700 mt-1">
                  ${gastosFiltrados.length > 0 ? Math.round(gastosTotalFiltrado / gastosFiltrados.length).toLocaleString('es-AR') : 0}
                </div>
              </div>
              <DollarSign className="w-6 h-6 text-zinc-300" />
            </div>
          </div>

          {/* FILTROS + BOTON */}
          <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-zinc-200 p-4 rounded-xl">
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <span>Mes:</span>
                <select value={filtroMesGastos} onChange={e => setFiltroMesGastos(e.target.value)} className="border border-zinc-200 rounded-md py-1 px-2 text-zinc-700 bg-white text-xs font-semibold">
                  {MESES_OPCIONES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <span>Categoría:</span>
                <select value={filtroCatGastos} onChange={e => setFiltroCatGastos(e.target.value)} className="border border-zinc-200 rounded-md py-1 px-2 text-zinc-700 bg-white text-xs font-semibold">
                  <option value="TODOS">Todas</option>
                  {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={() => { setGastoErr(''); setGastoOk(''); setShowGastoModal(true); }}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
              id="btn-add-gasto"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Gasto
            </button>
          </div>

          {/* TABLA GASTOS */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
            <div className="min-w-[480px]">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-200 uppercase tracking-wider text-[10px]">
                  <th className="p-4">Concepto</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Registrado por</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
                {gastosFiltrados.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-zinc-400 italic">Sin gastos registrados para el período seleccionado.</td></tr>
                ) : (
                  gastosFiltrados.map(g => (
                    <tr key={g.id} className="hover:bg-zinc-50/50">
                      <td className="p-4 font-semibold text-zinc-900">{g.concepto}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catColors[g.categoria] || catColors.OTROS}`}>
                          {g.categoria}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-zinc-500 text-[10px]">{g.fecha}</td>
                      <td className="p-4 font-mono text-zinc-400 text-[10px]">{g.registrado_por}</td>
                      <td className="p-4 text-right font-mono font-bold text-rose-600">${g.monto.toLocaleString('es-AR')}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => eliminarGasto(g.id)}
                          className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-md transition-colors cursor-pointer border-none bg-transparent"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {gastosFiltrados.length > 0 && (
                <tfoot>
                  <tr className="bg-zinc-50 border-t border-zinc-200">
                    <td colSpan={4} className="p-4 font-bold text-xs text-zinc-600 uppercase tracking-wider">Total del período</td>
                    <td className="p-4 text-right font-mono font-bold text-rose-700 text-sm">${gastosTotalFiltrado.toLocaleString('es-AR')}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: LIQUIDACIÓN DE PROFESORES */}
      {activeSubTab === 'LIQUIDACION' && (
        <div className="space-y-6">
          {/* FILTROS Y ACCIONES */}
          <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-zinc-200 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span>Mes de liquidación:</span>
              <select value={filtroMesLiq} onChange={e => setFiltroMesLiq(e.target.value)} className="border border-zinc-200 rounded-md py-1 px-2 text-zinc-700 bg-white text-xs font-semibold">
                {MESES_OPCIONES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <button
              onClick={() => { setNovedadErr(''); setNovedadOk(''); setShowNovedadModal(true); }}
              className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar Novedad
            </button>
          </div>

          {profesores.filter(p => p.activo).length === 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-xs text-amber-800 font-sans">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 animate-bounce" />
              <p>No hay profesores activos registrados. Cargá profesores desde la sección de ajustes o configuración.</p>
            </div>
          )}

          {/* TABLA LIQUIDACIONES */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-zinc-900 text-white font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Profesor</th>
                    <th className="p-4 text-center">Turnos Asignados</th>
                    <th className="p-4 text-center">Clases Teóricas</th>
                    <th className="p-4 text-center">Ausencias</th>
                    <th className="p-4 text-center">Reemplazos</th>
                    <th className="p-4 text-center">Clases Netas</th>
                    <th className="p-4 text-right">$/Clase</th>
                    <th className="p-4 text-right">Total Estimado</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {liquidaciones.map(({ prof, turnosProf, clasesTeoricasTotal, ausencias, reemplazos, clasesNetas, montoTotal, yaLiquidado }) => (
                    <tr key={prof.id} className={`hover:bg-zinc-50/50 ${yaLiquidado ? 'opacity-60' : ''}`}>
                      <td className="p-4">
                        <div className="font-bold text-zinc-900">{prof.nombre}</div>
                        <div className="text-[10px] text-zinc-400 font-mono">{prof.email}</div>
                      </td>
                      <td className="p-4 text-center">
                        {turnosProf.length > 0 ? (
                          <div className="space-y-0.5">
                            {turnosProf.slice(0, 3).map(t => (
                              <div key={t.id} className="text-[10px] text-zinc-600 font-mono">{t.dia} {t.hora}hs</div>
                            ))}
                            {turnosProf.length > 3 && <div className="text-[9px] text-zinc-400">+{turnosProf.length - 3} más</div>}
                          </div>
                        ) : (
                          <span className="text-zinc-300 italic text-[10px]">Sin turnos asignados</span>
                        )}
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-zinc-700">{clasesTeoricasTotal}</td>
                      <td className="p-4 text-center">
                        <span className={`font-mono font-bold ${ausencias > 0 ? 'text-red-600' : 'text-zinc-400'}`}>{ausencias}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`font-mono font-bold ${reemplazos > 0 ? 'text-emerald-600' : 'text-zinc-400'}`}>{reemplazos > 0 ? `+${reemplazos}` : '0'}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-mono font-bold text-zinc-900 text-sm">{clasesNetas}</span>
                      </td>
                      <td className="p-4 text-right font-mono text-zinc-500">${prof.valor_hora.toLocaleString('es-AR')}</td>
                      <td className="p-4 text-right">
                        <span className="font-mono font-bold text-emerald-700 text-sm">${montoTotal.toLocaleString('es-AR')}</span>
                      </td>
                      <td className="p-4 text-center">
                        {yaLiquidado ? (
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 mx-auto w-fit">
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Liquidado
                          </span>
                        ) : (
                          <button
                            onClick={() => handleLiquidar(prof.id, prof.nombre, montoTotal)}
                            disabled={clasesNetas === 0 || liquidandoId === prof.id}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="w-3 h-3" />
                            {liquidandoId === prof.id ? 'Registrando...' : 'Liquidar y Pagar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {liquidaciones.length === 0 && (
                    <tr><td colSpan={9} className="p-8 text-center text-zinc-400 italic">Sin profesores activos para liquidar.</td></tr>
                  )}
                </tbody>
                {liquidaciones.length > 0 && (
                  <tfoot>
                    <tr className="bg-zinc-50 border-t border-zinc-200">
                      <td colSpan={7} className="p-4 font-bold text-xs text-zinc-600 uppercase tracking-wider">Total estimado del mes</td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-700 text-sm">
                        ${liquidaciones.reduce((s, l) => s + l.montoTotal, 0).toLocaleString('es-AR')}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* NOVEDADES DEL MES */}
          {novedadesProfesores.filter(n => n.fecha.startsWith(filtroMesLiq)).length > 0 && (
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs text-xs font-sans">
              <div className="p-4 border-b border-zinc-100">
                <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Novedades del mes — Ausencias y Reemplazos</h4>
              </div>
              <div className="divide-y divide-zinc-100 font-medium">
                {novedadesProfesores.filter(n => n.fecha.startsWith(filtroMesLiq)).map(n => {
                  const prof = profesores.find(p => p.id === n.profesor_id);
                  const profReemp = n.reemplazo_profesor_id ? profesores.find(p => p.id === n.reemplazo_profesor_id) : null;
                  return (
                    <div key={n.id} className="flex justify-between items-center p-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${n.tipo === 'AUSENCIA' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                          {n.tipo}
                        </span>
                        <div>
                          <span className="font-semibold text-zinc-900">{prof?.nombre || n.profesor_id}</span>
                          {profReemp && <span className="text-zinc-500"> → reemplazado por {profReemp.nombre}</span>}
                          <div className="text-[10px] text-zinc-400 font-mono">{n.fecha} — Turno: {n.turno_id}</div>
                        </div>
                      </div>
                      <button onClick={() => eliminarNovedadProfesor(n.id)} className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-md cursor-pointer border-none bg-transparent">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL REGISTRAR NOVEDAD PROFESOR */}
      {showNovedadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans text-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Registrar Novedad de Profesor</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Ausencias o reemplazos del mes de liquidación</p>
              </div>
              <button onClick={() => setShowNovedadModal(false)} className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg cursor-pointer border-none">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleNovedadSubmit} className="p-5 space-y-4 text-xs font-sans">
              {novedadErr && <div className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-200 font-semibold">{novedadErr}</div>}
              {novedadOk && <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg border border-emerald-200 font-semibold">{novedadOk}</div>}
              
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">Tipo de novedad *</label>
                <div className="flex gap-2">
                  {(['AUSENCIA', 'REEMPLAZO'] as const).map(tipo => (
                    <button key={tipo} type="button" onClick={() => setNovedadForm(prev => ({ ...prev, tipo }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer border-none ${novedadForm.tipo === tipo ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300 bg-white'}`}>
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold block text-[10px] uppercase">Profesor *</label>
                  <select required value={novedadForm.profesor_id} onChange={e => setNovedadForm(prev => ({ ...prev, profesor_id: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium">
                    <option value="">-- Seleccionar --</option>
                    {profesores.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold block text-[10px] uppercase">Fecha *</label>
                  <input type="date" required value={novedadForm.fecha} onChange={e => setNovedadForm(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs font-mono outline-hidden font-medium" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">Turno *</label>
                <select required value={novedadForm.turno_id} onChange={e => setNovedadForm(prev => ({ ...prev, turno_id: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium">
                  <option value="">-- Seleccionar turno --</option>
                  {turnos.map(t => <option key={t.id} value={t.id}>{t.dia} {t.hora}hs{t.profesor ? ` — Prof: ${t.profesor}` : ''}</option>)}
                </select>
              </div>

              {novedadForm.tipo === 'REEMPLAZO' && (
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold block text-[10px] uppercase">Profesor Reemplazante</label>
                  <select value={novedadForm.reemplazo_profesor_id} onChange={e => setNovedadForm(prev => ({ ...prev, reemplazo_profesor_id: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium">
                    <option value="">-- Sin asignar --</option>
                    {profesores.filter(p => p.activo && p.id !== novedadForm.profesor_id).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-100 flex justify-end gap-2 font-semibold">
                <button type="button" onClick={() => setShowNovedadModal(false)} className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer bg-white">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg transition-all shadow-sm cursor-pointer border-none">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GASTO */}
      {showGastoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans text-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-base font-bold">Registrar Gasto / Egreso</h3>
              <button onClick={() => setShowGastoModal(false)} className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg cursor-pointer border-none"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleGastoSubmit} className="p-5 space-y-4 text-xs font-sans">
              {gastoErr && <div className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-200 font-semibold">{gastoErr}</div>}
              {gastoOk && <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg border border-emerald-200 font-semibold">{gastoOk}</div>}
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">Concepto *</label>
                <input type="text" required placeholder="Ej: Alquiler del salón, gas, etc." value={gastoForm.concepto} onChange={e => setGastoForm(prev => ({ ...prev, concepto: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2.5 text-xs outline-hidden focus:border-zinc-500 font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold block text-[10px] uppercase">Monto ARS *</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2.5 text-zinc-400 font-mono text-xs">$</span>
                    <input type="number" required min="1" value={gastoForm.monto} onChange={e => setGastoForm(prev => ({ ...prev, monto: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2.5 pl-6 text-xs font-mono font-bold outline-hidden focus:border-zinc-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold block text-[10px] uppercase">Fecha *</label>
                  <input type="date" required value={gastoForm.fecha} onChange={e => setGastoForm(prev => ({ ...prev, fecha: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2.5 text-xs font-mono outline-hidden focus:border-zinc-500 font-bold" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS_GASTO.map(cat => (
                    <button key={cat} type="button" onClick={() => setGastoForm(prev => ({ ...prev, categoria: cat }))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer border-none ${gastoForm.categoria === cat ? 'bg-zinc-900 text-white border-zinc-900 shadow-xs' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-300 bg-white'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100 flex justify-end gap-2 font-semibold">
                <button type="button" onClick={() => setShowGastoModal(false)} className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer bg-white">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all shadow-sm cursor-pointer border-none">Registrar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PAGO FORM MODAL */}
      {showAddPagoModal && (
        <PagoFormModal 
          onClose={() => setShowAddPagoModal(false)}
          onSuccess={(generatedReceipts) => {
            setShowAddPagoModal(false);
            setRecibosMultiples(generatedReceipts);
            setShowRecibosModal(true);
          }}
        />
      )}

      {/* CSV IMPORT CONCILIATION MODAL */}
      {showImportStatementModal && (
        <PagoCSVImportModal 
          onClose={() => setShowImportStatementModal(false)}
        />
      )}

      {/* RECEIPT PREVIEW / WHATSAPP RECEIPTS MODAL */}
      {(receiptClientText || showRecibosModal) && (
        <PagoReceiptModal 
          receiptClientText={receiptClientText}
          onCloseReceipt={() => setReceiptClientText(null)}
          recibosMultiples={showRecibosModal ? recibosMultiples : null}
          onCloseRecibos={() => {
            setShowRecibosModal(false);
            setRecibosMultiples([]);
          }}
        />
      )}

      {/* PAGO DELETE MODAL */}
      <PagoDeleteModal
        isOpen={!!pagoParaEliminar}
        onClose={() => setPagoParaEliminar(null)}
        pago={pagoParaEliminar}
        clienteNombre={(() => {
          if (!pagoParaEliminar) return '';
          const cl = clientes.find(c => c.id === pagoParaEliminar.cliente_id);
          return cl ? `${cl.apellido}, ${cl.nombre}` : pagoParaEliminar.cliente_nombre_completo;
        })()}
        onConfirmDelete={(id) => { eliminarPago(id); setPagoParaEliminar(null); }}
      />

      {/* PAGO EDIT MODAL */}
      <PagoEditModal
        isOpen={!!pagoParaEditar}
        onClose={() => setPagoParaEditar(null)}
        pago={pagoParaEditar}
      />
    </div>
  );
};
