// src/components/PagosLog.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../GymContext';
import { Pago, MedioPago } from '../types';
import { 
  Plus, Search, Receipt, Download, Upload, CreditCard, DollarSign, 
  HelpCircle, Check, ArrowDownRight, ArrowUpRight, Copy, RefreshCw, X, MessageSquare, Trash2 
} from 'lucide-react';

interface PagosLogProps {
  showAddPagoModal: boolean;
  setShowAddPagoModal: (show: boolean) => void;
}

export const PagosLog: React.FC<PagosLogProps> = ({ showAddPagoModal, setShowAddPagoModal }) => {
  const { 
    pagos, clientes, planes, registrarPago, importarPagosCSV, rolActivo 
  } = useGym();

  const [buscarCliente, setBuscarCliente] = useState('');
  const [filtroMedio, setFiltroMedio] = useState<string>('TODOS');
  const [filtroMes, setFiltroMes] = useState<string>('2026-05');

  // --- MANUAL FORM STATE ---
  const [pagoForm, setPagoForm] = useState({
    cliente_id: '', // Quién abona
    medio_pago: 'MERCADO_PAGO' as MedioPago,
    mes_correspondiente: '2026-05',
    hash_transaccion: ''
  });
  const [beneficiarios, setBeneficiarios] = useState<Array<{ cliente_id: string, monto: string, mes_correspondiente: string }>>([]);
  const [formErr, setFormErr] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // --- CSV BANK STATEMENT IMPORT STATE ---
  const [showImportStatementModal, setShowImportStatementModal] = useState(false);
  const [statementCSV, setStatementCSV] = useState('');
  const [statementParsedRows, setStatementParsedRows] = useState<any[]>([]);
  const [importReport, setImportReport] = useState<{ procesados: number; insertados: number; duplicados: number; errores: string[] } | null>(null);

  // --- WHATSAPP GENERATOR DIALOG ---
  const [receiptClientText, setReceiptClientText] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  
  // --- WHATSAPP MULTIPLE RECEIPTS COMPOSER ---
  const [recibosMultiples, setRecibosMultiples] = useState<Array<{ cliente_nombre: string, messageText: string, telefono: string, copiado: boolean }>>([]);
  const [showRecibosModal, setShowRecibosModal] = useState(false);

  // Prefill price on client select
  const handleClientSelect = (clientId: string) => {
    const cl = clientes.find(c => c.id === clientId);
    if (!cl) return;

    const plan = planes.find(p => p.id === cl.plan_id);
    const planPrecio = plan ? plan.precio : 0;

    setPagoForm(prev => ({
      ...prev,
      cliente_id: clientId
    }));

    // Autopopulate payer as first beneficiary if list is empty
    if (beneficiarios.length === 0) {
      setBeneficiarios([{
        cliente_id: clientId,
        monto: planPrecio.toString(),
        mes_correspondiente: pagoForm.mes_correspondiente
      }]);
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

    setBeneficiarios(prev => [
      ...prev,
      {
        cliente_id: clientId,
        monto: planPrecio.toString(),
        mes_correspondiente: pagoForm.mes_correspondiente
      }
    ]);
    setFormErr('');
  };

  const handleUpdateBeneficiaryMonto = (index: number, val: string) => {
    setBeneficiarios(prev => prev.map((b, idx) => idx === index ? { ...b, monto: val } : b));
  };

  const handleUpdateBeneficiaryMes = (index: number, val: string) => {
    setBeneficiarios(prev => prev.map((b, idx) => idx === index ? { ...b, mes_correspondiente: val } : b));
  };

  const handleRemoveBeneficiary = (index: number) => {
    setBeneficiarios(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleManualPagoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr('');
    setFormSuccess('');

    if (!pagoForm.cliente_id) {
      setFormErr('Por favor ingrese quién abona la transacción.');
      return;
    }

    if (beneficiarios.length === 0) {
      setFormErr('Debe ingresar al menos un beneficiario para el pago.');
      return;
    }

    // Validate all amounts
    for (let i = 0; i < beneficiarios.length; i++) {
      const b = beneficiarios[i];
      const parsedMonto = parseFloat(b.monto);
      if (isNaN(parsedMonto) || parsedMonto <= 0) {
        const c = clientes.find(x => x.id === b.cliente_id);
        setFormErr(`El monto para el socio ${c ? c.nombre + ' ' + c.apellido : 'desconocido'} debe ser mayor a 0 pesos.`);
        return;
      }
      if (!b.mes_correspondiente) {
        setFormErr('Todos los beneficiarios deben tener un mes correspondiente asignado.');
        return;
      }
    }

    const finalHash = pagoForm.hash_transaccion.trim() || `MP-${Date.now()}`;

    // Loop through beneficiaries and register payments
    const results: any[] = [];
    const generatedReceipts: typeof recibosMultiples = [];

    beneficiarios.forEach((b, idx) => {
      const parsedMonto = parseFloat(b.monto);
      const res = registrarPago({
        cliente_id: b.cliente_id,
        cliente_nombre_completo: '', // resolved inside Context
        monto: parsedMonto,
        medio_pago: pagoForm.medio_pago,
        mes_correspondiente: b.mes_correspondiente,
        hash_transaccion: finalHash,
        registrado_por: 'operator@gimnasio.com.ar'
      }, 'operator@gimnasio.com.ar');

      results.push(res);

      // Generate WhatsApp text for this beneficiary
      const clObj = clientes.find(c => c.id === b.cliente_id);
      if (clObj) {
        const nombre = clObj.nombre;
        let textMsg = '';
        if (clObj.tipo === 'FIJO' && clObj.turnos_fijos.length > 0) {
          const turnosStr = clObj.turnos_fijos.map(tfId => {
            const parts = tfId.split('-');
            return `${parts[0]} ${parts[1] || '00:00'}hs`;
          }).join(', ');
          textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${parsedMonto.toLocaleString('es-AR')} correspondiente al mes de ${b.mes_correspondiente} para la actividad física en KAHA GYM. ¡Muchas gracias por tu compromiso! Tus turnos fijos son ${turnosStr} y se renovarán automáticamente, ¿está ok? Sino comunícame con alguien para hablar y acomodar.`;
        } else {
          textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${parsedMonto.toLocaleString('es-AR')} correspondiente al mes de ${b.mes_correspondiente} para la actividad física en KAHA GYM. ¡Muchas gracias por tu compromiso! Recordá que tus cupos son variables y podés gestionar tus reservas en el portal del socio.`;
        }

        generatedReceipts.push({
          cliente_nombre: `${clObj.apellido}, ${clObj.nombre}`,
          messageText: textMsg,
          telefono: clObj.telefono || '5491123456789',
          copiado: false
        });
      }
    });

    const failed = results.find(r => !r.success);
    if (failed) {
      setFormErr(failed.message);
    } else {
      setFormSuccess('Cobro múltiple registrado exitosamente en el sistema.');
      setPagoForm({
        cliente_id: '',
        medio_pago: 'MERCADO_PAGO',
        mes_correspondiente: '2026-05',
        hash_transaccion: ''
      });
      setBeneficiarios([]);
      
      // Load generated WhatsApp receipts to show in the composer modal
      setRecibosMultiples(generatedReceipts);

      setTimeout(() => {
        setShowAddPagoModal(false);
        setFormSuccess('');
        setShowRecibosModal(true); // Open the WhatsApp broadcast receipts composer modal!
      }, 1200);
    }
  };

  // --- REPORT COMPARATIVE MONTHLY REVENUE ---
  const comparativaFinanciera = useMemo(() => {
    const mesCorriente = filtroMes; // '2026-05'
    // Extraer mes anterior
    const year = parseInt(mesCorriente.split('-')[0]);
    const month = parseInt(mesCorriente.split('-')[1]);
    const prevMonthStr = month === 1 
      ? `${year - 1}-12` 
      : `${year}-${(month - 1).toString().padStart(2, '0')}`;

    const ingresosEsteMes = pagos
      .filter(p => p.mes_correspondiente === mesCorriente)
      .reduce((s, p) => s + p.monto, 0);

    const ingresosMesAnterior = pagos
      .filter(p => p.mes_correspondiente === prevMonthStr)
      .reduce((s, p) => s + p.monto, 0) || 57000; // default seed backup

    const variacionAbsoluta = ingresosEsteMes - ingresosMesAnterior;
    const variacionPorcentual = ingresosMesAnterior > 0 
      ? Math.round((variacionAbsoluta / ingresosMesAnterior) * 100)
      : 0;

    return {
      mesActualLabel: mesCorriente,
      mesAnteriorLabel: prevMonthStr,
      esteMes: ingresosEsteMes,
      mesAnterior: ingresosMesAnterior,
      diferencia: variacionAbsoluta,
      porcent: variacionPorcentual
    };
  }, [pagos, filtroMes]);

  // --- RENDERING FILTERED PAYMENTS ---
  const pagosFiltrados = useMemo(() => {
    return pagos.filter(p => {
      // Filtrar mes
      if (p.mes_correspondiente !== filtroMes) return false;

      // Filtrar medio
      if (filtroMedio !== 'TODOS' && p.medio_pago !== filtroMedio) return false;

      // Buscar cliente
      if (buscarCliente.trim()) {
        const query = buscarCliente.toLowerCase();
        // Resolve customer name info if missing
        const cl = clientes.find(c => c.id === p.cliente_id);
        const nameText = cl ? `${cl.nombre} ${cl.apellido}`.toLowerCase() : p.cliente_nombre_completo.toLowerCase();
        if (!nameText.includes(query)) return false;
      }

      return true;
    });
  }, [pagos, filtroMes, filtroMedio, buscarCliente, clientes]);

  // --- PARSE EMBEDDED WALLET BANK STATEMENT (MERCADO PAGO / UALA CSV) ---
  const handleStatementUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setStatementCSV(text);

      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length > 1) {
        // Simular que mapeamos automáticamente encabezados típicos:
        // 'monto', 'email', 'ID_Transaccion' / 'hash', 'medio', 'mes'
        const rowsToPreview: any[] = [];
        lines.slice(1).forEach((l, idx) => {
          const cells = l.split(',');
          if (cells.length < 3) return;

          // Simulador inteligente de mapeo de Wallet:
          // Col 0: Email socio, Col 1: Monto, Col 2: Hash MP, Col 3: Medio (opcional), Col 4: Mes (opcional)
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

  // --- WHATSAPP GENERATOR HANDLER ---
  const handleOpenReceipt = (p: Pago) => {
    const cl = clientes.find(c => c.id === p.cliente_id);
    const nombre = cl ? cl.nombre : p.cliente_nombre_completo;
    
    let textMsg = '';
    if (cl && cl.tipo === 'FIJO' && cl.turnos_fijos.length > 0) {
      const turnosStr = cl.turnos_fijos.map(tfId => {
        const parts = tfId.split('-');
        return `${parts[0]} ${parts[1] || '00:00'}hs`;
      }).join(', ');
      textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${p.monto.toLocaleString('es-AR')} correspondiente al mes de ${p.mes_correspondiente} para la actividad física en KAHA GYM. ¡Muchas gracias por tu compromiso! Tus turnos fijos son ${turnosStr} y se renovarán automáticamente, ¿está ok? Sino comunícame con alguien para hablar y acomodar.`;
    } else {
      textMsg = `Hola ${nombre}! Confirmamos la recepción de tu pago de $${p.monto.toLocaleString('es-AR')} correspondiente al mes de ${p.mes_correspondiente} para la actividad física en KAHA GYM. ¡Muchas gracias por tu compromiso! Recordá que tus cupos son variables y podés gestionar tus reservas en el portal del socio.`;
    }
    
    setReceiptClientText(textMsg);
    setCopiado(false);
  };

  const handleCopyReceipt = () => {
    if (receiptClientText) {
      navigator.clipboard.writeText(receiptClientText);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto" id="pagos-log-tab-panel">
      
      {/* SECCIÓN TITULO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Registro de Pagos</h2>
          <p className="text-zinc-500 font-sans text-sm font-medium">Historial contable de abonos, conciliación bancaria y recibos de cobertura</p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs justify-end w-full md:w-auto">
          {/* IMPORT WALLET STATEMENT */}
          <button
            onClick={() => {
              setImportReport(null);
              setStatementParsedRows([]);
              setStatementCSV('');
              setShowImportStatementModal(true);
            }}
            className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-xs"
            id="btn-import-wallet-modal-trigger"
          >
            <Upload className="w-4 h-4 text-zinc-500" />
            Conciliar extracto billetera MP
          </button>

          {/* REGISTRAR PAGO DIRECTO */}
          <button
            onClick={() => {
              setFormErr('');
              setFormSuccess('');
              setShowAddPagoModal(true);
            }}
            className="bg-black hover:bg-zinc-800 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            id="btn-register-payment-modal-trigger"
          >
            <Plus className="w-4 h-4" />
            Cargar Pago Manual
          </button>
        </div>
      </div>

      {/* REPORTE MENSUAL COMPARATIVO CON MES ANTERIOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5" id="comparative-financial-kpis">
        {/* INGRESOS ESTE MES */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans">Facturado Mes Solicitado</span>
            <div className="text-2xl font-mono font-bold text-zinc-950 mt-1">${comparativaFinanciera.esteMes.toLocaleString('es-AR')}</div>
          </div>
          <div className="p-2 ml-4 bg-zinc-100 text-zinc-900 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* COMPARACION ANTERIOR */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans">Facturado Mes Anterior ({comparativaFinanciera.mesAnteriorLabel})</span>
            <div className="text-2xl font-mono font-bold text-zinc-500 mt-1">${comparativaFinanciera.mesAnterior.toLocaleString('es-AR')}</div>
          </div>
          <div className="p-2 ml-4 bg-zinc-50 text-zinc-400 rounded-lg">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* VARIACION PORCENTUAL CARD */}
        <div className="bg-white border border-zinc-200 p-5 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider block font-sans">Evolución de Tendencia</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-2xl font-mono font-bold block ${comparativaFinanciera.diferencia >= 0 ? 'text-emerald-600' : 'text-red-650'}`}>
                {comparativaFinanciera.porcent >= 0 ? '+' : ''}{comparativaFinanciera.porcent}%
              </span>
              <span className="text-[10px] bg-zinc-100 px-2 py-0.5 rounded-sm border border-zinc-200 font-mono text-zinc-500">
                ${comparativaFinanciera.diferencia.toLocaleString('es-AR')} ARS
              </span>
            </div>
          </div>
          <div className={`p-2 ml-4 rounded-lg flex items-center justify-center ${
            comparativaFinanciera.diferencia >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            {comparativaFinanciera.diferencia >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* COMPONENTE DE BUSQUEDA Y FILTRADO */}
      <div className="bg-white border border-zinc-200 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between" id="payments-filters-container">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre del alumno..."
            value={buscarCliente}
            onChange={(e) => setBuscarCliente(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-zinc-200 rounded-lg text-xs font-sans outline-hidden focus:border-zinc-500"
            id="payments-search-input"
          />
        </div>

        <div className="flex gap-4 items-center">
          {/* FILTRO MES */}
          <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-zinc-500">
            <span>Mes de Análisis:</span>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="border border-zinc-200 rounded-md py-1 px-2 text-zinc-700 bg-white"
            >
              <option value="2026-05">Mayo 2026</option>
              <option value="2026-04">Abril 2026</option>
              <option value="2026-03">Marzo 2026</option>
              <option value="2026-02">Febrero 2026</option>
              <option value="2026-01">Enero 2026</option>
            </select>
          </div>

          {/* FILTRO MEDIO */}
          <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-zinc-500">
            <span>Medio:</span>
            <select
              value={filtroMedio}
              onChange={(e) => setFiltroMedio(e.target.value)}
              className="border border-zinc-200 rounded-md py-1 px-2 text-zinc-700 bg-white"
            >
              <option value="TODOS">Todos</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia Bancaria</option>
              <option value="MERCADO_PAGO">Mercado Pago</option>
              <option value="UALA">Uala</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA HISTORIAL DE COBROS */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-200 uppercase tracking-wider text-[10px]">
                <th className="p-4">Socio</th>
                <th className="p-4">Abono Registrado</th>
                <th className="p-4">Medio de Pago</th>
                <th className="p-4">Mes Cubierto</th>
                <th className="p-4">Comprobante ID / Ref</th>
                <th className="p-4">Registrado por</th>
                <th className="p-4 text-center">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
              {pagosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400 font-sans italic">
                    Sin registros de cobros coincidentes este mes.
                  </td>
                </tr>
              ) : (
                pagosFiltrados.map(p => {
                  const cl = clientes.find(c => c.id === p.cliente_id);
                  const planSocio = cl ? planes.find(x => x.id === cl.plan_id) : null;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/50">
                      <td className="p-4 font-semibold text-zinc-950">
                        {cl ? `${cl.apellido}, ${cl.nombre}` : p.cliente_nombre_completo}
                      </td>
                      <td className="p-4">
                        <div className="font-mono font-bold text-emerald-600">
                          ${p.monto.toLocaleString('es-AR')}
                        </div>
                        {planSocio && <div className="text-[10px] text-zinc-400 font-sans">{planSocio.nombre}</div>}
                      </td>
                      <td className="p-4 text-zinc-600">
                        <span className="px-2 py-0.5 rounded-sm bg-zinc-100 border border-zinc-200 text-[10px] uppercase font-bold text-zinc-700">
                          {p.medio_pago}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-zinc-600">{p.mes_correspondiente}</td>
                      <td className="p-4">
                        <div className="font-mono text-zinc-500 text-[10px] select-all cursor-copy">{p.hash_transaccion || 'Ref-MP-' + p.id.slice(-5)}</div>
                        <div className="text-[9px] text-zinc-400">{new Date(p.fecha_pago).toLocaleString('es-AR')}</div>
                      </td>
                      <td className="p-4 font-mono text-zinc-400 text-[10px]">{p.registrado_por}</td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenReceipt(p)}
                          className="px-2.5 py-1 text-[10.5px] border border-zinc-200 rounded bg-white text-zinc-950 flex items-center gap-1 hover:bg-zinc-50 font-bold justify-center mx-auto"
                          id="whatsapp-trigger-btn"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                          Ver Recibo
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

      {/* --- MODAL CARGA MANUAL PAGO --- */}
      {showAddPagoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans" id="payment-form-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-xl overflow-hidden">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold tracking-tight">Cargar Transacción Contable</h3>
                <p className="text-[10px] text-zinc-400">Permite registrar cobros individuales o agrupados (ej: padres pagando por hijos)</p>
              </div>
              <button
                onClick={() => {
                  setShowAddPagoModal(false);
                  setBeneficiarios([]);
                }}
                className="text-zinc-400 hover:text-white"
                id="btn-close-payment"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualPagoSubmit} className="p-5 space-y-4 text-xs">
              {formErr && (
                <div className="bg-red-50 text-red-700 p-2.5 rounded-lg font-medium border border-red-200">
                  {formErr}
                </div>
              )}

              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-2.5 rounded-lg font-semibold border border-emerald-250">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CHOOSE CLIENT WITH AUTOCOMPLETE / SELECT */}
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Quién Abona (Pagador)</label>
                  <select
                    required
                    value={pagoForm.cliente_id}
                    onChange={(e) => handleClientSelect(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
                    id="pago-cliente-select"
                  >
                    <option value="">-- Seleccionar pagador --</option>
                    {clientes
                      .filter(c => c.activo)
                      .map(c => {
                        const pl = planes.find(p => p.id === c.plan_id);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.apellido}, {c.nombre} (Plan {pl?.nombre} — Deuda: ${c.deuda_acumulada})
                          </option>
                        );
                      })}
                  </select>
                </div>

                {/* ADD BENEFICIARY DROPDOWN */}
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Agregar Alumno (Destinatario del pago)</label>
                  <select
                    value=""
                    onChange={(e) => handleAddBeneficiary(e.target.value)}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden font-medium"
                    id="add-beneficiary-select"
                  >
                    <option value="">-- Buscar y agregar otro socio --</option>
                    {clientes
                      .filter(c => c.activo)
                      .map(c => {
                        const pl = planes.find(p => p.id === c.plan_id);
                        return (
                          <option key={c.id} value={c.id}>
                            {c.apellido}, {c.nombre} (Plan: {pl?.nombre})
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>

              {/* BENEFICIARIES LIST */}
              <div className="space-y-2">
                <label className="text-zinc-500 font-semibold block text-[10px] uppercase">
                  Detalle de Socios Cubiertos por esta Transacción
                </label>
                
                {beneficiarios.length === 0 ? (
                  <div className="border border-dashed border-zinc-200 rounded-lg p-4 text-center text-zinc-400 italic">
                    No se han seleccionado destinatarios para el abono todavía.
                  </div>
                ) : (
                  <div className="border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50 max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-150 text-zinc-650 font-bold border-b border-zinc-200 text-[10px] uppercase">
                          <th className="p-2">Socio</th>
                          <th className="p-2 w-32">Mes a Cubrir</th>
                          <th className="p-2 w-28">Monto ARS</th>
                          <th className="p-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {beneficiarios.map((b, idx) => {
                          const cl = clientes.find(c => c.id === b.cliente_id);
                          return (
                            <tr key={b.cliente_id} className="hover:bg-zinc-100/50">
                              <td className="p-2 font-semibold text-zinc-900">
                                {cl ? `${cl.apellido}, ${cl.nombre}` : 'Desconocido'}
                              </td>
                              <td className="p-2">
                                <input
                                  type="month"
                                  required
                                  value={b.mes_correspondiente}
                                  onChange={(e) => handleUpdateBeneficiaryMes(idx, e.target.value)}
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
                                    onChange={(e) => handleUpdateBeneficiaryMonto(idx, e.target.value)}
                                    className="w-full border border-zinc-200 rounded-md p-1 pl-4 bg-white font-mono text-xs font-bold outline-hidden"
                                  />
                                </div>
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBeneficiary(idx)}
                                  className="p-1 hover:bg-red-50 text-zinc-400 hover:text-red-650 rounded-md transition-colors"
                                  title="Quitar destinatario"
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
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* MEDIO DE PAGO */}
                <div className="space-y-1">
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Vía o Canal de Pago</label>
                  <select
                    value={pagoForm.medio_pago}
                    onChange={(e) => setPagoForm(prev => ({ ...prev, medio_pago: e.target.value as MedioPago }))}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs bg-white outline-hidden"
                    id="pago-medio"
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
                  <label className="text-zinc-500 font-semibold block text-[10px] uppercase">Ref / ID Transacción Bancaria</label>
                  <input
                    type="text"
                    placeholder="ej: MP-90382211 (opcional)"
                    value={pagoForm.hash_transaccion}
                    onChange={(e) => setPagoForm(prev => ({ ...prev, hash_transaccion: e.target.value }))}
                    className="w-full border border-zinc-200 rounded-lg p-2 text-xs font-mono outline-hidden"
                    id="pago-hash"
                  />
                </div>
              </div>

              {/* DYNAMIC TOTAL PREVIEW */}
              <div className="bg-zinc-50 border border-zinc-200 p-3 rounded-lg flex justify-between items-center text-xs">
                <span className="font-semibold text-zinc-550">Total de la Transacción:</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  ${beneficiarios.reduce((sum, b) => sum + (parseFloat(b.monto) || 0), 0).toLocaleString('es-AR')} ARS
                </span>
              </div>

              <div className="pt-4 border-t border-zinc-100 flex justify-end gap-2 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPagoModal(false);
                    setBeneficiarios([]);
                  }}
                  className="px-4 py-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-all font-semibold shadow-xs"
                >
                  Registrar Cobro (${beneficiarios.length} Socios)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RECEIPT PREVIEW WHATSAPP COMPOSER --- */}
      {receiptClientText && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-zinc-950 text-white rounded-xl shadow-2xl border border-zinc-800 w-full max-w-md overflow-hidden relative p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-850 pb-3">
              <h3 className="font-sans font-bold text-sm tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" />
                Comprobante para Alumno (WhatsApp Link / Copy)
              </h3>
              <button
                onClick={() => setReceiptClientText(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-zinc-400">Este comprobante simula la generación del formato estructurado listo para enviarse al socio.</p>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg font-sans text-xs text-zinc-300 leading-relaxed font-semibold italic">
              "{receiptClientText}"
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyReceipt}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 border border-zinc-700"
              >
                <Copy className="w-4 h-4" />
                {copiado ? 'Copiado con éxito' : 'Copiar Texto'}
              </button>
              
              <a
                href={`https://wa.me/?text=${encodeURIComponent(receiptClientText)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-1.5 text-center shadow-md shadow-emerald-600/10"
              >
                Enviar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- MULTIPLE RECEIPTS WHATSAPP COMPOSER --- */}
      {showRecibosModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold tracking-tight">Comprobantes de Pago para Socios</h3>
              </div>
              <button 
                onClick={() => {
                  setShowRecibosModal(false);
                  setRecibosMultiples([]);
                }} 
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <p className="text-zinc-550 leading-relaxed">
                Se registraron los cobros correctamente. Abajo tenés los mensajes listos para enviar a cada alumno o tutor por WhatsApp.
              </p>

              <div className="space-y-4">
                {recibosMultiples.map((rec, index) => {
                  const handleCopySingle = () => {
                    navigator.clipboard.writeText(rec.messageText);
                    setRecibosMultiples(prev => prev.map((r, i) => i === index ? { ...r, copiado: true } : r));
                    setTimeout(() => {
                      setRecibosMultiples(prev => prev.map((r, i) => i === index ? { ...r, copiado: false } : r));
                    }, 2000);
                  };

                  return (
                    <div key={index} className="border border-zinc-200 rounded-lg p-4 bg-zinc-50 space-y-2 animate-fade-in">
                      <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                        <span className="font-bold text-zinc-900">{rec.cliente_nombre}</span>
                        <span className="text-[10px] text-zinc-450 font-mono">WhatsApp: {rec.telefono}</span>
                      </div>
                      
                      <div className="bg-white border border-zinc-200 p-2.5 rounded font-mono text-[11px] text-zinc-700 italic select-all leading-normal whitespace-pre-wrap">
                        {rec.messageText}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCopySingle}
                          className="flex-1 py-1.5 border border-zinc-200 hover:bg-zinc-150 rounded text-xs font-semibold flex items-center justify-center gap-1 text-zinc-705 transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-zinc-500" />
                          {rec.copiado ? 'Copiado' : 'Copiar Mensaje'}
                        </button>
                        <a
                          href={`https://wa.me/${rec.telefono}?text=${encodeURIComponent(rec.messageText)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-550 text-white rounded text-xs font-bold flex items-center justify-center gap-1 text-center shadow-xs transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-white" />
                          Enviar WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-zinc-150 bg-zinc-50 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowRecibosModal(false);
                  setRecibosMultiples([]);
                }}
                className="px-5 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CONCILIAR EXTRACTO MP --- */}
      {showImportStatementModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-xl shadow-2xl border border-zinc-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="bg-zinc-900 text-white p-5 flex justify-between items-center">
              <h3 className="text-base font-bold tracking-tight">Conciliar Extracto .CSV (Billeteras Digitales)</h3>
              <button onClick={() => setShowImportStatementModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {!statementCSV ? (
                <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center bg-zinc-50 hover:bg-zinc-100/50">
                  <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                  <p className="font-semibold text-zinc-700 font-sans">Sube tu archivo .CSV de Mercado Pago / Uala</p>
                  <p className="text-zinc-400 text-[10px] mt-1 leading-normal">
                    Formato de conciliación: Columna 1=Email del socio, Columna 2=Monto, Columna 3=ID de transacción, Columna 4=Medio, Columna 5=Mes.
                  </p>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleStatementUpload}
                    className="mt-4 block mx-auto text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-900 file:text-white hover:file:bg-zinc-800 cursor-pointer"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="font-bold text-zinc-900 border-b border-zinc-100 pb-2">Previsualización de Transacciones Leídas</h4>
                  
                  <div className="overflow-x-auto border border-zinc-200 rounded-lg">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-zinc-50 text-zinc-500 font-semibold uppercase tracking-wider text-[9px] border-b border-zinc-200">
                        <tr>
                          <th className="p-2">Socio Encontrado</th>
                          <th className="p-2">Email</th>
                          <th className="p-2">Monto a Conciliar</th>
                          <th className="p-2">Hash de Transacción</th>
                          <th className="p-2">Medio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {statementParsedRows.map((row, idx) => {
                          const cli = clientes.find(c => c.activo && c.email.toLowerCase() === row.cliente_email?.toLowerCase());
                          const esDuplicado = pagos.some(p => p.hash_transaccion === row.hash);

                          return (
                            <tr key={idx} className={esDuplicado ? 'bg-amber-50/50 opacity-70' : 'hover:bg-zinc-50'}>
                              <td className="p-2 font-semibold">
                                {cli ? `${cli.apellido}, ${cli.nombre}` : (
                                  <span className="text-red-500 font-semibold font-sans">Socio no encontrado</span>
                                )}
                              </td>
                              <td className="p-2 font-mono">{row.cliente_email}</td>
                              <td className="p-2 font-mono font-bold text-emerald-600">${row.monto}</td>
                              <td className="p-2 font-mono text-[10px] font-semibold">{row.hash}</td>
                              <td className="p-2 text-zinc-400">
                                {row.medio_pago}
                                {esDuplicado && <span className="ml-2 bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-[8px] font-sans font-bold border border-amber-200">DUPLICADO</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
                    <span className="text-zinc-650 leading-tight">
                      Fueron identificadas <span className="font-bold text-zinc-900">{statementParsedRows.length} líneas</span> de cobro. Los pagos con hash duplicados serán filtrados por seguridad.
                    </span>
                    <button
                      onClick={handleConfirmStatementImport}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 text-white rounded-lg font-bold"
                    >
                      Ejecutar Conciliación
                    </button>
                  </div>

                  {importReport && (
                    <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl space-y-2 font-sans font-medium">
                      <h4 className="font-bold text-emerald-700 flex items-center gap-1.5">
                        <Check className="w-5 h-5" />
                        Conciliación finalizada
                      </h4>
                      <p className="text-zinc-600 leading-normal">
                        Procesados: <strong>{importReport.procesados}</strong> | 
                        Registrados: <strong className="text-emerald-600">{importReport.insertados}</strong> | 
                        Duplicados omitidos: <strong className="text-amber-600">{importReport.duplicados}</strong>
                      </p>
                      {importReport.errores.length > 0 && (
                        <div className="bg-white p-2 rounded-lg text-[9.5px] border border-red-200 text-red-650 font-mono">
                          {importReport.errores.map((e, index) => <div key={index} className="py-1">{e}</div>)}
                        </div>
                      )}
                      <button
                        onClick={() => setShowImportStatementModal(false)}
                        className="w-full bg-black text-white rounded-lg py-2 mt-2 font-bold"
                      >
                        Finalizar
                      </button>
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
