// src/components/PlanesPricing.tsx
import React, { useState } from 'react';
import { useGym } from '../../GymContext';
import { Shield, Sparkles, TrendingUp, HelpCircle, History, Check, DollarSign, PenTool } from 'lucide-react';

export const PlanesPricing: React.FC = () => {
  const { planes, clientes, historialPrecios, updatePrecioPlan, rolActivo } = useGym();
  
  // --- STATE EDICIÓN ---
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [nuevoPrecio, setNuevoPrecio] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- CALCULO ADICIONAL ---
  const clientesActivos = clientes.filter(c => c.activo);
  
  // Calcular total teórico sumando el ingreso teórico de cada plan
  const totalTeoricoGimnasio = planes.reduce((acc, plan) => {
    const cantClientes = clientesActivos.filter(c => c.plan_id === plan.id).length;
    return acc + (cantClientes * plan.precio);
  }, 0);

  const handleStartEditPrice = (planId: string, precioActual: number) => {
    setSelectedPlanId(planId);
    setNuevoPrecio(precioActual.toString());
    setSuccessMsg('');
  };

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) return;

    const parsedPrice = parseFloat(nuevoPrecio);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      alert('Ingresa un precio numérico válido mayor o igual a 0.');
      return;
    }

    // Actualizar precio
    updatePrecioPlan(selectedPlanId, parsedPrice, 'admin@gimnasio.com.ar');
    setSuccessMsg('Precio de abono mensual modificado con éxito. Cambiado en histórico de cambios.');
    
    setTimeout(() => {
      setSelectedPlanId(null);
      setSuccessMsg('');
    }, 1500);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto" id="planes-pricing-tab-panel">
      
      {/* SECCIÓN TITULO */}
      <div>
        <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Planes y Precios</h2>
        <p className="text-zinc-500 font-sans text-sm">Gestiona la tarifa base de las cuotas y audita el rendimiento teórico de cada categoría</p>
      </div>

      {/* RLS BARRIER WARNING FOR OPERATORS */}
      {rolActivo !== 'ADMIN' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-800 font-sans shadow-xs" id="rls-operator-unauthorized-banner">
          <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="leading-normal">
            <span className="font-bold block text-amber-950">Acceso de Tarifas Restringido por Rol (RLS)</span>
            Has ingresado al sistema como <span className="font-bold">OPERADOR</span>. Por políticas de seguridad de base de datos de la empresa, los operadores poseen permisos de solo lectura para los abonos mensuales y no pueden alterar valores monetarios ni visualizar proyecciones de rentabilidad.
          </div>
        </div>
      )}

      {/* GRILLA DE PLANES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {planes.map(plan => {
          // Contar clientes activos asignados a este plan
          const countActivosPlan = clientesActivos.filter(c => c.plan_id === plan.id).length;
          const ingresoTeoricoPlan = countActivosPlan * plan.precio;
          const isProcessing = selectedPlanId === plan.id;

          return (
            <div 
              key={plan.id} 
              className="bg-white border border-zinc-200 p-6 rounded-xl flex flex-col justify-between shadow-xs transition-hover hover:border-zinc-300 relative"
              id={`plan-card-${plan.id}`}
            >
              {/* Contenido Superior */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-zinc-100 border border-zinc-200 text-zinc-800 font-sans">
                    {plan.dias_por_semana} Días Semana
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">ID: {plan.id}</span>
                </div>

                <h3 className="text-lg font-sans font-bold text-zinc-900">{plan.nombre}</h3>
                
                <div className="pt-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 font-sans">Abono Mensual</span>
                  <div className="text-3xl font-mono font-bold text-zinc-950 mt-1">
                    ${plan.precio.toLocaleString('es-AR')}
                    <span className="text-xs text-zinc-400 font-normal ml-1">ARS</span>
                  </div>
                </div>
              </div>

              {/* Métricas del plan */}
              <div className="mt-6 pt-4 border-t border-zinc-100 space-y-2 text-xs">
                <div className="flex justify-between text-zinc-500 font-sans font-medium">
                  <span>Socios Activos:</span>
                  <span className="font-bold text-zinc-900">{countActivosPlan} alumnos</span>
                </div>
                <div className="flex justify-between text-zinc-500 font-sans font-medium">
                  <span>Ingreso Teórico:</span>
                  <span className="font-mono font-bold text-zinc-900">${ingresoTeoricoPlan.toLocaleString('es-AR')}</span>
                </div>
              </div>

              {/* Botón modificar tarifa si es ADMIN */}
              {rolActivo === 'ADMIN' && (
                <div className="mt-4 pt-2">
                  {!isProcessing ? (
                    <button
                      onClick={() => handleStartEditPrice(plan.id, plan.precio)}
                      className="w-full text-center py-2 border border-zinc-200 text-zinc-900 font-bold rounded-lg text-xs hover:bg-zinc-50 transition-colors flex items-center justify-center gap-1.5"
                      id={`btn-modify-price-${plan.id}`}
                    >
                      Editar Precio
                    </button>
                  ) : (
                    <form onSubmit={handleSavePrice} className="space-y-2 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                      <label className="text-[9px] uppercase font-bold text-zinc-500">Nuevo precio en pesos (ARS)</label>
                      <div className="flex gap-1.5 items-center">
                        <div className="relative flex-1">
                          <span className="absolute left-2.5 top-2 text-zinc-400 font-mono">$</span>
                          <input
                            type="number"
                            required
                            min="0"
                            step="any"
                            value={nuevoPrecio}
                            onChange={(e) => setNuevoPrecio(e.target.value)}
                            className="bg-white pl-6 pr-2 py-1.5 w-full text-xs font-mono border border-zinc-300 rounded-lg outline-hidden"
                            placeholder="Monto"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-black hover:bg-zinc-800 text-white p-1.5 rounded-lg text-xs font-bold"
                          title="Guardar"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPlanId(null)}
                          className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 p-1.5 rounded-lg text-xs font-bold"
                          title="Cancelar"
                        >
                          Cancel
                        </button>
                      </div>

                      {successMsg && (
                        <p className="text-[9px] text-emerald-600 block mt-1 leading-normal font-sans font-semibold">
                          {successMsg}
                        </p>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RENTABILIDAD TEÓRICA CONSOLIDADA */}
      <div className="bg-white border border-zinc-200 p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-xs leading-normal">
        <div className="space-y-1">
          <h4 className="font-sans font-bold text-lg text-zinc-900">Ingreso Teórico Consolidado del Sistema</h4>
          <p className="text-zinc-500 font-sans text-xs">Es la suma total del cobro planeado por la matrícula actual si la cobranza fuera perfecta (100% de cumplimiento financiero).</p>
        </div>
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 py-3 px-6 rounded-xl text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider block font-sans">Total Teórico Mensual</span>
          <span className="text-3xl font-mono font-bold block mt-1">${totalTeoricoGimnasio.toLocaleString('es-AR')} ARS</span>
        </div>
      </div>

      {/* PANEL HISTORIAL NO RETROACTIVO */}
      {rolActivo === 'ADMIN' && (
        <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
            <History className="w-5 h-5 text-zinc-500" />
            <h3 className="font-sans font-bold text-sm text-zinc-900 uppercase tracking-wide">Auditoría del Historial de Precios de Planes (No Retroactivos)</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-sans uppercase text-[10px] tracking-wider font-semibold">
                  <th className="p-3">Plan Modificado</th>
                  <th className="p-3">Precio Anterior (ARS)</th>
                  <th className="p-3">Precio Nuevo (ARS)</th>
                  <th className="p-3">Ajuste Aplicado</th>
                  <th className="p-3">Fecha del Cambio</th>
                  <th className="p-3">Ejecutado Por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-sans text-zinc-700">
                {historialPrecios.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-zinc-400">No hay registros de variaciones en las tarifas del gimnasio.</td>
                  </tr>
                ) : (
                  historialPrecios.map(h => {
                    const diff = h.precio_nuevo - h.precio_anterior;
                    const sign = diff >= 0 ? '+' : '';
                    const percent = Math.round((diff / h.precio_anterior) * 100);

                    return (
                      <tr key={h.id} className="hover:bg-zinc-50/50">
                        <td className="p-3 font-semibold text-zinc-950">{h.nombre_plan}</td>
                        <td className="p-3 font-mono text-zinc-500">${h.precio_anterior.toLocaleString('es-AR')}</td>
                        <td className="p-3 font-mono font-bold text-zinc-900">${h.precio_nuevo.toLocaleString('es-AR')}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[10px] ${diff >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {sign}${diff.toLocaleString('es-AR')} ({sign}{percent}%)
                          </span>
                        </td>
                        <td className="p-3 text-zinc-500">{new Date(h.fecha_cambio).toLocaleString('es-AR')}</td>
                        <td className="p-3 font-mono text-zinc-400 text-[10px]">{h.cambiado_por}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
