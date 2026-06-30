// src/components/ProyeccionesTab.tsx
import React, { useMemo } from 'react';
import { useGym } from '../../GymContext';
import { Shield, BarChart3, TrendingUp, Sparkles, Scale, AlertOctagon, HelpCircle } from 'lucide-react';

export const ProyeccionesTab: React.FC = () => {
  const { planes, clientes, turnos, rolActivo } = useGym();

  const meses = ['Mayo (Act)', 'Junio (Proj)', 'Julio (Proj)', 'Agosto (Proj)'];

  // Proyecciones de ingresos teóricos según el listado de planes
  // Contamos clientes activos actuales
  const clientesActivos = useMemo(() => clientes.filter(c => c.activo), [clientes]);
  const totalActivosCount = clientesActivos.length;

  // Distribución por planes actual
  const planEstadisticas = useMemo(() => {
    return planes.map(p => {
      const cant = clientesActivos.filter(c => c.plan_id === p.id).length;
      const subtotal = cant * p.precio;
      return {
        ...p,
        cant,
        subtotal
      };
    });
  }, [planes, clientesActivos]);

  // Total teórico mensual actual al 100% de cumplimiento de los actuales
  const totalIngresoActualMen = useMemo(() => {
    return planEstadisticas.reduce((sum, p) => sum + p.subtotal, 0);
  }, [planEstadisticas]);

  // Capacidad instalada vs Vendida
  // Capacidad instalada total = sum (cupo_maximo de todos los turnos)
  const totalCuposInstalados = useMemo(() => {
    return turnos.reduce((sum, t) => sum + t.cupo_maximo, 0);
  }, [turnos]);

  // Capacidad vendida actual = sum(turnos_fijos de todos los clientes activos)
  const totalCuposVendidos = useMemo(() => {
    return turnos.reduce((sum, t) => sum + t.asignados_ids.length, 0);
  }, [turnos]);

  const porcentajeCupoSold = totalCuposInstalados > 0 
    ? Math.round((totalCuposVendidos / totalCuposInstalados) * 100)
    : 0;

  // Clasificación de turnos
  // Infrautilizados (< 40% de ocupación), Saturados (>= 80% ocupación)
  const turnosInfrautilizados = useMemo(() => {
    return turnos.filter(t => t.asignados_ids.length > 0 && (t.asignados_ids.length / t.cupo_maximo) < 0.4);
  }, [turnos]);

  const turnosSaturados = useMemo(() => {
    return turnos.filter(t => (t.asignados_ids.length / t.cupo_maximo) >= 0.82);
  }, [turnos]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto" id="proyecciones-analytics-tab-panel">
      
      {/* SECCIÓN CABECERA */}
      <div>
        <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Proyecciones de Negocio</h2>
        <p className="text-zinc-500 font-sans text-sm font-medium font-sans">Análisis de capacidad vendida, optimización de ocupación de turnos y expectativas de ingresos</p>
      </div>

      {/* RLS PROTECTED BARRIER */}
      {rolActivo !== 'ADMIN' ? (
        <div className="bg-zinc-50 p-12 border-2 border-dashed border-zinc-200 rounded-2xl text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
          <Shield className="w-12 h-12 text-zinc-400" />
          <div className="space-y-2">
            <h3 className="font-sans font-bold text-zinc-900 text-sm">Información Restringida por Rol (RLS)</h3>
            <p className="text-zinc-500 text-xs leading-relaxed font-medium">
              El perfil de <strong className="text-red-650 font-bold">OPERADOR</strong> no posee los privilegios necesarios de Base de Datos para acceder a las proyecciones comerciales, cálculos de ingresos teóricos y análisis de capacidad de KAHA GYM.
            </p>
            <p className="text-zinc-400 text-[11px]">
              Por favor, cambie su rol operativo a <strong className="text-zinc-950 font-semibold">ADMIN (Acceso Total)</strong> en el switcher superior para desbloquear esta sección.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in text-xs font-sans">
          
          {/* ANALISIS CAPACIDAD INSTALADA VS VENDIDA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KPI BAR GRAPH */}
            <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-zinc-500" />
                <h3 className="font-sans font-bold text-sm text-zinc-900 uppercase tracking-wide">Capacidad Instalada vs Capacidad Vendida</h3>
              </div>

              <p className="text-zinc-500 text-xs leading-normal">
                Compara los cupos semanales fijos diseñados (Capacidad Instalada) frente a los que se encuentran actualmente comprometidos por los alumnos fijos activos (Capacidad Vendida).
              </p>

              <div className="pt-4 space-y-2">
                <div className="flex justify-between items-end text-xs">
                  <span className="text-zinc-500 font-semibold">Tasa de Ocupación Vendida:</span>
                  <span className="font-mono font-bold text-zinc-950 text-sm">{porcentajeCupoSold}%</span>
                </div>
                <div className="bg-zinc-100 h-6 rounded-md overflow-hidden border border-zinc-200 flex items-center relative">
                  <div 
                    className="bg-black h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, porcentajeCupoSold)}%` }}
                  ></div>
                  <span className="absolute inset-x-0 text-center font-mono font-bold text-[10px] text-zinc-500">
                    {totalCuposVendidos} fijos reservados / {totalCuposInstalados} cupos totales disponibles a la semana
                  </span>
                </div>
              </div>
            </div>

            {/* DETECCION DE TURNOS INFRAUTILIZADOS VS SATURADOS */}
            <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* SATURADOS */}
              <div className="space-y-2">
                <h4 className="font-bold text-red-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-sans">
                  <AlertOctagon className="w-4 h-4" />
                  Turnos Saturados (&gt;=80%)
                </h4>
                <p className="text-zinc-400 text-[10.5px] leading-tight">Sugerencia: Abrir nuevos cupos o desalentar inscripciones fijos aquí.</p>
                {turnosSaturados.length === 0 ? (
                  <span className="text-zinc-400 italic block pt-1">Ninguno</span>
                ) : (
                  <div className="space-y-1 max-h-28 overflow-y-auto pt-1 pr-1">
                    {turnosSaturados.map(t => (
                      <div key={t.id} className="p-1.5 bg-red-50 text-red-800 rounded border border-red-100 font-semibold font-mono text-[10px]">
                        {t.dia} — {t.hora}hs ({t.asignados_ids.length}/{t.cupo_maximo} cupos)
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* INFRAUTILIZADOS */}
              <div className="space-y-2">
                <h4 className="font-bold text-amber-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5 font-sans">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  Subutilizados (&lt;40%)
                </h4>
                <p className="text-zinc-400 text-[10.5px] leading-tight font-sans">Sugerencia: Promover inscripciones u ofrecer descuentos en estos horarios.</p>
                {turnosInfrautilizados.length === 0 ? (
                  <span className="text-zinc-400 italic block pt-1">Ninguno</span>
                ) : (
                  <div className="space-y-1 max-h-28 overflow-y-auto pt-1 pr-1">
                    {turnosInfrautilizados.map(t => (
                      <div key={t.id} className="p-1.5 bg-amber-50 text-amber-800 rounded border border-amber-100 font-semibold font-mono text-[10px]">
                        {t.dia} — {t.hora}hs ({t.asignados_ids.length}/{t.cupo_maximo} cupos)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DISTRIBUCIÓN ANALÍTICA DE INGRESOS POR PLANES */}
          <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs space-y-4">
            <h3 className="font-sans font-bold text-sm text-zinc-900 uppercase tracking-wide border-b border-zinc-100 pb-2 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-zinc-400" />
              Distribución Comercial por Categoría de Plan Activo
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-bold text-[10px]">
                    <th className="p-3">Plan Base</th>
                    <th className="p-3">Días por Semana</th>
                    <th className="p-3 text-center">Cantidad Alumnos Activos</th>
                    <th className="p-3">Tarifa Vigente</th>
                    <th className="p-3 text-right">Subtotal Facturacióm (ARS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
                  {planEstadisticas.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-50/40">
                      <td className="p-3 font-semibold text-zinc-950">{p.nombre}</td>
                      <td className="p-3 text-zinc-500">{p.dias_por_semana} sesiones fijas</td>
                      <td className="p-3 text-center font-mono font-bold text-zinc-900">{p.cant} alumnos</td>
                      <td className="p-3 font-mono text-zinc-650">${p.precio.toLocaleString('es-AR')}</td>
                      <td className="p-3 text-right font-mono font-bold text-zinc-950">${p.subtotal.toLocaleString('es-AR')}</td>
                    </tr>
                  ))}
                  <tr className="bg-zinc-50 font-bold border-t-2 border-zinc-300">
                    <td colSpan={2} className="p-3 text-zinc-900 font-semibold">Total Consolidado Mensual</td>
                    <td className="p-3 text-center font-mono font-bold text-zinc-900">{totalActivosCount} alumnos</td>
                    <td className="p-3 text-zinc-400">-</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-700 text-sm">${totalIngresoActualMen.toLocaleString('es-AR')} ARS</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* INGRESO PROYECTADO SEGÚN INDICES DE COBRANZA / COMPORTAMIENTO (Próximos 3 meses) */}
          <div className="bg-white border border-zinc-200 p-6 rounded-xl shadow-xs space-y-4">
            <h3 className="font-sans font-bold text-sm text-zinc-900 uppercase tracking-wide border-b border-zinc-100 pb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Proyección de Recaudación Financiera al 100%, 75% y 50% de Éxito de Cobro
            </h3>
            
            <p className="text-zinc-500 text-xs">
              Mapea el rendimiento económico esperado de la matrícula fija para el horizonte actual y próximos trimestres de acuerdo con el cumplimiento del pago mensual de los socios.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 text-center">
              {meses.map((mes, idx) => {
                // Supongamos un leve incremento simulado mensual por crecimiento orgánico de alumnos (+2% mes)
                const tasaInflacionOrg = 1 + (idx * 0.02);
                const baseDelMes = totalIngresoActualMen * tasaInflacionOrg;

                return (
                  <div key={mes} className="border border-zinc-200 bg-[#f9fafb] p-4 rounded-xl space-y-3 shadow-xs">
                    <span className="font-sans font-bold text-zinc-900 text-xs uppercase block bg-zinc-900 text-white rounded py-1 tracking-wider">{mes}</span>
                    
                    <div className="space-y-2 text-xs text-left">
                      <div className="border-b border-zinc-200 pb-1.5">
                        <span className="text-[10px] text-zinc-400 font-semibold block uppercase">Cobro al 100% (Perfecto)</span>
                        <span className="font-mono font-bold block text-zinc-900 text-sm">${Math.round(baseDelMes).toLocaleString('es-AR')}</span>
                      </div>
                      <div className="border-b border-zinc-200 pb-1.5">
                        <span className="text-[10px] text-zinc-400 font-medium block uppercase">Cobro al 75% (Normal)</span>
                        <span className="font-mono font-bold block text-emerald-600 font-bold block text-[13px]">${Math.round(baseDelMes * 0.75).toLocaleString('es-AR')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 font-medium block uppercase">Cobro al 50% (Crítico)</span>
                        <span className="font-mono font-semibold block text-zinc-500">${Math.round(baseDelMes * 0.5).toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
