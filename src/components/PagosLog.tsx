// src/components/PagosLog.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../GymContext';
import { Pago, MedioPago, Gasto } from '../types';
import { 
  Plus, Search, Receipt, Upload, DollarSign, 
  Check, ArrowDownRight, ArrowUpRight, Copy, X, Trash2,
  TrendingDown, Calendar, ChevronRight, AlertCircle
} from 'lucide-react';

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
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  let count = 0;
  // JS getDay(): 0=Sun,1=Mon..6=Sat
  const jsDia = diaSemana === 7 ? 0 : diaSemana;
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === jsDia) count++;
  }
  return count;
}

const CATEGORIAS_GASTO = ['ALQUILER', 'SERVICIOS', 'INSUMOS', 'PROFESORES', 'OTROS'] as const;

export const PagosLog: React.FC<PagosLogProps> = ({ showAddPagoModal, setShowAddPagoModal }) => {
  const { 
    pagos, clientes, planes, registrarPago, importarPagosCSV,
    gastos, registrarGasto, eliminarGasto,
    profesores, turnos, novedadesProfesores, registrarNovedadProfesor, eliminarNovedadProfesor
  } = useGym();

  const [activeSubTab, setActiveSubTab] = useState<SubTab>('INGRESOS');

  // ─── INGRESOS STATE ──────────────────────────────────────────────
  const [buscarCliente, setBuscarCliente] = useState('');
  const [filtroMedio, setFiltroMedio] = useState<string>('TODOS');
  const [filtroMes, setFiltroMes] = useState<string>('2026-05');

  const [pagoForm, setPagoForm] = useState({
    cliente_id: '',
    medio_pago: 'MERCADO_PAGO' as MedioPago,
    mes_correspondiente: '2026-05',
    hash_transaccion: ''
  });
  const [beneficiarios, setBeneficiarios] = useState<Array<{ cliente_id: string, monto: string, mes_correspondiente: string }>>([]);
  const [formErr, setFormErr] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [showImportStatementModal, setShowImportStatementModal] = useState(false);
  const [statementCSV, setStatementCSV] = useState('');
  const [statementParsedRows, setStatementParsedRows] = useState<any[]>([]);
  const [importReport, setImportReport] = useState<{ procesados: number; insertados: number; duplicados: number; errores: string[] } | null>(null);

  const [receiptClientText, setReceiptClientText] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [recibosMultiples, setRecibosMultiples] = useState<Array<{ cliente_nombre: string, messageText: string, telefono: string, copiado: boolean }>>([]);
  const [showRecibosModal, setShowRecibosModal] = useState(false);

  // ─── EGRESOS STATE ───────────────────────────────────────────────
  const [filtroMesGastos, setFiltroMesGastos] = useState<string>('2026-05');
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
  const [filtroMesLiq, setFiltroMesLiq] = useState<string>('2026-05');
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

  // ─── INGRESOS HANDLERS ───────────────────────────────────────────
  const handleClientSelect = (clientId: string) => {
    const cl = clientes.find(c => c.id === clientId);
    if (!cl) return;
    const plan = planes.find(p => p.id === cl.plan_id);
    const planPrecio = plan ? plan.precio : 0;
    setPagoForm(prev => ({ ...prev, cliente_id: clientId }));
    if (beneficiarios.length === 0) {
      setBeneficiarios([{ cliente_id: clientId, monto: planPrecio.toString(), mes_correspondiente: pagoForm.mes_correspondiente }]);
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
    const planPrecio = plan ? plan.precio : 0;
    setBeneficiarios(prev => [...prev, { cliente_id: clientId, monto: planPrecio.toString(), mes_correspondiente: pagoForm.mes_correspondiente }]);
    setFormErr('');
  };

  const handleManualPagoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');
    setFormSuccess('');
    if (!pagoForm.cliente_id) { setFormErr('Por favor ingrese quién abona la transacción.'); return; }
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
    const generatedReceipts: typeof recibosMultiples = [];

    beneficiarios.forEach((b) => {
      const parsedMonto = parseFloat(b.monto);
      const res = registrarPago({
        cliente_id: b.cliente_id,
        cliente_nombre_completo: '',
        monto: parsedMonto,
        medio_pago: pagoForm.medio_pago,
        mes_correspondiente: b.mes_correspondiente,
        hash_transaccion: finalHash,
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
          textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${parsedMonto.toLocaleString('es-AR')} correspondiente al mes de ${b.mes_correspondiente} para la actividad física en KAHA GYM. ¡Muchas gracias por tu compromiso! Tus turnos fijos son ${turnosStr}.`;
        } else {
          textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${parsedMonto.toLocaleString('es-AR')} correspondiente al mes de ${b.mes_correspondiente} para la actividad física en KAHA GYM. ¡Muchas gracias por tu compromiso!`;
        }
        generatedReceipts.push({ cliente_nombre: `${clObj.apellido}, ${clObj.nombre}`, messageText: textMsg, telefono: clObj.telefono || '5491123456789', copiado: false });
      }
    });

    const failed = results.find(r => !r.success);
    if (failed) {
      setFormErr(failed.message);
    } else {
      setFormSuccess('Cobro múltiple registrado exitosamente.');
      setPagoForm({ cliente_id: '', medio_pago: 'MERCADO_PAGO', mes_correspondiente: '2026-05', hash_transaccion: '' });
      setBeneficiarios([]);
      setRecibosMultiples(generatedReceipts);
      setTimeout(() => {
        setShowAddPagoModal(false);
        setFormSuccess('');
        setShowRecibosModal(true);
      }, 1200);
    }
  };

  // ─── COMPARATIVE ────────────────────────────────────────────────
  const comparativaFinanciera = useMemo(() => {
    const mesCorriente = filtroMes;
    const year = parseInt(mesCorriente.split('-')[0]);
    const month = parseInt(mesCorriente.split('-')[1]);
    const prevMonthStr = month === 1 ? `${year - 1}-12` : `${year}-${(month - 1).toString().padStart(2, '0')}`;
    const ingresosEsteMes = pagos.filter(p => p.mes_correspondiente === mesCorriente).reduce((s, p) => s + p.monto, 0);
    const ingresosMesAnterior = pagos.filter(p => p.mes_correspondiente === prevMonthStr).reduce((s, p) => s + p.monto, 0) || 57000;
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

  // ─── CSV HANDLERS ───────────────────────────────────────────────
  const handleStatementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setStatementCSV(text);
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length > 1) {
        const rowsToPreview: any[] = [];
        lines.slice(1).forEach((l, idx) => {
          const cells = l.split(',');
          if (cells.length < 3) return;
          rowsToPreview.push({
            cliente_email: cells[0]?.trim(),
            monto: parseFloat(cells[1]?.trim() || '0'),
            hash: cells[2]?.trim() || `MP-CSV-${Date.now()}-${idx}`,
            medio_pago: (cells[3]?.trim()?.toUpperCase() || 'MERCADO_PAGO') as MedioPago,
            mes: cells[4]?.trim() || '2026-05',
            fecha_pago: new Date().toISOString()
          });
        });
        setStatementParsedRows(rowsToPreview);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmStatementImport = () => {
    if (statementParsedRows.length === 0) return;
    const report = importarPagosCSV(statementParsedRows, 'admin@gimnasio.com.ar');
    setImportReport(report);
  };

  const handleOpenReceipt = (p: Pago) => {
    const cl = clientes.find(c => c.id === p.cliente_id);
    const nombre = cl ? cl.nombre : p.cliente_nombre_completo;
    let textMsg = '';
    if (cl && cl.tipo === 'FIJO' && cl.turnos_fijos.length > 0) {
      const turnosStr = cl.turnos_fijos.map(tfId => { const parts = tfId.split('-'); return `${parts[0]} ${parts[1] || '00:00'}hs`; }).join(', ');
      textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${p.monto.toLocaleString('es-AR')} correspondiente al mes de ${p.mes_correspondiente} para la actividad física en KAHA GYM. Tus turnos fijos son ${turnosStr}.`;
    } else {
      textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${p.monto.toLocaleString('es-AR')} correspondiente al mes de ${p.mes_correspondiente} para la actividad física en KAHA GYM. ¡Gracias!`;
    }
    setReceiptClientText(textMsg);
    setCopiado(false);
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
      // Find all turnos assigned to this professor
      const turnosProf = turnos.filter(t => t.profesor === prof.nombre || t.profesor === prof.id);

      // Count theoretical classes in the month
      let clasesTeoricasTotal = 0;
      turnosProf.forEach(t => {
        const diaIdx = DIA_IDX[t.dia] || 0;
        if (diaIdx > 0) {
          clasesTeoricasTotal += diasEnMes(diaIdx, filtroMesLiq);
        }
      });

      // Ausencias in the month
      const ausencias = novedadesProfesores.filter(n =>
        n.profesor_id === prof.id &&
        n.tipo === 'AUSENCIA' &&
        n.fecha.startsWith(filtroMesLiq)
      ).length;

      // Reemplazos realizados (cuando este prof reemplaza a otro)
      const reemplazos = novedadesProfesores.filter(n =>
        n.reemplazo_profesor_id === prof.id &&
        n.tipo === 'REEMPLAZO' &&
        n.fecha.startsWith(filtroMesLiq)
      ).length;

      const clasesNetas = Math.max(0, clasesTeoricasTotal - ausencias + reemplazos);
      const montoTotal = clasesNetas * prof.valor_hora;

      // Check if already liquidated this month
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
    const res = registrarGasto({
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
    <div className="space-y-6 p-6 max-w-7xl mx-auto" id="pagos-log-tab-panel">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Finanzas & Pagos</h2>
          <p className="text-zinc-500 font-sans text-sm font-medium">Ingresos, egresos y liquidación de profesores</p>
        </div>

        {/* SUB-TABS */}
        <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 gap-1">
          {([['INGRESOS', 'Ingresos y Cuotas'], ['EGRESOS', 'Gastos y Egresos'], ['LIQUIDACION', 'Liquidación Profes']] as [SubTab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveSubTab(key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSubTab === key
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          SUB-TAB: INGRESOS Y CUOTAS
      ════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'INGRESOS' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="comparative-financial-kpis">
            <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans">Facturado Mes</span>
                <div className="text-2xl font-mono font-bold text-zinc-950 mt-1">${comparativaFinanciera.esteMes.toLocaleString('es-AR')}</div>
              </div>
              <div className="p-2 ml-4 bg-zinc-100 text-zinc-900 rounded-lg"><DollarSign className="w-5 h-5" /></div>
            </div>
            <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans">Mes Anterior ({comparativaFinanciera.mesAnteriorLabel})</span>
                <div className="text-2xl font-mono font-bold text-zinc-500 mt-1">${comparativaFinanciera.mesAnterior.toLocaleString('es-AR')}</div>
              </div>
              <div className="p-2 ml-4 bg-zinc-50 text-zinc-400 rounded-lg"><DollarSign className="w-5 h-5" /></div>
            </div>
            <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans">Evolución de Tendencia</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-2xl font-mono font-bold block ${comparativaFinanciera.diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {comparativaFinanciera.porcent >= 0 ? '+' : ''}{comparativaFinanciera.porcent}%
                  </span>
                  <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 font-mono text-zinc-500">
                    ${comparativaFinanciera.diferencia.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
              <div className={`p-2 ml-4 rounded-lg ${comparativaFinanciera.diferencia >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                {comparativaFinanciera.diferencia >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              </div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="bg-white border border-zinc-200 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por nombre del alumno..."
                value={buscarCliente}
                onChange={e => setBuscarCliente(e.target.value)}
                className="pl-9 pr-4 py-2 w-full border border-zinc-200 rounded-lg text-xs font-sans outline-hidden focus:border-zinc-400"
                id="payments-search-input"
              />
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <span>Mes:</span>
                <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="border border-zinc-200 rounded-md py-1 px-2 text-zinc-700 bg-white text-xs">
                  <option value="2026-05">Mayo 2026</option>
                  <option value="2026-04">Abril 2026</option>
                  <option value="2026-03">Marzo 2026</option>
                  <option value="2026-02">Febrero 2026</option>
                  <option value="2026-01">Enero 2026</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <span>Medio:</span>
                <select value={filtroMedio} onChange={e => setFiltroMedio(e.target.value)} className="border border-zinc-200 rounded-md py-1 px-2 text-zinc-700 bg-white text-xs">
                  <option value="TODOS">Todos</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="MERCADO_PAGO">Mercado Pago</option>
                  <option value="UALA">Uala</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <button
                onClick={() => { setFormErr(''); setFormSuccess(''); setShowAddPagoModal(true); }}
                className="bg-black hover:bg-zinc-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                id="btn-register-payment-modal-trigger"
              >
                <Plus className="w-3.5 h-3.5" />
                Cargar Pago
              </button>
              <button
                onClick={() => { setImportReport(null); setStatementParsedRows([]); setStatementCSV(''); setShowImportStatementModal(true); }}
                className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              >
                <Upload className="w-3.5 h-3.5" />
                Conciliar CSV
              </button>
            </div>
          </div>

          {/* TABLA COBROS */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-200 uppercase tracking-wider text-[10px]">
                    <th className="p-4">Socio</th>
                    <th className="p-4">Abono</th>
                    <th className="p-4">Medio</th>
                    <th className="p-4">Mes Cubierto</th>
                    <th className="p-4">Ref. / ID</th>
                    <th className="p-4">Registrado por</th>
                    <th className="p-4 text-center">Recibo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
                  {pagosFiltrados.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-zinc-400 italic">Sin registros de cobros coincidentes este mes.</td></tr>
                  ) : (
                    pagosFiltrados.map(p => {
                      const cl = clientes.find(c => c.id === p.cliente_id);
                      const planSocio = cl ? planes.find(x => x.id === cl.plan_id) : null;
                      return (
                        <tr key={p.id} className="hover:bg-zinc-50/50">
                          <td className="p-4 font-semibold text-zinc-950">{cl ? `${cl.apellido}, ${cl.nombre}` : p.cliente_nombre_completo}</td>
                          <td className="p-4">
                            <div className="font-mono font-bold text-emerald-600">${p.monto.toLocaleString('es-AR')}</div>
                            {planSocio && <div className="text-[10px] text-zinc-400">{planSocio.nombre}</div>}
                          </td>
                          <td className="p-4"><span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-[10px] uppercase font-bold text-zinc-700">{p.medio_pago}</span></td>
                          <td className="p-4 font-mono font-bold text-zinc-600">{p.mes_correspondiente}</td>
                          <td className="p-4">
                            <div className="font-mono text-zinc-500 text-[10px] select-all">{p.hash_transaccion || 'Ref-' + p.id.slice(-5)}</div>
                            <div className="text-[9px] text-zinc-400">{new Date(p.fecha_pago).toLocaleString('es-AR')}</div>
                          </td>
                          <td className="p-4 font-mono text-zinc-400 text-[10px]">{p.registrado_por}</td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleOpenReceipt(p)} className="px-2.5 py-1 text-[10.5px] border border-emerald-200 rounded bg-emerald-50 text-emerald-800 flex items-center gap-1.5 hover:bg-emerald-100 font-bold justify-center mx-auto cursor-pointer transition-colors">
                              <svg className="w-3.5 h-3.5 fill-current text-emerald-600" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/></svg>
                              Ver Recibo WA
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
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          SUB-TAB: GASTOS Y EGRESOS
      ════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'EGRESOS' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Total Egresos</span>
                <div className="text-2xl font-mono font-bold text-rose-600 mt-1">${gastosTotalFiltrado.toLocaleString('es-AR')}</div>
              </div>
              <TrendingDown className="w-6 h-6 text-rose-300" />
            </div>
            <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block">Registros</span>
                <div className="text-2xl font-mono font-bold text-zinc-900 mt-1">{gastosFiltrados.length}</div>
              </div>
              <Receipt className="w-6 h-6 text-zinc-300" />
            </div>
            <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
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
                <select value={filtroMesGastos} onChange={e => setFiltroMesGastos(e.target.value)} className="border border-zinc-200 rounded-md py-1 px-2 text-zinc-700 bg-white text-xs">
                  <option value="2026-05">Mayo 2026</option>
                  <option value="2026-04">Abril 2026</option>
                  <option value="2026-03">Marzo 2026</option>
                  <option value="2026-02">Febrero 2026</option>
                  <option value="2026-01">Enero 2026</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                <span>Categoría:</span>
                <select value={filtroCatGastos} onChange={e => setFiltroCatGastos(e.target.value)} className="border border-zinc-200 rounded-md py-1 px-2 text-zinc-700 bg-white text-xs">
                  <option value="TODOS">Todas</option>
                  {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={() => { setGastoErr(''); setGastoOk(''); setShowGastoModal(true); }}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              id="btn-add-gasto"
            >
              <Plus className="w-3.5 h-3.5" />
              Añadir Gasto
            </button>
          </div>

          {/* TABLA GASTOS */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
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
                          className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-md transition-colors cursor-pointer"
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
      )}

      {/* ════════════════════════════════════════════════════════════
          SUB-TAB: LIQUIDACIÓN DE PROFESORES
      ════════════════════════════════════════════════════════════ */}
      {activeSubTab === 'LIQUIDACION' && (
        <div className="space-y-6">
          
          {/* FILTROS Y ACCIONES */}
          <div className="flex flex-wrap gap-3 items-center justify-between bg-white border border-zinc-200 p-4 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-medium">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <span>Mes de liquidación:</span>
              <select value={filtroMesLiq} onChange={e => setFiltroMesLiq(e.target.value)} className="border border-zinc-200 rounded-md py-1 px-2 text-zinc-700 bg-white text-xs font-semibold">
                <option value="2026-05">Mayo 2026</option>
                <option value="2026-04">Abril 2026</option>
                <option value="2026-03">Marzo 2026</option>
                <option value="2026-02">Febrero 2026</option>
                <option value="2026-01">Enero 2026</option>
              </select>
            </div>
            <button
              onClick={() => { setNovedadErr(''); setNovedadOk(''); setShowNovedadModal(true); }}
              className="bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar Novedad
            </button>
          </div>

          {/* AVISO si no hay profesores */}
          {profesores.filter(p => p.activo).length === 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-3 text-xs text-amber-800">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
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
                            <Check className="w-3 h-3" /> Liquidado
                          </span>
                        ) : (
                          <button
                            onClick={() => handleLiquidar(prof.id, prof.nombre, montoTotal)}
                            disabled={clasesNetas === 0 || liquidandoId === prof.id}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
            <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-zinc-100">
                <h4 className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Novedades del mes — Ausencias y Reemplazos</h4>
              </div>
              <div className="divide-y divide-zinc-100">
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
                      <button onClick={() => eliminarNovedadProfesor(n.id)} className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-md cursor-pointer">
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

      {/* ═══ MODAL REGISTRAR NOVEDAD PROFESOR ═══ */}
      {showNovedadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Registrar Novedad de Profesor</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Ausencias o reemplazos del mes de liquidación</p>
              </div>
              <button onClick={() => setShowNovedadModal(false)} className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleNovedadSubmit} className="p-5 space-y-4 text-xs">
              {novedadErr && <div className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-200">{novedadErr}</div>}
              {novedadOk && <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg border border-emerald-200">{novedadOk}</div>}
              
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">Tipo de novedad *</label>
                <div className="flex gap-2">
                  {(['AUSENCIA', 'REEMPLAZO'] as const).map(tipo => (
                    <button key={tipo} type="button" onClick={() => setNovedadForm(prev => ({ ...prev, tipo }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${novedadForm.tipo === tipo ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}>
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold block text-[10px] uppercase">Profesor *</label>
                  <select required value={novedadForm.profesor_id} onChange={e => setNovedadForm(prev => ({ ...prev, profesor_id: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden">
                    <option value="">-- Seleccionar --</option>
                    {profesores.filter(p => p.activo).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold block text-[10px] uppercase">Fecha *</label>
                  <input type="date" required value={novedadForm.fecha} onChange={e => setNovedadForm(prev => ({ ...prev, fecha: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs font-mono outline-hidden" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">Turno *</label>
                <select required value={novedadForm.turno_id} onChange={e => setNovedadForm(prev => ({ ...prev, turno_id: e.target.value }))}
                  className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden">
                  <option value="">-- Seleccionar turno --</option>
                  {turnos.map(t => <option key={t.id} value={t.id}>{t.dia} {t.hora}hs{t.profesor ? ` — Prof: ${t.profesor}` : ''}</option>)}
                </select>
              </div>

              {novedadForm.tipo === 'REEMPLAZO' && (
                <div className="space-y-1">
                  <label className="text-zinc-500 font-bold block text-[10px] uppercase">Profesor Reemplazante</label>
                  <select value={novedadForm.reemplazo_profesor_id} onChange={e => setNovedadForm(prev => ({ ...prev, reemplazo_profesor_id: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden">
                    <option value="">-- Sin asignar --</option>
                    {profesores.filter(p => p.activo && p.id !== novedadForm.profesor_id).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-100 flex justify-end gap-2 font-semibold">
                <button type="button" onClick={() => setShowNovedadModal(false)} className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg transition-all shadow-sm cursor-pointer">Registrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL GASTO ═══ */}
      {showGastoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans">
          <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-md overflow-hidden">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-base font-bold">Registrar Gasto / Egreso</h3>
              <button onClick={() => setShowGastoModal(false)} className="text-zinc-400 hover:text-white bg-zinc-800 p-1.5 rounded-lg cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleGastoSubmit} className="p-5 space-y-4 text-xs">
              {gastoErr && <div className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-200">{gastoErr}</div>}
              {gastoOk && <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg border border-emerald-200">{gastoOk}</div>}
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">Concepto *</label>
                <input type="text" required placeholder="Ej: Alquiler del salón, gas, etc." value={gastoForm.concepto} onChange={e => setGastoForm(prev => ({ ...prev, concepto: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2.5 text-xs outline-hidden focus:border-zinc-500" />
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
                  <input type="date" required value={gastoForm.fecha} onChange={e => setGastoForm(prev => ({ ...prev, fecha: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2.5 text-xs font-mono outline-hidden focus:border-zinc-500" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-zinc-500 font-bold block text-[10px] uppercase">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS_GASTO.map(cat => (
                    <button key={cat} type="button" onClick={() => setGastoForm(prev => ({ ...prev, categoria: cat }))}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${gastoForm.categoria === cat ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:border-zinc-400'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-zinc-100 flex justify-end gap-2 font-semibold">
                <button type="button" onClick={() => setShowGastoModal(false)} className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all shadow-sm cursor-pointer">Registrar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ MODAL CARGA MANUAL PAGO ═══ */}
      {showAddPagoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans" id="payment-form-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-xl overflow-hidden">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold tracking-tight">Cargar Transacción Contable</h3>
                <p className="text-[10px] text-zinc-400">Permite registrar cobros individuales o agrupados</p>
              </div>
              <button onClick={() => { setShowAddPagoModal(false); setBeneficiarios([]); }} className="text-zinc-400 hover:text-white" id="btn-close-payment">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleManualPagoSubmit} className="p-5 space-y-4 text-xs">
              {formErr && <div className="bg-red-50 text-red-700 p-2.5 rounded-lg font-medium border border-red-200">{formErr}</div>}
              {formSuccess && <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-semibold border border-emerald-200">{formSuccess}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Quién Abona (Pagador)</label>
                  <select required value={pagoForm.cliente_id} onChange={e => handleClientSelect(e.target.value)} className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium" id="pago-cliente-select">
                    <option value="">-- Seleccionar pagador --</option>
                    {clientes.filter(c => c.activo).map(c => {
                      const pl = planes.find(p => p.id === c.plan_id);
                      return <option key={c.id} value={c.id}>{c.apellido}, {c.nombre} (Plan {pl?.nombre} — Deuda: ${c.deuda_acumulada})</option>;
                    })}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Agregar Alumno Beneficiario</label>
                  <select value="" onChange={e => handleAddBeneficiary(e.target.value)} className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium" id="add-beneficiary-select">
                    <option value="">-- Buscar y agregar otro socio --</option>
                    {clientes.filter(c => c.activo).map(c => {
                      const pl = planes.find(p => p.id === c.plan_id);
                      return <option key={c.id} value={c.id}>{c.apellido}, {c.nombre} (Plan: {pl?.nombre})</option>;
                    })}
                  </select>
                </div>
              </div>
              {/* BENEFICIARIOS */}
              <div className="space-y-2">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Detalle de Socios Cubiertos</label>
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
                              <td className="p-2 text-center"><button type="button" onClick={() => setBeneficiarios(prev => prev.filter((_, i) => i !== idx))} className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-600 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Vía de Pago</label>
                  <select value={pagoForm.medio_pago} onChange={e => setPagoForm(prev => ({ ...prev, medio_pago: e.target.value as MedioPago }))} className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden">
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="MERCADO_PAGO">Mercado Pago</option>
                    <option value="UALA">Uala</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Ref / ID Transacción</label>
                  <input type="text" placeholder="ej: MP-90382211 (opcional)" value={pagoForm.hash_transaccion} onChange={e => setPagoForm(prev => ({ ...prev, hash_transaccion: e.target.value }))} className="w-full border border-zinc-200 rounded-lg p-2 text-xs font-mono outline-hidden" />
                </div>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-550">Total de la Transacción:</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">${beneficiarios.reduce((sum, b) => sum + (parseFloat(b.monto) || 0), 0).toLocaleString('es-AR')} ARS</span>
              </div>
              <div className="pt-4 border-t border-zinc-100 flex justify-end gap-2 text-xs font-semibold">
                <button type="button" onClick={() => { setShowAddPagoModal(false); setBeneficiarios([]); }} className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all cursor-pointer">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-all font-semibold shadow-xs cursor-pointer">Registrar Cobro ({beneficiarios.length} Socios)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ RECEIPT PREVIEW ═══ */}
      {receiptClientText && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans">
          <div className="bg-zinc-950 text-white rounded-xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden relative p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="font-sans font-bold text-sm flex items-center gap-2">
                <svg className="w-5 h-5 fill-current text-emerald-400" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/></svg>
                Comprobante WhatsApp
              </h3>
              <button onClick={() => setReceiptClientText(null)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg font-sans text-xs text-zinc-300 leading-relaxed italic">"{receiptClientText}"</div>
            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(receiptClientText); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 border border-zinc-700 cursor-pointer">
                <Copy className="w-4 h-4" />{copiado ? 'Copiado' : 'Copiar Texto'}
              </button>
              <a href={`https://wa.me/?text=${encodeURIComponent(receiptClientText)}`} target="_blank" rel="noreferrer" className="flex-1 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 text-center shadow-sm shadow-emerald-600/20 transition-colors">
                <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/></svg>
                Enviar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MULTIPLE RECEIPTS ═══ */}
      {showRecibosModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 fill-current text-[#25D366]" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/></svg>
                <h3 className="text-base font-bold">Comprobantes de Pago para Socios</h3>
              </div>
              <button onClick={() => { setShowRecibosModal(false); setRecibosMultiples([]); }} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <p className="text-zinc-500">Cobros registrados correctamente. Mensajes listos para enviar por WhatsApp.</p>
              <div className="space-y-4">
                {recibosMultiples.map((rec, index) => {
                  const handleCopySingle = () => {
                    navigator.clipboard.writeText(rec.messageText);
                    setRecibosMultiples(prev => prev.map((r, i) => i === index ? { ...r, copiado: true } : r));
                    setTimeout(() => setRecibosMultiples(prev => prev.map((r, i) => i === index ? { ...r, copiado: false } : r)), 2000);
                  };
                  return (
                    <div key={index} className="border border-zinc-200 rounded-lg p-4 bg-zinc-50 space-y-2">
                      <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                        <span className="font-bold text-zinc-900">{rec.cliente_nombre}</span>
                        <span className="text-[10px] text-zinc-450 font-mono">WhatsApp: {rec.telefono}</span>
                      </div>
                      <div className="bg-white border border-zinc-200 p-2.5 rounded font-mono text-[11px] text-zinc-700 italic select-all whitespace-pre-wrap">{rec.messageText}</div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={handleCopySingle} className="flex-1 py-1.5 border border-zinc-200 hover:bg-zinc-100 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer">
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />{rec.copiado ? 'Copiado' : 'Copiar'}
                        </button>
                        <a href={`https://wa.me/${rec.telefono}?text=${encodeURIComponent(rec.messageText)}`} target="_blank" rel="noreferrer" className="flex-1 py-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 text-center transition-colors shadow-sm">
                          <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.66.986 3.284 1.48 4.909 1.481 5.482 0 9.94-4.461 9.943-9.94.002-2.654-1.029-5.15-2.901-7.025C16.726 1.795 14.237.772 11.583.772c-5.485 0-9.94 4.46-9.943 9.94-.001 1.904.5 3.76 1.45 5.421L2.09 21.65l5.557-1.496zm12.355-6.883c-.302-.15-1.787-.882-2.062-.982-.275-.1-.475-.15-.674.15-.2.3-.775.982-.95 1.182-.175.2-.35.225-.65.075-.3-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.275-2.083.175-.3.275-.475.375-.674.1-.2.05-.375-.025-.525-.075-.15-.674-1.625-.925-2.225-.244-.589-.493-.51-.674-.519-.175-.008-.375-.01-.575-.01-.2 0-.525.075-.8.375-.275.3-1.05 1.025-1.05 2.5 0 1.475 1.075 2.9 1.225 3.1.15.2 2.11 3.22 5.11 4.52.714.31 1.272.496 1.706.634.717.228 1.37.195 1.887.118.575-.085 1.788-.73 2.038-1.43.25-.7.25-1.3.175-1.43-.075-.125-.275-.2-.575-.35z"/></svg>
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="p-4 border-t border-zinc-150 bg-zinc-50 flex justify-end">
              <button type="button" onClick={() => { setShowRecibosModal(false); setRecibosMultiples([]); }} className="px-5 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold text-xs cursor-pointer">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL CONCILIAR EXTRACTO ═══ */}
      {showImportStatementModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm font-sans">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-base font-bold">Conciliar Extracto .CSV (Billeteras Digitales)</h3>
              <button onClick={() => setShowImportStatementModal(false)} className="text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {!statementCSV ? (
                <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center bg-zinc-50">
                  <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                  <p className="font-semibold text-zinc-700">Subí tu archivo .CSV de Mercado Pago / Uala</p>
                  <p className="text-zinc-400 text-[10px] mt-1">Formato: Email, Monto, Hash, Medio, Mes</p>
                  <input type="file" accept=".csv" onChange={handleStatementUpload} className="mt-4 block mx-auto text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer" />
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-bold text-zinc-900 border-b border-zinc-100 pb-2">Vista previa de transacciones leídas</h4>
                  <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 text-zinc-500 font-semibold uppercase tracking-wider text-[9px] border-b border-zinc-200">
                        <tr><th className="p-2">Socio</th><th className="p-2">Email</th><th className="p-2">Monto</th><th className="p-2">Hash</th><th className="p-2">Medio</th></tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {statementParsedRows.map((row, idx) => {
                          const cli = clientes.find(c => c.activo && c.email.toLowerCase() === row.cliente_email?.toLowerCase());
                          const esDuplicado = pagos.some(p => p.hash_transaccion === row.hash);
                          return (
                            <tr key={idx} className={esDuplicado ? 'bg-amber-50/50 opacity-70' : 'hover:bg-zinc-50'}>
                              <td className="p-2 font-semibold">{cli ? `${cli.apellido}, ${cli.nombre}` : <span className="text-red-500">No encontrado</span>}</td>
                              <td className="p-2 font-mono">{row.cliente_email}</td>
                              <td className="p-2 font-mono font-bold text-emerald-600">${row.monto}</td>
                              <td className="p-2 font-mono text-[10px]">{row.hash}</td>
                              <td className="p-2 text-zinc-400">{row.medio_pago}{esDuplicado && <span className="ml-2 bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-[8px] font-bold border border-amber-200">DUPLICADO</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
                    <span className="text-zinc-600">{statementParsedRows.length} líneas identificadas. Los duplicados serán omitidos.</span>
                    <button onClick={handleConfirmStatementImport} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-700 text-white rounded-lg font-bold text-xs cursor-pointer">Ejecutar Conciliación</button>
                  </div>
                  {importReport && (
                    <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl space-y-2">
                      <h4 className="font-bold text-emerald-700 flex items-center gap-1.5"><Check className="w-5 h-5" />Conciliación finalizada</h4>
                      <p className="text-zinc-600">Procesados: <strong>{importReport.procesados}</strong> | Registrados: <strong className="text-emerald-600">{importReport.insertados}</strong> | Duplicados: <strong className="text-amber-600">{importReport.duplicados}</strong></p>
                      {importReport.errores.length > 0 && <div className="bg-white p-2 rounded-lg text-[9.5px] border border-red-200 text-red-600 font-mono">{importReport.errores.map((e, i) => <div key={i}>{e}</div>)}</div>}
                      <button onClick={() => setShowImportStatementModal(false)} className="w-full bg-black text-white rounded-lg py-2 mt-2 font-bold text-xs cursor-pointer">Finalizar</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
