// src/components/Pagos/BalanceTab.tsx
import React, { useState, useMemo } from 'react';
import { useGym } from '../../GymContext';
import { 
  DollarSign, TrendingUp, TrendingDown, Scale, ArrowRight, 
  Share2, Check, Eye, EyeOff, Calendar, AlertCircle, 
  Users, Wallet, PieChart, ShieldCheck, HelpCircle
} from 'lucide-react';
import { calcularBalanceMes, generarMensajeWhatsAppBalance } from '../../lib/balanceFinanciero';

interface BalanceTabProps {
  mostrarBalance: boolean;
  onToggleBalance: () => void;
}

// Genera los últimos 12 meses para el selector
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

export const BalanceTab: React.FC<BalanceTabProps> = ({ mostrarBalance, onToggleBalance }) => {
  const { 
    pagos, gastos, clientes, planes, 
    profesores, turnos, novedadesProfesores 
  } = useGym();

  const [mesSeleccionado, setMesSeleccionado] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });

  const [incluirEfectivo, setIncluirEfectivo] = useState(false);
  const [porcentajeJuanchi, setPorcentajeJuanchi] = useState<number>(50);
  const [copiado, setCopiado] = useState(false);

  // Nombre legible del mes seleccionado
  const nombreMesSeleccionado = useMemo(() => {
    const found = MESES_OPCIONES.find(m => m.value === mesSeleccionado);
    if (found) return found.label;
    const [year, month] = mesSeleccionado.split('-').map(Number);
    const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${MESES_ES[(month || 1) - 1]} ${year}`;
  }, [mesSeleccionado]);

  // Cálculo del balance del mes corriente
  const balance = useMemo(() => {
    return calcularBalanceMes({
      mes: mesSeleccionado,
      pagos,
      gastos,
      clientes,
      planes,
      profesores,
      turnos,
      novedadesProfesores,
      incluirEfectivoEnCompensacion: incluirEfectivo,
      porcentajeJuanchi
    });
  }, [mesSeleccionado, pagos, gastos, clientes, planes, profesores, turnos, novedadesProfesores, incluirEfectivo, porcentajeJuanchi]);

  // Mes anterior para comparar
  const mesAnteriorStr = useMemo(() => {
    const [year, month] = mesSeleccionado.split('-').map(Number);
    return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  }, [mesSeleccionado]);

  const balanceMesAnterior = useMemo(() => {
    return calcularBalanceMes({
      mes: mesAnteriorStr,
      pagos,
      gastos,
      clientes,
      planes,
      profesores,
      turnos,
      novedadesProfesores
    });
  }, [mesAnteriorStr, pagos, gastos, clientes, planes, profesores, turnos, novedadesProfesores]);

  // Variación respecto al mes anterior
  const variacionGanancia = balance.gananciaReal - balanceMesAnterior.gananciaReal;
  const variacionPorcentual = balanceMesAnterior.gananciaReal > 0 
    ? Math.round((variacionGanancia / balanceMesAnterior.gananciaReal) * 100)
    : (balance.gananciaReal > 0 ? 100 : 0);

  const handleCopiarWhatsApp = () => {
    const texto = generarMensajeWhatsAppBalance(balance, nombreMesSeleccionado);
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  const fmt = (monto: number) => {
    if (!mostrarBalance) return '$ •••••••';
    return `$${Math.round(monto).toLocaleString('es-AR')}`;
  };

  return (
    <div className="space-y-6" id="balance-tab-content">
      {/* BARRA SUPERIOR: SELECTOR DE MES, COMPARATIVAS Y EXPORTACIÓN */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-wider">
            <Calendar className="w-4 h-4 text-zinc-700" />
            <span>Período:</span>
          </div>
          <select 
            value={mesSeleccionado}
            onChange={e => setMesSeleccionado(e.target.value)}
            className="border border-zinc-300 rounded-xl px-3 py-1.5 text-xs font-bold text-zinc-900 bg-zinc-50 outline-hidden focus:border-zinc-800 cursor-pointer shadow-2xs"
          >
            {MESES_OPCIONES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Botón rápido mes actual */}
          {mesSeleccionado !== new Date().toISOString().slice(0, 7) && (
            <button
              onClick={() => setMesSeleccionado(new Date().toISOString().slice(0, 7))}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            >
              Ir a Mes Actual
            </button>
          )}

          {/* Ocultar / Mostrar montos */}
          <button
            type="button"
            onClick={onToggleBalance}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors cursor-pointer shadow-2xs"
            title={mostrarBalance ? "Ocultar montos numéricos" : "Mostrar montos"}
          >
            {mostrarBalance ? <Eye className="w-4 h-4 text-zinc-500" /> : <EyeOff className="w-4 h-4 text-zinc-400" />}
            <span className="hidden sm:inline">{mostrarBalance ? 'Ocultar Cifras' : 'Mostrar Cifras'}</span>
          </button>
        </div>

        {/* BOTÓN COPIAR RESUMEN PARA WHATSAPP */}
        <button
          onClick={handleCopiarWhatsApp}
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border ${
            copiado 
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-200' 
              : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
          }`}
          title="Copia al portapapeles un resumen formateado para compartir con los socios en WhatsApp"
        >
          {copiado ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4 text-emerald-700" />}
          <span>{copiado ? '¡Copiado para WhatsApp!' : 'Copiar Resumen para WhatsApp'}</span>
        </button>
      </div>

      {/* FILA 1: KPIs EJECUTIVOS DE GANANCIA Y RESULTADO DE LA EMPRESA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ganancia Real de Caja */}
        <div className={`p-4 sm:p-5 rounded-2xl border shadow-xs flex flex-col justify-between ${
          balance.gananciaReal >= 0 
            ? 'bg-linear-to-br from-emerald-50/70 to-teal-50/40 border-emerald-200' 
            : 'bg-linear-to-br from-rose-50/70 to-red-50/40 border-rose-200'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 font-mono">
                Ganancia Neta Real (Caja)
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                balance.gananciaReal >= 0 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                {balance.margenRealPorcentaje}% margen
              </span>
            </div>
            <div className={`mt-2 font-mono font-black text-2xl sm:text-3xl truncate ${
              balance.gananciaReal >= 0 ? 'text-emerald-950' : 'text-rose-950'
            }`}>
              {fmt(balance.gananciaReal)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-200/60 flex items-center justify-between text-[11px] text-zinc-600">
            <span>Cobrado: <strong className="text-zinc-900">{fmt(balance.totalIngresos)}</strong></span>
            <span>Gastos: <strong className="text-zinc-900">{fmt(balance.totalEgresos)}</strong></span>
          </div>
        </div>

        {/* Ganancia Proyectada al Cierre */}
        <div className="bg-linear-to-br from-indigo-50/70 to-violet-50/40 border border-indigo-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 font-mono">
                Ganancia Proyectada
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                Al cierre
              </span>
            </div>
            <div className="mt-2 font-mono font-black text-2xl sm:text-3xl text-indigo-950 truncate">
              {fmt(balance.gananciaProyectada)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-indigo-200/60 text-[10px] text-indigo-700 leading-tight">
            <span>+ {fmt(balance.deudaPendienteCobro)} por cobrar</span>
            <span className="mx-1">•</span>
            <span>- {fmt(balance.liquidacionesPendientes)} profes pendientes</span>
          </div>
        </div>

        {/* Efectividad de Cobranza */}
        <div className="bg-white border border-zinc-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 font-mono">
                Efectividad de Cobranza
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-300 font-mono">
                {balance.porcentajeCobrado}%
              </span>
            </div>
            <div className="mt-2.5">
              <div className="w-full bg-zinc-100 h-2.5 rounded-full overflow-hidden border border-zinc-200">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, balance.porcentajeCobrado))}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
            <span>{balance.pagosCount} cuotas cobradas</span>
            <span className="text-amber-700 font-bold">{balance.sociosDeudoresCount} deudores ({fmt(balance.deudaPendienteCobro)})</span>
          </div>
        </div>

        {/* Punto de Equilibrio (Break-Even) */}
        <div className="bg-white border border-zinc-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-600 font-mono">
                Punto de Equilibrio
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-300">
                Costos Fijos
              </span>
            </div>
            <div className="mt-2 font-mono font-black text-2xl text-zinc-900 truncate">
              {fmt(balance.puntoEquilibrioMonto)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center justify-between">
            <span>Para no perder dinero:</span>
            <strong className="text-zinc-800 font-mono">≥ {balance.puntoEquilibrioSocios} socios</strong>
          </div>
        </div>
      </div>

      {/* FILA 2: CAJAS Y SALDOS INDIVIDUALES (JUANCHI, RULO, EFECTIVO) */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-4 h-4 text-zinc-700" />
              Saldos en Mano por Caja y Socio
            </h3>
            <p className="text-[11px] text-zinc-500 font-medium">
              Cuánto dinero recaudó cada cuenta bancaria/caja y cuánto gastó cada uno en nombre del gimnasio.
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-lg border border-zinc-200">
            Total en Mano: {fmt(balance.cajaJuanchi.saldoNeto + balance.cajaRulo.saldoNeto + balance.cajaEfectivo.saldoNeto)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CAJA JUANCHI */}
          <div className="bg-violet-50/60 border border-violet-200 rounded-2xl p-4.5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟣</span>
                <div>
                  <h4 className="font-bold text-xs text-violet-950 uppercase tracking-wide">Caja Juanchi</h4>
                  <span className="text-[10px] text-violet-600 font-medium">Cuenta / Transferencias</span>
                </div>
              </div>
              <span className="text-[10px] font-bold font-mono bg-violet-100 text-violet-800 px-2 py-0.5 rounded border border-violet-200">
                Juanchi
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wider block">Saldo Disponible</span>
              <div className="text-2xl font-mono font-black text-violet-950 mt-0.5 truncate">
                {fmt(balance.cajaJuanchi.saldoNeto)}
              </div>
            </div>

            <div className="pt-3 border-t border-violet-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Ingresos cobrados:</span>
                <strong className="text-emerald-700 font-mono">+{fmt(balance.cajaJuanchi.ingresos)}</strong>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Gastos abonados:</span>
                <strong className="text-rose-700 font-mono">-{fmt(balance.cajaJuanchi.egresos)}</strong>
              </div>
            </div>
          </div>

          {/* CAJA RULO */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4.5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🟡</span>
                <div>
                  <h4 className="font-bold text-xs text-amber-950 uppercase tracking-wide">Caja Rulo ("Full")</h4>
                  <span className="text-[10px] text-amber-700 font-medium">Cuenta / Transferencias</span>
                </div>
              </div>
              <span className="text-[10px] font-bold font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                Rulo
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Saldo Disponible</span>
              <div className="text-2xl font-mono font-black text-amber-950 mt-0.5 truncate">
                {fmt(balance.cajaRulo.saldoNeto)}
              </div>
            </div>

            <div className="pt-3 border-t border-amber-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Ingresos cobrados:</span>
                <strong className="text-emerald-700 font-mono">+{fmt(balance.cajaRulo.ingresos)}</strong>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Gastos abonados:</span>
                <strong className="text-rose-700 font-mono">-{fmt(balance.cajaRulo.egresos)}</strong>
              </div>
            </div>
          </div>

          {/* CAJA EFECTIVO */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4.5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💵</span>
                <div>
                  <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wide">Caja Efectivo</h4>
                  <span className="text-[10px] text-emerald-700 font-medium">Cajón Físico en el Local</span>
                </div>
              </div>
              <span className="text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                Físico
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Efectivo en Caja</span>
              <div className="text-2xl font-mono font-black text-emerald-950 mt-0.5 truncate">
                {fmt(balance.cajaEfectivo.saldoNeto)}
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Cobrado en mano:</span>
                <strong className="text-emerald-700 font-mono">+{fmt(balance.cajaEfectivo.ingresos)}</strong>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Gastos en efectivo:</span>
                <strong className="text-rose-700 font-mono">-{fmt(balance.cajaEfectivo.egresos)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILA 3: COMPENSACIÓN ENTRE SOCIOS (AJUSTE EXACTO 50/50) */}
      <div className="bg-linear-to-r from-zinc-900 via-zinc-900 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-wide uppercase font-sans flex items-center gap-2">
                Compensación Entre Socios ({porcentajeJuanchi}% Juanchi / {100 - porcentajeJuanchi}% Rulo)
              </h3>
              <p className="text-[11px] text-zinc-400">
                Cálculo del movimiento necesario para que ambos socios retiren exactamente lo que les corresponde.
              </p>
            </div>
          </div>

          {/* Opciones de Compensación */}
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer bg-zinc-800/70 px-3 py-1.5 rounded-xl border border-zinc-700 hover:border-zinc-600 transition-colors">
              <input
                type="checkbox"
                checked={incluirEfectivo}
                onChange={e => setIncluirEfectivo(e.target.checked)}
                className="rounded text-indigo-500 focus:ring-indigo-400 cursor-pointer"
              />
              <span className="text-[11px] font-medium">Repartir Efectivo de Caja</span>
            </label>
          </div>
        </div>

        {/* DICTAMEN DE COMPENSACIÓN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono">
                Dictamen de Ajuste:
              </span>
            </div>
            <div className="text-lg sm:text-xl font-bold font-sans text-white flex items-center gap-2 flex-wrap">
              {balance.compensacion.debeTransferir === 'NINGUNO' ? (
                <span className="text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  Cuentas perfectamente equilibradas
                </span>
              ) : (
                <span className="text-amber-300 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
                  👉 {mostrarBalance ? balance.compensacion.mensaje : 'Ajuste de cuentas calculado ••••••'}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              {balance.compensacion.detalle}
            </p>
          </div>

          <div className="bg-zinc-800/80 border border-zinc-700/80 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-zinc-300">
              <span>Base Divisible Socios:</span>
              <strong className="font-mono text-white">{fmt(balance.compensacion.baseTotal)}</strong>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Le corresponde a Juanchi:</span>
              <strong className="font-mono text-violet-300">{fmt(balance.compensacion.cuotaEquitativa)}</strong>
            </div>
            <div className="flex justify-between text-zinc-300">
              <span>Le corresponde a Rulo:</span>
              <strong className="font-mono text-amber-300">{fmt(balance.compensacion.baseTotal - balance.compensacion.cuotaEquitativa)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* FILA 4: ESTRUCTURA DE COSTOS Y ANÁLISIS DE GASTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Estructura de Gastos */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-zinc-700" />
              <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                Estructura de Gastos del Mes
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
              Total: {fmt(balance.totalEgresos)}
            </span>
          </div>

          {balance.estructuraCostos.length === 0 ? (
            <p className="text-xs text-zinc-400 italic text-center py-6">
              No hay gastos registrados para este mes.
            </p>
          ) : (
            <div className="space-y-3">
              {balance.estructuraCostos.map(item => (
                <div key={item.categoria} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.label}
                    </span>
                    <span className="font-mono font-bold text-zinc-900">
                      {fmt(item.monto)} <span className="text-zinc-400 font-normal">({item.porcentaje}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.porcentaje}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen Comparativo con Mes Anterior */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <TrendingUp className="w-4 h-4 text-zinc-700" />
              <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wider">
                Comparativa vs Mes Anterior
              </h3>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center text-zinc-600">
                <span>Ganancia Este Mes:</span>
                <strong className="font-mono text-zinc-900">{fmt(balance.gananciaReal)}</strong>
              </div>
              <div className="flex justify-between items-center text-zinc-600">
                <span>Ganancia Mes Anterior:</span>
                <strong className="font-mono text-zinc-600">{fmt(balanceMesAnterior.gananciaReal)}</strong>
              </div>
              <div className="pt-2 border-t border-zinc-100 flex justify-between items-center">
                <span className="font-bold text-zinc-800">Variación Absoluta:</span>
                <span className={`font-mono font-bold ${variacionGanancia >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {variacionGanancia >= 0 ? '+' : ''}{fmt(variacionGanancia)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-zinc-800">Variación Porcentual:</span>
                <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-full ${
                  variacionPorcentual >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {variacionPorcentual >= 0 ? '+' : ''}{variacionPorcentual}%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-[11px] text-zinc-600 space-y-1">
            <span className="font-bold text-zinc-800 block">💡 Nota de Gestión:</span>
            <p>
              El cálculo de compensación equilibra las transferencias bancarias recibidas y los gastos pagados con dinero personal de cada socio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
