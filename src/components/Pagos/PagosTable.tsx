// src/components/Pagos/PagosTable.tsx
import React from 'react';
import { Pago, Cliente, Plan } from '../../types';
import { Search, Plus, Upload } from 'lucide-react';

// Genera los últimos N meses dinámicamente
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

interface PagosTableProps {
  buscarCliente: string;
  setBuscarCliente: (val: string) => void;
  filtroMes: string;
  setFiltroMes: (val: string) => void;
  filtroMedio: string;
  setFiltroMedio: (val: string) => void;
  pagosFiltrados: Pago[];
  clientes: Cliente[];
  planes: Plan[];
  onOpenReceipt: (pago: Pago) => void;
  onAddPagoClick: () => void;
  onConciliarCSVClick: () => void;
}

export const PagosTable: React.FC<PagosTableProps> = ({
  buscarCliente,
  setBuscarCliente,
  filtroMes,
  setFiltroMes,
  filtroMedio,
  setFiltroMedio,
  pagosFiltrados,
  clientes,
  planes,
  onOpenReceipt,
  onAddPagoClick,
  onConciliarCSVClick
}) => {
  return (
    <div className="space-y-4">
      {/* FILTROS Y ACCIONES */}
      <div className="bg-white border border-zinc-200 p-3 sm:p-4 rounded-xl space-y-3 text-xs">
        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nombre del alumno..."
            value={buscarCliente}
            onChange={e => setBuscarCliente(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-zinc-200 rounded-lg text-xs font-sans outline-hidden focus:border-zinc-400 font-medium"
            id="payments-search-input"
          />
        </div>

        {/* Selects & Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <span className="shrink-0">Mes:</span>
              <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className="w-full border border-zinc-200 rounded-md py-1.5 px-2 text-zinc-700 bg-white text-xs font-semibold">
                {MESES_OPCIONES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <span className="shrink-0">Medio:</span>
              <select value={filtroMedio} onChange={e => setFiltroMedio(e.target.value)} className="w-full border border-zinc-200 rounded-md py-1.5 px-2 text-zinc-700 bg-white text-xs font-semibold">
                <option value="TODOS">Todos</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="UALA">Uala</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex gap-2">
            <button
              onClick={onAddPagoClick}
              className="bg-black hover:bg-zinc-800 text-white px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
              id="btn-register-payment-modal-trigger"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cargar Pago</span>
            </button>
            <button
              onClick={onConciliarCSVClick}
              className="flex items-center justify-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 px-3 py-2 rounded-lg text-xs font-semibold transition-all border-none cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Conciliar CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLA COBROS */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <div className="min-w-[540px]">
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
                      <td className="p-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-[10px] uppercase font-bold text-zinc-700">
                            {p.medio_pago}
                          </span>
                          {p.medio_pago === 'TRANSFERENCIA' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-violet-100 text-violet-800 border border-violet-200 font-mono">
                              A: {p.destino_transferencia || 'JUANCHI'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-zinc-600">{p.mes_correspondiente}</td>
                      <td className="p-4">
                        <div className="font-mono text-zinc-500 text-[10px] select-all">{p.hash_transaccion || 'Ref-' + p.id.slice(-5)}</div>
                        <div className="text-[9px] text-zinc-400">{new Date(p.fecha_pago).toLocaleString('es-AR')}</div>
                      </td>
                      <td className="p-4 font-mono text-zinc-400 text-[10px]">{p.registrado_por}</td>
                      <td className="p-4 text-center">
                        <button onClick={() => onOpenReceipt(p)} className="px-2.5 py-1 text-[10.5px] border border-emerald-200 rounded bg-emerald-50 text-emerald-800 flex items-center gap-1.5 hover:bg-emerald-100 font-bold justify-center mx-auto cursor-pointer transition-colors border-none">
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
    </div>
  );
};
