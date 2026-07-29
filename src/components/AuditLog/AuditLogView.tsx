// src/components/AuditLogView.tsx
import { useMemo, useState } from 'react';
import { useGym } from '../../GymContext';
import { Search, Database } from 'lucide-react';

// Formatea el campo `detalles` (que es un objeto) a texto legible para mostrar/buscar
function formatDetalles(detalles: any): string {
  if (detalles === null || detalles === undefined) return '';
  if (typeof detalles === 'string') return detalles;
  try {
    return Object.entries(detalles)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' · ');
  } catch {
    return String(detalles);
  }
}

export const AuditLogView: React.FC = () => {
  const { auditLogs } = useGym();
  const [buscarLog, setBuscarLog] = useState('');

  const sortedLogs = useMemo(() => {
    return [...auditLogs].sort((a, b) => {
      return new Date(b.creado_at).getTime() - new Date(a.creado_at).getTime();
    });
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    if (!buscarLog.trim()) return sortedLogs;
    const query = buscarLog.toLowerCase();
    return sortedLogs.filter(l =>
      l.accion.toLowerCase().includes(query) ||
      l.usuario_email.toLowerCase().includes(query) ||
      formatDetalles(l.detalles).toLowerCase().includes(query)
    );
  }, [sortedLogs, buscarLog]);

  return (
    <div className="space-y-6 p-3 sm:p-6 max-w-7xl mx-auto overflow-x-hidden" id="audit-logs-tab-panel">
      
      {/* SECCIÓN CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-sans font-bold tracking-tight text-zinc-950">Registro de Auditoría</h2>
          <p className="text-zinc-500 font-sans text-sm font-medium">Historial inmutable de transacciones, alteración de precios, conciliaciones y matrícula</p>
        </div>

        <div className="relative w-full md:w-80 text-xs font-sans">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por acción o usuario analista..."
            value={buscarLog}
            onChange={(e) => setBuscarLog(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-zinc-200 rounded-lg text-xs outline-hidden focus:border-zinc-500"
            id="audit-search-input"
          />
        </div>
      </div>

      {/* NOTA EXPLICATIVA RLS Y PERSISTENCIA */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 flex items-start gap-3 text-xs text-zinc-600 font-sans leading-normal">
        <Database className="w-5 h-5 text-zinc-500 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-zinc-900 block mb-0.5">Bitácora Transaccional del Servidor</span>
          Este registro representa un calco del trigger automatizado de PostgreSQL en Supabase. Registra cada inserción, modificación y borrado de forma inmutable, garantizando la trazabilidad operativa y el cumplimiento de las normativas de seguridad de datos de la empresa.
        </div>
      </div>

      {/* LISTADO DE ACCIONES — TABLA en desktop, CARDS en mobile */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-xs">

        {/* DESKTOP TABLE */}
        <div className="hidden sm:block overflow-x-auto text-xs font-sans">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-200 uppercase tracking-wider text-[10px]">
                <th className="p-4 w-44">Fecha / Hora</th>
                <th className="p-4 w-40">Usuario Responsable</th>
                <th className="p-4 w-52">Acción</th>
                <th className="p-4">Detalles Operativos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-400 italic">No hay logs de auditoría que coincidan con la búsqueda.</td>
                </tr>
              ) : (
                filteredLogs.map(l => {
                  let badgeColor = 'bg-zinc-100 text-zinc-800 border-zinc-200';
                  if (l.accion.includes('PAGO')) {
                    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                  } else if (l.accion.includes('ELIMINAR') || l.accion.includes('MOROSO')) {
                    badgeColor = 'bg-red-50 text-red-700 border-red-100';
                  } else if (l.accion.includes('CREAR') || l.accion.includes('NUEVO')) {
                    badgeColor = 'bg-blue-50 text-blue-800 border-blue-100';
                  } else if (l.accion.includes('PRECIO') || l.accion.includes('CUPO_MODIFICADO')) {
                    badgeColor = 'bg-purple-50 text-purple-800 border-purple-100';
                  }

                  return (
                    <tr key={l.id} className="hover:bg-zinc-50/50">
                      <td className="p-4 font-mono text-[10px] text-zinc-500 whitespace-nowrap">
                        {new Date(l.creado_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-zinc-800 font-bold text-[11px] truncate w-36" title={l.usuario_email}>{l.usuario_email}</div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-sm border font-bold text-[9px] uppercase tracking-wide inline-block ${badgeColor}`}>
                          {l.accion}
                        </span>
                      </td>
                      <td className="p-4 font-sans text-zinc-600 font-medium leading-relaxed">
                        {formatDetalles(l.detalles) || 'Sin detalles adicionales registrados.'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="sm:hidden divide-y divide-zinc-100 text-xs font-sans">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 italic">No hay logs que coincidan.</div>
          ) : (
            filteredLogs.map(l => {
              let badgeColor = 'bg-zinc-100 text-zinc-800 border-zinc-200';
              if (l.accion.includes('PAGO')) badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
              else if (l.accion.includes('ELIMINAR') || l.accion.includes('MOROSO')) badgeColor = 'bg-red-50 text-red-700 border-red-100';
              else if (l.accion.includes('CREAR') || l.accion.includes('NUEVO')) badgeColor = 'bg-blue-50 text-blue-800 border-blue-100';
              else if (l.accion.includes('PRECIO') || l.accion.includes('CUPO_MODIFICADO')) badgeColor = 'bg-purple-50 text-purple-800 border-purple-100';

              return (
                <div key={l.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded border font-bold text-[9px] uppercase tracking-wide shrink-0 ${badgeColor}`}>
                      {l.accion}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400 truncate text-right">{l.usuario_email}</span>
                  </div>
                  <div className="font-mono text-[10px] text-zinc-500">
                    {new Date(l.creado_at).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}
                  </div>
                  {formatDetalles(l.detalles) && (
                    <p className="text-zinc-600 text-[11px] leading-relaxed break-words">
                      {formatDetalles(l.detalles)}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
